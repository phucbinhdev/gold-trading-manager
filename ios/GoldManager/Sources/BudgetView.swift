import SwiftUI

struct BudgetView: View {
    @Environment(PortfolioStore.self) private var appStore
    @Environment(BudgetStore.self) private var store
    @State private var sheet: BudgetSheet?
    @State private var incomeDraft = 0.0
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                monthSelector
                sourceSelector
                summaryCard

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(store.selectedSource?.name ?? "Nguồn tiền")
                            .font(.headline)
                        Text("\(store.entries.count) khoản thu chi")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button {
                        sheet = .addEntry
                    } label: {
                        Label("Thêm", systemImage: "plus")
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(store.budget == nil)
                }

                switch store.state {
                case .idle where store.entries.isEmpty,
                     .loading where store.entries.isEmpty:
                    ProgressView("Đang tải ngân sách...")
                        .frame(maxWidth: .infinity, minHeight: 160)
                case .failed(let message) where store.entries.isEmpty:
                    StatusMessageView(
                        symbol: "exclamationmark.triangle",
                        title: "Không thể tải ngân sách",
                        message: message,
                        action: { Task { await store.load(configuration: appStore.configuration) } }
                    )
                default:
                    if store.entries.isEmpty {
                        StatusMessageView(
                            symbol: "list.bullet.clipboard",
                            title: "Chưa có khoản thu chi",
                            message: "Thêm khoản đầu tiên để tính số tiền còn lại."
                        )
                        .frame(minHeight: 170)
                    } else {
                        ForEach(store.entries) { entry in
                            BudgetEntryRow(entry: entry, errorMessage: $errorMessage)
                        }
                    }
                }
            }
            .padding()
            .padding(.bottom, 70)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("Tính nợ")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        sheet = .addSource
                    } label: {
                        Label("Thêm nguồn tiền", systemImage: "plus")
                    }
                    Button(role: .destructive) {
                        Task {
                            do {
                                try await store.deactivateSelectedSource(
                                    configuration: appStore.configuration
                                )
                            } catch {
                                errorMessage = error.localizedDescription
                            }
                        }
                    } label: {
                        Label("Ẩn nguồn hiện tại", systemImage: "trash")
                    }
                    .disabled(store.sources.count <= 1)
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .refreshable { await store.load(configuration: appStore.configuration) }
        .task { await store.load(configuration: appStore.configuration) }
        .onChange(of: store.budget?.totalIncome) { _, value in
            incomeDraft = value ?? 0
        }
        .sheet(item: $sheet) { sheet in
            switch sheet {
            case .addEntry:
                AddBudgetEntryView()
            case .addSource:
                AddBudgetSourceView()
            case .editIncome:
                EditBudgetIncomeView(initialValue: store.budget?.totalIncome ?? 0)
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

    private var monthSelector: some View {
        HStack {
            Button {
                Task { await store.moveMonth(by: -1, configuration: appStore.configuration) }
            } label: {
                Image(systemName: "chevron.left")
            }
            Spacer()
            VStack(spacing: 2) {
                Text("THÁNG")
                    .font(.caption2.bold())
                    .foregroundStyle(.secondary)
                Text(store.month.formatted(.dateTime.month(.twoDigits).year()))
                    .font(.headline)
            }
            Spacer()
            Button {
                Task { await store.moveMonth(by: 1, configuration: appStore.configuration) }
            } label: {
                Image(systemName: "chevron.right")
            }
        }
        .padding()
        .background(AppTheme.cardBackground, in: RoundedRectangle(cornerRadius: 18))
    }

    private var sourceSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                ForEach(store.sources) { source in
                    Button {
                        Task {
                            await store.selectSource(source.id, configuration: appStore.configuration)
                        }
                    } label: {
                        Text(source.name)
                            .font(.subheadline.bold())
                            .padding(.horizontal, 15)
                            .padding(.vertical, 9)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(store.selectedSourceId == source.id ? .white : .primary)
                    .background(
                        store.selectedSourceId == source.id ? Color.indigo : Color.indigo.opacity(0.1),
                        in: Capsule()
                    )
                }
            }
        }
    }

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("TIỀN HIỆN CÓ")
                        .font(.caption.bold())
                        .foregroundStyle(.white.opacity(0.65))
                    Text(store.availableIncome.vnd)
                        .font(.system(.title, design: .rounded, weight: .bold))
                }
                Spacer()
                Button {
                    sheet = .editIncome
                } label: {
                    Image(systemName: "pencil")
                        .frame(width: 42, height: 42)
                        .background(.white.opacity(0.14), in: Circle())
                }
                .buttonStyle(.plain)
            }

            HStack {
                summaryMetric("Thu vào", value: "+\(store.recordIncome.vnd)")
                summaryMetric("Dự kiến chi", value: "-\(store.totalExpenses.vnd)")
                summaryMetric("Còn lại", value: store.remaining.vnd)
            }
        }
        .foregroundStyle(.white)
        .padding(22)
        .background(
            LinearGradient(
                colors: [.indigo, .purple],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 26)
        )
        .shadow(color: .indigo.opacity(0.2), radius: 20, y: 10)
    }

    private func summaryMetric(_ title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.65))
            Text(value)
                .font(.caption.bold())
                .lineLimit(1)
                .minimumScaleFactor(0.65)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private enum BudgetSheet: String, Identifiable {
    case addEntry
    case addSource
    case editIncome
    var id: String { rawValue }
}

