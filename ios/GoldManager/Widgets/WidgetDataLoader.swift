import AppIntents
import Foundation

// MARK: - Snapshot từng màn hình (view-model của widget)

/// Màn "Vàng": tổng tài sản, lợi nhuận và thông tin danh mục theo người sở hữu được chọn.
struct PortfolioWidgetSnapshot: Sendable {
    var totalChi: Double
    var currentValue: Double
    var totalInvested: Double
    var profit: Double
    var profitPercent: Double
    var marketPrice: Double
    var realizedProfit: Double
    var hasSold: Bool
    /// Tên người sở hữu đang lọc, `nil` khi xem tất cả.
    var ownerName: String?

    static let placeholder = PortfolioWidgetSnapshot(
        totalChi: 12.5,
        currentValue: 100_000_000,
        totalInvested: 86_500_000,
        profit: 13_500_000,
        profitPercent: 15.6,
        marketPrice: 8_000_000,
        realizedProfit: 4_200_000,
        hasSold: true,
        ownerName: nil
    )
}

/// Một khoản thu/chi rút gọn để hiển thị (và tương tác) trong widget lớn.
struct BudgetWidgetEntry: Sendable, Identifiable {
    let id: UUID
    let name: String
    let amount: Double
    let recordType: BudgetRecordType
    let isPaid: Bool
    let isSelected: Bool
}

/// Màn "Tính nợ": thu/chi và số dư còn lại của nguồn tiền đầu tiên trong tháng hiện tại.
struct BudgetWidgetSnapshot: Sendable {
    var sourceName: String
    var monthLabel: String
    var availableIncome: Double
    var totalExpenses: Double
    var remaining: Double
    var hasData: Bool
    var entries: [BudgetWidgetEntry]

    static let placeholder = BudgetWidgetSnapshot(
        sourceName: "Nguồn chính",
        monthLabel: "Tháng 6/2026",
        availableIncome: 25_000_000,
        totalExpenses: 18_400_000,
        remaining: 6_600_000,
        hasData: true,
        entries: [
            BudgetWidgetEntry(id: UUID(), name: "Lương", amount: 25_000_000,
                              recordType: .income, isPaid: true, isSelected: true),
            BudgetWidgetEntry(id: UUID(), name: "Tiền nhà", amount: 5_000_000,
                              recordType: .expense, isPaid: false, isSelected: true),
            BudgetWidgetEntry(id: UUID(), name: "Điện nước", amount: 1_200_000,
                              recordType: .expense, isPaid: false, isSelected: true),
            BudgetWidgetEntry(id: UUID(), name: "Ăn uống", amount: 3_000_000,
                              recordType: .expense, isPaid: false, isSelected: true),
            BudgetWidgetEntry(id: UUID(), name: "Internet", amount: 250_000,
                              recordType: .expense, isPaid: true, isSelected: true)
        ]
    )
}

/// Màn "Tích góp": tiến độ đóng tiền của toàn bộ các dây.
struct SavingsWidgetSnapshot: Sendable {
    var totalGoal: Double
    var totalPaid: Double
    var totalRemaining: Double
    var rowCount: Int
    var activeCount: Int

    /// Tỉ lệ hoàn thành (0...1).
    var progress: Double {
        totalGoal <= 0 ? 0 : min(1, max(0, totalPaid / totalGoal))
    }

    static let placeholder = SavingsWidgetSnapshot(
        totalGoal: 60_000_000,
        totalPaid: 38_000_000,
        totalRemaining: 22_000_000,
        rowCount: 5,
        activeCount: 3
    )
}

// MARK: - Tích góp (widget chi tiết: tổng quan + một dây được chọn)

/// Tổng quan một dây cho cột trái: nhãn và tiến độ đóng ô.
struct SavingsRowSummary: Sendable, Identifiable {
    let id: UUID
    let label: String
    let paidCount: Int
    let totalCells: Int
    let periodAmount: Double

