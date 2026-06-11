import SwiftUI

enum AppTheme {
    static let gold = Color(red: 0.96, green: 0.79, blue: 0.10)
    static let deepGold = Color(red: 0.75, green: 0.45, blue: 0.02)
    static let cardBackground = Color(uiColor: .secondarySystemGroupedBackground)
}

extension Double {
    var vnd: String {
        formatted(
            .currency(code: "VND")
                .locale(Locale(identifier: "vi_VN"))
                .precision(.fractionLength(0))
        )
    }

    var goldWeight: String {
        formatted(.number.locale(Locale(identifier: "vi_VN")).precision(.fractionLength(0...2)))
    }
}

struct StatusMessageView: View {
    let symbol: String
    let title: String
    let message: String
    var action: (() -> Void)?

    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: symbol)
        } description: {
            Text(message)
        } actions: {
            if let action {
                Button("Thử lại", action: action)
                    .buttonStyle(.borderedProminent)
            }
        }
    }
}
