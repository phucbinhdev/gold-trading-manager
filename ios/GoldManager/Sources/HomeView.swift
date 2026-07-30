import SwiftUI

/// Trang "Tổng quan": gom số liệu rút gọn của cả 4 màn vào các thẻ gradient
/// mang phong cách như widget. Chạm vào thẻ sẽ chuyển sang tab tương ứng.
struct HomeView: View {
    @Binding var selection: AppTab

    @Environment(PortfolioStore.self) private var portfolioStore
    @Environment(BudgetStore.self) private var budgetStore
    @Environment(SavingsStore.self) private var savingsStore
    @Environment(IpadStore.self) private var ipadStore

    @State private var showSettings = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                PortfolioSummaryCard { selection = .portfolio }
                BudgetSummaryCard { selection = .budget }
                SavingsSummaryCard { selection = .savings }
                IpadSummaryCard { selection = .ipad }
            }
            .padding(.horizontal, 16)
            .padding(.top, 4)
            .padding(.bottom, 16)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("Tổng quan")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showSettings = true
                } label: {
                    Image(systemName: "gearshape.fill")
                }
                .accessibilityLabel("Cài đặt")
            }
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
        }
        .task { await loadAll() }
        .refreshable { await loadAll() }
    }

    /// Tải song song cả 4 nguồn. `configuration` lấy từ PortfolioStore (có ngay từ init).
    private func loadAll() async {
        let configuration = portfolioStore.configuration
        async let portfolio: Void = portfolioStore.load()
        async let budget: Void = budgetStore.load(configuration: configuration)
        async let savings: Void = savingsStore.load(configuration: configuration)
        async let ipad: Void = ipadStore.load(configuration: configuration)
        _ = await (portfolio, budget, savings, ipad)
    }
}

// MARK: - Bảng màu (đồng bộ với widget)

private enum HomePalette {
    static let portfolio = [Color(red: 0.85, green: 0.6, blue: 0.05), Color(red: 0.93, green: 0.42, blue: 0.07)]
    static let budget = [Color.indigo, Color.purple]
    static let savings = [Color(red: 0.07, green: 0.62, blue: 0.42), Color(red: 0.02, green: 0.55, blue: 0.6)]
    static let ipad = [Color(red: 0.16, green: 0.45, blue: 0.9), Color(red: 0.13, green: 0.66, blue: 0.55)]
}

/// Màu lãi/lỗ tươi để đọc rõ trên mọi nền gradient.
private extension Color {
    static let homeGain = Color(red: 0.64, green: 1.0, blue: 0.72)
    static let homeLoss = Color(red: 1.0, green: 0.66, blue: 0.62)
}

// MARK: - Thành phần dùng chung

private struct HomeCardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// Khung thẻ gradient bo góc, chạm được.
private struct HomeCard<Content: View>: View {
    let colors: [Color]
    let onTap: () -> Void
    @ViewBuilder var content: Content

    var body: some View {
        Button(action: onTap) {
            content
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing),
                    in: RoundedRectangle(cornerRadius: 24, style: .continuous)
                )
                .shadow(color: (colors.last ?? .black).opacity(0.28), radius: 12, x: 0, y: 7)
        }
        .buttonStyle(HomeCardButtonStyle())
    }
}

/// Hàng tiêu đề thẻ: biểu tượng + tên + phụ đề + mũi tên gợi ý chạm.
private struct HomeCardHeader: View {
    let systemImage: String
    let title: String
    var subtitle: String?

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: systemImage)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(.white.opacity(0.22), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            VStack(alignment: .leading, spacing: 1) {
                Text(title)
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
                if let subtitle {
                    Text(subtitle)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.85))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right")
                .font(.footnote.weight(.bold))
                .foregroundStyle(.white.opacity(0.7))
        }
    }
}

/// Số liệu lớn (nhãn nhỏ trên, giá trị to dưới).
private struct HomeHero: View {
    let label: String
    let value: String
    var valueColor: Color = .white

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white.opacity(0.8))
            Text(value)
                .font(.system(size: 30, weight: .heavy, design: .rounded))
                .foregroundStyle(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
        }
    }
}