    var isCompleted: Bool { totalCells > 0 && paidCount >= totalCells }
    var progress: Double {
        totalCells <= 0 ? 0 : min(1, max(0, Double(paidCount) / Double(totalCells)))
    }
}

/// Một ô của dây được chọn (cột phải).
struct SavingsCellInfo: Sendable, Identifiable {
    let number: Int        // 1-based
    let isPaid: Bool
    let paidAt: Date?
    var id: Int { number }
}

/// Dây được chọn để hiển thị chi tiết các ô ở cột phải.
struct SavingsDetailRow: Sendable {
    let id: UUID
    let label: String
    let periodAmount: Double
    let totalCells: Int
    let paidCount: Int
    let cells: [SavingsCellInfo]

    var remaining: Double { Double(max(0, totalCells - paidCount)) * periodAmount }
    var progress: Double {
        totalCells <= 0 ? 0 : min(1, max(0, Double(paidCount) / Double(totalCells)))
    }
}

/// Snapshot cho widget "Tích góp chi tiết": cột trái tổng quan mọi dây,
/// cột phải chi tiết các ô của dây người dùng chọn trong cài đặt widget.
struct SavingsDetailWidgetSnapshot: Sendable {
    var rows: [SavingsRowSummary]
    var totalGoal: Double
    var totalPaid: Double
    var selected: SavingsDetailRow?

    var totalProgress: Double {
        totalGoal <= 0 ? 0 : min(1, max(0, totalPaid / totalGoal))
    }

    static let placeholder = SavingsDetailWidgetSnapshot(
        rows: [
            SavingsRowSummary(id: UUID(), label: "Dây tháng 6", paidCount: 6,
                              totalCells: 10, periodAmount: 5_000_000),
            SavingsRowSummary(id: UUID(), label: "Dây Tết", paidCount: 3,
                              totalCells: 12, periodAmount: 2_000_000),
            SavingsRowSummary(id: UUID(), label: "Quỹ dự phòng", paidCount: 1,
                              totalCells: 20, periodAmount: 1_000_000),
            SavingsRowSummary(id: UUID(), label: "Mua xe", paidCount: 8,
                              totalCells: 8, periodAmount: 3_000_000)
        ],
        totalGoal: 110_000_000,
        totalPaid: 53_000_000,
        selected: SavingsDetailRow(
            id: UUID(),
            label: "Dây tháng 6",
            periodAmount: 5_000_000,
            totalCells: 10,
            paidCount: 6,
            cells: (1...10).map { SavingsCellInfo(number: $0, isPaid: $0 <= 6, paidAt: nil) }
        )
    )
}

/// Màn "iPad": vốn, doanh thu, lợi nhuận và công nợ của tháng hiện tại.
struct IpadWidgetSnapshot: Sendable {
    var monthLabel: String
    var totalCost: Double
    var totalRevenue: Double
    var totalProfit: Double
    var unpaidDebt: Double
    var count: Int

    static let placeholder = IpadWidgetSnapshot(
        monthLabel: "Tháng 6/2026",
        totalCost: 42_000_000,
        totalRevenue: 51_500_000,
        totalProfit: 9_500_000,
        unpaidDebt: 7_300_000,
        count: 6
    )
}

// MARK: - Cấu hình Supabase đọc từ Info.plist của widget

private enum WidgetConfig {
    static func current() -> SupabaseConfiguration {
        SupabaseConfiguration(
            projectURL: value("EXPO_PUBLIC_SUPABASE_URL"),
            anonKey: value("EXPO_PUBLIC_SUPABASE_ANON_KEY")
        )
    }

    private static func value(_ key: String) -> String {
        guard let raw = Bundle.main.object(forInfoDictionaryKey: key) as? String else { return "" }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.hasPrefix("$(") ? "" : trimmed
    }
}

// MARK: - Tiện ích tháng

private func monthKey(for date: Date) -> String {
    let components = Calendar.current.dateComponents([.year, .month], from: date)
    return String(format: "%04d-%02d", components.year ?? 0, components.month ?? 0)
}

private var currentMonthKey: String { monthKey(for: Date()) }

