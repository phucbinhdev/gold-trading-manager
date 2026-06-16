import Foundation
import Observation
import UIKit

enum IpadDebtFilter: String, CaseIterable, Identifiable {
    case all
    case unpaid
    case paid

    var id: String { rawValue }
    var title: String {
        switch self {
        case .all: "Tất cả trạng thái nợ"
        case .unpaid: "Còn nợ"
        case .paid: "Đã trả nợ"
        }
    }
}

@MainActor
@Observable
final class IpadStore {
    var transactions: [IpadTransaction] = []
    var state: LoadState = .idle
    var statusFilter: IpadStatus?
    var debtFilter = IpadDebtFilter.all
    var monthFilter = IpadStore.currentMonthKey

    private let client = SupabaseClient()

    var visibleTransactions: [IpadTransaction] {
        transactions
            .filter { transaction in
                let matchesMonth = monthFilter == "all" || Self.monthKey(transaction.purchaseDate) == monthFilter
                let matchesStatus = statusFilter == nil || transaction.status == statusFilter
                let matchesDebt: Bool
                switch debtFilter {
                case .all: matchesDebt = true
                case .unpaid: matchesDebt = !transaction.debtPaid
                case .paid: matchesDebt = transaction.debtPaid
                }
                return matchesMonth && matchesStatus && matchesDebt
            }
            .sorted(by: Self.compareTransactions)
    }

    var monthOptions: [String] {
        var months = Set(transactions.map { Self.monthKey($0.purchaseDate) })
        months.insert(Self.currentMonthKey)
        return months.sorted(by: >)
    }

    var totalCost: Double {
        visibleTransactions.reduce(0) { $0 + $1.totalCost }
    }

    var totalRevenue: Double {
        visibleTransactions.reduce(0) { $0 + ($1.status == .sold ? $1.sellingPrice ?? 0 : 0) }
    }

    var totalProfit: Double {
        visibleTransactions.reduce(0) { $0 + ($1.status == .sold ? $1.profitAmount ?? 0 : 0) }
    }

    var unpaidDebt: Double {
        visibleTransactions.reduce(0) { $0 + ($1.debtPaid ? 0 : $1.loanAmount) }
    }

    func load(configuration: SupabaseConfiguration) async {
        guard configuration.isValid else {
            state = .failed(APIError.notConfigured.localizedDescription)
            return
        }
        state = transactions.isEmpty ? .loading : .loaded
        do {
            transactions = try await client.fetchIpadTransactions(configuration: configuration)
                .sorted(by: Self.compareTransactions)
            state = .loaded
        } catch is CancellationError {
            return
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    func add(
        purchaseDate: Date,
        status: IpadStatus,
        purchasePrice: Double,
        extraCost: Double,
        loanAmount: Double,
        sellingPrice: Double? = nil,
        saleDate: Date? = nil,
        note: String,
        configuration: SupabaseConfiguration
    ) async throws {
        try await client.createIpadTransaction(
            purchaseDate: purchaseDate,
            status: status,
            purchasePrice: purchasePrice,
            extraCost: extraCost,
            loanAmount: loanAmount,
            sellingPrice: sellingPrice,
            saleDate: saleDate,
            note: note.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
            configuration: configuration
        )
        await load(configuration: configuration)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    func setStatus(
        _ transaction: IpadTransaction,
        status: IpadStatus,
        sellingPrice: Double? = nil,
        saleDate: Date? = nil,
        configuration: SupabaseConfiguration
    ) async throws {
        try await client.updateIpadStatus(
            id: transaction.id,
            status: status,
            sellingPrice: status == .sold ? sellingPrice ?? transaction.sellingPrice : nil,
            saleDate: status == .sold ? saleDate ?? transaction.saleDate : nil,
            configuration: configuration
        )
        await load(configuration: configuration)
    }

    func toggleDebt(_ transaction: IpadTransaction, configuration: SupabaseConfiguration) async throws {
        try await client.updateIpadDebt(
            id: transaction.id,
            paid: !transaction.debtPaid,
            configuration: configuration
        )
        await load(configuration: configuration)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    func update(
        _ transaction: IpadTransaction,
        purchaseDate: Date,
        status: IpadStatus,
        purchasePrice: Double,
        extraCost: Double,
        loanAmount: Double,
        sellingPrice: Double?,
        saleDate: Date?,
        note: String,
        configuration: SupabaseConfiguration
    ) async throws {
        try await client.updateIpadTransaction(
            id: transaction.id,
            purchaseDate: purchaseDate,
            status: status,
            purchasePrice: purchasePrice,
            extraCost: extraCost,
            loanAmount: loanAmount,
            sellingPrice: sellingPrice,
            saleDate: saleDate,
            note: note.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
            configuration: configuration
        )
        await load(configuration: configuration)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    func delete(_ transaction: IpadTransaction, configuration: SupabaseConfiguration) async throws {
        try await client.deleteIpadTransaction(id: transaction.id, configuration: configuration)
        transactions.removeAll { $0.id == transaction.id }
    }

    static var currentMonthKey: String {
        monthKey(Date())
    }

    static func monthKey(_ date: Date) -> String {
        let components = Calendar.current.dateComponents([.year, .month], from: date)
        return String(format: "%04d-%02d", components.year ?? 0, components.month ?? 0)
    }

    static func monthTitle(_ key: String) -> String {
        guard key != "all" else { return "Tất cả" }
        let dashParts = key.split(separator: "-")
        guard dashParts.count == 2 else { return key }
        return "Tháng \(Int(dashParts[1]) ?? 0)/\(dashParts[0])"
    }

    private static func compareTransactions(_ left: IpadTransaction, _ right: IpadTransaction) -> Bool {
        if left.purchaseDate != right.purchaseDate {
            return left.purchaseDate > right.purchaseDate
        }
        if left.createdAt != right.createdAt {
            return left.createdAt > right.createdAt
        }
        return left.id.uuidString < right.id.uuidString
    }
}

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
