import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Timeline dùng chung

/// Một entry chứa snapshot tải từ Supabase. `data` là nil khi chưa cấu hình hoặc lỗi mạng.
private struct SnapshotEntry<Data>: TimelineEntry {
    let date: Date
    let data: Data?
}

/// Hộp bắc cầu completion (non-Sendable của WidgetKit) qua biên giới Task.
/// An toàn vì completion chỉ được gọi đúng một lần, không chia sẻ trạng thái biến đổi.
private struct SendableBox<T>: @unchecked Sendable {
    let value: T
}

/// Provider tổng quát: tải snapshot bất đồng bộ trực tiếp từ Supabase cho mọi widget.
private struct AsyncSnapshotProvider<Data: Sendable>: TimelineProvider {
    let placeholder: Data
    let loader: @Sendable () async -> Data?

    func placeholder(in context: Context) -> SnapshotEntry<Data> {
        SnapshotEntry(date: Date(), data: placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry<Data>) -> Void) {
        if context.isPreview {
            completion(SnapshotEntry(date: Date(), data: placeholder))
            return
        }
        let loader = self.loader
        let box = SendableBox(value: completion)
        Task {
            let data = await loader()
            box.value(SnapshotEntry(date: Date(), data: data))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry<Data>>) -> Void) {
        let loader = self.loader
        let box = SendableBox(value: completion)
        Task {
            let data = await loader()
            // Làm mới định kỳ ~30 phút; WidgetKit có thể giãn theo ngân sách hệ thống.
            let next = Date().addingTimeInterval(60 * 30)
            box.value(Timeline(entries: [SnapshotEntry(date: Date(), data: data)], policy: .after(next)))
        }
    }
}

/// Provider tổng quát cho widget có cấu hình (AppIntent): tải snapshot theo lựa chọn của người dùng.
private struct AsyncIntentSnapshotProvider<Intent: WidgetConfigurationIntent, Data: Sendable>: AppIntentTimelineProvider {
    let placeholder: Data
    let loader: @Sendable (Intent) async -> Data?

    func placeholder(in context: Context) -> SnapshotEntry<Data> {
        SnapshotEntry(date: Date(), data: placeholder)
    }

    func snapshot(for configuration: Intent, in context: Context) async -> SnapshotEntry<Data> {
        if context.isPreview {
            return SnapshotEntry(date: Date(), data: placeholder)
        }
        return SnapshotEntry(date: Date(), data: await loader(configuration))
    }

    func timeline(for configuration: Intent, in context: Context) async -> Timeline<SnapshotEntry<Data>> {
        let data = await loader(configuration)
        let next = Date().addingTimeInterval(60 * 30)
        return Timeline(entries: [SnapshotEntry(date: Date(), data: data)], policy: .after(next))
    }
}

// MARK: - Khung nền dùng chung

private struct WidgetChrome<Content: View>: View {
    let colors: [Color]
    @ViewBuilder var content: Content

    var body: some View {
        content
            .containerBackground(for: .widget) {
                LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
            }
    }
}

/// Hàng tiêu đề: biểu tượng + tên màn + phụ đề.
private struct WidgetHeader: View {
    let systemImage: String
    let title: String
    var subtitle: String?

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: systemImage)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 26, height: 26)
                .background(.white.opacity(0.22), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
            Text(title)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
            Spacer(minLength: 0)
            if let subtitle {
                Text(subtitle)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.85))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
    }
}

/// Số liệu lớn dạng "nhãn nhỏ ở trên, giá trị to ở dưới".
private struct HeroStat: View {
    let label: String
    let value: String
    var valueColor: Color = .white
    var valueFont: Font = .system(.title2, design: .rounded, weight: .heavy)

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.white.opacity(0.8))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Text(value)
                .font(valueFont)
                .foregroundStyle(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
    }
}

/// Ô số liệu nhỏ trên nền mờ.
private struct MiniStat: View {
    let label: String
    let value: String
    var valueColor: Color = .white
    var systemImage: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white.opacity(0.75))
                }
                Text(label)
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.75))
                    .lineLimit(1)
            }
            Text(value)
                .font(.system(.footnote, design: .rounded, weight: .bold))
                .foregroundStyle(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 8)
        .padding(.vertical, 7)
        .background(.white.opacity(0.16), in: RoundedRectangle(cornerRadius: 11, style: .continuous))
    }
}

