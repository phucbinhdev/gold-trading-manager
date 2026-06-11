import Foundation
import Observation
import UIKit

@MainActor
@Observable
final class SavingsStore {
    var rows: [SavingsRow] = []
    var state: LoadState = .idle
    var pendingIds = Set<UUID>()

    private let client = SupabaseClient()

    var totalGoal: Double {
        rows.reduce(0) { $0 + Double($1.totalCells) * $1.periodAmount }
    }

    var totalPaid: Double {
        rows.reduce(0) { $0 + Double($1.completedCells.count) * $1.periodAmount }
    }

    func load(configuration: SupabaseConfiguration) async {
        guard configuration.isValid else {
            state = .failed(APIError.notConfigured.localizedDescription)
            return
        }
        state = rows.isEmpty ? .loading : .loaded
        do {
            rows = try await client.fetchSavings(configuration: configuration)
            state = .loaded
        } catch is CancellationError {
            return
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    func add(
        label: String,
        periodAmount: Double,
        totalCells: Int,
        configuration: SupabaseConfiguration
    ) async throws {
        try await client.createSavings(
            label: label,
            periodAmount: periodAmount,
            totalCells: totalCells,
            configuration: configuration
        )
        await load(configuration: configuration)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    func toggleCell(
        row: SavingsRow,
        number: Int,
        configuration: SupabaseConfiguration
    ) async throws {
        guard !pendingIds.contains(row.id), (1...row.totalCells).contains(number) else { return }
        pendingIds.insert(row.id)
        defer { pendingIds.remove(row.id) }

        var updated = row
        var completed = row.completedCells
        let key = String(number)
        if completed.contains(number) {
            completed.remove(number)
            updated.cellPaidAt.removeValue(forKey: key)
            updated.cellNotes.removeValue(forKey: key)
        } else {
            completed.insert(number)
            updated.cellPaidAt[key] = DateFormatters.formatISO8601(Date())
        }
        apply(completed: completed, to: &updated)
        replace(updated)

        do {
            try await client.updateSavings(updated, configuration: configuration)
        } catch {
            replace(row)
            throw error
        }
        UISelectionFeedbackGenerator().selectionChanged()
    }

    func delete(_ row: SavingsRow, configuration: SupabaseConfiguration) async throws {
        try await client.deleteSavings(id: row.id, configuration: configuration)
        rows.removeAll { $0.id == row.id }
    }

    private func apply(completed: Set<Int>, to row: inout SavingsRow) {
        row.monthCells = Dictionary(uniqueKeysWithValues: completed.map { (String($0), true) })
        row.closedCount = completed.count
        row.periodsLeft = max(0, row.totalCells - completed.count)
        row.remainingAmount = Double(row.periodsLeft) * row.periodAmount
        row.closed = row.totalCells > 0 && completed.count >= row.totalCells
    }

    private func replace(_ row: SavingsRow) {
        guard let index = rows.firstIndex(where: { $0.id == row.id }) else { return }
        rows[index] = row
    }
}
