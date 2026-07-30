import SwiftUI
import Charts

/// Biểu đồ lịch sử giá vàng theo ngày, kèm thống kê thay đổi và cao/thấp.
struct PriceHistoryView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortfolioStore.self) private var store

    @State private var range: HistoryRange = .month

    enum HistoryRange: String, CaseIterable, Identifiable {
        case week = "7 ngày"
        case month = "30 ngày"
        case quarter = "90 ngày"
        case all = "Tất cả"

        var id: String { rawValue }
        var days: Int? {
            switch self {
            case .week: 7
            case .month: 30
            case .quarter: 90
            case .all: nil
            }
        }
    }

    private var points: [GoldPricePoint] {
        let all = store.priceHistory
        guard let days = range.days,
              let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: Date())
        else { return all }
        return all.filter { $0.priceDate >= cutoff }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                if store.priceHistory.count < 2 {
                    emptyState
                        .frame(maxWidth: .infinity, minHeight: 360)
                } else {
                    VStack(spacing: 18) {
                        Picker("Khoảng thời gian", selection: $range) {
                            ForEach(HistoryRange.allCases) { Text($0.rawValue).tag($0) }
                        }
                        .pickerStyle(.segmented)

                        summaryCard
                        chartCard
                        extremesRow
                    }
                    .padding()
                }
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationTitle("Lịch sử giá vàng")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Xong") { dismiss() }
                }
            }
            .task { await store.refreshPriceHistory() }
        }
    }

    // MARK: Thống kê

    private var latest: Double { points.last?.price ?? store.marketPrice }
    private var first: Double { points.first?.price ?? latest }
    private var delta: Double { latest - first }
    private var deltaPercent: Double { first == 0 ? 0 : delta / first * 100 }

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Giá hiện tại / chỉ")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(latest.vnd)
                .font(.system(.largeTitle, design: .rounded, weight: .heavy))
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            HStack(spacing: 6) {
                Image(systemName: delta >= 0 ? "arrow.up.right" : "arrow.down.right")
                    .font(.footnote.weight(.bold))
                Text("\(delta >= 0 ? "+" : "")\(delta.compactVND) (\(deltaText)%)")
                    .font(.subheadline.weight(.semibold))
                Text("so với đầu kỳ")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .foregroundStyle(delta >= 0 ? .green : .red)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(AppTheme.cardBackground, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var deltaText: String {
        String(format: "%@%.1f", deltaPercent >= 0 ? "+" : "", deltaPercent)
    }

    // MARK: Biểu đồ

    private var chartCard: some View {
        Chart(points) { point in
            AreaMark(
                x: .value("Ngày", point.priceDate),
                y: .value("Giá", point.price)
            )
            .foregroundStyle(
                LinearGradient(
                    colors: [AppTheme.gold.opacity(0.35), AppTheme.gold.opacity(0.02)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .interpolationMethod(.monotone)

            LineMark(
                x: .value("Ngày", point.priceDate),
                y: .value("Giá", point.price)
            )
            .foregroundStyle(AppTheme.deepGold)
            .interpolationMethod(.monotone)
            .lineStyle(StrokeStyle(lineWidth: 2.5))
        }
        .chartYScale(domain: yDomain)
        .chartYAxis {
            AxisMarks { value in
                AxisGridLine()
                AxisValueLabel {
                    if let price = value.as(Double.self) {
                        Text(price.compactVND)
                    }
                }
            }
        }
        .frame(height: 240)
        .padding()
        .background(AppTheme.cardBackground, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var yDomain: ClosedRange<Double> {
        let prices = points.map(\.price)
        guard let min = prices.min(), let max = prices.max() else { return 0...1 }
        guard min != max else { return (min * 0.99)...(max * 1.01) }
        let pad = (max - min) * 0.1
        return (min - pad)...(max + pad)
    }

    // MARK: Cao / thấp

    private var extremesRow: some View {
        HStack(spacing: 12) {
            extremeBox(title: "Cao nhất", value: points.map(\.price).max() ?? 0, color: .green)
            extremeBox(title: "Thấp nhất", value: points.map(\.price).min() ?? 0, color: .red)
        }
    }

    private func extremeBox(title: String, value: Double, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value.vnd)
                .font(.system(.headline, design: .rounded, weight: .bold))
                .foregroundStyle(color)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(AppTheme.cardBackground, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("Chưa có dữ liệu giá", systemImage: "chart.xyaxis.line")
        } description: {
            Text("Lịch sử giá được ghi tự động mỗi ngày khi app cập nhật giá vàng. Hãy quay lại sau vài ngày.")
        }
    }
}