/// Hiển thị khi app chưa từng đồng bộ dữ liệu.
private struct WidgetEmptyState: View {
    let systemImage: String
    let title: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: systemImage)
                .font(.title2.weight(.bold))
                .foregroundStyle(.white)
            Text(title)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
            Text("Mở app để cập nhật")
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.8))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .multilineTextAlignment(.center)
    }
}

// MARK: - Bảng màu & deep link

private enum WidgetPalette {
    static let portfolio = [Color(red: 0.85, green: 0.6, blue: 0.05), Color(red: 0.93, green: 0.42, blue: 0.07)]
    static let budget = [Color.indigo, Color.purple]
    static let savings = [Color(red: 0.07, green: 0.62, blue: 0.42), Color(red: 0.02, green: 0.55, blue: 0.6)]
    static let ipad = [Color(red: 0.16, green: 0.45, blue: 0.9), Color(red: 0.13, green: 0.66, blue: 0.55)]
}

private func tabURL(_ tab: String) -> URL {
    URL(string: "goldmanager://tab/\(tab)")!
}

// MARK: - Widget Vàng

private struct PortfolioWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry<PortfolioWidgetSnapshot>

    /// Màu tươi để đọc rõ trên nền gradient vàng cam.
    private let gainColor = Color(red: 0.45, green: 0.96, blue: 0.55)
    private let lossColor = Color(red: 1.0, green: 0.56, blue: 0.5)

    var body: some View {
        WidgetChrome(colors: WidgetPalette.portfolio) {
            if let data = entry.data {
                content(data)
            } else {
                WidgetEmptyState(systemImage: "chart.pie.fill", title: "Vàng")
            }
        }
        .widgetURL(tabURL("portfolio"))
    }

    @ViewBuilder
    private func content(_ data: PortfolioWidgetSnapshot) -> some View {
        if family == .systemSmall {
            smallContent(data)
        } else {
            mediumContent(data)
        }
    }

    /// Dòng đầu mảnh: biểu tượng + người sở hữu + số chỉ đang sở hữu (thay cho tiêu đề "Vàng").
    private func ownerLine(_ data: PortfolioWidgetSnapshot) -> some View {
        HStack(spacing: 5) {
            Image(systemName: "chart.pie.fill")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.white.opacity(0.9))
            Text("\(data.ownerName ?? "Tất cả") · \(data.totalChi.widgetGoldWeight) chỉ")
                .font(.system(size: 11.5, weight: .bold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
    }

    /// Dòng giá thị trường mảnh (thay cho hộp MiniStat để tiết kiệm chiều cao).
    private func priceLine(_ data: PortfolioWidgetSnapshot) -> some View {
        HStack(spacing: 4) {
            Image(systemName: "tag.fill")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(.white.opacity(0.8))
            Text("Giá TT \(data.marketPrice.widgetCompactVND)/chỉ")
                .font(.system(size: 10.5, weight: .semibold))
                .foregroundStyle(.white.opacity(0.9))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
    }

    // MARK: Small — số liệu cốt lõi + thanh tăng trưởng ngang

    private func smallContent(_ data: PortfolioWidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            ownerLine(data)

            HeroStat(label: "Tổng tài sản", value: data.currentValue.widgetCompactVND,
                     valueFont: .system(.title3, design: .rounded, weight: .heavy))

            profitPill(data)

            Spacer(minLength: 0)

            growthBar(data)

            priceLine(data)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    // MARK: Medium — số liệu bên trái, biểu đồ cột so sánh bên phải

    private func mediumContent(_ data: PortfolioWidgetSnapshot) -> some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 6) {
                ownerLine(data)

                HeroStat(label: "Tổng tài sản", value: data.currentValue.widgetCompactVND)

                profitPill(data)

                Spacer(minLength: 0)

                priceLine(data)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            barChart(data)
                .frame(width: 112)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    // MARK: Biểu đồ

    /// Thanh ngang (cỡ small): nền là phần chung Vốn ↔ Giá trị, đuôi là phần lời (xanh) / lỗ (đỏ).
    private func growthBar(_ data: PortfolioWidgetSnapshot) -> some View {
        let invested = max(0, data.totalInvested)
        let current = max(0, data.currentValue)
        let total = max(invested, current, 1)
        let baseFrac = min(invested, current) / total
        let deltaFrac = abs(current - invested) / total
        let gain = data.profit >= 0

        return GeometryReader { geo in
            let w = geo.size.width
            HStack(spacing: 2) {
                Capsule().fill(.white)
                    .frame(width: max(3, w * CGFloat(baseFrac)))
                Capsule().fill(gain ? gainColor : lossColor)
                    .frame(width: max(3, w * CGFloat(deltaFrac)))
            }
            .frame(maxHeight: .infinity, alignment: .center)
        }
        .frame(height: 9)
    }

    /// Hai cột dọc (cỡ medium): Vốn vs Hiện tại; chênh lệch là cap màu lời/lỗ trên đỉnh cột cao hơn.
    private func barChart(_ data: PortfolioWidgetSnapshot) -> some View {
        let invested = max(0, data.totalInvested)
        let current = max(0, data.currentValue)
        let maxVal = max(invested, current, 1)
        let gain = data.profit >= 0

        return HStack(alignment: .bottom, spacing: 12) {
            verticalBar(
                caption: "Vốn",
                valueLabel: data.totalInvested.widgetCompactVND,
                totalFraction: invested / maxVal,
                capFraction: gain ? 0 : (invested - current) / maxVal,
                capColor: lossColor,
                baseColor: .white.opacity(0.42)
            )
            verticalBar(
                caption: "Hiện tại",
                valueLabel: data.currentValue.widgetCompactVND,
                totalFraction: current / maxVal,
                capFraction: gain ? (current - invested) / maxVal : 0,
                capColor: gainColor,
                baseColor: .white.opacity(0.92)
            )
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func verticalBar(caption: String, valueLabel: String,
                             totalFraction: Double, capFraction: Double,
                             capColor: Color, baseColor: Color) -> some View {
        VStack(spacing: 5) {
            Text(valueLabel)
                .font(.system(size: 10, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.55)

            GeometryReader { geo in
                let h = geo.size.height
                let capH = max(0, h * CGFloat(capFraction))
                let baseH = max(0, h * CGFloat(totalFraction) - capH)
                ZStack(alignment: .bottom) {
                    RoundedRectangle(cornerRadius: 7, style: .continuous)
                        .fill(.white.opacity(0.14))
                    VStack(spacing: 0) {
                        if capH > 0 {
                            Rectangle().fill(capColor).frame(height: capH)
                        }
                        Rectangle().fill(baseColor).frame(height: baseH)
                    }
                    .frame(height: capH + baseH)
                    .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                }
            }
            .frame(maxWidth: .infinity)

            Text(caption)
                .font(.system(size: 9.5, weight: .semibold))
                .foregroundStyle(.white.opacity(0.85))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
    }

    // MARK: Pill lợi nhuận

    private func profitPill(_ data: PortfolioWidgetSnapshot) -> some View {
        HStack(spacing: 5) {
            Image(systemName: data.profit >= 0 ? "arrow.up.right" : "arrow.down.right")
                .font(.caption2.bold())
            Text(signed(data.profit))
                .font(.footnote.weight(.bold))
            Text("(\(data.profit >= 0 ? "+" : "")\(data.profitPercent.formatted(.number.precision(.fractionLength(1))))%)")
                .font(.caption2.weight(.semibold))
                .opacity(0.9)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(profitColor(data.profit).opacity(0.45), in: Capsule())
    }

    private func signed(_ value: Double) -> String {
        "\(value >= 0 ? "+" : "")\(value.widgetCompactVND)"
    }

    private func profitColor(_ value: Double) -> Color {
        value >= 0 ? Color(red: 0.1, green: 0.55, blue: 0.2) : Color(red: 0.7, green: 0.1, blue: 0.1)
    }
}

private struct PortfolioWidget: Widget {
    let kind = "GoldManagerPortfolioWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: SelectGoldOwnerIntent.self,
            provider: AsyncIntentSnapshotProvider(
                placeholder: PortfolioWidgetSnapshot.placeholder,
                loader: { (intent: SelectGoldOwnerIntent) in
                    await WidgetData.loadPortfolio(owner: intent.owner)
                }
            )
        ) { entry in
            PortfolioWidgetView(entry: entry)
        }
        .configurationDisplayName("Vàng")
        .description("Tổng tài sản và lợi nhuận danh mục vàng theo người sở hữu.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Widget Tính nợ

private struct BudgetWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry<BudgetWidgetSnapshot>

    /// Mọi cỡ "lớn" (Large, Extra Large, và cỡ dọc lớn Extra Large Portrait của iOS 27)
    /// dùng chung layout danh sách tương tác; small/medium chỉ hiện tổng quan.
    private var isLargeFamily: Bool {
        if family == .systemLarge || family == .systemExtraLarge { return true }
        if #available(iOS 27.0, *) {
            if family == .systemExtraLargePortrait { return true }
        }
        return false
    }

    var body: some View {
        WidgetChrome(colors: WidgetPalette.budget) {
            if let data = entry.data, data.hasData {
                if isLargeFamily {
                    largeContent(data)
                } else {
                    compactContent(data)
                }
            } else {
                WidgetEmptyState(systemImage: "list.bullet.clipboard.fill", title: "Tính nợ")
            }
        }
        .widgetURL(tabURL("budget"))
    }

    // MARK: small / medium — chỉ tổng quan

    @ViewBuilder
    private func compactContent(_ data: BudgetWidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: family == .systemSmall ? 8 : 10) {
            WidgetHeader(systemImage: "list.bullet.clipboard.fill", title: "Tính nợ",
                         subtitle: data.monthLabel)

            HeroStat(label: "Còn lại · \(data.sourceName)",
                     value: data.remaining.widgetCompactVND,
                     valueColor: data.remaining >= 0 ? .white : Color(red: 1, green: 0.85, blue: 0.85))

            HStack(spacing: 8) {
                MiniStat(label: "Tổng thu", value: "+\(data.availableIncome.widgetCompactVND)")
                MiniStat(label: "Dự kiến chi", value: "-\(data.totalExpenses.widgetCompactVND)")
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    // MARK: large — 1/3 tổng quan + 2/3 danh sách tương tác

    private func largeContent(_ data: BudgetWidgetSnapshot) -> some View {
        GeometryReader { proxy in
            let spacing: CGFloat = 12
            let summaryHeight = proxy.size.height / 3
            let listHeight = proxy.size.height - summaryHeight - spacing
            VStack(spacing: spacing) {
                summarySection(data)
                    .frame(height: summaryHeight, alignment: .top)
                listSection(data, maxRows: rowCapacity(for: listHeight))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
        }
    }

    /// Số hàng vừa khít chiều cao danh sách — để widget lấp đầy mọi cỡ thay vì cố định cứng.
    private func rowCapacity(for height: CGFloat) -> Int {
        let headerHeight: CGFloat = 24   // tiêu đề "KHOẢN THU CHI"
        let rowHeight: CGFloat = 43      // mỗi hàng + khoảng cách
        return max(3, Int((height - headerHeight) / rowHeight))
    }

    private func summarySection(_ data: BudgetWidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(systemImage: "list.bullet.clipboard.fill", title: "Tính nợ",
                         subtitle: "\(data.sourceName) · \(data.monthLabel)")

            HStack(spacing: 8) {
                summaryColumn(label: "Thu", value: "+\(data.availableIncome.widgetCompactVND)",
                              valueColor: Color(red: 0.78, green: 1, blue: 0.85))
                summaryColumn(label: "Chi", value: "-\(data.totalExpenses.widgetCompactVND)",
                              valueColor: .white)
                summaryColumn(label: "Còn lại", value: data.remaining.widgetCompactVND,
                              valueColor: data.remaining >= 0 ? .white : Color(red: 1, green: 0.82, blue: 0.82),
                              emphasized: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func summaryColumn(label: String, value: String,
                               valueColor: Color, emphasized: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.white.opacity(0.8))
                .lineLimit(1)
            Text(value)
                .font(.system(.title3, design: .rounded, weight: .heavy))
                .foregroundStyle(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 9)
        .background(.white.opacity(emphasized ? 0.26 : 0.14),
                    in: RoundedRectangle(cornerRadius: 13, style: .continuous))
    }

    @ViewBuilder
    private func listSection(_ data: BudgetWidgetSnapshot, maxRows: Int) -> some View {
        let paidCount = data.entries.filter(\.isPaid).count

        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Text("KHOẢN THU CHI")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.white.opacity(0.75))
                Spacer()
                Text("\(paidCount)/\(data.entries.count) đã xong")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.75))
            }

            if data.entries.isEmpty {
                Text("Chưa có khoản thu chi")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.8))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            } else {
                ForEach(data.entries.prefix(maxRows)) { entry in
                    entryRow(entry)
                }
                if data.entries.count > maxRows {
                    Text("+\(data.entries.count - maxRows) khoản khác")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.7))
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.top, 1)
                }
                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, alignment: .top)
    }

    private func entryRow(_ entry: BudgetWidgetEntry) -> some View {
        // Khoản bị tắt (không tính) khi chưa thanh toán và không được chọn.
        let isDimmed = !entry.isPaid && !entry.isSelected

        return HStack(spacing: 10) {
            // Vùng chạm 1 — checkbox: bật/tắt đã thanh toán.
            Button(intent: ToggleBudgetEntryPaidIntent(
                entryId: entry.id, isPaid: entry.isPaid, isSelected: entry.isSelected
            )) {
                Image(systemName: entry.isPaid ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 19, weight: .bold))
                    .foregroundStyle(.white)
                    .opacity(entry.isPaid ? 1 : 0.9)
            }
            .buttonStyle(.plain)

            // Vùng chạm 2 — thân khoản: bật/tắt tính vào ngân sách.
            Button(intent: ToggleBudgetEntrySelectedIntent(
                entryId: entry.id, isPaid: entry.isPaid, isSelected: entry.isSelected
            )) {
                HStack(spacing: 6) {
                    Text(entry.name)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .strikethrough(entry.isPaid, color: .white.opacity(0.7))
                        .lineLimit(1)

                    Spacer(minLength: 4)

                    Text("\(entry.recordType == .income ? "+" : "-")\(entry.amount.widgetCompactVND)")
                        .font(.subheadline.weight(.bold).monospacedDigit())
                        .foregroundStyle(entry.recordType == .income
                                         ? Color(red: 0.78, green: 1, blue: 0.85) : .white)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .opacity(isDimmed ? 0.45 : 1)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 11)
        .padding(.vertical, 8)
        .background(rowBackground(for: entry),
                    in: RoundedRectangle(cornerRadius: 11, style: .continuous))
    }

    /// Nền hàng phản ánh trạng thái: đã thanh toán mờ nhẹ, đang chọn rõ, bị tắt rất nhạt.
    private func rowBackground(for entry: BudgetWidgetEntry) -> Color {
        if entry.isPaid { return .white.opacity(0.12) }
        if entry.isSelected { return .white.opacity(0.20) }
        return .white.opacity(0.06)
    }
}

private struct BudgetWidget: Widget {
    let kind = "GoldManagerBudgetWidget"

    var body: some WidgetConfiguration {
        // iOS 27 bổ sung cỡ dọc lớn (Extra Large Portrait) — thêm khi máy hỗ trợ.
        var families: [WidgetFamily] = [.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge]
        if #available(iOS 27.0, *) {
            families.append(.systemExtraLargePortrait)
        }

        return StaticConfiguration(
            kind: kind,
            provider: AsyncSnapshotProvider(placeholder: BudgetWidgetSnapshot.placeholder,
                                            loader: { await WidgetData.loadBudget() })
        ) { entry in
            BudgetWidgetView(entry: entry)
        }
        .configurationDisplayName("Tính nợ")
        .description("Thu chi, số dư còn lại và danh sách khoản thu chi tương tác trong tháng.")
        .supportedFamilies(families)
    }
}

// MARK: - Widget Tích góp

private struct SavingsWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry<SavingsWidgetSnapshot>

    var body: some View {
        WidgetChrome(colors: WidgetPalette.savings) {
            if let data = entry.data {
                content(data)
            } else {
                WidgetEmptyState(systemImage: "banknote.fill", title: "Tích góp")
            }
        }
        .widgetURL(tabURL("savings"))
    }

    @ViewBuilder
    private func content(_ data: SavingsWidgetSnapshot) -> some View {
        if family == .systemSmall {
            VStack(alignment: .leading, spacing: 10) {
                WidgetHeader(systemImage: "banknote.fill", title: "Tích góp",
                             subtitle: "\(data.rowCount) dây")
                Spacer(minLength: 0)
                progressRing(data)
                    .frame(maxWidth: .infinity, alignment: .center)
                Spacer(minLength: 0)
                Label("Đã góp \(data.totalPaid.widgetCompactVND)",
                      systemImage: "checkmark.circle.fill")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            HStack(spacing: 16) {
                progressRing(data)
                VStack(alignment: .leading, spacing: 8) {
                    WidgetHeader(systemImage: "banknote.fill", title: "Tích góp",
                                 subtitle: "\(data.activeCount)/\(data.rowCount) dây")
                    HStack(spacing: 8) {
                        MiniStat(label: "Đã góp", value: data.totalPaid.widgetCompactVND,
                                 systemImage: "checkmark.circle.fill")
                        MiniStat(label: "Còn lại", value: data.totalRemaining.widgetCompactVND,
                                 systemImage: "hourglass")
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func progressRing(_ data: SavingsWidgetSnapshot) -> some View {
        ZStack {
            Circle().stroke(.white.opacity(0.25), lineWidth: 9)
            Circle()
                .trim(from: 0, to: max(0.001, data.progress))
                .stroke(.white, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\((data.progress * 100).formatted(.number.precision(.fractionLength(0))))%")
                .font(.system(.headline, design: .rounded, weight: .heavy))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.6)
        }
        .frame(width: family == .systemSmall ? 78 : 88, height: family == .systemSmall ? 78 : 88)
    }
}

private struct SavingsWidget: Widget {
    let kind = "GoldManagerSavingsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: AsyncSnapshotProvider(placeholder: SavingsWidgetSnapshot.placeholder,
                                            loader: { await WidgetData.loadSavings() })
        ) { entry in
            SavingsWidgetView(entry: entry)
        }
        .configurationDisplayName("Tích góp")
        .description("Tiến độ đóng tiền của các dây tích góp.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Widget Tích góp chi tiết (tổng quan trái + ô của dây được chọn bên phải)

private struct SavingsDetailWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry<SavingsDetailWidgetSnapshot>

    var body: some View {
        WidgetChrome(colors: WidgetPalette.savings) {
            if let data = entry.data, !data.rows.isEmpty {
                content(data)
            } else {
                WidgetEmptyState(systemImage: "square.grid.2x2.fill", title: "Tích góp")
            }
        }
        .widgetURL(tabURL("savings"))
    }

    private func content(_ data: SavingsDetailWidgetSnapshot) -> some View {
        GeometryReader { proxy in
            HStack(spacing: 11) {
                overviewColumn(data, size: CGSize(width: proxy.size.width * 0.40,
                                                  height: proxy.size.height))
                    .frame(width: proxy.size.width * 0.40, alignment: .top)

                Divider().overlay(Color.white.opacity(0.22))

                detailColumn(data, size: CGSize(width: proxy.size.width * 0.55,
                                                height: proxy.size.height))
                    .frame(maxWidth: .infinity, alignment: .topLeading)
            }
        }
    }

    // MARK: Cột trái — tiến độ dạng vòng lồng nhau (ngoài: tất cả dây · trong: dây được chọn)

    /// Màu nhấn vàng ấm cho vòng ngoài (toàn bộ dây); vòng trong (dây được chọn) dùng trắng.
    private let outerRingColor = Color(red: 1.0, green: 0.84, blue: 0.42)

    private func overviewColumn(_ data: SavingsDetailWidgetSnapshot, size: CGSize) -> some View {
        let outer = data.totalProgress
        let inner = data.selected?.progress ?? 0
        let completed = data.rows.filter(\.isCompleted).count
        let diameter = max(56, min(size.width, size.height - 44))

        return VStack(spacing: 8) {
            Spacer(minLength: 0)

            savingsRings(outer: outer, inner: inner, diameter: diameter)

            Spacer(minLength: 0)

            VStack(spacing: 5) {
                ringLegend(color: outerRingColor,
                           label: "Tất cả \(completed)/\(data.rows.count) dây",
                           value: percent(outer))
                ringLegend(color: .white,
                           label: data.selected?.label ?? "Chưa chọn dây",
                           value: percent(inner))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    /// Hai vòng đồng tâm kiểu app Sức khỏe: vòng ngoài là tiến độ toàn bộ các dây,
    /// vòng trong là tiến độ của dây được chọn.
    private func savingsRings(outer: Double, inner: Double, diameter: CGFloat) -> some View {
        let lineWidth = max(7, diameter * 0.14)
        let innerInset = lineWidth + 4

        return ZStack {
            Circle().stroke(outerRingColor.opacity(0.25), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: max(0.001, min(1, outer)))
                .stroke(outerRingColor, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))

            Circle().stroke(.white.opacity(0.25), lineWidth: lineWidth)
                .padding(innerInset)
            Circle()
                .trim(from: 0, to: max(0.001, min(1, inner)))
                .stroke(.white, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .padding(innerInset)
        }
        .frame(width: diameter, height: diameter)
    }

    /// Một dòng chú thích cho mỗi vòng: chấm màu + nhãn + phần trăm.
    private func ringLegend(color: Color, label: String, value: String) -> some View {
        HStack(spacing: 5) {
            Circle().fill(color).frame(width: 7, height: 7)
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.white.opacity(0.9))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Spacer(minLength: 3)
            Text(value)
                .font(.system(size: 10, weight: .bold).monospacedDigit())
                .foregroundStyle(.white)
        }
    }

    private func percent(_ value: Double) -> String {
        "\(Int((value * 100).rounded()))%"
    }

    // MARK: Cột phải — chi tiết ô của dây được chọn

    @ViewBuilder
    private func detailColumn(_ data: SavingsDetailWidgetSnapshot, size: CGSize) -> some View {
        if let sel = data.selected, sel.totalCells > 0 {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Text("\(sel.paidCount)/\(sel.totalCells) ô")
                        .font(.system(size: 14, weight: .heavy).monospacedDigit())
                        .foregroundStyle(.white)
                    Spacer(minLength: 2)
                    Text(sel.remaining > 0 ? "Còn \(sel.remaining.widgetCompactVND)" : "Hoàn tất")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.white.opacity(0.9))
                }

                cellsGrid(sel, size: size)
            }
        } else {
            VStack(spacing: 6) {
                Image(systemName: "hand.tap.fill")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(.white)
                Text("Chọn dây để xem chi tiết ô")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.9))
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func cellsGrid(_ sel: SavingsDetailRow, size: CGSize) -> some View {
        let metrics = cellMetrics
        let spacing = metrics.spacing
        let maxRows = 3
        // Chiều cao dành cho lưới (trừ header cột phải 1 dòng + dòng "+N ô").
        let gridHeight = max(60, size.height - 40)
        // Cạnh ô co lại nếu cần để 3 hàng luôn vừa, nhưng không lớn hơn cỡ chuẩn của family.
        let side = min(metrics.size,
                       (gridHeight - spacing * CGFloat(maxRows - 1)) / CGFloat(maxRows))
        let columns = max(1, Int((size.width + spacing) / (side + spacing)))
        let capacity = max(columns, columns * maxRows)
        let visible = Array(sel.cells.prefix(capacity))
        let overflow = sel.cells.count - visible.count

        return VStack(alignment: .leading, spacing: spacing) {
            LazyVGrid(
                columns: Array(repeating: GridItem(.fixed(side), spacing: spacing), count: columns),
                alignment: .leading,
                spacing: spacing
            ) {
                ForEach(visible) { cell in
                    cellView(cell, side: side)
                }
            }

            if overflow > 0 {
                Text("+\(overflow) ô")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.75))
            }

            Spacer(minLength: 0)
        }
    }

    private func cellView(_ cell: SavingsCellInfo, side: CGFloat) -> some View {
        Group {
            if cell.isPaid {
                Image(systemName: "checkmark")
                    .font(.system(size: side * 0.42, weight: .black))
                    .foregroundStyle(WidgetPalette.savings[0])
            } else {
                Text("\(cell.number)")
                    .font(.system(size: side * 0.40, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .minimumScaleFactor(0.5)
            }
        }
        .frame(width: side, height: side)
        .background(cell.isPaid ? Color.white : Color.white.opacity(0.16),
                    in: RoundedRectangle(cornerRadius: 7, style: .continuous))
        .overlay {
            if !cell.isPaid {
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .stroke(.white.opacity(0.22))
            }
        }
    }

    private var cellMetrics: (size: CGFloat, spacing: CGFloat) {
        switch family {
        case .systemExtraLarge: return (34, 6)
        case .systemLarge: return (32, 6)
        default: return (26, 5)
        }
    }
}

private struct SavingsDetailWidget: Widget {
    let kind = "GoldManagerSavingsDetailWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: SelectSavingsRowIntent.self,
            provider: AsyncIntentSnapshotProvider(
                placeholder: SavingsDetailWidgetSnapshot.placeholder,
                loader: { (intent: SelectSavingsRowIntent) in
                    await WidgetData.loadSavingsDetail(selectedId: intent.row?.id)
                }
            )
        ) { entry in
            SavingsDetailWidgetView(entry: entry)
        }
        .configurationDisplayName("Tích góp chi tiết")
        .description("Cột trái tổng quan các dây, cột phải chi tiết ô của một dây bạn chọn.")
        .supportedFamilies([.systemMedium, .systemLarge, .systemExtraLarge])
    }
}

// MARK: - Widget iPad

private struct IpadWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry<IpadWidgetSnapshot>

    var body: some View {
        WidgetChrome(colors: WidgetPalette.ipad) {
            if let data = entry.data {
                content(data)
            } else {
                WidgetEmptyState(systemImage: "ipad", title: "iPad")
            }
        }
        .widgetURL(tabURL("ipad"))
    }

    @ViewBuilder
    private func content(_ data: IpadWidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: family == .systemSmall ? 8 : 10) {
            WidgetHeader(systemImage: "ipad", title: "iPad", subtitle: data.monthLabel)

            HeroStat(label: "Lợi nhuận · \(data.count) máy",
                     value: "\(data.totalProfit >= 0 ? "+" : "")\(data.totalProfit.widgetCompactVND)")

            if family == .systemSmall {
                MiniStat(label: "Nợ chưa trả",
                         value: data.unpaidDebt.widgetCompactVND,
                         valueColor: data.unpaidDebt > 0 ? Color(red: 1, green: 0.9, blue: 0.6) : .white)
            } else {
                HStack(spacing: 8) {
                    MiniStat(label: "Tổng vốn", value: data.totalCost.widgetCompactVND)
                    MiniStat(label: "Doanh thu", value: data.totalRevenue.widgetCompactVND)
                    MiniStat(label: "Nợ chưa trả",
                             value: data.unpaidDebt.widgetCompactVND,
                             valueColor: data.unpaidDebt > 0 ? Color(red: 1, green: 0.9, blue: 0.6) : .white)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

private struct IpadWidget: Widget {
    let kind = "GoldManagerIpadWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: AsyncSnapshotProvider(placeholder: IpadWidgetSnapshot.placeholder,
                                            loader: { await WidgetData.loadIpad() })
        ) { entry in
            IpadWidgetView(entry: entry)
        }
        .configurationDisplayName("iPad")
        .description("Vốn, doanh thu, lợi nhuận và công nợ trong tháng.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Bundle

@main
struct GoldManagerWidgetBundle: WidgetBundle {
    var body: some Widget {
        PortfolioWidget()
        BudgetWidget()
        SavingsWidget()
        SavingsDetailWidget()
        IpadWidget()
    }
}
