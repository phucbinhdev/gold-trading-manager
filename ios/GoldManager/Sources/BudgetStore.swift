import Foundation
import Observation
import UIKit

@MainActor
@Observable
final class BudgetStore {
    var sources: [BudgetSource] = []
    var selectedSourceId: UUID?
    var month = Date()
    var budget: BudgetMonth?
    var entries: [BudgetEntry] = []
    var state: LoadState = .idle
    var pendingEntryIds = Set<UUID>()

    private let client = SupabaseClient()

    private static let cacheKey = "budget"

    private struct BudgetCache: Codable {
        var sources: [BudgetSource]
        var selectedSourceId: UUID?
        var monthKey: String
        var budget: BudgetMonth?
        var entries: [BudgetEntry]
    }

    init() {
        guard let cache = LocalCache.load(BudgetCache.self, key: Self.cacheKey) else { return }
        sources = cache.sources
        selectedSourceId = cache.selectedSourceId
        // Chỉ áp khoản thu/chi nếu cache đúng tháng đang xem.
        if cache.monthKey == monthKey {
            budget = cache.budget
            entries = cache.entries
        }
    }

    private func saveCache() {
        LocalCache.save(
            BudgetCache(
                sources: sources,
                selectedSourceId: selectedSourceId,
                monthKey: monthKey,
                budget: budget,
                entries: entries
            ),
            key: Self.cacheKey
        )
    }

    var selectedSource: BudgetSource? {
        sources.first { $0.id == selectedSourceId }
    }

    var monthKey: String {
        let components = Calendar.current.dateComponents([.year, .month], from: month)
        return String(format: "%04d-%02d", components.year ?? 0, components.month ?? 0)
    }

    var activeEntries: [BudgetEntry] {
        entries.filter { $0.isPaid || $0.isSelected }
    }

    var recordIncome: Double {
        activeEntries.filter { $0.recordType == .income }.reduce(0) { $0 + $1.amount }
    }

    var totalExpenses: Double {
        activeEntries.filter { $0.recordType == .expense }.reduce(0) { $0 + $1.amount }
    }

    var availableIncome: Double {
        (budget?.totalIncome ?? 0) + recordIncome
    }

    var remaining: Double {
        availableIncome - totalExpenses
    }

    func load(configuration: SupabaseConfiguration) async {
        guard configuration.isValid else {
            state = .failed(APIError.notConfigured.localizedDescription)
            return
        }
        state = entries.isEmpty ? .loading : .loaded
        do {
            var loadedSources = try await client.fetchBudgetSources(configuration: configuration)
            if loadedSources.isEmpty {
                loadedSources = [
                    try await client.createBudgetSource(
                        name: "Nguồn chính",
                        sortOrder: 0,
                        configuration: configuration
                    )
                ]
            }
            sources = loadedSources
            if selectedSourceId == nil || !loadedSources.contains(where: { $0.id == selectedSourceId }) {
                selectedSourceId = loadedSources.first?.id
            }
            try await loadSelectedMonth(configuration: configuration)
            state = .loaded
            saveCache()
        } catch is CancellationError {
            return
        } catch {
            state = sources.isEmpty ? .failed(error.localizedDescription) : .loaded
        }
    }

    func loadSelectedMonth(configuration: SupabaseConfiguration) async throws {
        guard let sourceId = selectedSourceId else {
            budget = nil
            entries = []
            return
        }
        let existingBudget = try await client.fetchBudgetMonth(
            sourceId: sourceId,
            monthKey: monthKey,
            configuration: configuration
        )
        let resolvedBudget: BudgetMonth
        if let existingBudget {
            resolvedBudget = existingBudget
        } else {
            resolvedBudget = try await client.createBudgetMonth(
                sourceId: sourceId,
                monthKey: monthKey,
                configuration: configuration
            )
        }
        budget = resolvedBudget
        entries = try await client.fetchBudgetEntries(
            budgetId: resolvedBudget.id,
            configuration: configuration
        )
    }