/// Ô số liệu nhỏ trên nền mờ.
private struct HomeMini: View {
    let label: String
    let value: String
    var valueColor: Color = .white
    var systemImage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 4) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.white.opacity(0.75))
                }
                Text(label)
                    .font(.system(size: 10.5, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.78))
                    .lineLimit(1)
            }
            Text(value)
                .font(.system(.subheadline, design: .rounded, weight: .bold))
                .foregroundStyle(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 9)
        .background(.white.opacity(0.16), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
    }
}

/// Hàng số liệu kiểu "nhãn — giá trị" cho phần bên phải thẻ Tích góp.
private struct HomeInlineStat: View {
    let label: String
    let value: String
    var valueColor: Color = .white

    var body: some View {
        HStack {
            Text(label)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white.opacity(0.78))
            Spacer(minLength: 8)
            Text(value)
                .font(.system(.subheadline, design: .rounded, weight: .bold))
                .foregroundStyle(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
    }
}

/// Vòng tròn tiến độ cho thẻ Tích góp.
private struct HomeProgressRing: View {
    let progress: Double

    var body: some View {
        ZStack {
            Circle()
                .stroke(.white.opacity(0.22), lineWidth: 9)
            Circle()
                .trim(from: 0, to: max(0, min(1, progress)))
                .stroke(.white, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(Int((max(0, min(1, progress)) * 100).rounded()))%")
                .font(.system(.headline, design: .rounded, weight: .heavy))
                .foregroundStyle(.white)
        }
        .frame(width: 84, height: 84)
    }
}

private func sign(_ value: Double) -> String { value >= 0 ? "+" : "" }

private func monthLabel(_ date: Date) -> String {
    let components = Calendar.current.dateComponents([.year, .month], from: date)
    return "Tháng \(components.month ?? 0)/\(components.year ?? 0)"
}

// MARK: - Thẻ Vàng

private struct PortfolioSummaryCard: View {
    @Environment(PortfolioStore.self) private var store
    let onTap: () -> Void

    var body: some View {
        let ownerName = store.selectedOwner?.title ?? "Tất cả"
        HomeCard(colors: HomePalette.portfolio, onTap: onTap) {
            VStack(alignment: .leading, spacing: 14) {
                HomeCardHeader(
                    systemImage: "chart.pie.fill",
                    title: "Vàng",
                    subtitle: "\(ownerName) · \(store.totalChi.goldWeight) chỉ"
                )
                HomeHero(label: "Tổng tài sản", value: store.currentValue.compactVND)
                HStack(spacing: 10) {
                    HomeMini(
                        label: "Lợi nhuận",
                        value: "\(sign(store.profit))\(store.profit.compactVND)",
                        valueColor: store.profit >= 0 ? .homeGain : .homeLoss,
                        systemImage: store.profit >= 0 ? "arrow.up.right" : "arrow.down.right"
                    )
                    HomeMini(label: "Giá TT", value: store.marketPrice.compactVND, systemImage: "tag.fill")
                    if store.hasSold {
                        HomeMini(
                            label: "Đã chốt",
                            value: "\(sign(store.realizedProfit))\(store.realizedProfit.compactVND)",
                            valueColor: store.realizedProfit >= 0 ? .homeGain : .homeLoss,
                            systemImage: "checkmark.seal.fill"
                        )
                    }
                }
            }
        }
    }
}

// MARK: - Thẻ Quản lý thu chi

private struct BudgetSummaryCard: View {
    @Environment(BudgetStore.self) private var store
    let onTap: () -> Void

