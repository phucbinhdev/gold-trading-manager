import Foundation
import Observation
import UIKit

@MainActor
@Observable
final class IpadStore {
    var transactions: [IpadTransaction] = []
    var state: LoadState = .idle
    var statusFilter: IpadStatus?

    private let client = SupabaseClient()

    var visibleTransactions: [IpadTransaction] {
        guard let statusFilter else { return transactions }
        return transactions.filter { $0.status == statusFilter }
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
        note: String,
        configuration: SupabaseConfiguration
    ) async throws {
        try await client.createIpadTransaction(
            purchaseDate: purchaseDate,
            status: status,
            purchasePrice: purchasePrice,
            extraCost: extraCost,
            loanAmount: loanAmount,
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

    func delete(_ transaction: IpadTransaction, configuration: SupabaseConfiguration) async throws {
        try await client.deleteIpadTransaction(id: transaction.id, configuration: configuration)
        transactions.removeAll { $0.id == transaction.id }
    }
}

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
