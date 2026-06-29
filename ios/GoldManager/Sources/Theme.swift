import SwiftUI
import UIKit

enum AppTheme {
    static let gold = Color(red: 0.96, green: 0.79, blue: 0.10)
    static let deepGold = Color(red: 0.75, green: 0.45, blue: 0.02)
    /// Màu chủ đạo (accent/tint) toàn app — xanh dương mặc định của hệ thống.
    static let accent = Color.blue
    static let cardBackground = Color(uiColor: .secondarySystemGroupedBackground)
}

extension GoldOwner {
    /// Màu nhận diện cho từng người sở hữu (dùng cho badge, bộ lọc).
    var tint: Color {
        switch self {
        case .binh: Color(red: 0.20, green: 0.52, blue: 0.96)
        case .tu: Color(red: 0.55, green: 0.36, blue: 0.96)
        }
    }
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

extension FormatStyle where Self == FloatingPointFormatStyle<Double> {
    static var vndInput: Self {
        .number
            .locale(Locale(identifier: "vi_VN"))
            .grouping(.automatic)
            .precision(.fractionLength(0))
    }
}

enum DeferredNumberKind {
    case decimal
    case currency
}

struct DeferredNumberField: View {
    @Binding var value: Double
    let kind: DeferredNumberKind
    var alignment: TextAlignment = .trailing

    @State private var text = ""
    @FocusState private var isFocused: Bool

    var body: some View {
        TextField("0", text: $text)
            .keyboardType(kind == .currency ? .numberPad : .decimalPad)
            .multilineTextAlignment(alignment)
            .focused($isFocused)
            .frame(maxWidth: .infinity, alignment: .trailing)
            .onAppear { text = displayText }
            .onChange(of: isFocused) { _, focused in
                if focused {
                    text = editingText
                    selectAllText()
                } else {
                    commit()
                    text = displayText
                }
            }
            .onChange(of: text) { _, newValue in
                guard isFocused, let parsed = parse(newValue) else { return }
                value = parsed
            }
            .onChange(of: value) { _, _ in
                if !isFocused { text = displayText }
            }
    }

    private var displayText: String {
        guard value != 0 else { return "" }
        return switch kind {
        case .currency:
            value.formatted(.vndInput)
        case .decimal:
            value.formatted(
                .number.locale(Locale(identifier: "vi_VN"))
                    .grouping(.automatic)
                    .precision(.fractionLength(0...4))
            )
        }
    }

    private var editingText: String {
        guard value != 0 else { return "" }
        return switch kind {
        case .currency:
            String(Int(value.rounded()))
        case .decimal:
            value.formatted(
                .number.locale(Locale(identifier: "vi_VN"))
                    .grouping(.never)
                    .precision(.fractionLength(0...4))
            )
        }
    }

    private func parse(_ input: String) -> Double? {
        switch kind {
        case .currency:
            let digits = input.filter(\.isNumber)
            return digits.isEmpty ? 0 : Double(digits)
        case .decimal:
            let normalized = input
                .replacingOccurrences(of: ",", with: ".")
                .filter { $0.isNumber || $0 == "." }
            return normalized.isEmpty ? 0 : Double(normalized)
        }
    }

    private func commit() {
        if let parsed = parse(text) {
            value = parsed
        }
    }

    private func selectAllText() {
        guard !text.isEmpty else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
            UIApplication.shared.sendAction(
                #selector(UIResponder.selectAll(_:)),
                to: nil,
                from: nil,
                for: nil
            )
        }
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

struct AppFormHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.largeTitle.weight(.bold))
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct AppFormCard<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        VStack(spacing: 0) {
            content
        }
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}

struct AppFormRow<Content: View>: View {
    let title: String
    let systemImage: String
    var tint: Color = .accentColor
    @ViewBuilder let content: Content

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(tint)
                .frame(width: 40, height: 40)
                .background(tint.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))

            Text(title)
                .font(.subheadline.weight(.semibold))

            Spacer(minLength: 10)

            HStack(spacing: 6) {
                content
            }
            .font(.subheadline.weight(.semibold))
        }
        .frame(minHeight: 70)
        .padding(.horizontal, 14)
    }
}