private func monthLabel(_ key: String) -> String {
    let parts = key.split(separator: "-")
    guard parts.count == 2 else { return key }
    return "Tháng \(Int(parts[1]) ?? 0)/\(parts[0])"
}

// MARK: - Tải dữ liệu cho widget (đọc trực tiếp từ Supabase)

/// Mỗi widget chỉ tải đúng phần dữ liệu nó cần. Trả về `nil` khi chưa cấu hình
/// hoặc lỗi mạng — widget sẽ hiển thị trạng thái "Mở app để cập nhật".
enum WidgetData {
    static func loadPortfolio(owner: GoldOwnerFilter = .all) async -> PortfolioWidgetSnapshot? {
        let config = WidgetConfig.current()
        guard config.isValid else { return nil }
        let client = SupabaseClient()
        do {
            async let loadedTransactions = client.fetchTransactions(configuration: config)
            async let loadedPrice = client.fetchMarketPrice(configuration: config)
            let allTransactions = try await loadedTransactions
            let marketPrice = try await loadedPrice

            // Lọc theo người sở hữu được chọn trong cài đặt widget.
            let transactions: [GoldTransaction]
            switch owner {
            case .all: transactions = allTransactions
            case .binh: transactions = allTransactions.filter { $0.owner == .binh }
            case .tu: transactions = allTransactions.filter { $0.owner == .tu }
            }

            let holdings = transactions.filter { !$0.isSold }
            let totalChi = holdings.reduce(0) { $0 + $1.amountChi }
            let totalInvested = holdings.reduce(0) { $0 + $1.cost }
            let currentValue = totalChi * marketPrice
            let profit = currentValue - totalInvested
            let sold = transactions.filter(\.isSold)
            let realized = sold.reduce(0) { $0 + ($1.realizedProfit ?? 0) }

            return PortfolioWidgetSnapshot(
                totalChi: totalChi,
                currentValue: currentValue,
                totalInvested: totalInvested,
                profit: profit,
                profitPercent: totalInvested == 0 ? 0 : profit / totalInvested * 100,
                marketPrice: marketPrice,
                realizedProfit: realized,
                hasSold: !sold.isEmpty,
                ownerName: owner.ownerName
            )
        } catch {
            return nil
        }
    }

    static func loadBudget() async -> BudgetWidgetSnapshot? {
        let config = WidgetConfig.current()
        guard config.isValid else { return nil }
        let client = SupabaseClient()
        let key = currentMonthKey
        do {
            let sources = try await client.fetchBudgetSources(configuration: config)
            guard let source = sources.first else {
                return BudgetWidgetSnapshot(
                    sourceName: "—", monthLabel: monthLabel(key),
                    availableIncome: 0, totalExpenses: 0, remaining: 0, hasData: false, entries: []
                )
            }
            // Chỉ đọc — không tạo mới tháng nếu chưa tồn tại.
            guard let month = try await client.fetchBudgetMonth(
                sourceId: source.id, monthKey: key, configuration: config
            ) else {
                return BudgetWidgetSnapshot(
                    sourceName: source.name, monthLabel: monthLabel(key),
                    availableIncome: 0, totalExpenses: 0, remaining: 0, hasData: false, entries: []
                )
            }
            let entries = try await client.fetchBudgetEntries(budgetId: month.id, configuration: config)
            let active = entries.filter { $0.isPaid || $0.isSelected }
            let recordIncome = active.filter { $0.recordType == .income }.reduce(0) { $0 + $1.amount }
            let totalExpenses = active.filter { $0.recordType == .expense }.reduce(0) { $0 + $1.amount }
            let availableIncome = month.totalIncome + recordIncome

            // Khoản chưa thanh toán nổi lên trên để tiện đánh dấu; giữ thứ tự tạo trong mỗi nhóm.
            let widgetEntries = entries
                .enumerated()
                .sorted { lhs, rhs in
                    if lhs.element.isPaid != rhs.element.isPaid { return !lhs.element.isPaid }
                    return lhs.offset < rhs.offset
                }
                .map { BudgetWidgetEntry(
                    id: $0.element.id,
                    name: $0.element.name,
                    amount: $0.element.amount,
                    recordType: $0.element.recordType,
                    isPaid: $0.element.isPaid,
                    isSelected: $0.element.isSelected
                ) }

            return BudgetWidgetSnapshot(
                sourceName: source.name,
                monthLabel: monthLabel(key),
                availableIncome: availableIncome,
                totalExpenses: totalExpenses,
                remaining: availableIncome - totalExpenses,
                hasData: true,
                entries: widgetEntries
            )
        } catch {
            return nil
        }
    }

