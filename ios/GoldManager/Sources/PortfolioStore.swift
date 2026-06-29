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
    /// Bộ lọc theo người sở hữu. `nil` = xem tất cả.
    var selectedOwner: GoldOwner?

    // MARK: Giá vàng BTMC (tự cập nhật mỗi ngày)

    /// Bảng giá trực tiếp từ BTMC, mỗi loại vàng một dòng.
    var liveQuotes: [GoldQuote] = []
    /// Loại vàng dùng để lấy giá tự động.
    var selectedQuoteName = PortfolioStore.defaultQuoteName
    /// Định giá theo giá mua vào hay giá bán ra của BTMC.
    var priceSide: GoldPriceSide = .buy
    /// Bật/tắt tự động điền giá BTMC mỗi ngày.
    var autoUpdateEnabled = true
    /// Đang tải bảng giá BTMC.
    var isFetchingQuotes = false

    /// Ngày (yyyy-MM-dd) gần nhất đã điền giá tự động — tránh ghi đè nhiều lần trong ngày.
    private var autoFilledDate: String?

    static let defaultQuoteName = "NHẪN TRÒN TRƠN (Vàng Rồng Thăng Long)"

    private enum SettingKey {
        static let price = "current_gold_price"
        static let quoteName = "gold_quote_name"
        static let side = "gold_price_side"
        static let auto = "gold_auto_update"
        static let autoDate = "gold_price_auto_date"
    }

    private let client = SupabaseClient()
    private let goldClient = BTMCGoldPriceClient()

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

    /// Giao dịch sau khi áp bộ lọc người sở hữu (vẫn gồm cả đã bán & chưa bán).
    var scopedTransactions: [GoldTransaction] {
        guard let selectedOwner else { return transactions }
        return transactions.filter { $0.owner == selectedOwner }
    }

    /// Vàng đang nắm giữ (chưa bán) trong phạm vi bộ lọc — cơ sở tính tổng tài sản.
    var holdings: [GoldTransaction] {
        scopedTransactions.filter { !$0.isSold }
    }

    /// Các giao dịch đã bán trong phạm vi bộ lọc.
    var soldTransactions: [GoldTransaction] {
        scopedTransactions.filter(\.isSold)
    }

    var totalChi: Double {
        holdings.reduce(0) { $0 + $1.amountChi }
    }

    var totalInvested: Double {
        holdings.reduce(0) { $0 + $1.cost }
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

    /// Tổng lợi nhuận đã chốt từ các giao dịch đã bán (trong phạm vi bộ lọc).
    var realizedProfit: Double {
        soldTransactions.reduce(0) { $0 + ($1.realizedProfit ?? 0) }
    }

    var hasSold: Bool { !soldTransactions.isEmpty }

    func load() async {
        guard configuration.isValid else {
            state = .failed(APIError.notConfigured.localizedDescription)
            return
        }
        state = transactions.isEmpty ? .loading : .loaded
        do {
            async let loadedTransactions = client.fetchTransactions(configuration: configuration)
            async let loadedSettings = client.fetchAppSettings(configuration: configuration)
            transactions = try await loadedTransactions
            applySettings(try await loadedSettings)
            state = .loaded
        } catch is CancellationError {
            return
        } catch {
            state = .failed(error.localizedDescription)
        }
        // Lấy giá BTMC theo kiểu "tốt nhất có thể": lỗi mạng không làm hỏng màn hình.
        await refreshLiveQuotes()
    }

    /// Áp dụng giá thị trường + cấu hình lấy giá đã lưu trong `app_settings`.
    private func applySettings(_ settings: [AppSetting]) {
        var map: [String: String] = [:]
        for setting in settings {
            if let value = setting.value { map[setting.key] = value }
        }
        if let value = map[SettingKey.price], let price = Double(value) {
            marketPrice = price
        }
        if let value = map[SettingKey.quoteName], !value.isEmpty {
            selectedQuoteName = value
        }
        if let value = map[SettingKey.side], let side = GoldPriceSide(rawValue: value) {
            priceSide = side
        }
        if let value = map[SettingKey.auto] {
            autoUpdateEnabled = (value == "1" || value == "true")
        }
        autoFilledDate = map[SettingKey.autoDate]
    }

    /// Tải bảng giá BTMC rồi tự điền giá hôm nay nếu cần.
    func refreshLiveQuotes() async {
        isFetchingQuotes = true
        do {
            let quotes = try await goldClient.fetchQuotes()
            if !quotes.isEmpty { liveQuotes = quotes }
        } catch {
            // Giữ nguyên giá đang có khi không lấy được bảng giá.
        }
        isFetchingQuotes = false
        await autoFillIfNeeded()
    }

    /// Danh sách tên loại vàng để chọn (luôn chứa loại đang chọn dù offline).
    var quoteNames: [String] {
        var names = liveQuotes.map(\.name)
        if !names.contains(selectedQuoteName) {
            names.insert(selectedQuoteName, at: 0)
        }
        return names
    }

    func quote(named name: String) -> GoldQuote? {
        liveQuotes.first { $0.name == name }
    }

    /// Giá BTMC theo loại vàng + kiểu định giá; `nil` nếu chưa có hoặc không hợp lệ.
    func livePrice(name: String, side: GoldPriceSide) -> Double? {
        guard let quote = quote(named: name) else { return nil }
        let price = quote.price(for: side)
        return price >= 1_000 ? price : nil
    }

    /// Giá BTMC ứng với cấu hình hiện tại.
    var currentLivePrice: Double? {
        livePrice(name: selectedQuoteName, side: priceSide)
    }

    /// Tự điền giá BTMC vào `current_gold_price` một lần mỗi ngày.
    private func autoFillIfNeeded() async {
        guard autoUpdateEnabled, let price = currentLivePrice else { return }
        let today = DateFormatters.formatDatabaseDay(Date())
        guard autoFilledDate != today else { return }
        do {
            try await client.upsertAppSettings(
                [SettingKey.price: String(format: "%.0f", price), SettingKey.autoDate: today],
                configuration: configuration
            )
            marketPrice = price
            autoFilledDate = today
        } catch {
            // Bỏ qua lỗi ghi — sẽ thử lại lần mở app sau.
        }
    }

    func add(
        amountChi: Double,
        pricePerChi: Double,
        date: Date,
        note: String,
        owner: GoldOwner
    ) async throws {
        let transaction = NewGoldTransaction(
            transactionDate: DateFormatters.formatDatabaseDay(date),
            amountChi: amountChi,
            pricePerChi: pricePerChi,
            note: note.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
            owner: owner.rawValue
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
        note: String,
        owner: GoldOwner
    ) async throws {
        let payload = NewGoldTransaction(
            transactionDate: DateFormatters.formatDatabaseDay(date),
            amountChi: amountChi,
            pricePerChi: pricePerChi,
            note: note.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
            owner: owner.rawValue
        )
        try await client.updateTransaction(
            id: transaction.id,
            transaction: payload,
            configuration: configuration
        )
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        await load()
    }

    /// Đánh dấu một giao dịch là đã bán (kèm ngày bán và giá bán mỗi chỉ).
    func markSold(
        _ transaction: GoldTransaction,
        soldDate: Date,
        soldPricePerChi: Double
    ) async throws {
        let payload = TransactionSoldPayload(
            isSold: true,
            soldDate: DateFormatters.formatDatabaseDay(soldDate),
            soldPricePerChi: soldPricePerChi
        )
        try await client.updateSoldStatus(
            id: transaction.id,
            payload: payload,
            configuration: configuration
        )
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        await load()
    }

    /// Bỏ đánh dấu đã bán, xoá luôn ngày bán & giá bán đã lưu.
    func clearSold(_ transaction: GoldTransaction) async throws {
        let payload = TransactionSoldPayload(
            isSold: false,
            soldDate: nil,
            soldPricePerChi: nil
        )
        try await client.updateSoldStatus(
            id: transaction.id,
            payload: payload,
            configuration: configuration
        )
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        await load()
    }

    /// Lưu giá thị trường thủ công + cấu hình lấy giá tự động từ màn hình chỉnh sửa.
    func saveMarketSettings(
        price: Double,
        quoteName: String,
        side: GoldPriceSide,
        autoUpdate: Bool
    ) async throws {
        // Đánh dấu hôm nay đã có giá để không tự ghi đè giá vừa nhập trong cùng ngày.
        let today = DateFormatters.formatDatabaseDay(Date())
        try await client.upsertAppSettings(
            [
                SettingKey.price: String(format: "%.0f", price),
                SettingKey.quoteName: quoteName,
                SettingKey.side: side.rawValue,
                SettingKey.auto: autoUpdate ? "1" : "0",
                SettingKey.autoDate: today
            ],
            configuration: configuration
        )
        marketPrice = price
        selectedQuoteName = quoteName
        priceSide = side
        autoUpdateEnabled = autoUpdate
        autoFilledDate = today
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

}

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