struct AppFormDivider: View {
    var body: some View {
        Divider()
            .padding(.leading, 66)
    }
}

struct AppFormSubmitButton: View {
    let title: String
    let systemImage: String
    let isEnabled: Bool
    let isLoading: Bool
    var tint: Color = .accentColor
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if isLoading {
                    ProgressView().tint(.white)
                } else {
                    Image(systemName: systemImage)
                }
                Text(isLoading ? "Đang lưu..." : title)
            }
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(
                isEnabled ? tint : Color.secondary.opacity(0.35),
                in: RoundedRectangle(cornerRadius: 18)
            )
        }
        .buttonStyle(.plain)
        .disabled(!isEnabled || isLoading)
    }
}

struct AppFormSaveToolbarItem: ToolbarContent {
    let isEnabled: Bool
    let isLoading: Bool
    let action: () -> Void

    var body: some ToolbarContent {
        ToolbarItem(placement: .confirmationAction) {
            Button(action: action) {
                if isLoading {
                    ProgressView()
                } else {
                    Text("Lưu").fontWeight(.semibold)
                }
            }
            .disabled(!isEnabled || isLoading)
        }
    }
}

/// Nút hành động nổi (FAB) cố định ở góc dưới bên phải màn hình.
/// Dùng chung cho các màn hình chính thay cho nút "+" trên thanh tiêu đề.
struct FloatingActionButton: View {
    var systemImage: String = "plus"
    var tint: Color = AppTheme.accent
    var isEnabled: Bool = true
    let accessibilityLabel: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 58, height: 58)
                .background(isEnabled ? tint : Color.secondary, in: Circle())
                .shadow(color: tint.opacity(isEnabled ? 0.35 : 0), radius: 12, y: 6)
        }
        .buttonStyle(.plain)
        .disabled(!isEnabled)
        .padding(.trailing, 20)
        .padding(.bottom, 20)
        .accessibilityLabel(accessibilityLabel)
    }
}

// MARK: - Bố cục thích ứng iPad

/// Bố cục dùng chung cho các màn hình dạng "thẻ tổng quan + danh sách".
///
/// - iPhone / chiều ngang hẹp (`.compact`): thẻ nằm trên cùng, danh sách cuộn ngay
///   bên dưới trong cùng một `List` — giữ nguyên trải nghiệm cũ.
/// - iPad / chiều ngang rộng (`.regular`): thẻ cố định (sticky) ở cột trái, danh sách
///   cuộn độc lập ở cột phải.
struct AdaptiveCardList<Card: View, ListContent: View>: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var sidebarWidth: CGFloat = 360
    var cardInsets = EdgeInsets(top: 8, leading: 16, bottom: 10, trailing: 16)
    @ViewBuilder var card: Card
    @ViewBuilder var list: ListContent

    private var isRegular: Bool { horizontalSizeClass == .regular }

    var body: some View {
        if isRegular {
            HStack(alignment: .top, spacing: 0) {
                ScrollView(.vertical, showsIndicators: false) {
                    card
                        .frame(maxWidth: .infinity)
                        .padding(20)
                }
                .frame(width: sidebarWidth)

                Divider()

                List {
                    list
                    bottomSpacer(height: 24)
                }
                .cardListStyle()
            }
            .background(Color(uiColor: .systemGroupedBackground))
        } else {
            List {
                card
                    .listRowInsets(cardInsets)
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)

                list

                bottomSpacer(height: 56)
            }
            .cardListStyle()
        }
    }

    private func bottomSpacer(height: CGFloat) -> some View {
        Color.clear
            .frame(height: height)
            .listRowInsets(EdgeInsets())
            .listRowSeparator(.hidden)
            .listRowBackground(Color.clear)
    }
}

private struct CardListStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .listStyle(.plain)
            .environment(\.defaultMinListRowHeight, 0)
            .scrollContentBackground(.hidden)
            .background(Color(uiColor: .systemGroupedBackground))
    }
}

extension View {
    /// Style dùng chung cho các `List` dạng thẻ: nền nhóm, ẩn nền mặc định, không giới hạn
    /// chiều cao dòng tối thiểu.
    func cardListStyle() -> some View { modifier(CardListStyle()) }
}
