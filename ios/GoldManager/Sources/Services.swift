import Foundation

enum APIError: LocalizedError {
    case notConfigured
    case invalidResponse
    case server(status: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            "Thiếu EXPO_PUBLIC_SUPABASE_URL hoặc EXPO_PUBLIC_SUPABASE_ANON_KEY trong cấu hình build."
        case .invalidResponse:
            "Máy chủ trả về dữ liệu không hợp lệ."
        case .server(_, let message):
            message
        }
    }
}

actor SupabaseClient {
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init(session: URLSession = .shared) {
        self.session = session

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let value = try decoder.singleValueContainer().decode(String.self)
            if value.count == 10 {
                guard let date = DateFormatters.parseDatabaseDay(value) else {
                    throw DecodingError.dataCorruptedError(
                        in: try decoder.singleValueContainer(),
                        debugDescription: "Invalid date"
                    )
                }
                return date
            }
            guard let date = DateFormatters.parseISO8601(value) else {
                throw DecodingError.dataCorruptedError(
                    in: try decoder.singleValueContainer(),
                    debugDescription: "Invalid timestamp"
                )
            }
            return date
        }
        self.decoder = decoder

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        self.encoder = encoder
    }

    func fetchTransactions(configuration: SupabaseConfiguration) async throws -> [GoldTransaction] {
        let request = try request(
            configuration: configuration,
            path: "transactions",
            query: [
                URLQueryItem(name: "select", value: "*"),
                URLQueryItem(name: "order", value: "transaction_date.desc")
            ]
        )
        return try await send(request)
    }

    func fetchMarketPrice(configuration: SupabaseConfiguration) async throws -> Double {
        let request = try request(
            configuration: configuration,
            path: "app_settings",
            query: [
                URLQueryItem(name: "select", value: "*"),
                URLQueryItem(name: "key", value: "eq.current_gold_price"),
                URLQueryItem(name: "limit", value: "1")
            ]
        )
        let settings: [AppSetting] = try await send(request)
        return settings.first?.value.flatMap(Double.init) ?? 8_000_000
    }

    func addTransaction(
        _ transaction: NewGoldTransaction,
        configuration: SupabaseConfiguration
    ) async throws {
        var request = try request(configuration: configuration, path: "transactions")
        request.httpMethod = "POST"
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = try encoder.encode(transaction)
        try await sendWithoutBody(request)
    }

    func updateTransaction(
        id: UUID,
        transaction: NewGoldTransaction,
        configuration: SupabaseConfiguration
    ) async throws {
        var request = try request(
            configuration: configuration,
            path: "transactions",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
        request.httpMethod = "PATCH"
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = try encoder.encode(transaction)
        try await sendWithoutBody(request)
    }

    func deleteTransaction(id: UUID, configuration: SupabaseConfiguration) async throws {
        var request = try request(
            configuration: configuration,
            path: "transactions",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
        request.httpMethod = "DELETE"
        try await sendWithoutBody(request)
    }

    func updateMarketPrice(_ price: Double, configuration: SupabaseConfiguration) async throws {
        struct SettingPayload: Encodable {
            let key: String
            let value: String
            let updatedAt: String

            enum CodingKeys: String, CodingKey {
                case key, value
                case updatedAt = "updated_at"
            }
        }

        var request = try request(
            configuration: configuration,
            path: "app_settings",
            query: [URLQueryItem(name: "on_conflict", value: "key")]
        )
        request.httpMethod = "POST"
        request.setValue("resolution=merge-duplicates,return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = try encoder.encode(
            SettingPayload(
                key: "current_gold_price",
                value: String(format: "%.0f", price),
                updatedAt: DateFormatters.formatISO8601(Date())
            )
        )
        try await sendWithoutBody(request)
    }

    func restGet<Response: Decodable & Sendable>(
        _ type: Response.Type,
        configuration: SupabaseConfiguration,
        path: String,
        query: [URLQueryItem] = []
    ) async throws -> Response {
        let request = try request(configuration: configuration, path: path, query: query)
        return try await send(request)
    }

    func restPost<Body: Encodable & Sendable, Response: Decodable & Sendable>(
        _ body: Body,
        response: Response.Type,
        configuration: SupabaseConfiguration,
        path: String,
        query: [URLQueryItem] = [],
        prefer: String = "return=representation"
    ) async throws -> Response {
        var request = try request(configuration: configuration, path: path, query: query)
        request.httpMethod = "POST"
        request.setValue(prefer, forHTTPHeaderField: "Prefer")
        request.httpBody = try encoder.encode(body)
        return try await send(request)
    }

    func restPatch<Body: Encodable & Sendable, Response: Decodable & Sendable>(
        _ body: Body,
        response: Response.Type,
        configuration: SupabaseConfiguration,
        path: String,
        query: [URLQueryItem],
        prefer: String = "return=representation"
    ) async throws -> Response {
        var request = try request(configuration: configuration, path: path, query: query)
        request.httpMethod = "PATCH"
        request.setValue(prefer, forHTTPHeaderField: "Prefer")
        request.httpBody = try encoder.encode(body)
        return try await send(request)
    }

    func restDelete(
        configuration: SupabaseConfiguration,
        path: String,
        query: [URLQueryItem]
    ) async throws {
        var request = try request(configuration: configuration, path: path, query: query)
        request.httpMethod = "DELETE"
        try await sendWithoutBody(request)
    }

    private func request(
        configuration: SupabaseConfiguration,
        path: String,
        query: [URLQueryItem] = []
    ) throws -> URLRequest {
        guard configuration.isValid,
              var components = URLComponents(string: configuration.projectURL)
        else {
            throw APIError.notConfigured
        }
        components.path = "/rest/v1/\(path)"
        components.queryItems = query
        guard let url = components.url else { throw APIError.notConfigured }

        var request = URLRequest(url: url)
        request.setValue(configuration.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(configuration.anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 20
        return request
    }

    private func send<Response: Decodable>(_ request: URLRequest) async throws -> Response {
        let (data, response) = try await session.data(for: request)
        try validate(response: response, data: data)
        return try decoder.decode(Response.self, from: data)
    }

    private func sendWithoutBody(_ request: URLRequest) async throws {
        let (data, response) = try await session.data(for: request)
        try validate(response: response, data: data)
    }

    private func validate(response: URLResponse, data: Data) throws {
        guard let response = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard 200..<300 ~= response.statusCode else {
            let message = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])
                .flatMap { $0["message"] as? String }
                ?? HTTPURLResponse.localizedString(forStatusCode: response.statusCode)
            throw APIError.server(status: response.statusCode, message: message)
        }
    }
}

enum DateFormatters {
    private static func databaseDayFormatter() -> DateFormatter {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }

    static func parseDatabaseDay(_ value: String) -> Date? {
        databaseDayFormatter().date(from: value)
    }

    static func formatDatabaseDay(_ date: Date) -> String {
        databaseDayFormatter().string(from: date)
    }

    static func parseISO8601(_ value: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: value) ?? ISO8601DateFormatter().date(from: value)
    }

    static func formatISO8601(_ date: Date) -> String {
        ISO8601DateFormatter().string(from: date)
    }
}
