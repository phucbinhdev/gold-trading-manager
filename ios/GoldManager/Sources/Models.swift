import Foundation

struct GoldTransaction: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let createdAt: Date
    let transactionDate: Date
    let amountChi: Double
    let pricePerChi: Double
    let totalPrice: Double?
    let note: String?

    var cost: Double {
        totalPrice ?? amountChi * pricePerChi
    }

    enum CodingKeys: String, CodingKey {
        case id
        case createdAt = "created_at"
        case transactionDate = "transaction_date"
        case amountChi = "amount_chi"
        case pricePerChi = "price_per_chi"
        case totalPrice = "total_price"
        case note
    }
}

struct NewGoldTransaction: Encodable, Sendable {
    let transactionDate: String
    let amountChi: Double
    let pricePerChi: Double
    let note: String?

    enum CodingKeys: String, CodingKey {
        case transactionDate = "transaction_date"
        case amountChi = "amount_chi"
        case pricePerChi = "price_per_chi"
        case note
    }
}

struct AppSetting: Codable, Sendable {
    let key: String
    let value: String?
    let updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case key
        case value
        case updatedAt = "updated_at"
    }
}

struct SupabaseConfiguration: Equatable, Sendable {
    var projectURL: String
    var anonKey: String

    var isValid: Bool {
        guard let url = URL(string: projectURL) else { return false }
        return url.scheme == "https" && !anonKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}

enum LoadState: Equatable {
    case idle
    case loading
    case loaded
    case failed(String)
}
