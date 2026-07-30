import Foundation

@main
struct SmokeCheck {
    static func main() async throws {
        let environment = ProcessInfo.processInfo.environment
        guard let url = environment["NEXT_PUBLIC_SUPABASE_URL"],
              let key = environment["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
        else {
            throw APIError.notConfigured
        }

        let configuration = SupabaseConfiguration(projectURL: url, anonKey: key)
        let client = SupabaseClient()

        async let transactions = client.fetchTransactions(configuration: configuration)
        async let marketPrice = client.fetchMarketPrice(configuration: configuration)
        async let budgetSources = client.fetchBudgetSources(configuration: configuration)
        async let budgetMonths = client.restGet(
            [BudgetMonth].self,
            configuration: configuration,
            path: "budget_months",
            query: [
                URLQueryItem(name: "select", value: "*"),
                URLQueryItem(name: "limit", value: "1")
            ]
        )
        async let savings = client.fetchSavings(configuration: configuration)
        async let ipads = client.fetchIpadTransactions(configuration: configuration)

        let loadedBudgetMonths = try await budgetMonths
        let budgetEntries: [BudgetEntry]
        if let budget = loadedBudgetMonths.first {
            budgetEntries = try await client.fetchBudgetEntries(
                budgetId: budget.id,
                configuration: configuration
            )
        } else {
            budgetEntries = []
        }

        let counts = try await [
            "transactions": transactions.count,
            "market_price": marketPrice > 0 ? 1 : 0,
            "budget_sources": budgetSources.count,
            "budget_months": loadedBudgetMonths.count,
            "budget_entries": budgetEntries.count,
            "savings": savings.count,
            "ipad_transactions": ipads.count
        ]

        for key in counts.keys.sorted() {
            print("\(key)=\(counts[key] ?? 0)")
        }
    }
}
