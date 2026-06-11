import SwiftUI

struct IpadView: View {
    @Environment(PortfolioStore.self) private var appStore
    @Environment(IpadStore.self) private var store
    @State private var sheet: IpadSheet?
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                filter
                summary

                HStack {
                    Text("Danh sách máy")
                        .font(.headline)
                    Spacer()
                    Text("\(store.visibleTransactions.count) máy")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                }

                switch store.state {
                case .idle where store.transactions.isEmpty,
                     .loading where store.transactions.isEmpty:
                    ProgressView("Đang tải kho iPad...")
                        .frame(maxWidth: .infinity, minHeight: 180)
                case .failed(let message) where store.transactions.isEmpty:
                    StatusMessageView(
                        symbol: "exclamationmark.triangle",
                        title: "Không thể tải kho",
                        message: message,
                        action: { Task { await store.load(configuration: appStore.configuration) } }
                    )
                default:
                    if store.visibleTransactions.isEmpty {
                        StatusMessageView(
                            symbol: "ipad",
                            title: "Chưa có máy",
                            message: "Thêm giao dịch nhập iPad đầu tiên."
                        )
                        .frame(minHeight: 180)
                    } else {
                        ForEach(store.visibleTransactions) { transaction in
                            IpadRow(
                                transaction: transaction,
                                saleAction: { sheet = .sale(transaction) },
                                errorMessage: $errorMessage
                            )
                        }
                    }
                }
            }
            .padding()
            .padding(.bottom, 70)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("Mua bán iPad")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    sheet = .add
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .task { await store.load(configuration: appStore.configuration) }
        .refreshable { await store.load(configuration: appStore.configuration) }
        .sheet(item: $sheet) { sheet in
            switch sheet {
            case .add:
                AddIpadView()
            case .sale(let transaction):
                CompleteIpadSaleView(transaction: transaction)
            }
        }
        .alert("Có lỗi xảy ra", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("Đóng", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private var filter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                filterButton(title: "Tất cả", status: nil)
                ForEach(IpadStatus.allCases) { status in
                    filterButton(title: status.title, status: status)
                }
            }
        }
    }

    private func filterButton(title: String, status: IpadStatus?) -> some View {
        Button {
            store.statusFilter = status
        } label: {
            Text(title)
                .font(.caption.bold())
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
        }
        .buttonStyle(.plain)
        .foregroundStyle(store.statusFilter == status ? .white : .primary)
        .background(store.statusFilter == status ? Color.blue : Color.blue.opacity(0.1), in: Capsule())
    }

    private var summary: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("LỢI NHUẬN")
                        .font(.caption.bold())
                        .foregroundStyle(.white.opacity(0.6))
                    Text("\(store.totalProfit >= 0 ? "+" : "")\(store.totalProfit.vnd)")
                        .font(.system(.title, design: .rounded, weight: .bold))
                        .foregroundStyle(store.totalProfit >= 0 ? Color.green.opacity(0.9) : .red)
                }
                Spacer()
                Image(systemName: "dollarsign.circle.fill")
                    .font(.largeTitle)
            }
            HStack {
                metric("Tổng vốn", store.totalCost.vnd)
                metric("Doanh thu", store.totalRevenue.vnd)
                metric("Nợ chưa trả", store.unpaidDebt.vnd)
            }
        }
        .foregroundStyle(.white)
        .padding(22)
        .background(Color(red: 0.04, green: 0.07, blue: 0.12), in: RoundedRectangle(cornerRadius: 26))
        .shadow(color: .black.opacity(0.18), radius: 18, y: 10)
    }

    private func metric(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.55))
            Text(value)
                .font(.caption.bold())
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private enum IpadSheet: Identifiable {
    case add
    case sale(IpadTransaction)

    var id: String {
        switch self {
        case .add: "add"
        case .sale(let transaction): "sale-\(transaction.id)"
        }
    }
}