    func moveMonth(by value: Int, configuration: SupabaseConfiguration) async {
        month = Calendar.current.date(byAdding: .month, value: value, to: month) ?? month
        do {
            try await loadSelectedMonth(configuration: configuration)
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    func selectSource(_ id: UUID, configuration: SupabaseConfiguration) async {
        selectedSourceId = id
        do {
            try await loadSelectedMonth(configuration: configuration)
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    func setBaseIncome(_ amount: Double, configuration: SupabaseConfiguration) async throws {
        guard var budget else { return }
        try await client.updateBudgetIncome(
            id: budget.id,
            totalIncome: amount,
            configuration: configuration
        )
        budget.totalIncome = amount
        self.budget = budget
    }

    func addEntry(
        type: BudgetRecordType,
        name: String,
        amount: Double,
        note: String,
        configuration: SupabaseConfiguration
    ) async throws {
        guard let budget else { return }
        let entry = try await client.createBudgetEntry(
            budgetId: budget.id,
            type: type,
            name: name,
            amount: amount,
            note: note.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
            configuration: configuration
        )
        entries.append(entry)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    func toggleSelected(_ entry: BudgetEntry, configuration: SupabaseConfiguration) async throws {
        guard !entry.isPaid, !pendingEntryIds.contains(entry.id) else { return }
        pendingEntryIds.insert(entry.id)
        defer { pendingEntryIds.remove(entry.id) }

        var optimistic = entry
        optimistic.isSelected.toggle()
        replace(optimistic)

        do {
            let updated = try await client.updateBudgetEntryFlags(
                id: entry.id,
                isPaid: entry.isPaid,
                isSelected: optimistic.isSelected,
                configuration: configuration
            )
            replace(updated)
            UISelectionFeedbackGenerator().selectionChanged()
        } catch {
            replace(entry)
            throw error
        }
    }

    func togglePaid(_ entry: BudgetEntry, configuration: SupabaseConfiguration) async throws {
        guard !pendingEntryIds.contains(entry.id) else { return }
        pendingEntryIds.insert(entry.id)
        defer { pendingEntryIds.remove(entry.id) }

        var optimistic = entry
        optimistic.isPaid.toggle()
        replace(optimistic)

        do {
            let updated = try await client.updateBudgetEntryFlags(
                id: entry.id,
                isPaid: optimistic.isPaid,
                isSelected: entry.isSelected,
                configuration: configuration
            )
            replace(updated)
            if updated.isPaid {
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            } else {
                UISelectionFeedbackGenerator().selectionChanged()
            }
        } catch {
            replace(entry)
            throw error
        }
    }

    func updateEntry(
        _ entry: BudgetEntry,
        type: BudgetRecordType,
        name: String,
        amount: Double,
        note: String,
        configuration: SupabaseConfiguration
    ) async throws {
        let updated = try await client.updateBudgetEntry(
            id: entry.id,
            type: type,
            name: name,
            amount: amount,
            note: note.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
            configuration: configuration
        )
        replace(updated)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    func delete(_ entry: BudgetEntry, configuration: SupabaseConfiguration) async throws {
        try await client.deleteBudgetEntry(id: entry.id, configuration: configuration)
        entries.removeAll { $0.id == entry.id }
    }

    func addSource(name: String, configuration: SupabaseConfiguration) async throws {
        let source = try await client.createBudgetSource(
            name: name,
            sortOrder: sources.count,
            configuration: configuration
        )
        sources.append(source)
        await selectSource(source.id, configuration: configuration)
    }

    func renameSource(
        _ source: BudgetSource,
        name: String,
        configuration: SupabaseConfiguration
    ) async throws {
        let updated = try await client.updateBudgetSource(
            id: source.id,
            name: name,
            configuration: configuration
        )
        if let index = sources.firstIndex(where: { $0.id == source.id }) {
            sources[index] = updated
        }
    }

    func deactivateSource(
        _ source: BudgetSource,
        configuration: SupabaseConfiguration
    ) async throws {
        guard sources.count > 1 else { return }
        _ = try await client.updateBudgetSource(
            id: source.id,
            isActive: false,
            configuration: configuration
        )
        sources.removeAll { $0.id == source.id }
        if selectedSourceId == source.id {
            selectedSourceId = sources.first?.id
            try await loadSelectedMonth(configuration: configuration)
        }
    }

    func deactivateSelectedSource(configuration: SupabaseConfiguration) async throws {
        guard let selectedSource else { return }
        try await deactivateSource(selectedSource, configuration: configuration)
    }

    private func replace(_ entry: BudgetEntry) {
        guard let index = entries.firstIndex(where: { $0.id == entry.id }) else { return }
        entries[index] = entry
    }
}

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