private struct BudgetEntryRow: View {
    @Environment(PortfolioStore.self) private var appStore
    @Environment(BudgetStore.self) private var store
    let entry: BudgetEntry
    @Binding var errorMessage: String?

    var body: some View {
        HStack(spacing: 13) {
            Button {
                Task {
                    do {
                        try await store.togglePaid(entry, configuration: appStore.configuration)
                    } catch {
                        errorMessage = error.localizedDescription
                    }
                }
            } label: {
                Image(systemName: entry.isPaid ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(entry.isPaid ? .green : .secondary)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 3) {
                Text(entry.name)
                    .font(.subheadline.bold())
                    .strikethrough(!entry.isSelected && !entry.isPaid)
                if let note = entry.note, !note.isEmpty {
                    Text(note)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }
            Spacer()
            Text("\(entry.recordType == .income ? "+" : "-")\(entry.amount.vnd)")
                .font(.subheadline.bold())
                .foregroundStyle(entry.recordType == .income ? .green : .red)
        }
        .contentShape(Rectangle())
        .onTapGesture {
            guard !entry.isPaid else { return }
            Task {
                do {
                    try await store.toggleSelected(entry, configuration: appStore.configuration)
                } catch {
                    errorMessage = error.localizedDescription
                }
            }
        }
        .padding(15)
        .background(
            entry.isPaid
                ? Color.green.opacity(0.08)
                : entry.isSelected ? AppTheme.cardBackground : Color.secondary.opacity(0.07),
            in: RoundedRectangle(cornerRadius: 18)
        )
        .opacity(entry.isSelected || entry.isPaid ? 1 : 0.58)
        .contextMenu {
            Button(role: .destructive) {
                Task {
                    do {
                        try await store.delete(entry, configuration: appStore.configuration)
                    } catch {
                        errorMessage = error.localizedDescription
                    }
                }
            } label: {
                Label("Xóa", systemImage: "trash")
            }
        }
    }
}

private struct AddBudgetEntryView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortfolioStore.self) private var appStore
    @Environment(BudgetStore.self) private var store
    @State private var type = BudgetRecordType.expense
    @State private var name = ""
    @State private var amount = 0.0
    @State private var note = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Picker("Loại", selection: $type) {
                    ForEach(BudgetRecordType.allCases) { type in
                        Text(type.title).tag(type)
                    }
                }
                .pickerStyle(.segmented)
                TextField("Tên khoản thu chi", text: $name)
                TextField("Số tiền", value: $amount, format: .number)
                    .keyboardType(.numberPad)
                TextField("Ghi chú", text: $note, axis: .vertical)
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
            .navigationTitle("Thêm khoản")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Lưu") { Task { await save() } }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || amount <= 0 || isSaving)
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        do {
            try await store.addEntry(
                type: type,
                name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                amount: amount,
                note: note,
                configuration: appStore.configuration
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
        }
    }
}

private struct AddBudgetSourceView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortfolioStore.self) private var appStore
    @Environment(BudgetStore.self) private var store
    @State private var name = ""
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                TextField("Tên nguồn tiền", text: $name)
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
            .navigationTitle("Nguồn tiền mới")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Thêm") {
                        Task {
                            do {
                                try await store.addSource(
                                    name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                                    configuration: appStore.configuration
                                )
                                dismiss()
                            } catch {
                                errorMessage = error.localizedDescription
                            }
                        }
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}

private struct EditBudgetIncomeView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortfolioStore.self) private var appStore
    @Environment(BudgetStore.self) private var store
    @State private var amount: Double
    @State private var errorMessage: String?

    init(initialValue: Double) {
        _amount = State(initialValue: initialValue)
    }

    var body: some View {
        NavigationStack {
            Form {
                TextField("Tiền gốc hiện có", value: $amount, format: .number)
                    .keyboardType(.numberPad)
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
            .navigationTitle("Tiền hiện có")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Lưu") {
                        Task {
                            do {
                                try await store.setBaseIncome(
                                    amount,
                                    configuration: appStore.configuration
                                )
                                dismiss()
                            } catch {
                                errorMessage = error.localizedDescription
                            }
                        }
                    }
                }
            }
        }
    }
}
