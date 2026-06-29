import SwiftUI

struct AddTransactionView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortfolioStore.self) private var store
    @State private var date = Date()
    @State private var amount = 0.0
    @State private var price = 0.0
    @State private var note = ""
    @State private var owner: GoldOwner = .binh
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var isValid: Bool {
        amount >= 0.01 && price >= 1_000
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    AppFormHeader(
                        title: "Thêm giao dịch",
                        subtitle: "Nhập số lượng vàng, giá mua và ngày giao dịch."
                    )

                    AppFormCard {
                        OwnerPickerRow(owner: $owner)
                        AppFormDivider()
                        AppFormRow(title: "Ngày giao dịch", systemImage: "calendar", tint: AppTheme.accent) {
                            DatePicker("", selection: $date, displayedComponents: .date)
                                .labelsHidden()
                        }
                        AppFormDivider()
                        AppFormRow(title: "Số lượng", systemImage: "scalemass.fill", tint: AppTheme.accent) {
                            DeferredNumberField(value: $amount, kind: .decimal)
                            Text("chỉ").foregroundStyle(.secondary)
                        }
                        AppFormDivider()
                        AppFormRow(title: "Giá mỗi chỉ", systemImage: "banknote.fill", tint: AppTheme.accent) {
                            DeferredNumberField(value: $price, kind: .currency)
                            Text("đ").foregroundStyle(.secondary)
                        }
                        AppFormDivider()
                        AppFormRow(title: "Ghi chú", systemImage: "note.text", tint: AppTheme.accent) {
                            TextField("Không bắt buộc", text: $note)
                                .multilineTextAlignment(.trailing)
                                .frame(maxWidth: .infinity, alignment: .trailing)
                        }
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }

                }
                .padding(20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .interactiveDismissDisabled(isSaving)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                        .disabled(isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await save() }
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text("Lưu").fontWeight(.semibold)
                        }
                    }
                    .disabled(!isValid || isSaving)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            try await store.add(
                amountChi: amount,
                pricePerChi: price,
                date: date,
                note: note,
                owner: owner
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
        }
    }
}

struct EditTransactionView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortfolioStore.self) private var store

    let transaction: GoldTransaction

    @State private var date: Date
    @State private var amount: Double
    @State private var price: Double
    @State private var note: String
    @State private var owner: GoldOwner
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(transaction: GoldTransaction) {
        self.transaction = transaction
        _date = State(initialValue: transaction.transactionDate)
        _amount = State(initialValue: transaction.amountChi)
        _price = State(initialValue: transaction.pricePerChi)
        _note = State(initialValue: transaction.note ?? "")
        _owner = State(initialValue: transaction.owner)
    }

    private var isValid: Bool {
        amount >= 0.01 && price >= 1_000
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    AppFormHeader(
                        title: "Chỉnh sửa giao dịch",
                        subtitle: "Cập nhật số lượng vàng, giá mua, ngày và ghi chú."
                    )

                    AppFormCard {
                        OwnerPickerRow(owner: $owner)
                        AppFormDivider()
                        AppFormRow(title: "Ngày giao dịch", systemImage: "calendar", tint: AppTheme.accent) {
                            DatePicker("", selection: $date, displayedComponents: .date)
                                .labelsHidden()
                        }
                        AppFormDivider()
                        AppFormRow(title: "Số lượng", systemImage: "scalemass.fill", tint: AppTheme.accent) {
                            DeferredNumberField(value: $amount, kind: .decimal)
                            Text("chỉ").foregroundStyle(.secondary)
                        }
                        AppFormDivider()
                        AppFormRow(title: "Giá mỗi chỉ", systemImage: "banknote.fill", tint: AppTheme.accent) {
                            DeferredNumberField(value: $price, kind: .currency)
                            Text("đ").foregroundStyle(.secondary)
                        }
                        AppFormDivider()
                        AppFormRow(title: "Ghi chú", systemImage: "note.text", tint: AppTheme.accent) {
                            TextField("Không bắt buộc", text: $note)
                                .multilineTextAlignment(.trailing)
                                .frame(maxWidth: .infinity, alignment: .trailing)
                        }
                    }

                    if let errorMessage {
                        Text(errorMessage).foregroundStyle(.red)
                    }
                }
                .padding(20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .interactiveDismissDisabled(isSaving)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                        .disabled(isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await save() }
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text("Lưu").fontWeight(.semibold)
                        }
                    }
                    .disabled(!isValid || isSaving)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            try await store.update(
                transaction,
                amountChi: amount,
                pricePerChi: price,
                date: date,
                note: note,
                owner: owner
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
        }
    }
}

