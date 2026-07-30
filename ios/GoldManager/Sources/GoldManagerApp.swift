import SwiftUI

@main
struct GoldManagerApp: App {
    @State private var portfolioStore = PortfolioStore()
    @State private var budgetStore = BudgetStore()
    @State private var savingsStore = SavingsStore()
    @State private var ipadStore = IpadStore()
    @State private var appLock = AppLockManager()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            AppView()
                .environment(portfolioStore)
                .environment(budgetStore)
                .environment(savingsStore)
                .environment(ipadStore)
                .environment(appLock)
                .tint(AppTheme.accent)
                .overlay {
                    if appLock.isLocked {
                        LockScreenView()
                            .environment(appLock)
                    } else if appLock.isEnabled, scenePhase == .inactive {
                        PrivacyCoverView()
                    }
                }
                .animation(.easeInOut(duration: 0.2), value: appLock.isLocked)
                .task { await appLock.authenticate() }
                .onChange(of: scenePhase) { _, newPhase in
                    switch newPhase {
                    case .background:
                        appLock.lock()
                    case .active:
                        Task { await appLock.authenticate() }
                    default:
                        break
                    }
                }
        }
    }
}

enum AppTab: String, Hashable {
    case home
    case portfolio
    case budget
    case savings
    case ipad
}

struct AppView: View {
    @State private var selection: AppTab

    init() {
        let requestedTab = ProcessInfo.processInfo.environment["GOLD_MANAGER_START_TAB"]
        _selection = State(initialValue: AppTab(rawValue: requestedTab ?? "") ?? .home)
    }

    var body: some View {
        TabView(selection: $selection) {
            NavigationStack {
                HomeView(selection: $selection)
            }
            .tabItem {
                Label("Tổng quan", systemImage: "square.grid.2x2.fill")
            }
            .tag(AppTab.home)

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
                Label("Thu chi", systemImage: "list.bullet.clipboard.fill")
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
