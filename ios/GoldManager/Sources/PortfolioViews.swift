import SwiftUI

struct PortfolioView: View {
    @Environment(PortfolioStore.self) private var store
    @State private var presentedSheet: PortfolioSheet?

    init() {
        let requestedSheet = ProcessInfo.processInfo.environment["GOLD_MANAGER_START_SHEET"]
        _presentedSheet = State(
            initialValue: requestedSheet == "add-gold" ? .addTransaction : nil
        )
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                PortfolioCard(
                    totalChi: store.totalChi,
                    totalInvested: store.totalInvested,
                    marketPrice: store.marketPrice,
                    currentValue: store.currentValue,
                    profit: store.profit,
                    profitPercent: store.profitPercent,
                    editPrice: { presentedSheet = .marketPrice }
                )

                switch store.state {
                case .idle where store.transactions.isEmpty,
                     .loading where store.transactions.isEmpty:
                    ProgressView("Đang tải danh mục...")
                        .frame(maxWidth: .infinity, minHeight: 180)
                case .failed(let message) where store.transactions.isEmpty:
                    StatusMessageView(
                        symbol: "wifi.exclamationmark",
                        title: "Không thể tải dữ liệu",
                        message: message,
                        action: { Task { await store.load() } }
                    )
                default:
                    RecentTransactionsView(transactions: store.transactions)
                }
            }
            .padding()
            .padding(.bottom, 72)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("Quản Lý Vàng")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    presentedSheet = .addTransaction
                } label: {
                    Image(systemName: "plus")
                        .fontWeight(.semibold)
                }
                .accessibilityLabel("Thêm giao dịch")
            }
        }
        .refreshable { await store.load() }
        .task { await store.load() }
        .sheet(item: $presentedSheet) { sheet in
            switch sheet {
            case .addTransaction:
                AddTransactionView()
            case .marketPrice:
                MarketPriceView()
            }
        }
    }

}

private enum PortfolioSheet: String, Identifiable {
    case addTransaction
    case marketPrice
    var id: String { rawValue }
}

struct PortfolioCard: View {
    let totalChi: Double
    let totalInvested: Double
    let marketPrice: Double
    let currentValue: Double
    let profit: Double
    let profitPercent: Double
    let editPrice: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("TỔNG TÀI SẢN")
                        .font(.caption.bold())
                        .tracking(1.2)
                        .foregroundStyle(.black.opacity(0.58))
                    Text(currentValue.vnd)
                        .font(.system(.largeTitle, design: .rounded, weight: .bold))
                        .contentTransition(.numericText())
                }
                Spacer()
                Image(systemName: "wallet.bifold.fill")
                    .font(.title2)
                    .frame(width: 48, height: 48)
                    .background(.white.opacity(0.3), in: RoundedRectangle(cornerRadius: 16))
            }

            HStack(spacing: 7) {
                Text("LỢI NHUẬN")
                    .font(.caption2.bold())
                    .foregroundStyle(.black.opacity(0.55))
                Text("\(profit >= 0 ? "+" : "")\(profit.vnd)")
                    .font(.subheadline.bold())
                    .foregroundStyle(profit >= 0 ? .green : .red)
                Image(systemName: profit >= 0 ? "arrow.up.right" : "arrow.down.right")
                    .font(.caption.bold())
                    .foregroundStyle(profit >= 0 ? .green : .red)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(.white.opacity(0.3), in: Capsule())

            Divider().overlay(.black.opacity(0.08))

            HStack(spacing: 12) {
                metric(
                    title: "Khối lượng vàng",
                    value: "\(totalChi.goldWeight) Chỉ",
                    detail: "Vốn: \(totalInvested.vnd)"
                )
                metric(
                    title: "Giá thị trường",
                    value: marketPrice.vnd,
                    detail: "\(profitPercent >= 0 ? "+" : "")\(profitPercent.formatted(.number.precision(.fractionLength(2))))%",
                    action: editPrice
                )
            }
        }
        .foregroundStyle(.black.opacity(0.82))
        .padding(22)
        .background(
            LinearGradient(
                colors: [Color(red: 0.98, green: 0.86, blue: 0.23), AppTheme.gold, Color.orange],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 28, style: .continuous)
        )
        .shadow(color: AppTheme.deepGold.opacity(0.2), radius: 24, y: 14)
    }

    private func metric(
        title: String,
        value: String,
        detail: String,
        action: (() -> Void)? = nil
    ) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.black.opacity(0.58))
            HStack(spacing: 6) {
                Text(value)
                    .font(.subheadline.bold())
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)
                if let action {
                    Button(action: action) {
                        Image(systemName: "pencil")
                            .font(.caption.bold())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Cập nhật giá vàng")
                }
            }
            Text(detail)
                .font(.caption2)
                .foregroundStyle(.black.opacity(0.52))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(.white.opacity(0.2), in: RoundedRectangle(cornerRadius: 17))
    }
}

struct RecentTransactionsView: View {
    @Environment(PortfolioStore.self) private var store
    let transactions: [GoldTransaction]
    @State private var selectedYear: Int?
    @State private var pendingDeletion: GoldTransaction?
    @State private var selectedTransaction: GoldTransaction?
    @State private var errorMessage: String?

    private var years: [Int] {
        Array(
            Set(
                transactions.map {
                    Calendar.current.component(.year, from: $0.transactionDate)
                }
            )
        )
        .sorted(by: >)
    }