    var body: some View {
        HomeCard(colors: HomePalette.budget, onTap: onTap) {
            VStack(alignment: .leading, spacing: 14) {
                HomeCardHeader(
                    systemImage: "list.bullet.clipboard.fill",
                    title: "Quản lý thu chi",
                    subtitle: "\(store.selectedSource?.name ?? "—") · \(monthLabel(store.month))"
                )
                HomeHero(
                    label: "Còn lại",
                    value: store.remaining.compactVND,
                    valueColor: store.remaining >= 0 ? .white : .homeLoss
                )
                HStack(spacing: 10) {
                    HomeMini(
                        label: "Tổng thu",
                        value: "+\(store.availableIncome.compactVND)",
                        valueColor: .homeGain,
                        systemImage: "arrow.down.circle.fill"
                    )
                    HomeMini(
                        label: "Tổng chi",
                        value: store.totalExpenses.compactVND,
                        systemImage: "arrow.up.circle.fill"
                    )
                }
            }
        }
    }
}

// MARK: - Thẻ Tích góp

private struct SavingsSummaryCard: View {
    @Environment(SavingsStore.self) private var store
    let onTap: () -> Void

    var body: some View {
        let goal = store.totalGoal
        let paid = store.totalPaid
        let remaining = max(0, goal - paid)
        let progress = goal > 0 ? paid / goal : 0
        let activeCount = store.rows.filter {
            !($0.totalCells > 0 && $0.completedCells.count >= $0.totalCells)
        }.count

        HomeCard(colors: HomePalette.savings, onTap: onTap) {
            VStack(alignment: .leading, spacing: 14) {
                HomeCardHeader(
                    systemImage: "banknote.fill",
                    title: "Tích góp",
                    subtitle: "\(store.rows.count) dây · \(activeCount) đang chạy"
                )
                HStack(spacing: 18) {
                    HomeProgressRing(progress: progress)
                    VStack(alignment: .leading, spacing: 9) {
                        HomeInlineStat(label: "Đã góp", value: paid.compactVND, valueColor: .homeGain)
                        HomeInlineStat(label: "Mục tiêu", value: goal.compactVND)
                        HomeInlineStat(label: "Còn lại", value: remaining.compactVND, valueColor: .white.opacity(0.9))
                    }
                    Spacer(minLength: 0)
                }
            }
        }
    }
}

// MARK: - Thẻ iPad

private struct IpadSummaryCard: View {
    @Environment(IpadStore.self) private var store
    let onTap: () -> Void

    var body: some View {
        // Tính độc lập theo tháng hiện tại để khớp nhãn, không phụ thuộc bộ lọc ở tab iPad.
        let key = IpadStore.currentMonthKey
        let scoped = store.transactions.filter { IpadStore.monthKey($0.purchaseDate) == key }
        let cost = scoped.reduce(0) { $0 + $1.totalCost }
        let revenue = scoped.reduce(0) { $0 + ($1.status == .sold ? $1.sellingPrice ?? 0 : 0) }
        let profit = scoped.reduce(0) { $0 + ($1.status == .sold ? $1.profitAmount ?? 0 : 0) }
        let debt = scoped.reduce(0) { $0 + ($1.debtPaid ? 0 : $1.loanAmount) }

        HomeCard(colors: HomePalette.ipad, onTap: onTap) {
            VStack(alignment: .leading, spacing: 14) {
                HomeCardHeader(
                    systemImage: "ipad",
                    title: "iPad",
                    subtitle: "\(IpadStore.monthTitle(key)) · \(scoped.count) máy"
                )
                HomeHero(
                    label: "Lợi nhuận",
                    value: "\(sign(profit))\(profit.compactVND)",
                    valueColor: profit >= 0 ? .homeGain : .homeLoss
                )
                HStack(spacing: 10) {
                    HomeMini(label: "Doanh thu", value: revenue.compactVND, systemImage: "creditcard.fill")
                    HomeMini(label: "Vốn", value: cost.compactVND, systemImage: "shippingbox.fill")
                    HomeMini(
                        label: "Nợ",
                        value: debt.compactVND,
                        valueColor: debt > 0 ? .homeLoss : .white,
                        systemImage: "exclamationmark.circle.fill"
                    )
                }
            }
        }
    }
}
