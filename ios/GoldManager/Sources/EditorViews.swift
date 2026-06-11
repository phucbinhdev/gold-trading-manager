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
            Form {
                Section {
                    DatePicker("Ngày giao dịch", selection: $date, displayedComponents: .date)
                    LabeledContent("Số lượng (Chỉ)") {
                        TextField("0", value: $amount, format: .number)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                    }
                    LabeledContent("Giá mua (VNĐ/Chỉ)") {
                        TextField("0", value: $price, format: .number)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }
                } footer: {
                    Text("Ví dụ: 1,5 chỉ tương đương 1 chỉ 5 phân.")
                }

                Section("Ghi chú") {
                    TextField("Ví dụ: Mua tặng mẹ...", text: $note, axis: .vertical)
                        .lineLimit(2...4)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Thêm giao dịch")
            .navigationBarTitleDisplayMode(.inline)
            .interactiveDismissDisabled(isSaving)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                        .disabled(isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Lưu") {
                        Task { await save() }
                    }
                    .fontWeight(.semibold)
                    .disabled(!isValid || isSaving)
                }
            }
            .overlay {
                if isSaving {
                    ProgressView()
                        .padding(22)
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
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
            Form {
                Section {
                    TextField("Giá vàng", value: $price, format: .number)
                        .keyboardType(.numberPad)
                        .font(.title2.bold())
                } footer: {
                    Text("Đơn vị VNĐ cho mỗi chỉ vàng.")
                }

                if let errorMessage {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                }
            }
            .navigationTitle("Giá thị trường")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Lưu") {
                        Task { await save() }
                    }
                    .disabled(price < 1_000 || isSaving)
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
        Form {
            Section {
                TextField("https://your-project.supabase.co", text: $projectURL)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.URL)
                    .autocorrectionDisabled()
                SecureField("Supabase anon key", text: $anonKey)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            } header: {
                Text("Kết nối Supabase")
            } footer: {
                Text("Thông tin này được lưu trong Keychain trên thiết bị.")
            }

            Section {
                Button {
                    save()
                } label: {
                    Label("Lưu và kiểm tra kết nối", systemImage: "checkmark.shield.fill")
                }
                .disabled(!draft.isValid)
            }

            Section("Ứng dụng") {
                LabeledContent("Phiên bản", value: "1.0.0")
                LabeledContent("Nền tảng", value: "Native SwiftUI")
            }
        }
        .navigationTitle("Cài đặt")
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