    private var filteredTransactions: [GoldTransaction] {
        let filtered: [GoldTransaction]
        if let selectedYear {
            filtered = transactions.filter {
                Calendar.current.component(.year, from: $0.transactionDate) == selectedYear
            }
        } else {
            filtered = transactions
        }

        return filtered.sorted {
            if $0.transactionDate != $1.transactionDate {
                return $0.transactionDate > $1.transactionDate
            }
            return $0.createdAt > $1.createdAt
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Giao dịch gần đây")
                        .font(.headline)

                    Text("\(filteredTransactions.count) giao dịch")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }

            if !years.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        yearButton(title: "Tất cả", year: nil)

                        ForEach(years.prefix(5), id: \.self) { year in
                            yearButton(title: String(year), year: year)
                        }
                    }
                }
            }

            if filteredTransactions.isEmpty {
                StatusMessageView(
                    symbol: "tray",
                    title: "Chưa có giao dịch",
                    message: selectedYear == nil
                        ? "Nhấn dấu cộng để thêm lần mua vàng đầu tiên."
                        : "Không có giao dịch trong năm đã chọn."
                )
                .frame(minHeight: 170)
            } else {
                ForEach(filteredTransactions) { transaction in
                    TransactionRow(
                        transaction: transaction,
                        editAction: { selectedTransaction = transaction },
                        deleteAction: { pendingDeletion = transaction }
                    )
                }
            }
        }
        .confirmationDialog(
            "Xóa giao dịch này?",
            isPresented: Binding(
                get: { pendingDeletion != nil },
                set: { if !$0 { pendingDeletion = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Xóa", role: .destructive) {
                deletePendingTransaction()
            }
            Button("Hủy", role: .cancel) {}
        } message: {
            Text("Hành động này không thể hoàn tác.")
        }
        .sheet(item: $selectedTransaction) { transaction in
            EditTransactionView(transaction: transaction)
        }
        .alert("Không thể xóa giao dịch", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("Đóng", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private func yearButton(title: String, year: Int?) -> some View {
        Button {
            selectedYear = year
        } label: {
            Text(title)
                .font(.caption.weight(.bold))
                .padding(.horizontal, 15)
                .frame(height: 38)
        }
        .buttonStyle(.plain)
        .foregroundStyle(selectedYear == year ? .black : .primary)
        .background(
            selectedYear == year ? AppTheme.gold : Color(uiColor: .secondarySystemGroupedBackground),
            in: Capsule()
        )
    }

    private func deletePendingTransaction() {
        guard let transaction = pendingDeletion else { return }
        Task {
            do {
                try await store.delete(transaction)
            } catch {
                errorMessage = error.localizedDescription
            }
            pendingDeletion = nil
        }
    }
}

struct TransactionRow: View {
    @Environment(PortfolioStore.self) private var store
    let transaction: GoldTransaction
    let editAction: () -> Void
    var deleteAction: (() -> Void)?
    @State private var horizontalOffset: CGFloat = 0

    private let deleteWidth: CGFloat = 82

    private var profit: Double {
        transaction.amountChi * store.marketPrice - transaction.cost
    }

    var body: some View {
        ZStack(alignment: .trailing) {
            if let deleteAction, horizontalOffset < 0 {
                Button(role: .destructive, action: deleteAction) {
                    Label("Xóa", systemImage: "trash.fill")
                        .labelStyle(.iconOnly)
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(width: deleteWidth)
                        .frame(maxHeight: .infinity)
                        .background(Color.red)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Xóa giao dịch")
            }

            rowContent
                .offset(x: horizontalOffset)
                .contentShape(Rectangle())
                .onTapGesture {
                    if horizontalOffset == 0 {
                        editAction()
                    } else {
                        closeActions()
                    }
                }
                .simultaneousGesture(swipeGesture, isEnabled: deleteAction != nil)
                .accessibilityAddTraits(.isButton)
                .accessibilityHint("Chạm để chỉnh sửa, vuốt sang trái để hiện nút xóa")
                .accessibilityAction(named: "Chỉnh sửa", editAction)
                .accessibilityAction(named: "Xóa") { deleteAction?() }
        }
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private var rowContent: some View {
        HStack(spacing: 13) {
            Image(systemName: profit >= 0 ? "arrow.up.right" : "arrow.down.right")
                .font(.headline)
                .foregroundStyle(profit >= 0 ? .green : .red)
                .frame(width: 42, height: 42)
                .background(
                    (profit >= 0 ? Color.green : Color.red).opacity(0.1),
                    in: Circle()
                )

            VStack(alignment: .leading, spacing: 3) {
                Text("\(transaction.amountChi.goldWeight) Chỉ")
                    .font(.subheadline.bold())
                Text(transaction.transactionDate.formatted(date: .numeric, time: .omitted))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if let note = transaction.note, !note.isEmpty {
                    Text(note)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 3) {
                Text(transaction.cost.vnd)
                    .font(.subheadline.bold())
                Text("\(profit >= 0 ? "+" : "")\(profit.vnd)")
                    .font(.caption.bold())
                    .foregroundStyle(profit >= 0 ? .green : .red)
            }

        }
        .padding(14)
        .background(AppTheme.cardBackground, in: RoundedRectangle(cornerRadius: 18))
    }

    private var swipeGesture: some Gesture {
        DragGesture(minimumDistance: 12)
            .onChanged { value in
                guard abs(value.translation.width) > abs(value.translation.height) else { return }
                horizontalOffset = min(0, max(-deleteWidth, value.translation.width))
            }
            .onEnded { value in
                let shouldReveal = value.translation.width < -deleteWidth * 0.4
                    || value.predictedEndTranslation.width < -deleteWidth
                withAnimation(.snappy(duration: 0.22)) {
                    horizontalOffset = shouldReveal ? -deleteWidth : 0
                }
            }
    }

    private func closeActions() {
        withAnimation(.snappy(duration: 0.22)) {
            horizontalOffset = 0
        }
    }
}