    static func loadSavings() async -> SavingsWidgetSnapshot? {
        let config = WidgetConfig.current()
        guard config.isValid else { return nil }
        let client = SupabaseClient()
        do {
            let rows = try await client.fetchSavings(configuration: config)
            let totalGoal = rows.reduce(0) { $0 + Double($1.totalCells) * $1.periodAmount }
            let totalPaid = rows.reduce(0) { $0 + Double($1.completedCells.count) * $1.periodAmount }
            let active = rows.filter { !($0.totalCells > 0 && $0.completedCells.count >= $0.totalCells) }.count

            return SavingsWidgetSnapshot(
                totalGoal: totalGoal,
                totalPaid: totalPaid,
                totalRemaining: max(0, totalGoal - totalPaid),
                rowCount: rows.count,
                activeCount: active
            )
        } catch {
            return nil
        }
    }

    /// Tải dữ liệu cho widget "Tích góp chi tiết": tổng quan mọi dây + chi tiết ô
    /// của dây `selectedId`. Nếu chưa chọn (hoặc dây đã bị xóa) thì lấy dây đầu danh sách.
    static func loadSavingsDetail(selectedId: String?) async -> SavingsDetailWidgetSnapshot? {
        let config = WidgetConfig.current()
        guard config.isValid else { return nil }
        do {
            let rows = try await SupabaseClient().fetchSavings(configuration: config)
            let ordered = rows.sorted(by: savingsOrder)

            let summaries = ordered.map { row in
                SavingsRowSummary(
                    id: row.id,
                    label: row.label,
                    paidCount: row.completedCells.count,
                    totalCells: row.totalCells,
                    periodAmount: row.periodAmount
                )
            }
            let totalGoal = rows.reduce(0) { $0 + Double($1.totalCells) * $1.periodAmount }
            let totalPaid = rows.reduce(0) { $0 + Double($1.completedCells.count) * $1.periodAmount }

            let chosen = selectedId
                .flatMap { id in ordered.first { $0.id.uuidString == id } }
                ?? ordered.first

            let selected = chosen.map { row -> SavingsDetailRow in
                let completed = row.completedCells
                let cells: [SavingsCellInfo] = row.totalCells > 0
                    ? (1...row.totalCells).map { number in
                        SavingsCellInfo(
                            number: number,
                            isPaid: completed.contains(number),
                            paidAt: row.cellPaidAt[String(number)].flatMap(DateFormatters.parseISO8601)
                        )
                    }
                    : []
                return SavingsDetailRow(
                    id: row.id,
                    label: row.label,
                    periodAmount: row.periodAmount,
                    totalCells: row.totalCells,
                    paidCount: completed.count,
                    cells: cells
                )
            }

            return SavingsDetailWidgetSnapshot(
                rows: summaries,
                totalGoal: totalGoal,
                totalPaid: totalPaid,
                selected: selected
            )
        } catch {
            return nil
        }
    }

