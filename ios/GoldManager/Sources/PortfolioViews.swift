import SwiftUI

struct PortfolioView: View {
    @Environment(PortfolioStore.self) private var store
    @State private var presentedSheet: PortfolioSheet?

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                header
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
                    RecentTransactionsView(transactions: Array(store.transactions.prefix(5)))
                }
            }
            .padding()
            .padding(.bottom, 72)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("Quản Lý Vàng")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                NavigationLink {
                    HistoryView()
                } label: {
                    Image(systemName: "clock")
                }
                .accessibilityLabel("Lịch sử giao dịch")
            }
            ToolbarItem(placement: .topBarTrailing) {
                HStack {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Image(systemName: "gearshape")
                    }
                    .accessibilityLabel("Cài đặt kết nối")

                    Button {
                        presentedSheet = .addTransaction
                    } label: {
                        Image(systemName: "plus")
                            .fontWeight(.semibold)
                    }
                    .accessibilityLabel("Thêm giao dịch")
                }
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

    private var header: some View {
        HStack(spacing: 14) {
            Image(systemName: "wallet.bifold.fill")
                .font(.title3)
                .foregroundStyle(.black.opacity(0.75))
                .frame(width: 46, height: 46)
                .background(AppTheme.gold.gradient, in: RoundedRectangle(cornerRadius: 15))

            VStack(alignment: .leading, spacing: 3) {
                Text("Xin chào")
                    .font(.title2.bold())
                Text("Theo dõi tài sản vàng của bạn.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
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
    let transactions: [GoldTransaction]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Giao dịch gần đây")
                .font(.headline)

            if transactions.isEmpty {
                StatusMessageView(
                    symbol: "tray",
                    title: "Chưa có giao dịch",
                    message: "Nhấn dấu cộng để thêm lần mua vàng đầu tiên."
                )
                .frame(minHeight: 170)
            } else {
                ForEach(transactions) { transaction in
                    TransactionRow(transaction: transaction)
                }
            }
        }
    }
}

struct TransactionRow: View {
    @Environment(PortfolioStore.self) private var store
    let transaction: GoldTransaction

    private var profit: Double {
        transaction.amountChi * store.marketPrice - transaction.cost
    }

    var body: some View {
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
}
