import SwiftUI

struct AddTransactionView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortfolioStore.self) private var store
    @State private var date = Date()
    @State private var amount = 0.0
    @State private var price = 0.0
    @State private var note = ""
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
                        AppFormRow(title: "Ngày giao dịch", systemImage: "calendar", tint: AppTheme.deepGold) {
                            DatePicker("", selection: $date, displayedComponents: .date)
                                .labelsHidden()
                        }
                        AppFormDivider()
                        AppFormRow(title: "Số lượng", systemImage: "scalemass.fill", tint: AppTheme.deepGold) {
                            DeferredNumberField(value: $amount, kind: .decimal)
                            Text("chỉ").foregroundStyle(.secondary)
                        }
                        AppFormDivider()
                        AppFormRow(title: "Giá mỗi chỉ", systemImage: "banknote.fill", tint: AppTheme.deepGold) {
                            DeferredNumberField(value: $price, kind: .currency)
                            Text("đ").foregroundStyle(.secondary)
                        }
                        AppFormDivider()
                        AppFormRow(title: "Ghi chú", systemImage: "note.text", tint: AppTheme.deepGold) {
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
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            try await store.add(
                amountChi: amount,
                pricePerChi: price,
                date: date,
                note: note
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
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(transaction: GoldTransaction) {
        self.transaction = transaction
        _date = State(initialValue: transaction.transactionDate)
        _amount = State(initialValue: transaction.amountChi)
        _price = State(initialValue: transaction.pricePerChi)
        _note = State(initialValue: transaction.note ?? "")
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
                        AppFormRow(title: "Ngày giao dịch", systemImage: "calendar", tint: AppTheme.deepGold) {
                            DatePicker("", selection: $date, displayedComponents: .date)
                                .labelsHidden()
                        }
                        AppFormDivider()
                        AppFormRow(title: "Số lượng", systemImage: "scalemass.fill", tint: AppTheme.deepGold) {
                            DeferredNumberField(value: $amount, kind: .decimal)
                            Text("chỉ").foregroundStyle(.secondary)
                        }
                        AppFormDivider()
                        AppFormRow(title: "Giá mỗi chỉ", systemImage: "banknote.fill", tint: AppTheme.deepGold) {
                            DeferredNumberField(value: $price, kind: .currency)
                            Text("đ").foregroundStyle(.secondary)
                        }
                        AppFormDivider()
                        AppFormRow(title: "Ghi chú", systemImage: "note.text", tint: AppTheme.deepGold) {
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
                note: note
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
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    AppFormHeader(
                        title: "Giá thị trường",
                        subtitle: "Cập nhật giá VNĐ hiện tại cho mỗi chỉ vàng."
                    )
                    AppFormCard {
                        AppFormRow(title: "Giá mỗi chỉ", systemImage: "chart.line.uptrend.xyaxis", tint: AppTheme.deepGold) {
                            DeferredNumberField(value: $price, kind: .currency)
                            Text("đ").foregroundStyle(.secondary)
                        }
                    }
                    if let errorMessage {
                        Text(errorMessage).foregroundStyle(.red)
                    }
                }
                .padding(20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                }
                AppFormSaveToolbarItem(
                    isEnabled: price >= 1_000,
                    isLoading: isSaving
                ) {
                    Task { await save() }
                }
            }
            .onAppear { price = store.marketPrice }
        }
    }

    private func save() async {
        isSaving = true
        do {
            try await store.saveMarketPrice(price)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
        }
    }
}
