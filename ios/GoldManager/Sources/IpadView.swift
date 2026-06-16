import SwiftUI

struct IpadView: View {
    @Environment(PortfolioStore.self) private var appStore
    @Environment(IpadStore.self) private var store
    @State private var sheet: IpadSheet?
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                monthFilter
                summary
                listFilters

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
                                editAction: { sheet = .edit(transaction) },
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
            case .edit(let transaction):
                EditIpadView(transaction: transaction)
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

    private var monthFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                monthButton(title: "Tất cả", key: "all")
                ForEach(store.monthOptions, id: \.self) { month in
                    monthButton(
                        title: month == IpadStore.currentMonthKey
                            ? "Tháng này"
                            : IpadStore.monthTitle(month),
                        key: month
                    )
                }
            }
        }
    }

    private func monthButton(title: String, key: String) -> some View {
        Button {
            store.monthFilter = key
        } label: {
            Text(title)
                .font(.caption.bold())
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
        }
        .buttonStyle(.plain)
        .foregroundStyle(store.monthFilter == key ? .white : .primary)
        .background(store.monthFilter == key ? Color.blue : Color.blue.opacity(0.1), in: Capsule())
    }

    private var listFilters: some View {
        HStack(spacing: 10) {
            Menu {
                Button("Tất cả tồn kho") {
                    store.statusFilter = nil
                }
                ForEach(IpadStatus.allCases) { status in
                    Button(status.title) {
                        store.statusFilter = status
                    }
                }
            } label: {
                filterMenuLabel(
                    store.statusFilter?.title ?? "Tất cả tồn kho",
                    systemImage: "shippingbox"
                )
            }

            Menu {
                ForEach(IpadDebtFilter.allCases) { filter in
                    Button(filter.title) {
                        store.debtFilter = filter
                    }
                }
            } label: {
                filterMenuLabel(store.debtFilter.title, systemImage: "creditcard")
            }
        }
    }

    private func filterMenuLabel(_ title: String, systemImage: String) -> some View {
        Label(title, systemImage: systemImage)
            .font(.caption.weight(.semibold))
            .lineLimit(1)
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(AppTheme.cardBackground, in: RoundedRectangle(cornerRadius: 13))
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
    case edit(IpadTransaction)

    var id: String {
        switch self {
        case .add: "add"
        case .sale(let transaction): "sale-\(transaction.id)"
        case .edit(let transaction): "edit-\(transaction.id)"
        }
    }
}

