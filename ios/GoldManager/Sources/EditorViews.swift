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
                            TextField("0", value: $amount, format: .number)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.trailing)
                            Text("chỉ").foregroundStyle(.secondary)
                        }
                        AppFormDivider()
                        AppFormRow(title: "Giá mỗi chỉ", systemImage: "banknote.fill", tint: AppTheme.deepGold) {
                            TextField("0", value: $price, format: .vndInput)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                            Text("đ").foregroundStyle(.secondary)
                        }
                        AppFormDivider()
                        AppFormRow(title: "Ghi chú", systemImage: "note.text", tint: AppTheme.deepGold) {
                            TextField("Không bắt buộc", text: $note)
                                .multilineTextAlignment(.trailing)
                        }
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }

                    AppFormSubmitButton(
                        title: "Lưu giao dịch",
                        systemImage: "checkmark",
                        isEnabled: isValid,
                        isLoading: isSaving,
                        tint: AppTheme.deepGold
                    ) {
                        Task { await save() }
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
                            TextField("0", value: $price, format: .vndInput)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                            Text("đ").foregroundStyle(.secondary)
                        }
                    }
                    if let errorMessage {
                        Text(errorMessage).foregroundStyle(.red)
                    }
                    AppFormSubmitButton(
                        title: "Cập nhật giá",
                        systemImage: "checkmark",
                        isEnabled: price >= 1_000,
                        isLoading: isSaving,
                        tint: AppTheme.deepGold
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

struct SettingsView: View {
    @Environment(PortfolioStore.self) private var store
    @State private var projectURL = ""
    @State private var anonKey = ""
    @State private var message: SettingsMessage?

    private var draft: SupabaseConfiguration {
        SupabaseConfiguration(
            projectURL: projectURL.trimmingCharacters(in: .whitespacesAndNewlines),
            anonKey: anonKey.trimmingCharacters(in: .whitespacesAndNewlines)
        )
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                AppFormHeader(
                    title: "Cài đặt",
                    subtitle: "Cấu hình kết nối dữ liệu Supabase cho ứng dụng."
                )
                AppFormCard {
                    AppFormRow(title: "Project URL", systemImage: "link", tint: AppTheme.deepGold) {
                        TextField("https://...", text: $projectURL)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.URL)
                            .autocorrectionDisabled()
                            .multilineTextAlignment(.trailing)
                    }
                    AppFormDivider()
                    AppFormRow(title: "Anon key", systemImage: "key.fill", tint: AppTheme.deepGold) {
                        SecureField("Nhập khóa", text: $anonKey)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .multilineTextAlignment(.trailing)
                    }
                }
                Text("Thông tin kết nối được lưu trong Keychain trên thiết bị.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                AppFormSubmitButton(
                    title: "Lưu và kiểm tra",
                    systemImage: "checkmark.shield.fill",
                    isEnabled: draft.isValid,
                    isLoading: false,
                    tint: AppTheme.deepGold,
                    action: save
                )
            }
            .padding(20)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("")
        .onAppear {
            projectURL = store.configuration.projectURL
            anonKey = store.configuration.anonKey
        }
        .alert(item: $message) { message in
            Alert(
                title: Text(message.title),
                message: Text(message.detail),
                dismissButton: .default(Text("Đóng"))
            )
        }
    }

    private func save() {
        do {
            try store.saveConfiguration(draft)
            Task {
                await store.load()
                message = SettingsMessage(
                    title: "Đã lưu cấu hình",
                    detail: store.state == .loaded
                        ? "Kết nối Supabase thành công."
                        : "Đã lưu. Hãy kiểm tra URL, anon key và quyền truy cập bảng."
                )
            }
        } catch {
            message = SettingsMessage(title: "Không thể lưu", detail: error.localizedDescription)
        }
    }
}

private struct SettingsMessage: Identifiable {
    let id = UUID()
    let title: String
    let detail: String
}
