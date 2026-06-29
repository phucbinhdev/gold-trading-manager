import SwiftUI

@main
struct GoldManagerApp: App {
    @State private var portfolioStore = PortfolioStore()
    @State private var budgetStore = BudgetStore()
    @State private var savingsStore = SavingsStore()
    @State private var ipadStore = IpadStore()

    var body: some Scene {
        WindowGroup {
            AppView()
                .environment(portfolioStore)
                .environment(budgetStore)
                .environment(savingsStore)
                .environment(ipadStore)
                .tint(AppTheme.accent)
        }
    }
}

private enum AppTab: String, Hashable {
    case portfolio
    case budget
    case savings
    case ipad
}

struct AppView: View {
    @State private var selection: AppTab

    init() {
        let requestedTab = ProcessInfo.processInfo.environment["GOLD_MANAGER_START_TAB"]
        _selection = State(initialValue: AppTab(rawValue: requestedTab ?? "") ?? .portfolio)
    }

    var body: some View {
        TabView(selection: $selection) {
            NavigationStack {
                PortfolioView()
            }
            .tabItem {
                Label("Vàng", systemImage: "chart.pie.fill")
            }
            .tag(AppTab.portfolio)

            NavigationStack {
                BudgetView()
            }
            .tabItem {
                Label("Tính nợ", systemImage: "list.bullet.clipboard.fill")
            }
            .tag(AppTab.budget)

            NavigationStack {
                SavingsView()
            }
            .tabItem {
                Label("Tích góp", systemImage: "banknote.fill")
            }
            .tag(AppTab.savings)

            NavigationStack {
                IpadView()
            }
            .tabItem {
                Label("iPad", systemImage: "ipad")
            }
            .tag(AppTab.ipad)
        }
        .onOpenURL { url in
            guard url.scheme == "goldmanager", url.host == "tab" else { return }
            let tabName = url.pathComponents.dropFirst().first
            if let tabName, let tab = AppTab(rawValue: tabName) {
                selection = tab
            }
        }
    }
}