private struct IpadRow: View {
    @Environment(PortfolioStore.self) private var appStore
    @Environment(IpadStore.self) private var store
    let transaction: IpadTransaction
    let saleAction: () -> Void
    let editAction: () -> Void
    @Binding var errorMessage: String?
    @State private var isExpanded = false

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
                Text(transaction.debtPaid ? "Đã trả nợ" : "Còn nợ")
                    .font(.caption2.bold())
                    .foregroundStyle(transaction.debtPaid ? .green : .red)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 5)
                    .background(
                        (transaction.debtPaid ? Color.green : Color.red).opacity(0.1),
                        in: Capsule()
                    )

                Spacer()

                Image(systemName: "chevron.down")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
                    .rotationEffect(.degrees(isExpanded ? 180 : 0))
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

            if isExpanded {
                Divider()

                Picker("Trạng thái", selection: statusBinding) {
                    ForEach(IpadStatus.allCases) { status in
                        Text(status.title).tag(status)
                    }
                }
                .pickerStyle(.segmented)

                HStack {
                    Button(action: editAction) {
                        Label("Sửa nhập hàng", systemImage: "pencil")
                    }
                    .buttonStyle(.bordered)

                    Button(action: saleAction) {
                        Label(
                            transaction.status == .sold ? "Sửa giá bán" : "Nhập giá bán",
                            systemImage: transaction.status == .sold ? "pencil" : "checkmark.circle"
                        )
                    }
                    .buttonStyle(.borderedProminent)
                }

                HStack {
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
                .buttonStyle(.bordered)
            }
            .font(.caption)
            }
        }
        .padding(16)
        .background(AppTheme.cardBackground, in: RoundedRectangle(cornerRadius: 21))
        .contentShape(RoundedRectangle(cornerRadius: 21))
        .onTapGesture {
            withAnimation(.snappy) {
                isExpanded.toggle()
            }
        }
    }

    private var statusBinding: Binding<IpadStatus> {
        Binding(
            get: { transaction.status },
            set: { status in
                if status == .sold && transaction.sellingPrice == nil {
                    saleAction()
                    return
                }
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
        )
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
    @State private var sellingPrice = 0.0
    @State private var saleDate = Date()
    @State private var note = ""
    @State private var saving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    AppFormHeader(title: "Thêm giao dịch iPad", subtitle: "Nhập thông tin mua máy, khoản vay và giá bán nếu có.")
                    ipadEditorFields(
                        purchaseDate: $purchaseDate,
                        status: $status,
                        purchasePrice: $purchasePrice,
                        extraCost: $extraCost,
                        loanAmount: $loanAmount,
                        sellingPrice: $sellingPrice,
                        saleDate: $saleDate,
                        note: $note
                    )
                    if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
                    AppFormSubmitButton(
                        title: "Thêm giao dịch",
                        systemImage: "plus",
                        isEnabled: purchasePrice > 0 && (status != .sold || sellingPrice > 0),
                        isLoading: saving,
                        tint: .blue
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .onChange(of: purchasePrice) { _, _ in setDefaultLoan() }
            .onChange(of: extraCost) { _, _ in setDefaultLoan() }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
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
                sellingPrice: status == .sold ? sellingPrice : nil,
                saleDate: status == .sold ? saleDate : nil,
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
    @State private var sellingPrice: Double
    @State private var saleDate: Date
    @State private var saving = false
    @State private var errorMessage: String?

    init(transaction: IpadTransaction) {
        self.transaction = transaction
        _sellingPrice = State(initialValue: transaction.sellingPrice ?? 0)
        _saleDate = State(initialValue: transaction.saleDate ?? Date())
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    AppFormHeader(title: "Hoàn tất bán", subtitle: "Nhập giá bán và ngày giao máy.")
                    AppFormCard {
                        AppFormRow(title: "Giá bán", systemImage: "banknote.fill", tint: .blue) {
                            TextField("0", value: $sellingPrice, format: .vndInput)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                            Text("đ").foregroundStyle(.secondary)
                        }
                        AppFormDivider()
                        AppFormRow(title: "Ngày bán", systemImage: "calendar", tint: .blue) {
                            DatePicker("", selection: $saleDate, displayedComponents: .date)
                                .labelsHidden()
                        }
                    }
                    VStack(alignment: .leading, spacing: 5) {
                        Text("LỢI NHUẬN DỰ KIẾN").font(.caption.bold()).foregroundStyle(.secondary)
                        Text((sellingPrice - transaction.totalCost).vnd)
                            .font(.title2.bold())
                            .foregroundStyle(sellingPrice >= transaction.totalCost ? .green : .red)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(20)
                    .background(Color.blue.opacity(0.08), in: RoundedRectangle(cornerRadius: 22))
                    if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
                    AppFormSubmitButton(
                        title: "Lưu giá bán",
                        systemImage: "checkmark",
                        isEnabled: sellingPrice > 0,
                        isLoading: saving,
                        tint: .blue
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
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

private struct EditIpadView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortfolioStore.self) private var appStore
    @Environment(IpadStore.self) private var store

    let transaction: IpadTransaction
    @State private var purchaseDate: Date
    @State private var status: IpadStatus
    @State private var purchasePrice: Double
    @State private var extraCost: Double
    @State private var loanAmount: Double
    @State private var sellingPrice: Double
    @State private var saleDate: Date
    @State private var note: String
    @State private var saving = false
    @State private var errorMessage: String?

    init(transaction: IpadTransaction) {
        self.transaction = transaction
        _purchaseDate = State(initialValue: transaction.purchaseDate)
        _status = State(initialValue: transaction.status)
        _purchasePrice = State(initialValue: transaction.purchasePrice)
        _extraCost = State(initialValue: transaction.extraCost)
        _loanAmount = State(initialValue: transaction.loanAmount)
        _sellingPrice = State(initialValue: transaction.sellingPrice ?? 0)
        _saleDate = State(initialValue: transaction.saleDate ?? Date())
        _note = State(initialValue: transaction.note ?? "")
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    AppFormHeader(title: "Sửa giao dịch iPad", subtitle: "Cập nhật thông tin nhập hàng, khoản vay và bán máy.")
                    ipadEditorFields(
                        purchaseDate: $purchaseDate,
                        status: $status,
                        purchasePrice: $purchasePrice,
                        extraCost: $extraCost,
                        loanAmount: $loanAmount,
                        sellingPrice: $sellingPrice,
                        saleDate: $saleDate,
                        note: $note
                    )
                    if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
                    AppFormSubmitButton(
                        title: "Lưu thay đổi",
                        systemImage: "checkmark",
                        isEnabled: purchasePrice > 0 && (status != .sold || sellingPrice > 0),
                        isLoading: saving,
                        tint: .blue
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                }
            }
        }
    }

    private func save() async {
        saving = true
        do {
            try await store.update(
                transaction,
                purchaseDate: purchaseDate,
                status: status,
                purchasePrice: purchasePrice,
                extraCost: extraCost,
                loanAmount: loanAmount,
                sellingPrice: status == .sold ? sellingPrice : nil,
                saleDate: status == .sold ? saleDate : nil,
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

@MainActor
private func ipadEditorFields(
    purchaseDate: Binding<Date>,
    status: Binding<IpadStatus>,
    purchasePrice: Binding<Double>,
    extraCost: Binding<Double>,
    loanAmount: Binding<Double>,
    sellingPrice: Binding<Double>,
    saleDate: Binding<Date>,
    note: Binding<String>
) -> some View {
    VStack(spacing: 18) {
        AppFormCard {
            AppFormRow(title: "Ngày mua", systemImage: "calendar", tint: .blue) {
                DatePicker("", selection: purchaseDate, displayedComponents: .date).labelsHidden()
            }
            AppFormDivider()
            AppFormRow(title: "Trạng thái", systemImage: "shippingbox.fill", tint: .blue) {
                Picker("", selection: status) {
                    ForEach(IpadStatus.allCases) { item in Text(item.title).tag(item) }
                }
                .labelsHidden()
            }
            AppFormDivider()
            moneyFormRow(title: "Giá mua", icon: "banknote.fill", value: purchasePrice, tint: .blue)
            AppFormDivider()
            moneyFormRow(title: "Chi phí thêm", icon: "plus.circle.fill", value: extraCost, tint: .blue)
            AppFormDivider()
            moneyFormRow(title: "Tiền vay", icon: "creditcard.fill", value: loanAmount, tint: .blue)
            AppFormDivider()
            AppFormRow(title: "Ghi chú", systemImage: "note.text", tint: .blue) {
                TextField("Không bắt buộc", text: note).multilineTextAlignment(.trailing)
            }
        }

        if status.wrappedValue == .sold {
            AppFormCard {
                moneyFormRow(title: "Giá bán", icon: "dollarsign.circle.fill", value: sellingPrice, tint: .green)
                AppFormDivider()
                AppFormRow(title: "Ngày bán", systemImage: "calendar.badge.checkmark", tint: .green) {
                    DatePicker("", selection: saleDate, displayedComponents: .date).labelsHidden()
                }
            }
        }
    }
}

@MainActor
private func moneyFormRow(
    title: String,
    icon: String,
    value: Binding<Double>,
    tint: Color
) -> some View {
    AppFormRow(title: title, systemImage: icon, tint: tint) {
        TextField("0", value: value, format: .vndInput)
            .keyboardType(.numberPad)
            .multilineTextAlignment(.trailing)
        Text("đ").foregroundStyle(.secondary)
    }
}
