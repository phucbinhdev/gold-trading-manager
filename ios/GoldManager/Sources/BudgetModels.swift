import Foundation

struct BudgetSource: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let createdAt: Date
    var name: String
    let sortOrder: Int
    var isActive: Bool

    enum CodingKeys: String, CodingKey {
        case id, name
        case createdAt = "created_at"
        case sortOrder = "sort_order"
        case isActive = "is_active"
    }
}

struct BudgetMonth: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let monthKey: String
    let sourceId: UUID
    var totalIncome: Double
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case monthKey = "month_key"
        case sourceId = "source_id"
        case totalIncome = "total_income"
        case createdAt = "created_at"
    }
}

enum BudgetRecordType: String, Codable, CaseIterable, Identifiable, Sendable {
    case expense
    case income
    var id: String { rawValue }
    var title: String { self == .expense ? "Chi" : "Thu" }
}

struct BudgetEntry: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let budgetId: UUID
    var recordType: BudgetRecordType
    var name: String
    var amount: Double
    var isPaid: Bool
    var isSelected: Bool
    let createdAt: Date
    var note: String?

    enum CodingKeys: String, CodingKey {
        case id, name, amount, note
        case budgetId = "budget_id"
        case recordType = "record_type"
        case isPaid = "is_paid"
        case isSelected = "is_selected"
        case createdAt = "created_at"
    }
}

struct SavingsRow: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let createdAt: Date
    var label: String
    var periodAmount: Double
    var periodsLeft: Int
    var remainingAmount: Double
    var closed: Bool
    var monthCells: [String: Bool]
    var cellPaidAt: [String: String]
    var cellNotes: [String: String]
    var closedCount: Int

    enum CodingKeys: String, CodingKey {
        case id, label, closed
        case createdAt = "created_at"
        case periodAmount = "period_amount"
        case periodsLeft = "periods_left"
        case remainingAmount = "remaining_amount"
        case monthCells = "month_cells"
        case cellPaidAt = "cell_paid_at"
        case cellNotes = "cell_notes"
        case closedCount = "closed_count"
    }

    var totalCells: Int {
        max(0, periodsLeft + closedCount)
    }

    var completedCells: Set<Int> {
        var cells = Set(
            monthCells.compactMap { key, completed in
                completed ? Int(key) : nil
            }
        )
        if cells.isEmpty, closedCount > 0 {
            cells.formUnion(1...min(closedCount, totalCells))
        }
        return cells
    }
}
