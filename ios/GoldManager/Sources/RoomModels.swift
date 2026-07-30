import Foundation

struct RoomSettings: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    var rentPrice: Double
    var electricPrice: Double
    var waterPrice: Double
    var bankId: String?
    var bankName: String?
    var accountNumber: String?
    var accountName: String?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case rentPrice = "rent_price"
        case electricPrice = "electric_price"
        case waterPrice = "water_price"
        case bankId = "bank_id"
        case bankName = "bank_name"
        case accountNumber = "account_number"
        case accountName = "account_name"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum RoomFeeType: String, Codable, CaseIterable, Identifiable, Sendable {
    case fixed
    case unit
    var id: String { rawValue }
    var title: String { self == .fixed ? "Cố định" : "Theo số lượng" }
}

struct RoomCustomFee: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    var name: String
    var type: RoomFeeType
    var unitPrice: Double?
    var fixedAmount: Double?
    var unitName: String?
    var isActive: Bool
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, name, type
        case unitPrice = "unit_price"
        case fixedAmount = "fixed_amount"
        case unitName = "unit_name"
        case isActive = "is_active"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct RoomRecordFee: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let recordId: UUID
    let customFeeId: UUID?
    let feeName: String
    let quantity: Double
    let amount: Double
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, quantity, amount
        case recordId = "record_id"
        case customFeeId = "custom_fee_id"
        case feeName = "fee_name"
        case createdAt = "created_at"
    }
}

struct RoomRecord: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let month: Date
    let electricOld: Double
    let electricNew: Double
    let waterOld: Double
    let waterNew: Double
    let rentAmount: Double
    let electricAmount: Double
    let waterAmount: Double
    let totalAmount: Double
    let createdAt: Date
    let recordCustomFees: [RoomRecordFee]?

    enum CodingKeys: String, CodingKey {
        case id, month
        case electricOld = "electric_old"
        case electricNew = "electric_new"
        case waterOld = "water_old"
        case waterNew = "water_new"
        case rentAmount = "rent_amount"
        case electricAmount = "electric_amount"
        case waterAmount = "water_amount"
        case totalAmount = "total_amount"
        case createdAt = "created_at"
        case recordCustomFees = "record_custom_fees"
    }
}

struct RoomFeeCalculation: Identifiable, Hashable, Sendable {
    let fee: RoomCustomFee
    var quantity: Double
    var id: UUID { fee.id }

    var amount: Double {
        fee.type == .fixed
            ? fee.fixedAmount ?? 0
            : (fee.unitPrice ?? 0) * quantity
    }
}

struct RoomBillCalculation: Hashable, Sendable {
    let electricUsed: Double
    let waterUsed: Double
    let rentAmount: Double
    let electricAmount: Double
    let waterAmount: Double
    let fees: [RoomFeeCalculation]

    var totalAmount: Double {
        rentAmount + electricAmount + waterAmount + fees.reduce(0) { $0 + $1.amount }
    }
}
