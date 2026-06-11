import SwiftUI

struct HistoryView: View {
    @Environment(PortfolioStore.self) private var store
    @State private var selectedYear: Int?
    @State private var pendingDeletion: GoldTransaction?
    @State private var errorMessage: String?

    private var years: [Int] {
        Array(Set(store.transactions.map { Calendar.current.component(.year, from: $0.transactionDate) }))
            .sorted(by: >)
    }

    private var transactions: [GoldTransaction] {
        guard let selectedYear else { return store.transactions }
        return store.transactions.filter {
            Calendar.current.component(.year, from: $0.transactionDate) == selectedYear
        }
    }

    var body: some View {
        Group {
            if transactions.isEmpty {
                StatusMessageView(
                    symbol: "clock",
                    title: "Chưa có giao dịch",
                    message: "Các lần mua vàng sẽ xuất hiện tại đây.",
                    action: { Task { await store.load() } }
                )
            } else {
                List {
                    Section {
                        Picker("Năm", selection: $selectedYear) {
                            Text("Tất cả").tag(Int?.none)
                            ForEach(years, id: \.self) { year in
                                Text(String(year)).tag(Int?.some(year))
                            }
                        }
                        .pickerStyle(.segmented)
                    }

                    Section("Giao dịch") {
                        ForEach(transactions) { transaction in
                            TransactionRow(transaction: transaction)
                                .listRowInsets(EdgeInsets(top: 6, leading: 0, bottom: 6, trailing: 0))
                                .listRowBackground(Color.clear)
                                .swipeActions {
                                    Button(role: .destructive) {
                                        pendingDeletion = transaction
                                    } label: {
                                        Label("Xóa", systemImage: "trash")
                                    }
                                }
                        }
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
        .navigationTitle("Lịch sử")
        .refreshable { await store.load() }
        .task {
            if store.state == .idle {
                await store.load()
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
            Button("Hủy", role: .cancel) {}
        } message: {
            Text("Hành động này không thể hoàn tác.")
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
}