struct MarketPriceView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortfolioStore.self) private var store

    @State private var price = 0.0
    @State private var side: GoldPriceSide = .buy
    @State private var autoUpdate = true
    @State private var isSaving = false
    @State private var errorMessage: String?

    /// Luôn theo dõi Nhẫn tròn trơn (Rồng Thăng Long) — không cho chọn loại vàng.
    private let quoteName = PortfolioStore.defaultQuoteName

    private var livePrice: Double? {
        store.livePrice(name: quoteName, side: side)
    }

    private var selectedQuote: GoldQuote? {
        store.quote(named: quoteName)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    AppFormHeader(
                        title: "Giá thị trường",
                        subtitle: "Tự lấy giá nhẫn trơn BTMC mỗi ngày, hoặc nhập tay khi cần."
                    )

                    autoCard
                    usePriceButton
                    manualCard

                    if let errorMessage {
                        Text(errorMessage).foregroundStyle(.red)
                    }
                }
                .padding(20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .interactiveDismissDisabled(isSaving)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                        .disabled(isSaving)
                }
                AppFormSaveToolbarItem(
                    isEnabled: price >= 1_000,
                    isLoading: isSaving
                ) {
                    Task { await save() }
                }
            }
            .onAppear {
                price = store.marketPrice
                side = store.priceSide
                autoUpdate = store.autoUpdateEnabled
            }
            .task { await store.refreshLiveQuotes() }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private var autoCard: some View {
        AppFormCard {
            AppFormRow(
                title: "Tự cập nhật mỗi ngày",
                systemImage: "arrow.triangle.2.circlepath",
                tint: AppTheme.accent
            ) {
                Toggle("", isOn: $autoUpdate).labelsHidden()
            }
            AppFormDivider()
            AppFormRow(title: "Định giá theo", systemImage: "arrow.left.arrow.right", tint: AppTheme.accent) {
                Picker("", selection: $side) {
                    ForEach(GoldPriceSide.allCases) { item in
                        Text(item.title).tag(item)
                    }
                }
                .labelsHidden()
                .pickerStyle(.segmented)
                .frame(maxWidth: 200)
            }
            AppFormDivider()
            AppFormRow(
                title: "Giá nhẫn trơn (BTMC)",
                systemImage: "antenna.radiowaves.left.and.right",
                tint: AppTheme.accent
            ) {
                if store.isFetchingQuotes && store.liveQuotes.isEmpty {
                    ProgressView()
                } else if let livePrice {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(livePrice.vnd)
                        if let updated = selectedQuote?.updatedAt, !updated.isEmpty {
                            Text(updated)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                } else {
                    Text("Chưa lấy được")
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    @ViewBuilder
    private var usePriceButton: some View {
        if let livePrice {
            Button {
                price = livePrice
            } label: {
                Label("Dùng giá BTMC (\(livePrice.vnd))", systemImage: "arrow.down.circle.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .tint(AppTheme.accent)
        }
    }

    private var manualCard: some View {
        AppFormCard {
            AppFormRow(title: "Giá mỗi chỉ", systemImage: "pencil", tint: AppTheme.accent) {
                DeferredNumberField(value: $price, kind: .currency)
                Text("đ").foregroundStyle(.secondary)
            }
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            try await store.saveMarketSettings(
                price: price,
                quoteName: quoteName,
                side: side,
                autoUpdate: autoUpdate
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
        }
    }
}

/// Dòng chọn người sở hữu (Bình / Tú) dùng chung cho form thêm & sửa.
struct OwnerPickerRow: View {
    @Binding var owner: GoldOwner

    var body: some View {
        AppFormRow(title: "Của ai", systemImage: "person.2.fill", tint: AppTheme.accent) {
            Picker("", selection: $owner) {
                ForEach(GoldOwner.allCases) { owner in
                    Text(owner.title).tag(owner)
                }
            }
            .pickerStyle(.segmented)
            .frame(maxWidth: 220)
            .labelsHidden()
        }
    }
}

/// Màn hình đánh dấu một giao dịch là đã bán: nhập ngày bán và giá bán mỗi chỉ.
struct MarkSoldView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortfolioStore.self) private var store

    let transaction: GoldTransaction

    @State private var soldDate: Date
    @State private var soldPrice: Double
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(transaction: GoldTransaction, marketPrice: Double) {
        self.transaction = transaction
        _soldDate = State(initialValue: transaction.soldDate ?? Date())
        _soldPrice = State(initialValue: transaction.soldPricePerChi ?? marketPrice)
    }

    private var isValid: Bool { soldPrice >= 1_000 }

    private var realizedProfit: Double {
        transaction.amountChi * soldPrice - transaction.cost
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    AppFormHeader(
                        title: transaction.isSold ? "Sửa giá bán" : "Đánh dấu đã bán",
                        subtitle: "Bán \(transaction.amountChi.goldWeight) chỉ — vốn \(transaction.cost.vnd)."
                    )

                    AppFormCard {
                        AppFormRow(title: "Ngày bán", systemImage: "calendar", tint: AppTheme.accent) {
                            DatePicker("", selection: $soldDate, displayedComponents: .date)
                                .labelsHidden()
                        }
                        AppFormDivider()
                        AppFormRow(title: "Giá bán mỗi chỉ", systemImage: "banknote.fill", tint: AppTheme.accent) {
                            DeferredNumberField(value: $soldPrice, kind: .currency)
                            Text("đ").foregroundStyle(.secondary)
                        }
                        AppFormDivider()
                        AppFormRow(
                            title: "Lợi nhuận",
                            systemImage: realizedProfit >= 0 ? "arrow.up.right" : "arrow.down.right",
                            tint: realizedProfit >= 0 ? .green : .red
                        ) {
                            Text("\(realizedProfit >= 0 ? "+" : "")\(realizedProfit.vnd)")
                                .foregroundStyle(realizedProfit >= 0 ? .green : .red)
                        }
                    }

                    if let errorMessage {
                        Text(errorMessage).foregroundStyle(.red)
                    }
                }
                .padding(20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .interactiveDismissDisabled(isSaving)
            .navigationTitle("Đã bán")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                        .disabled(isSaving)
                }
                AppFormSaveToolbarItem(isEnabled: isValid, isLoading: isSaving) {
                    Task { await save() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            try await store.markSold(
                transaction,
                soldDate: soldDate,
                soldPricePerChi: soldPrice
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
        }
    }
}