    static func loadIpad() async -> IpadWidgetSnapshot? {
        let config = WidgetConfig.current()
        guard config.isValid else { return nil }
        let client = SupabaseClient()
        let key = currentMonthKey
        do {
            let transactions = try await client.fetchIpadTransactions(configuration: config)
            let scoped = transactions.filter { monthKey(for: $0.purchaseDate) == key }

            return IpadWidgetSnapshot(
                monthLabel: monthLabel(key),
                totalCost: scoped.reduce(0) { $0 + $1.totalCost },
                totalRevenue: scoped.reduce(0) { $0 + ($1.status == .sold ? $1.sellingPrice ?? 0 : 0) },
                totalProfit: scoped.reduce(0) { $0 + ($1.status == .sold ? $1.profitAmount ?? 0 : 0) },
                unpaidDebt: scoped.reduce(0) { $0 + ($1.debtPaid ? 0 : $1.loanAmount) },
                count: scoped.count
            )
        } catch {
            return nil
        }
    }
}

// MARK: - Sắp xếp dây (đồng bộ với app: chưa xong trước, dây nhỏ trước, cũ trước)

private func savingsOrder(_ lhs: SavingsRow, _ rhs: SavingsRow) -> Bool {
    let lc = lhs.totalCells > 0 && lhs.completedCells.count >= lhs.totalCells
    let rc = rhs.totalCells > 0 && rhs.completedCells.count >= rhs.totalCells
    if lc != rc { return !lc }

    let lt = Double(lhs.totalCells) * lhs.periodAmount
    let rt = Double(rhs.totalCells) * rhs.periodAmount
    if lt != rt { return lt < rt }

    return lhs.createdAt < rhs.createdAt
}

// MARK: - Cấu hình widget Tích góp chi tiết (chọn dây)

/// Một dây tích góp dùng làm lựa chọn trong màn cài đặt widget.
struct SavingsRowEntity: AppEntity, Identifiable {
    let id: String
    let label: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation { "Dây tích góp" }
    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(label)") }

    static let defaultQuery = SavingsRowQuery()
}

/// Cấp danh sách dây cho bộ chọn của widget (đọc trực tiếp Supabase).
struct SavingsRowQuery: EntityQuery {
    func entities(for identifiers: [SavingsRowEntity.ID]) async throws -> [SavingsRowEntity] {
        try await allRows().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [SavingsRowEntity] {
        try await allRows()
    }

    private func allRows() async throws -> [SavingsRowEntity] {
        let config = WidgetConfig.current()
        guard config.isValid else { return [] }
        let rows = try await SupabaseClient().fetchSavings(configuration: config)
        return rows
            .sorted(by: savingsOrder)
            .map { SavingsRowEntity(id: $0.id.uuidString, label: $0.label) }
    }
}

/// Intent cấu hình: chọn dây để hiển thị chi tiết các ô ở cột phải.
struct SelectSavingsRowIntent: WidgetConfigurationIntent {
    static let title: LocalizedStringResource = "Chọn dây tích góp"
    static let description = IntentDescription("Chọn dây để xem chi tiết các ô bên phải widget.")

    @Parameter(title: "Dây tích góp")
    var row: SavingsRowEntity?

    init() {}
}

// MARK: - Cấu hình widget Vàng (chọn người sở hữu)

/// Bộ lọc người sở hữu cho widget "Vàng": tất cả, Bình hoặc Tú.
enum GoldOwnerFilter: String, AppEnum {
    case all
    case binh
    case tu

    /// Tên hiển thị, `nil` khi xem tất cả (không gắn nhãn người sở hữu).
    var ownerName: String? {
        switch self {
        case .all: nil
        case .binh: "Bình"
        case .tu: "Tú"
        }
    }

    static var typeDisplayRepresentation: TypeDisplayRepresentation { "Người sở hữu" }

    static var caseDisplayRepresentations: [GoldOwnerFilter: DisplayRepresentation] {
        [
            .all: "Tất cả",
            .binh: "Bình",
            .tu: "Tú"
        ]
    }
}

/// Intent cấu hình: chọn người sở hữu để lọc danh mục vàng.
struct SelectGoldOwnerIntent: WidgetConfigurationIntent {
    static let title: LocalizedStringResource = "Chọn người sở hữu"
    static let description = IntentDescription("Lọc danh mục vàng theo người sở hữu.")

