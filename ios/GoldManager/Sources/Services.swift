import Foundation
import WidgetKit

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

    func updateSoldStatus(
        id: UUID,
        payload: TransactionSoldPayload,
        configuration: SupabaseConfiguration
    ) async throws {
        var request = try request(
            configuration: configuration,
            path: "transactions",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
        request.httpMethod = "PATCH"
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = try encoder.encode(payload)
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
        try await upsertAppSettings(
            ["current_gold_price": String(format: "%.0f", price)],
            configuration: configuration
        )
    }

    /// Lịch sử giá vàng (mới nhất `days` ngày), trả theo thứ tự ngày tăng dần để vẽ biểu đồ.
    func fetchGoldPriceHistory(
        days: Int = 90,
        configuration: SupabaseConfiguration
    ) async throws -> [GoldPricePoint] {
        let request = try request(
            configuration: configuration,
            path: "gold_price_history",
            query: [
                URLQueryItem(name: "select", value: "price_date,price"),
                URLQueryItem(name: "order", value: "price_date.desc"),
                URLQueryItem(name: "limit", value: String(days))
            ]
        )
        let points: [GoldPricePoint] = try await send(request)
        return points.sorted { $0.priceDate < $1.priceDate }
    }

    /// Ghi (upsert) giá vàng của một ngày vào `gold_price_history`.
    func recordGoldPrice(
        date: Date,
        price: Double,
        configuration: SupabaseConfiguration
    ) async throws {
        let payload = [GoldPriceRecord(priceDate: DateFormatters.formatDatabaseDay(date), price: price)]
        var request = try request(
            configuration: configuration,
            path: "gold_price_history",
            query: [URLQueryItem(name: "on_conflict", value: "price_date")]
        )
        request.httpMethod = "POST"
        request.setValue("resolution=merge-duplicates,return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = try encoder.encode(payload)
        try await sendWithoutBody(request)
    }

    /// Đọc toàn bộ key/value trong bảng `app_settings`.
    func fetchAppSettings(configuration: SupabaseConfiguration) async throws -> [AppSetting] {
        let request = try request(
            configuration: configuration,
            path: "app_settings",
            query: [URLQueryItem(name: "select", value: "*")]
        )
        return try await send(request)
    }

    /// Ghi (upsert) nhiều cặp key/value vào `app_settings` trong một lần gọi.
    func upsertAppSettings(
        _ values: [String: String],
        configuration: SupabaseConfiguration
    ) async throws {
        guard !values.isEmpty else { return }

        struct SettingPayload: Encodable {
            let key: String
            let value: String
            let updatedAt: String

            enum CodingKeys: String, CodingKey {
                case key, value
                case updatedAt = "updated_at"
            }
        }

        let now = DateFormatters.formatISO8601(Date())
        let payload = values.map {
            SettingPayload(key: $0.key, value: $0.value, updatedAt: now)
        }

        var request = try request(
            configuration: configuration,
            path: "app_settings",
            query: [URLQueryItem(name: "on_conflict", value: "key")]
        )
        request.httpMethod = "POST"
        request.setValue("resolution=merge-duplicates,return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = try encoder.encode(payload)
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
        reloadWidgetsIfMutating(request)
        return try decoder.decode(Response.self, from: data)
    }

    private func sendWithoutBody(_ request: URLRequest) async throws {
        let (data, response) = try await session.data(for: request)
        try validate(response: response, data: data)
        reloadWidgetsIfMutating(request)
    }

    /// Sau mỗi lần ghi thành công (POST/PATCH/PUT/DELETE), yêu cầu WidgetKit nạp lại
    /// toàn bộ widget để chúng phản ánh dữ liệu mới ngay, thay vì chờ refresh nền ~30 phút.
    /// Request đọc (GET) bị bỏ qua nên `load()` thông thường không kích hoạt reload.
    private func reloadWidgetsIfMutating(_ request: URLRequest) {
        switch request.httpMethod {
        case "POST", "PATCH", "PUT", "DELETE":
            WidgetCenter.shared.reloadAllTimelines()
        default:
            break
        }
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

// MARK: - BTMC Gold Price API

/// Đọc bảng giá vàng công khai của Bảo Tín Minh Châu (BTMC).
///
/// API trả JSON dạng `{"DataList":{"Data":[{"@row":"1","@n_1":...,"@pb_1":...}]}}`
/// với hậu tố khoá thay đổi theo số dòng, nên việc giải mã đi qua `[String: String]`
/// rồi dò theo tiền tố (xem `GoldQuote.init(btmcRow:)`).
actor BTMCGoldPriceClient {
    static let endpoint = URL(
        string: "https://btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v"
    )!

    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func fetchQuotes() async throws -> [GoldQuote] {
        var request = URLRequest(url: Self.endpoint)
        request.timeoutInterval = 15
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            throw APIError.invalidResponse
        }

        let decoded = try JSONDecoder().decode(BTMCResponse.self, from: data)
        var seen = Set<String>()
        var quotes: [GoldQuote] = []
        for row in decoded.dataList.data {
            guard let quote = GoldQuote(btmcRow: row) else { continue }
            // API trả nhiều lần cập nhật trong ngày; giữ dòng đầu (mới nhất) mỗi loại.
            if seen.insert(quote.name).inserted {
                quotes.append(quote)
            }
        }
        return quotes
    }
}

private struct BTMCResponse: Decodable {
    let dataList: Container

    enum CodingKeys: String, CodingKey {
        case dataList = "DataList"
    }

    struct Container: Decodable {
        let data: [[String: String]]

        enum CodingKeys: String, CodingKey {
            case data = "Data"
        }
    }
}
