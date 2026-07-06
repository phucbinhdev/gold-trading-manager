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
        AdaptiveCardList {
            PortfolioCard(
                totalChi: store.totalChi,
                totalInvested: store.totalInvested,
                marketPrice: store.marketPrice,
                currentValue: store.currentValue,
                profit: store.profit,
                profitPercent: store.profitPercent,
                realizedProfit: store.realizedProfit,
                hasSold: store.hasSold,
                scopeLabel: store.selectedOwner?.title ?? "Tất cả",
                editPrice: { presentedSheet = .marketPrice }
            )
        } list: {
            portfolioListContent
        }
        .animation(.smooth(duration: 0.35), value: store.state)
        .animation(.smooth(duration: 0.35), value: store.transactions)
        .animation(.smooth(duration: 0.35), value: store.selectedOwner)
        .navigationTitle("Quản Lý Vàng")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    presentedSheet = .priceHistory
                } label: {
                    Image(systemName: "chart.xyaxis.line")
                }
                .accessibilityLabel("Lịch sử giá vàng")
            }
        }
        .overlay(alignment: .bottomTrailing) {
            FloatingActionButton(accessibilityLabel: "Thêm giao dịch") {
                presentedSheet = .addTransaction
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
            case .priceHistory:
                PriceHistoryView()
            }
        }
    }

    @ViewBuilder
    private var portfolioListContent: some View {
        switch store.state {
        case .idle where store.transactions.isEmpty,
             .loading where store.transactions.isEmpty:
            ProgressView("Đang tải danh mục...")
                .frame(maxWidth: .infinity, minHeight: 180)
                .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                .listRowSeparator(.hidden)
                .listRowBackground(Color.clear)
        case .failed(let message) where store.transactions.isEmpty:
            StatusMessageView(
                symbol: "wifi.exclamationmark",
                title: "Không thể tải dữ liệu",
                message: message,
                action: { Task { await store.load() } }
            )
            .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
            .listRowSeparator(.hidden)
            .listRowBackground(Color.clear)
        default:
            RecentTransactionsView(transactions: store.scopedTransactions)
        }
    }

}

private enum PortfolioSheet: String, Identifiable {
    case addTransaction
    case marketPrice
    case priceHistory
    var id: String { rawValue }
}

