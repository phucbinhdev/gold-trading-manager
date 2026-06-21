import Foundation
import Observation
import UIKit

@MainActor
@Observable
final class PortfolioStore {
    var transactions: [GoldTransaction] = []
    var marketPrice = 8_000_000.0
    var state: LoadState = .idle
    var configuration: SupabaseConfiguration

    private let client = SupabaseClient()

    init() {
        let environment = ProcessInfo.processInfo.environment
        configuration = SupabaseConfiguration(
            projectURL: Self.buildSetting("EXPO_PUBLIC_SUPABASE_URL")
                ?? environment["EXPO_PUBLIC_SUPABASE_URL"]
                ?? "",
            anonKey: Self.buildSetting("EXPO_PUBLIC_SUPABASE_ANON_KEY")
                ?? environment["EXPO_PUBLIC_SUPABASE_ANON_KEY"]
                ?? ""
        )
    }

    private static func buildSetting(_ key: String) -> String? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String else {
            return nil
        }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty || trimmed.hasPrefix("$(") ? nil : trimmed
    }

    var totalChi: Double {
        transactions.reduce(0) { $0 + $1.amountChi }
    }

    var totalInvested: Double {
        transactions.reduce(0) { $0 + $1.cost }
    }

    var currentValue: Double {
        totalChi * marketPrice
    }

    var profit: Double {
        currentValue - totalInvested
    }

    var profitPercent: Double {
        totalInvested == 0 ? 0 : profit / totalInvested * 100
    }

    func load() async {
        guard configuration.isValid else {
            state = .failed(APIError.notConfigured.localizedDescription)
            return
        }
        state = transactions.isEmpty ? .loading : .loaded
        do {
            async let loadedTransactions = client.fetchTransactions(configuration: configuration)
            async let loadedPrice = client.fetchMarketPrice(configuration: configuration)
            transactions = try await loadedTransactions
            marketPrice = try await loadedPrice
            state = .loaded
        } catch is CancellationError {
            return
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    func add(amountChi: Double, pricePerChi: Double, date: Date, note: String) async throws {
        let transaction = NewGoldTransaction(
            transactionDate: DateFormatters.formatDatabaseDay(date),
            amountChi: amountChi,
            pricePerChi: pricePerChi,
            note: note.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
        )
        try await client.addTransaction(transaction, configuration: configuration)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        await load()
    }

    func delete(_ transaction: GoldTransaction) async throws {
        try await client.deleteTransaction(id: transaction.id, configuration: configuration)
        transactions.removeAll { $0.id == transaction.id }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    func update(
        _ transaction: GoldTransaction,
        amountChi: Double,
        pricePerChi: Double,
        date: Date,
        note: String
    ) async throws {
        let payload = NewGoldTransaction(
            transactionDate: DateFormatters.formatDatabaseDay(date),
            amountChi: amountChi,
            pricePerChi: pricePerChi,
            note: note.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
        )
        try await client.updateTransaction(
            id: transaction.id,
            transaction: payload,
            configuration: configuration
        )
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        await load()
    }

    func saveMarketPrice(_ price: Double) async throws {
        try await client.updateMarketPrice(price, configuration: configuration)
        marketPrice = price
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

}

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
