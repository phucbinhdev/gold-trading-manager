import SwiftUI

struct BudgetView: View {
    @Environment(PortfolioStore.self) private var appStore
    @Environment(BudgetStore.self) private var store
    @State private var sheet: BudgetSheet?
    @State private var incomeDraft = 0.0
    @State private var errorMessage: String?
    @State private var pendingDeletion: BudgetEntry?

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
                            BudgetEntryRow(
                                entry: entry,
                                errorMessage: $errorMessage,
                                onEdit: { sheet = .editEntry(entry) },
                                onDelete: { pendingDeletion = entry }
                            )
                        }
                    }
                }
            }
            .padding()
            .padding(.bottom, 70)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("Tính nợ")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    sheet = .addEntry
                } label: {
                    Image(systemName: "plus")
                        .fontWeight(.semibold)
                }
                .disabled(store.budget == nil)
                .accessibilityLabel("Thêm khoản thu chi")
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
            case .editEntry(let entry):
                EditBudgetEntryView(entry: entry)
            case .addSource:
                AddBudgetSourceView()
            case .editSource(let source):
                EditBudgetSourceView(source: source)
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
        .confirmationDialog(
            "Xóa khoản thu chi này?",
            isPresented: Binding(
                get: { pendingDeletion != nil },
                set: { if !$0 { pendingDeletion = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Xóa", role: .destructive) {
                deletePendingEntry()
            }
            Button("Hủy", role: .cancel) {}
        } message: {
            Text("Hành động này không thể hoàn tác.")
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

                if let source = store.selectedSource {
                    Button {
                        sheet = .editSource(source)
                    } label: {
                        Image(systemName: "pencil")
                            .font(.subheadline.weight(.bold))
                            .frame(width: 36, height: 36)
                            .background(Color.indigo.opacity(0.1), in: Circle())
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(.indigo)
                    .accessibilityLabel("Sửa ví \(source.name)")
                }

                Button {
                    sheet = .addSource
                } label: {
                    Image(systemName: "plus")
                        .font(.subheadline.weight(.bold))
                        .frame(width: 36, height: 36)
                        .background(Color.indigo, in: Circle())
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
                .accessibilityLabel("Thêm ví")
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
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .minimumScaleFactor(0.72)
                        .lineLimit(1)
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
                .font(.system(size: 14, weight: .bold, design: .rounded).monospacedDigit())
                .lineLimit(1)
                .minimumScaleFactor(0.65)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func deletePendingEntry() {
        guard let entry = pendingDeletion else { return }
        Task {
            do {
                try await store.delete(entry, configuration: appStore.configuration)
            } catch {
                errorMessage = error.localizedDescription
            }
            pendingDeletion = nil
        }
    }
}

private enum BudgetSheet: Identifiable {
    case addEntry
    case editEntry(BudgetEntry)
    case addSource
    case editSource(BudgetSource)
    case editIncome

    var id: String {
        switch self {
        case .addEntry: "add-entry"
        case .editEntry(let entry): "edit-entry-\(entry.id)"
        case .addSource: "add-source"
        case .editSource(let source): "edit-source-\(source.id)"
        case .editIncome: "edit-income"
        }
    }
}

private struct BudgetEntryRow: View {
    @Environment(PortfolioStore.self) private var appStore
    @Environment(BudgetStore.self) private var store
    let entry: BudgetEntry
    @Binding var errorMessage: String?
    let onEdit: () -> Void
    let onDelete: () -> Void
    @State private var isExpanded = false
    @State private var horizontalOffset: CGFloat = 0

    private let deleteWidth: CGFloat = 82

    private var isPending: Bool {
        store.pendingEntryIds.contains(entry.id)
    }

    private var hasExpandableNote: Bool {
        guard let note = entry.note else { return false }
        return note.count > 100 || note.filter(\.isNewline).count >= 2
    }

    var body: some View {
        ZStack(alignment: .trailing) {
            if canDelete, horizontalOffset < 0 {
                Button(role: .destructive, action: onDelete) {
                    Image(systemName: "trash.fill")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(width: deleteWidth)
                        .frame(maxHeight: .infinity)
                        .background(Color.red)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Xóa khoản thu chi")
            }

            rowContent
                .offset(x: horizontalOffset)
                .contentShape(Rectangle())
                .onTapGesture {
                    if horizontalOffset == 0 {
                        onEdit()
                    } else {
                        closeActions()
                    }
                }
                .simultaneousGesture(swipeGesture, isEnabled: canDelete)
                .accessibilityAddTraits(.isButton)
                .accessibilityHint("Chạm để chỉnh sửa, vuốt sang trái để hiện nút xóa")
                .accessibilityAction(named: "Chỉnh sửa", onEdit)
                .accessibilityAction(named: "Xóa", onDelete)
        }
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .animation(.snappy, value: entry.isSelected)
        .animation(.snappy, value: entry.isPaid)
    }

    private var rowContent: some View {
        VStack(alignment: .leading, spacing: 8) {
            header
            noteSection
        }
        .padding(16)
        .background(
            entry.isPaid
                ? Color.green.opacity(0.08)
                : entry.isSelected ? AppTheme.cardBackground : Color.secondary.opacity(0.07),
            in: RoundedRectangle(cornerRadius: 16)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 16)
                .stroke(cardBorder, lineWidth: 1)
        }
        .shadow(
            color: entry.isSelected && !entry.isPaid ? .black.opacity(0.08) : .clear,
            radius: 10,
            y: 4
        )
        .scaleEffect(entry.isSelected || entry.isPaid ? 1 : 0.96)
        .opacity(entry.isPaid ? 0.82 : entry.isSelected ? 1 : 0.6)
    }

    private var header: some View {
        HStack(spacing: 10) {
            paidButton
            titleBlock
            Spacer(minLength: 4)
            paidBadge
        }
    }

    private var paidButton: some View {
        Button {
            togglePaid()
        } label: {
            ZStack {
                Circle()
                    .fill(entry.isPaid ? Color.green : checkboxBackground)
                    .frame(width: 26, height: 26)

                Circle()
                    .stroke(checkboxBorder, lineWidth: 2)
                    .frame(width: 26, height: 26)

                if isPending {
                    ProgressView()
                        .controlSize(.mini)
                } else if entry.isPaid {
                    Image(systemName: "checkmark")
                        .font(.system(size: 12, weight: .black))
                        .foregroundStyle(.white)
                }
            }
            .frame(width: 44, height: 44)
        }
        .buttonStyle(.plain)
        .disabled(isPending)
        .accessibilityLabel(entry.isPaid ? "Bỏ đánh dấu hoàn thành" : "Đánh dấu hoàn thành")
    }

    private var titleBlock: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(entry.name)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(entry.isSelected || entry.isPaid ? .primary : .secondary)
                .strikethrough(!entry.isSelected && !entry.isPaid)

            Text("\(entry.recordType == .income ? "+" : "-")\(entry.amount.vnd)")
                .font(.caption.monospacedDigit().weight(.semibold))
                .foregroundStyle(entry.recordType == .income ? .green : .red)
        }
    }

    @ViewBuilder
    private var paidBadge: some View {
        if entry.isPaid {
            Text(entry.recordType == .income ? "ĐÃ THU" : "ĐÃ CHI")
                .font(.system(size: 10, weight: .black))
                .foregroundStyle(.green)
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(Color.green.opacity(0.14), in: RoundedRectangle(cornerRadius: 6))
        }
    }

    @ViewBuilder
    private var noteSection: some View {
        if let note = entry.note, !note.isEmpty {
            VStack(alignment: .leading, spacing: 3) {
                Text(note)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(isExpanded ? nil : 2)

                if hasExpandableNote {
                    Button {
                        withAnimation(.snappy) {
                            isExpanded.toggle()
                        }
                    } label: {
                        Label(
                            isExpanded ? "Thu gọn" : "Xem thêm",
                            systemImage: isExpanded ? "chevron.up" : "chevron.down"
                        )
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.indigo)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.leading, 54)
            .padding(.trailing, 8)
        }
    }

    private var checkboxBackground: Color {
        entry.isSelected ? Color.indigo.opacity(0.18) : .clear
    }

    private var checkboxBorder: Color {
        if entry.isPaid { return .green }
        return entry.isSelected ? .indigo : Color.secondary.opacity(0.35)
    }

    private var cardBorder: Color {
        if entry.isPaid { return Color.green.opacity(0.3) }
        return entry.isSelected ? Color.indigo.opacity(0.45) : .clear
    }

    private var canDelete: Bool {
        !isPending
    }

    private var swipeGesture: some Gesture {
        DragGesture(minimumDistance: 12)
            .onChanged { value in
                guard abs(value.translation.width) > abs(value.translation.height) else { return }
                horizontalOffset = min(0, max(-deleteWidth, value.translation.width))
            }
            .onEnded { value in
                let shouldReveal = value.translation.width < -deleteWidth * 0.4
                    || value.predictedEndTranslation.width < -deleteWidth
                withAnimation(.snappy(duration: 0.22)) {
                    horizontalOffset = shouldReveal ? -deleteWidth : 0
                }
            }
    }

    private func closeActions() {
        withAnimation(.snappy(duration: 0.22)) {
            horizontalOffset = 0
        }
    }

    private func toggleSelected() {
        Task {
            do {
                try await store.toggleSelected(entry, configuration: appStore.configuration)
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func togglePaid() {
        Task {
            do {
                try await store.togglePaid(entry, configuration: appStore.configuration)
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

}

private struct EditBudgetEntryView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortfolioStore.self) private var appStore
    @Environment(BudgetStore.self) private var store

    let entry: BudgetEntry
    @State private var type: BudgetRecordType
    @State private var name: String
    @State private var amount: Double
    @State private var note: String
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(entry: BudgetEntry) {
        self.entry = entry
        _type = State(initialValue: entry.recordType)
        _name = State(initialValue: entry.name)
        _amount = State(initialValue: entry.amount)
        _note = State(initialValue: entry.note ?? "")
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    AppFormHeader(title: "Sửa khoản", subtitle: "Cập nhật thông tin khoản thu hoặc chi.")
                    budgetEntryFields(type: $type, name: $name, amount: $amount, note: $note)
                    if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
                }
                .padding(20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                }
                AppFormSaveToolbarItem(
                    isEnabled: !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && amount > 0,
                    isLoading: isSaving
                ) {
                    Task { await save() }
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        do {
            try await store.updateEntry(
                entry,
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
            ScrollView {
                VStack(spacing: 18) {
                    AppFormHeader(title: "Thêm khoản", subtitle: "Tạo khoản thu hoặc chi cho nguồn tiền hiện tại.")
                    budgetEntryFields(type: $type, name: $name, amount: $amount, note: $note)
                    if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
                }
                .padding(20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                }
                AppFormSaveToolbarItem(
                    isEnabled: !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && amount > 0,
                    isLoading: isSaving
                ) {
                    Task { await save() }
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
            ScrollView {
                VStack(spacing: 18) {
                    AppFormHeader(title: "Nguồn tiền mới", subtitle: "Tạo một ví riêng để quản lý thu chi theo tháng.")
                    AppFormCard {
                        AppFormRow(title: "Tên nguồn", systemImage: "wallet.bifold.fill", tint: .indigo) {
                            TextField("Ví dụ: Lương", text: $name)
                                .multilineTextAlignment(.trailing)
                        }
                    }
                    if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
                }
                .padding(20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                }
                AppFormSaveToolbarItem(
                    isEnabled: !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                    isLoading: false,
                    action: addSource
                )
            }
        }
    }

    private func addSource() {
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
}

private struct EditBudgetSourceView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortfolioStore.self) private var appStore
    @Environment(BudgetStore.self) private var store

    let source: BudgetSource

    @State private var name: String
    @State private var isSaving = false
    @State private var confirmsDeactivation = false
    @State private var errorMessage: String?

    init(source: BudgetSource) {
        self.source = source
        _name = State(initialValue: source.name)
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    AppFormHeader(
                        title: "Chỉnh sửa ví",
                        subtitle: "Đổi tên hoặc ẩn ví khỏi danh sách quản lý."
                    )

                    AppFormCard {
                        AppFormRow(title: "Tên ví", systemImage: "wallet.bifold.fill", tint: .indigo) {
                            TextField("Tên ví", text: $name)
                                .multilineTextAlignment(.trailing)
                                .frame(maxWidth: .infinity, alignment: .trailing)
                        }
                    }

                    if let errorMessage {
                        Text(errorMessage).foregroundStyle(.red)
                    }

                    Button(role: .destructive) {
                        confirmsDeactivation = true
                    } label: {
                        Label("Ẩn ví này", systemImage: "eye.slash")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .disabled(store.sources.count <= 1 || isSaving)
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
                    .disabled(trimmedName.isEmpty || isSaving)
                }
            }
            .confirmationDialog(
                "Ẩn ví \(source.name)?",
                isPresented: $confirmsDeactivation,
                titleVisibility: .visible
            ) {
                Button("Ẩn ví", role: .destructive) {
                    Task { await deactivate() }
                }
                Button("Hủy", role: .cancel) {}
            } message: {
                Text("Dữ liệu cũ vẫn được giữ trong Supabase.")
            }
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            try await store.renameSource(
                source,
                name: trimmedName,
                configuration: appStore.configuration
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
        }
    }

    private func deactivate() async {
        isSaving = true
        errorMessage = nil
        do {
            try await store.deactivateSource(source, configuration: appStore.configuration)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
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
            ScrollView {
                VStack(spacing: 18) {
                    AppFormHeader(title: "Tiền hiện có", subtitle: "Cập nhật số dư gốc của nguồn tiền này.")
                    AppFormCard {
                        AppFormRow(title: "Số tiền", systemImage: "banknote.fill", tint: .indigo) {
                            DeferredNumberField(value: $amount, kind: .currency)
                            Text("đ").foregroundStyle(.secondary)
                        }
                    }
                    if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
                }
                .padding(20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                }
                AppFormSaveToolbarItem(
                    isEnabled: amount >= 0,
                    isLoading: false,
                    action: saveIncome
                )
            }
        }
    }

    private func saveIncome() {
        Task {
            do {
                try await store.setBaseIncome(amount, configuration: appStore.configuration)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}

@MainActor
private func budgetEntryFields(
    type: Binding<BudgetRecordType>,
    name: Binding<String>,
    amount: Binding<Double>,
    note: Binding<String>
) -> some View {
    AppFormCard {
        AppFormRow(title: "Loại khoản", systemImage: "arrow.left.arrow.right", tint: .indigo) {
            Picker("", selection: type) {
                ForEach(BudgetRecordType.allCases) { item in
                    Text(item.title).tag(item)
                }
            }
            .labelsHidden()
        }
        AppFormDivider()
        AppFormRow(title: "Tên khoản", systemImage: "tag.fill", tint: .indigo) {
            TextField("Nhập tên", text: name)
                .multilineTextAlignment(.trailing)
        }
        AppFormDivider()
        AppFormRow(title: "Số tiền", systemImage: "banknote.fill", tint: .indigo) {
            DeferredNumberField(value: amount, kind: .currency)
            Text("đ").foregroundStyle(.secondary)
        }
        AppFormDivider()
        AppFormRow(title: "Ghi chú", systemImage: "note.text", tint: .indigo) {
            TextField("Không bắt buộc", text: note)
                .multilineTextAlignment(.trailing)
        }
    }
}
