import SwiftUI
import WidgetKit

private struct MenuEntry: TimelineEntry {
    let date: Date
}

private struct MenuProvider: TimelineProvider {
    func placeholder(in context: Context) -> MenuEntry {
        MenuEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (MenuEntry) -> Void) {
        completion(MenuEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MenuEntry>) -> Void) {
        completion(Timeline(entries: [MenuEntry(date: Date())], policy: .after(Date().addingTimeInterval(30 * 60))))
    }
}

private struct MenuWidgetStyle {
    let title: String
    let subtitle: String
    let systemImage: String
    let tab: String
    let colors: [Color]

    var url: URL {
        URL(string: "goldmanager://tab/\(tab)")!
    }
}

private struct MenuWidgetView: View {
    let style: MenuWidgetStyle
    @Environment(\.widgetFamily) private var family

    var body: some View {
        ZStack(alignment: .topLeading) {
            LinearGradient(
                colors: style.colors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(alignment: .leading, spacing: family == .systemSmall ? 10 : 14) {
                Image(systemName: style.systemImage)
                    .font(.system(size: family == .systemSmall ? 28 : 34, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: family == .systemSmall ? 46 : 56, height: family == .systemSmall ? 46 : 56)
                    .background(.white.opacity(0.18), in: RoundedRectangle(cornerRadius: 16, style: .continuous))

                Spacer(minLength: 6)

                Text(style.title)
                    .font(family == .systemSmall ? .title3.weight(.black) : .title.weight(.black))
                    .foregroundStyle(.white)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)

                Text(style.subtitle)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.78))
                    .lineLimit(family == .systemSmall ? 2 : 1)
            }
            .padding(16)
        }
        .widgetURL(style.url)
        .containerBackground(.clear, for: .widget)
    }
}

private struct PortfolioWidget: Widget {
    let kind = "GoldManagerPortfolioWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MenuProvider()) { _ in
            MenuWidgetView(style: .portfolio)
        }
        .configurationDisplayName("Quản lý vàng")
        .description("Mở nhanh danh mục vàng và giao dịch gần đây.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

private struct BudgetWidget: Widget {
    let kind = "GoldManagerBudgetWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MenuProvider()) { _ in
            MenuWidgetView(style: .budget)
        }
        .configurationDisplayName("Tính nợ")
        .description("Mở nhanh màn tính nợ và các khoản thu chi.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

private struct SavingsWidget: Widget {
    let kind = "GoldManagerSavingsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MenuProvider()) { _ in
            MenuWidgetView(style: .savings)
        }
        .configurationDisplayName("Tích góp")
        .description("Mở nhanh các dây tích góp.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

private struct IpadWidget: Widget {
    let kind = "GoldManagerIpadWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MenuProvider()) { _ in
            MenuWidgetView(style: .ipad)
        }
        .configurationDisplayName("Mua bán iPad")
        .description("Mở nhanh màn quản lý mua bán iPad.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct GoldManagerWidgetBundle: WidgetBundle {
    var body: some Widget {
        PortfolioWidget()
        BudgetWidget()
        SavingsWidget()
        IpadWidget()
    }
}

private extension MenuWidgetStyle {
    static let portfolio = MenuWidgetStyle(
        title: "Vàng",
        subtitle: "Danh mục và lịch sử",
        systemImage: "chart.pie.fill",
        tab: "portfolio",
        colors: [Color(red: 0.96, green: 0.79, blue: 0.10), Color.orange]
    )

    static let budget = MenuWidgetStyle(
        title: "Tính nợ",
        subtitle: "Thu chi và khoản đã trả",
        systemImage: "list.bullet.clipboard.fill",
        tab: "budget",
        colors: [Color.indigo, Color.purple]
    )

    static let savings = MenuWidgetStyle(
        title: "Tích góp",
        subtitle: "Theo dõi từng ô đóng",
        systemImage: "banknote.fill",
        tab: "savings",
        colors: [Color(red: 0.12, green: 0.72, blue: 0.42), Color(red: 0.03, green: 0.65, blue: 0.72)]
    )

    static let ipad = MenuWidgetStyle(
        title: "iPad",
        subtitle: "Mua bán và công nợ",
        systemImage: "ipad",
        tab: "ipad",
        colors: [Color.blue, Color.green]
    )
}
