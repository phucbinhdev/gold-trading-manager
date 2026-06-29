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

    var sortedRows: [SavingsRow] {
        rows.sorted { left, right in
            let leftCompleted = isCompleted(left)
            let rightCompleted = isCompleted(right)

            if leftCompleted != rightCompleted {
                return !leftCompleted
            }

            let leftTotal = Double(left.totalCells) * left.periodAmount
            let rightTotal = Double(right.totalCells) * right.periodAmount
            if leftTotal != rightTotal {
                return leftTotal < rightTotal
            }

            return left.createdAt < right.createdAt
        }
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
        updated.applyCompletedCells(completed)
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

    private func isCompleted(_ row: SavingsRow) -> Bool {
        row.totalCells > 0 && row.completedCells.count >= row.totalCells
    }

    private func replace(_ row: SavingsRow) {
        guard let index = rows.firstIndex(where: { $0.id == row.id }) else { return }
        rows[index] = row
    }
}