struct PortfolioCard: View {
    let totalChi: Double
    let totalInvested: Double
    let marketPrice: Double
    let currentValue: Double
    let profit: Double
    let profitPercent: Double
    let realizedProfit: Double
    let hasSold: Bool
    let scopeLabel: String
    let editPrice: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 6) {
                        Text("TỔNG TÀI SẢN")
                            .font(.caption.bold())
                            .tracking(1.2)
                            .foregroundStyle(.black.opacity(0.58))
                        Text(scopeLabel)
                            .font(.caption2.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(.white.opacity(0.4), in: Capsule())
                            .foregroundStyle(.black.opacity(0.6))
                    }
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

            HStack(spacing: 8) {
                HStack(spacing: 7) {
                    Text("LỢI NHUẬN")
                        .font(.caption2.bold())
                        .foregroundStyle(.black.opacity(0.55))
                    Text("\(profit >= 0 ? "+" : "")\(profit.vnd)")
                        .font(.subheadline.bold())
                        .foregroundStyle(profit >= 0 ? .green : .red)
                        .contentTransition(.numericText())
                    Image(systemName: profit >= 0 ? "arrow.up.right" : "arrow.down.right")
                        .font(.caption.bold())
                        .foregroundStyle(profit >= 0 ? .green : .red)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(.white.opacity(0.3), in: Capsule())

                if hasSold {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.caption2.bold())
                            .foregroundStyle(.black.opacity(0.5))
                        Text("Đã chốt \(realizedProfit >= 0 ? "+" : "")\(realizedProfit.vnd)")
                            .font(.caption.bold())
                            .foregroundStyle(realizedProfit >= 0 ? .green : .red)
                            .contentTransition(.numericText())
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(.white.opacity(0.3), in: Capsule())
                }
            }

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
        .animation(.smooth(duration: 0.4), value: marketPrice)
        .animation(.smooth(duration: 0.4), value: currentValue)
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
                    .contentTransition(.numericText())
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
    @State private var sellingTransaction: GoldTransaction?
    @State private var errorMessage: String?

    private var ownerBinding: Binding<GoldOwner?> {
        Binding(
            get: { store.selectedOwner },
            set: { newValue in withAnimation(.snappy) { store.selectedOwner = newValue } }
        )
    }

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
            // Vàng đang giữ hiển thị trước, đã bán dồn xuống dưới.
            if $0.isSold != $1.isSold {
                return !$0.isSold
            }
            if $0.transactionDate != $1.transactionDate {
                return $0.transactionDate > $1.transactionDate
            }
            return $0.createdAt > $1.createdAt
        }
    }

    private var subtitleText: String {
        let total = filteredTransactions.count
        let sold = filteredTransactions.filter(\.isSold).count
        return sold > 0 ? "\(total) giao dịch · \(sold) đã bán" : "\(total) giao dịch"
    }

    var body: some View {
        Group {
            Picker("Người sở hữu", selection: ownerBinding) {
                Text("Tất cả").tag(Optional<GoldOwner>.none)
                ForEach(GoldOwner.allCases) { owner in
                    Text(owner.title).tag(Optional(owner))
                }
            }
            .pickerStyle(.segmented)
            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 4, trailing: 16))
            .listRowSeparator(.hidden)
            .listRowBackground(Color.clear)

            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Giao dịch gần đây")
                        .font(.headline)

                    Text(subtitleText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }
            .listRowInsets(EdgeInsets(top: 14, leading: 16, bottom: 6, trailing: 16))
            .listRowSeparator(.hidden)
            .listRowBackground(Color.clear)
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
            .sheet(item: $sellingTransaction) { transaction in
                MarkSoldView(transaction: transaction, marketPrice: store.marketPrice)
            }
            .alert("Không thể xóa giao dịch", isPresented: Binding(
                get: { errorMessage != nil },
                set: { if !$0 { errorMessage = nil } }
            )) {
                Button("Đóng", role: .cancel) {}
            } message: {
                Text(errorMessage ?? "")
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
                .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 8, trailing: 16))
                .listRowSeparator(.hidden)
                .listRowBackground(Color.clear)
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
                .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                .listRowSeparator(.hidden)
                .listRowBackground(Color.clear)
            } else {
                ForEach(filteredTransactions) { transaction in
                    TransactionRow(
                        transaction: transaction,
                        editAction: { selectedTransaction = transaction },
                        deleteAction: { pendingDeletion = transaction },
                        sellAction: { sellingTransaction = transaction },
                        unsellAction: { unsell(transaction) }
                    )
                    .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                }
            }
        }
    }

    private func yearButton(title: String, year: Int?) -> some View {
        Button {
            withAnimation(.snappy) { selectedYear = year }
        } label: {
            Text(title)
                .font(.caption.weight(.bold))
                .padding(.horizontal, 15)
                .frame(height: 38)
        }
        .buttonStyle(.plain)
        .foregroundStyle(selectedYear == year ? .white : .primary)
        .background(
            selectedYear == year ? AppTheme.accent : Color(uiColor: .secondarySystemGroupedBackground),
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

    private func unsell(_ transaction: GoldTransaction) {
        Task {
            do {
                try await store.clearSold(transaction)
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}

struct OwnerBadge: View {
    let owner: GoldOwner

    var body: some View {
        HStack(spacing: 3) {
            Image(systemName: owner.symbol)
                .font(.system(size: 9, weight: .bold))
            Text(owner.title)
                .font(.caption2.bold())
        }
        .foregroundStyle(owner.tint)
        .padding(.horizontal, 7)
        .padding(.vertical, 2)
        .background(owner.tint.opacity(0.15), in: Capsule())
    }
}

struct TransactionRow: View {
    @Environment(PortfolioStore.self) private var store
    let transaction: GoldTransaction
    let editAction: () -> Void
    var deleteAction: (() -> Void)?
    var sellAction: (() -> Void)?
    var unsellAction: (() -> Void)?

    private var isSold: Bool { transaction.isSold }

    /// Lợi nhuận hiển thị: đã chốt nếu đã bán, ngược lại là lãi/lỗ theo giá thị trường.
    private var displayProfit: Double {
        transaction.realizedProfit ?? (transaction.amountChi * store.marketPrice - transaction.cost)
    }

    private var accentColor: Color {
        isSold ? .secondary : (displayProfit >= 0 ? .green : .red)
    }

    var body: some View {
        rowContent
            .contentShape(Rectangle())
            .onTapGesture(perform: editAction)
            .swipeActions(edge: .leading, allowsFullSwipe: !isSold) {
                if isSold {
                    if let unsellAction {
                        Button(action: unsellAction) {
                            Image(systemName: "arrow.uturn.backward")
                        }
                        .tint(.gray)
                        .accessibilityLabel("Bỏ đánh dấu đã bán")
                    }
                    if let sellAction {
                        Button(action: sellAction) {
                            Image(systemName: "pencil")
                        }
                        .tint(.green)
                        .accessibilityLabel("Sửa giá bán")
                    }
                } else if let sellAction {
                    Button(action: sellAction) {
                        Label("Đã bán", systemImage: "checkmark.seal.fill")
                    }
                    .tint(.green)
                    .accessibilityLabel("Đánh dấu đã bán")
                }
            }
            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                if let deleteAction {
                    Button(role: .destructive, action: deleteAction) {
                        Image(systemName: "trash")
                    }
                    .tint(.red)
                    .accessibilityLabel("Xóa")
                }
            }
            .accessibilityAddTraits(.isButton)
            .accessibilityHint("Chạm để chỉnh sửa, vuốt để đánh dấu đã bán hoặc xóa")
            .accessibilityAction(named: "Chỉnh sửa", editAction)
            .accessibilityAction(named: isSold ? "Bỏ đánh dấu đã bán" : "Đánh dấu đã bán") {
                isSold ? unsellAction?() : sellAction?()
            }
            .accessibilityAction(named: "Xóa") { deleteAction?() }
    }

    private var rowContent: some View {
        HStack(spacing: 13) {
            Image(systemName: isSold ? "checkmark.seal.fill" : (displayProfit >= 0 ? "arrow.up.right" : "arrow.down.right"))
                .font(.headline)
                .foregroundStyle(accentColor)
                .frame(width: 42, height: 42)
                .background(accentColor.opacity(0.12), in: Circle())

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text("\(transaction.amountChi.goldWeight) Chỉ")
                        .font(.subheadline.bold())
                    OwnerBadge(owner: transaction.owner)
                    if isSold {
                        Text("Đã bán")
                            .font(.caption2.bold())
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.secondary.opacity(0.12), in: Capsule())
                    }
                }
                HStack(spacing: 4) {
                    Text(transaction.transactionDate.formatted(date: .numeric, time: .omitted))
                    if isSold, let soldDate = transaction.soldDate {
                        Text("→ bán \(soldDate.formatted(date: .numeric, time: .omitted))")
                    }
                }
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
                Text("\(displayProfit >= 0 ? "+" : "")\(displayProfit.vnd)")
                    .font(.caption.bold())
                    .foregroundStyle(displayProfit >= 0 ? .green : .red)
                if isSold {
                    Text("đã chốt lời")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(14)
        .background(AppTheme.cardBackground, in: RoundedRectangle(cornerRadius: 18))
        .opacity(isSold ? 0.9 : 1)
    }

}
