import Foundation

/// Người sở hữu số vàng trong một giao dịch.
enum GoldOwner: String, Codable, CaseIterable, Identifiable, Sendable {
    case binh
    case tu

    var id: String { rawValue }

    /// Tên hiển thị đầy đủ.
    var title: String {
        switch self {
        case .binh: "Bình"
        case .tu: "Tú"
        }
    }

    /// Biểu tượng SF Symbol đại diện.
    var symbol: String { "person.fill" }
}

struct GoldTransaction: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let createdAt: Date
    let transactionDate: Date
    let amountChi: Double
    let pricePerChi: Double
    let totalPrice: Double?
    let note: String?
    let owner: GoldOwner
    let isSold: Bool
    let soldDate: Date?
    let soldPricePerChi: Double?

    var cost: Double {
        totalPrice ?? amountChi * pricePerChi
    }

    /// Tổng tiền thu về khi bán (chỉ có ý nghĩa khi đã bán và đã nhập giá bán).
    var soldValue: Double? {
        guard isSold, let soldPricePerChi else { return nil }
        return amountChi * soldPricePerChi
    }

    /// Lợi nhuận đã chốt khi bán.
    var realizedProfit: Double? {
        soldValue.map { $0 - cost }
    }

    enum CodingKeys: String, CodingKey {
        case id
        case createdAt = "created_at"
        case transactionDate = "transaction_date"
        case amountChi = "amount_chi"
        case pricePerChi = "price_per_chi"
        case totalPrice = "total_price"
        case note
        case owner
        case isSold = "is_sold"
        case soldDate = "sold_date"
        case soldPricePerChi = "sold_price_per_chi"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        transactionDate = try container.decode(Date.self, forKey: .transactionDate)
        amountChi = try container.decode(Double.self, forKey: .amountChi)
        pricePerChi = try container.decode(Double.self, forKey: .pricePerChi)
        totalPrice = try container.decodeIfPresent(Double.self, forKey: .totalPrice)
        note = try container.decodeIfPresent(String.self, forKey: .note)
        // Các cột mới: chịu được dữ liệu cũ chưa có cột (migration chưa chạy) hoặc giá trị null.
        owner = (try? container.decode(GoldOwner.self, forKey: .owner)) ?? .binh
        isSold = (try? container.decode(Bool.self, forKey: .isSold)) ?? false
        soldDate = try? container.decode(Date.self, forKey: .soldDate)
        soldPricePerChi = try? container.decode(Double.self, forKey: .soldPricePerChi)
    }
}

struct NewGoldTransaction: Encodable, Sendable {
    let transactionDate: String
    let amountChi: Double
    let pricePerChi: Double
    let note: String?
    let owner: String

    enum CodingKeys: String, CodingKey {
        case transactionDate = "transaction_date"
        case amountChi = "amount_chi"
        case pricePerChi = "price_per_chi"
        case note
        case owner
    }
}

/// Payload PATCH để đánh dấu đã bán / bỏ đánh dấu. Mọi trường đều được mã hoá
/// (kể cả `null`) để khi bỏ đánh dấu sẽ xoá luôn ngày bán và giá bán cũ.
struct TransactionSoldPayload: Encodable, Sendable {
    let isSold: Bool
    let soldDate: String?
    let soldPricePerChi: Double?

    enum CodingKeys: String, CodingKey {
        case isSold = "is_sold"
        case soldDate = "sold_date"
        case soldPricePerChi = "sold_price_per_chi"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(isSold, forKey: .isSold)
        try container.encode(soldDate, forKey: .soldDate)
        try container.encode(soldPricePerChi, forKey: .soldPricePerChi)
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

// MARK: - Giá vàng BTMC

/// Cách định giá số vàng đang giữ theo bảng giá BTMC.
enum GoldPriceSide: String, CaseIterable, Identifiable, Sendable {
    case buy
    case sell

    var id: String { rawValue }

    var title: String {
        switch self {
        case .buy: "Giá mua vào"
        case .sell: "Giá bán ra"
        }
    }
}

/// Một dòng báo giá vàng từ API công khai của BTMC (đơn vị VNĐ mỗi chỉ).
struct GoldQuote: Identifiable, Hashable, Sendable {
    let name: String
    let karat: String
    let purity: String
    /// Giá BTMC mua vào — số tiền khách nhận khi bán ra.
    let buyPrice: Double
    /// Giá BTMC bán ra — số tiền khách trả khi mua vào.
    let sellPrice: Double
    /// Thời điểm BTMC cập nhật, ví dụ "27/06/2026 15:53".
    let updatedAt: String

    var id: String { name }

    /// Giá theo loại định giá; tự lùi về giá còn lại nếu giá đã chọn bằng 0.
    func price(for side: GoldPriceSide) -> Double {
        switch side {
        case .buy: buyPrice > 0 ? buyPrice : sellPrice
        case .sell: sellPrice > 0 ? sellPrice : buyPrice
        }
    }
}

extension GoldQuote {
    /// Khởi tạo từ một phần tử JSON của BTMC. Mỗi phần tử có các khoá hậu tố động
    /// theo số dòng (`@n_1`, `@pb_1`, `@ps_1`, `@d_1`...), nên ta dò theo tiền tố.
    init?(btmcRow row: [String: String]) {
        func value(prefix: String) -> String? {
            row.first { $0.key.hasPrefix(prefix) }?.value
        }
        guard let name = value(prefix: "@n_")?.trimmingCharacters(in: .whitespacesAndNewlines),
              !name.isEmpty
        else { return nil }
        self.init(
            name: name,
            karat: value(prefix: "@k_") ?? "",
            purity: value(prefix: "@h_") ?? "",
            buyPrice: value(prefix: "@pb_").flatMap(Double.init) ?? 0,
            sellPrice: value(prefix: "@ps_").flatMap(Double.init) ?? 0,
            updatedAt: value(prefix: "@d_") ?? ""
        )
    }
}