    @Parameter(title: "Người sở hữu", default: .all)
    var owner: GoldOwnerFilter

    init() {}
}

// MARK: - Tương tác từ widget

/// Ghi cờ mới cho một khoản thu chi. Ghi thành công sẽ tự kích hoạt reload widget
/// qua SupabaseClient (xem `reloadWidgetsIfMutating`), không cần reload thủ công.
private func writeBudgetEntryFlags(entryId: String, isPaid: Bool, isSelected: Bool) async {
    let config = WidgetConfig.current()
    guard config.isValid, let id = UUID(uuidString: entryId) else { return }
    _ = try? await SupabaseClient().updateBudgetEntryFlags(
        id: id,
        isPaid: isPaid,
        isSelected: isSelected,
        configuration: config
    )
}

/// Chạm checkbox: bật/tắt trạng thái "đã thanh toán" (`is_paid`), giữ nguyên `is_selected`.
struct ToggleBudgetEntryPaidIntent: AppIntent {
    static let title: LocalizedStringResource = "Đánh dấu đã thanh toán"
    static var isDiscoverable: Bool { false }

    @Parameter(title: "Mã khoản") var entryId: String
    @Parameter(title: "Đang đã thanh toán") var isPaid: Bool
    @Parameter(title: "Đang được chọn") var isSelected: Bool

    init() {}

    init(entryId: UUID, isPaid: Bool, isSelected: Bool) {
        self.entryId = entryId.uuidString
        self.isPaid = isPaid
        self.isSelected = isSelected
    }

    func perform() async throws -> some IntentResult {
        await writeBudgetEntryFlags(entryId: entryId, isPaid: !isPaid, isSelected: isSelected)
        return .result()
    }
}

/// Chạm thân khoản: bật/tắt việc tính khoản vào ngân sách (`is_selected`), giữ nguyên `is_paid`.
struct ToggleBudgetEntrySelectedIntent: AppIntent {
    static let title: LocalizedStringResource = "Bật/tắt khoản thu chi"
    static var isDiscoverable: Bool { false }

    @Parameter(title: "Mã khoản") var entryId: String
    @Parameter(title: "Đang đã thanh toán") var isPaid: Bool
    @Parameter(title: "Đang được chọn") var isSelected: Bool

    init() {}

    init(entryId: UUID, isPaid: Bool, isSelected: Bool) {
        self.entryId = entryId.uuidString
        self.isPaid = isPaid
        self.isSelected = isSelected
    }

    func perform() async throws -> some IntentResult {
        await writeBudgetEntryFlags(entryId: entryId, isPaid: isPaid, isSelected: !isSelected)
        return .result()
    }
}

// MARK: - Định dạng tiền tệ dùng cho widget

extension Double {
    /// Tiền VND đầy đủ, ví dụ "12.345.678 ₫".
    var widgetVND: String {
        formatted(
            .currency(code: "VND")
                .locale(Locale(identifier: "vi_VN"))
                .precision(.fractionLength(0))
        )
    }

    /// Tiền VND rút gọn cho không gian hẹp: "1,2 tỷ", "12,5 tr", "850 N".
    var widgetCompactVND: String {
        let value = abs(self)
        let sign = self < 0 ? "-" : ""
        let vi = Locale(identifier: "vi_VN")
        func number(_ amount: Double, _ fraction: Int) -> String {
            amount.formatted(.number.locale(vi).precision(.fractionLength(0...fraction)))
        }
        switch value {
        case 1_000_000_000...:
            return "\(sign)\(number(value / 1_000_000_000, 2)) tỷ"
        case 1_000_000...:
            return "\(sign)\(number(value / 1_000_000, 1)) tr"
        case 1_000...:
            return "\(sign)\(number(value / 1_000, 0)) N"
        default:
            return "\(sign)\(number(value, 0))"
        }
    }

    /// Khối lượng vàng, ví dụ "12,5".
    var widgetGoldWeight: String {
        formatted(.number.locale(Locale(identifier: "vi_VN")).precision(.fractionLength(0...2)))
    }
}
