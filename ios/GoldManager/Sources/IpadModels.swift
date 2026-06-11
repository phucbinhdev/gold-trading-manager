import Foundation

enum IpadStatus: String, Codable, CaseIterable, Identifiable, Sendable {
    case importing
    case inStock = "in_stock"
    case sold

    var id: String { rawValue }

    var title: String {
        switch self {
        case .importing: "Đang nhập"
        case .inStock: "Lưu kho"
        case .sold: "Đã bán"
        }
    }
}

struct IpadTransaction: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let createdAt: Date
    var purchaseDate: Date
    let deviceName: String
    let storage: String?
    let color: String?
    let serialNumber: String?
    var purchasePrice: Double
    var extraCost: Double
    var loanAmount: Double
    var sellingPrice: Double?
    var saleDate: Date?
    var note: String?
    var debtPaid: Bool
    var debtPaidAt: Date?
    let totalCost: Double
    let profitAmount: Double?
    var status: IpadStatus

    enum CodingKeys: String, CodingKey {
        case id, color, note, status
        case createdAt = "created_at"
        case purchaseDate = "purchase_date"
        case deviceName = "device_name"
        case storage
        case serialNumber = "serial_number"
        case purchasePrice = "purchase_price"
        case extraCost = "extra_cost"
        case loanAmount = "loan_amount"
        case sellingPrice = "selling_price"
        case saleDate = "sale_date"
        case debtPaid = "debt_paid"
        case debtPaidAt = "debt_paid_at"
        case totalCost = "total_cost"
        case profitAmount = "profit_amount"
    }
}