private struct IpadRow: View {
    @Environment(PortfolioStore.self) private var appStore
    @Environment(IpadStore.self) private var store
    let transaction: IpadTransaction
    let saleAction: () -> Void
    @Binding var errorMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Image(systemName: "ipad")
                    .font(.title2)
                    .frame(width: 44, height: 44)
                    .background(statusColor.opacity(0.12), in: RoundedRectangle(cornerRadius: 14))
                    .foregroundStyle(statusColor)
                VStack(alignment: .leading, spacing: 3) {
                    Text(transaction.deviceName)
                        .font(.headline)
                    Text(transaction.purchaseDate.formatted(date: .numeric, time: .omitted))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text(transaction.status.title)
                    .font(.caption2.bold())
                    .foregroundStyle(statusColor)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 5)
                    .background(statusColor.opacity(0.12), in: Capsule())
            }

            HStack {
                value("Tổng vốn", transaction.totalCost.vnd)
                if transaction.status == .sold {
                    value("Giá bán", (transaction.sellingPrice ?? 0).vnd)
                    value("Lợi nhuận", (transaction.profitAmount ?? 0).vnd)
                } else {
                    value("Tiền vay", transaction.loanAmount.vnd)
                    value("Phí thêm", transaction.extraCost.vnd)
                }
            }

            if let note = transaction.note, !note.isEmpty {
                Text(note)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack {
                Menu {
                    ForEach(IpadStatus.allCases) { status in
                        Button {
                            if status == .sold && transaction.sellingPrice == nil {
                                saleAction()
                            } else {
                                Task {
                                    do {
                                        try await store.setStatus(
                                            transaction,
                                            status: status,
                                            configuration: appStore.configuration
                                        )
                                    } catch {
                                        errorMessage = error.localizedDescription
                                    }
                                }
                            }
                        } label: {
                            Text(status.title)
                        }
                    }
                } label: {
                    Label("Trạng thái", systemImage: "arrow.triangle.2.circlepath")
                }
                .buttonStyle(.bordered)

                Button {
                    Task {
                        do {
                            try await store.toggleDebt(
                                transaction,
                                configuration: appStore.configuration
                            )
                        } catch {
                            errorMessage = error.localizedDescription
                        }
                    }
                } label: {
                    Label(
                        transaction.debtPaid ? "Đã trả nợ" : "Còn nợ",
                        systemImage: transaction.debtPaid ? "checkmark.circle.fill" : "circle"
                    )
                }
                .buttonStyle(.bordered)
                .tint(transaction.debtPaid ? .green : .orange)

                Spacer()
                Menu {
                    Button(role: .destructive) {
                        Task {
                            do {
                                try await store.delete(
                                    transaction,
                                    configuration: appStore.configuration
                                )
                            } catch {
                                errorMessage = error.localizedDescription
                            }
                        }
                    } label: {
                        Label("Xóa", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .frame(width: 36, height: 36)
                }
            }
            .font(.caption)
        }
        .padding(16)
        .background(AppTheme.cardBackground, in: RoundedRectangle(cornerRadius: 21))
    }

    private var statusColor: Color {
        switch transaction.status {
        case .importing: .blue
        case .inStock: .orange
        case .sold: .green
        }
    }

    private func value(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.bold())
                .lineLimit(1)
                .minimumScaleFactor(0.65)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct AddIpadView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortfolioStore.self) private var appStore
    @Environment(IpadStore.self) private var store
    @State private var purchaseDate = Date()
    @State private var status = IpadStatus.inStock
    @State private var purchasePrice = 0.0
    @State private var extraCost = 0.0
    @State private var loanAmount = 0.0
    @State private var note = ""
    @State private var saving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                DatePicker("Ngày mua", selection: $purchaseDate, displayedComponents: .date)
                Picker("Trạng thái", selection: $status) {
                    ForEach(IpadStatus.allCases.filter { $0 != .sold }) { status in
                        Text(status.title).tag(status)
                    }
                }
                TextField("Giá mua", value: $purchasePrice, format: .number)
                    .keyboardType(.numberPad)
                TextField("Chi phí thêm", value: $extraCost, format: .number)
                    .keyboardType(.numberPad)
                TextField("Tiền vay", value: $loanAmount, format: .number)
                    .keyboardType(.numberPad)
                TextField("Ghi chú", text: $note, axis: .vertical)
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
            .navigationTitle("Thêm iPad")
            .navigationBarTitleDisplayMode(.inline)
            .onChange(of: purchasePrice) { _, _ in setDefaultLoan() }
            .onChange(of: extraCost) { _, _ in setDefaultLoan() }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Lưu") { Task { await save() } }
                        .disabled(purchasePrice <= 0 || saving)
                }
            }
        }
    }

    private func setDefaultLoan() {
        if loanAmount == 0 {
            loanAmount = purchasePrice + extraCost
        }
    }

    private func save() async {
        saving = true
        do {
            try await store.add(
                purchaseDate: purchaseDate,
                status: status,
                purchasePrice: purchasePrice,
                extraCost: extraCost,
                loanAmount: loanAmount == 0 ? purchasePrice + extraCost : loanAmount,
                note: note,
                configuration: appStore.configuration
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            saving = false
        }
    }
}

private struct CompleteIpadSaleView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortfolioStore.self) private var appStore
    @Environment(IpadStore.self) private var store
    let transaction: IpadTransaction
    @State private var sellingPrice = 0.0
    @State private var saleDate = Date()
    @State private var saving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                TextField("Giá bán", value: $sellingPrice, format: .number)
                    .keyboardType(.numberPad)
                DatePicker("Ngày bán", selection: $saleDate, displayedComponents: .date)
                LabeledContent("Lợi nhuận dự kiến", value: (sellingPrice - transaction.totalCost).vnd)
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
            .navigationTitle("Hoàn tất bán")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Lưu") { Task { await save() } }
                        .disabled(sellingPrice <= 0 || saving)
                }
            }
        }
    }

    private func save() async {
        saving = true
        do {
            try await store.setStatus(
                transaction,
                status: .sold,
                sellingPrice: sellingPrice,
                saleDate: saleDate,
                configuration: appStore.configuration
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            saving = false
        }
    }
}
