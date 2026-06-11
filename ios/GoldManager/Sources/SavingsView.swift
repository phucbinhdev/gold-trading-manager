import SwiftUI

private let savingsAccent = Color(red: 0.12, green: 0.72, blue: 0.42)

struct SavingsView: View {
    @Environment(SavingsStore.self) private var store
    @Environment(PortfolioStore.self) private var appStore
    @State private var isAdding = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 18) {
                    SavingsSummaryCard(
                        paid: store.totalPaid,
                        goal: store.totalGoal
                    )

                    HStack(alignment: .firstTextBaseline) {
                        Text("Các dây tích góp")
                            .font(.title3.weight(.bold))

                        Spacer()

                        Text("\(store.rows.count) dây")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top, 4)

                    if store.state == .loading && store.rows.isEmpty {
                        ProgressView("Đang tải dữ liệu...")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 56)
                    } else if store.rows.isEmpty {
                        SavingsEmptyState {
                            isAdding = true
                        }
                    } else {
                        ForEach(store.rows) { row in
                            SavingsCard(
                                row: row,
                                isUpdating: store.pendingIds.contains(row.id),
                                onToggle: { index in
                                    Task {
                                        do {
                                            try await store.toggleCell(
                                                row: row,
                                                number: index + 1,
                                                configuration: appStore.configuration
                                            )
                                        } catch {
                                            errorMessage = error.localizedDescription
                                        }
                                    }
                                },
                                onDelete: {
                                    Task {
                                        do {
                                            try await store.delete(
                                                row,
                                                configuration: appStore.configuration
                                            )
                                        } catch {
                                            errorMessage = error.localizedDescription
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 12)
                .padding(.bottom, 28)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationTitle("Tích góp")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isAdding = true
                    } label: {
                        Label("Thêm dây", systemImage: "plus")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .frame(height: 44)
                            .background(savingsAccent, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Tạo một dây tích góp mới")
                }
            }
            .refreshable {
                await store.load(configuration: appStore.configuration)
            }
            .sheet(isPresented: $isAdding) {
                AddSavingsView()
                    .environment(store)
                    .environment(appStore)
                    .presentationDetents([.large])
            }
            .task {
                if store.state == .idle {
                    await store.load(configuration: appStore.configuration)
                }
            }
            .alert("Không thể thực hiện", isPresented: errorBinding) {
                Button("Đóng", role: .cancel) {}
            } message: {
                Text(errorMessage ?? "Đã xảy ra lỗi.")
            }
        }
    }

    private var errorBinding: Binding<Bool> {
        Binding(
            get: { errorMessage != nil },
            set: { isPresented in
                if !isPresented {
                    errorMessage = nil
                }
            }
        )
    }
}

private struct SavingsSummaryCard: View {
    let paid: Double
    let goal: Double

    private var remaining: Double {
        max(goal - paid, 0)
    }

    private var progress: Double {
        guard goal > 0 else { return 0 }
        return min(Double(paid) / Double(goal), 1)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 7) {
                    Text("ĐÃ ĐÓNG")
                        .font(.caption.weight(.bold))
                        .tracking(1.1)
                        .foregroundStyle(.white.opacity(0.76))

                    Text(paid.vnd)
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .minimumScaleFactor(0.72)
                        .lineLimit(1)
                }

                Spacer(minLength: 8)

                Image(systemName: "banknote.fill")
                    .font(.system(size: 25, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 58, height: 58)
                    .background(.white.opacity(0.18), in: RoundedRectangle(cornerRadius: 18))
            }

            VStack(spacing: 9) {
                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(.white.opacity(0.22))

                        Capsule()
                            .fill(.white)
                            .frame(width: proxy.size.width * progress)
                    }
                }
                .frame(height: 8)

                HStack {
                    Text("\(Int(progress * 100))% mục tiêu")
                    Spacer()
                    Text("Còn \(remaining.vnd)")
                }
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white.opacity(0.86))
            }

            HStack(spacing: 10) {
                SavingsMetric(
                    title: "Mục tiêu",
                    value: goal.vnd
                )

                SavingsMetric(
                    title: "Đã hoàn tất",
                    value: "\(goal > 0 && paid >= goal ? 100 : Int(progress * 100))%"
                )
            }
        }
        .padding(22)
        .background(
            LinearGradient(
                colors: [Color(red: 0.12, green: 0.72, blue: 0.42), Color(red: 0.03, green: 0.65, blue: 0.72)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 28, style: .continuous)
        )
        .shadow(color: savingsAccent.opacity(0.18), radius: 20, y: 10)
    }
}

private struct SavingsMetric: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.72))

            Text(value)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 13)
        .padding(.vertical, 11)
        .background(.white.opacity(0.13), in: RoundedRectangle(cornerRadius: 15))
    }
}

private struct SavingsCard: View {
    let row: SavingsRow
    let isUpdating: Bool
    let onToggle: (Int) -> Void
    let onDelete: () -> Void

    @State private var showsCompletedCells = false

    private var progress: Double {
        guard row.totalCells > 0 else { return 0 }
        return Double(row.completedCells.count) / Double(row.totalCells)
    }

    private var shouldShowCells: Bool {
        !row.closed || showsCompletedCells
    }

    var body: some View {
        VStack(spacing: 0) {
            header

            Divider()
                .padding(.horizontal, 18)

            if row.closed {
                completedSummary
            }

            if shouldShowCells {
                cellsSection
            }
        }
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 25, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 25, style: .continuous)
                .stroke(row.closed ? savingsAccent.opacity(0.2) : Color.primary.opacity(0.06))
        }
        .shadow(color: .black.opacity(0.045), radius: 12, y: 5)
    }

    private var header: some View {
        HStack(spacing: 13) {
            Image(systemName: row.closed ? "checkmark.seal.fill" : "wallet.bifold.fill")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(row.closed ? savingsAccent : .orange)
                .frame(width: 46, height: 46)
                .background(
                    (row.closed ? savingsAccent : Color.orange).opacity(0.11),
                    in: RoundedRectangle(cornerRadius: 15)
                )

            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 8) {
                    Text(row.label)
                        .font(.headline)

                    if row.closed {
                        Text("Hoàn tất")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(savingsAccent)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 5)
                            .background(savingsAccent.opacity(0.1), in: Capsule())
                    }
                }

                Text("\(row.periodAmount.vnd) mỗi ô")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 4)

            Menu {
                Button(role: .destructive, action: onDelete) {
                    Label("Xóa dây", systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.secondary)
                    .frame(width: 48, height: 48)
                    .background(Color(uiColor: .tertiarySystemFill), in: Circle())
                    .contentShape(Circle())
            }
            .accessibilityLabel("Tùy chọn cho \(row.label)")
        }
        .padding(18)
    }

    private var completedSummary: some View {
        VStack(spacing: 14) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Đã đóng đủ \(row.completedCells.count)/\(row.totalCells) ô")
                        .font(.subheadline.weight(.bold))

                    Text((Double(row.totalCells) * row.periodAmount).vnd)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(savingsAccent)
                }

                Spacer()

                Button {
                    withAnimation(.snappy) {
                        showsCompletedCells.toggle()
                    }
                } label: {
                    Label(
                        showsCompletedCells ? "Thu gọn" : "Xem ô",
                        systemImage: showsCompletedCells ? "chevron.up" : "square.grid.2x2"
                    )
                    .font(.subheadline.weight(.semibold))
                    .frame(minWidth: 104, minHeight: 46)
                    .background(savingsAccent.opacity(0.1), in: Capsule())
                }
                .buttonStyle(.plain)
                .foregroundStyle(savingsAccent)
            }

            ProgressView(value: 1)
                .tint(savingsAccent)
        }
        .padding(18)
    }

    private var cellsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(row.closed ? "Chi tiết các ô" : "Chạm để đánh dấu đã đóng")
                        .font(.subheadline.weight(.semibold))

                    if !row.closed {
                        Text("Tiến độ \(row.completedCells.count)/\(row.totalCells) ô")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                if isUpdating {
                    ProgressView()
                } else if !row.closed {
                    Text("\(Int(progress * 100))%")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(savingsAccent)
                }
            }

            if !row.closed {
                ProgressView(value: progress)
                    .tint(savingsAccent)
            }

            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 54, maximum: 66), spacing: 11)],
                spacing: 11
            ) {
                ForEach(0..<row.totalCells, id: \.self) { index in
                    SavingsCellButton(
                        index: index,
                        date: row.cellPaidAt[String(index + 1)]
                            .flatMap(DateFormatters.parseISO8601),
                        isDisabled: isUpdating
                    ) {
                        onToggle(index)
                    }
                }
            }

            HStack(spacing: 12) {
                Label(
                    "\(row.completedCells.count)/\(row.totalCells) ô",
                    systemImage: "checkmark.circle.fill"
                )
                .foregroundStyle(savingsAccent)

                Spacer()

                Text("Còn \(row.remainingAmount.vnd)")
                    .foregroundStyle(row.remainingAmount == 0 ? savingsAccent : .orange)
            }
            .font(.subheadline.weight(.semibold))
        }
        .padding(18)
        .padding(.top, row.closed ? -4 : 0)
    }
}

private struct SavingsCellButton: View {
    let index: Int
    let date: Date?
    let isDisabled: Bool
    let action: () -> Void

    private var isCompleted: Bool {
        date != nil
    }

    var body: some View {
        Button(action: action) {
            VStack(spacing: 3) {
                if let date {
                    Image(systemName: "checkmark")
                        .font(.system(size: 16, weight: .black))

                    Text(date.formatted(.dateTime.day().month()))
                        .font(.system(size: 9, weight: .bold, design: .rounded))
                        .lineLimit(1)
                } else {
                    Text("\(index + 1)")
                        .font(.system(size: 19, weight: .bold, design: .rounded))
                }
            }
            .foregroundStyle(isCompleted ? .white : .primary)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(
                isCompleted ? savingsAccent : Color(uiColor: .tertiarySystemGroupedBackground),
                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
            )
            .overlay {
                if !isCompleted {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Color.primary.opacity(0.09))
                }
            }
            .contentShape(RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain)
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.55 : 1)
        .accessibilityLabel(
            isCompleted
                ? "Ô \(index + 1), đã đóng"
                : "Ô \(index + 1), chưa đóng"
        )
        .accessibilityHint(isCompleted ? "Chạm để bỏ đánh dấu" : "Chạm để đánh dấu đã đóng")
    }
}

private struct SavingsEmptyState: View {
    let onAdd: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "banknote.fill")
                .font(.system(size: 30, weight: .semibold))
                .foregroundStyle(savingsAccent)
                .frame(width: 66, height: 66)
                .background(savingsAccent.opacity(0.1), in: RoundedRectangle(cornerRadius: 20))

            Text("Chưa có dây tích góp")
                .font(.headline)

            Text("Tạo dây đầu tiên để theo dõi từng lần đóng tiền.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button(action: onAdd) {
                Label("Tạo dây mới", systemImage: "plus")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(savingsAccent, in: RoundedRectangle(cornerRadius: 17))
            }
            .buttonStyle(.plain)
            .padding(.top, 5)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 25))
    }
}

private struct AddSavingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(SavingsStore.self) private var store
    @Environment(PortfolioStore.self) private var appStore

    @State private var label = ""
    @State private var amount = 5_000_000.0
    @State private var totalCells = 10
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var canSave: Bool {
        !label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        amount > 0 &&
        totalCells > 0 &&
        !isSaving
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Tạo dây mới")
                            .font(.largeTitle.weight(.bold))

                        Text("Thiết lập số tiền mỗi ô và số lần cần đóng.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    VStack(spacing: 0) {
                        SavingsFormField(
                            title: "Tên dây",
                            systemImage: "tag.fill"
                        ) {
                            TextField("Ví dụ: Dây tháng 6", text: $label)
                                .textInputAutocapitalization(.sentences)
                                .multilineTextAlignment(.trailing)
                        }

                        Divider().padding(.leading, 52)

                        SavingsFormField(
                            title: "Tiền mỗi ô",
                            systemImage: "banknote.fill"
                        ) {
                            TextField(
                                "0",
                                value: $amount,
                                format: .number.grouping(.automatic)
                            )
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)

                            Text("đ")
                                .foregroundStyle(.secondary)
                        }

                        Divider().padding(.leading, 52)

                        SavingsFormField(
                            title: "Số ô",
                            systemImage: "square.grid.2x2.fill"
                        ) {
                            Stepper(value: $totalCells, in: 1...100) {
                                Text("\(totalCells)")
                                    .font(.headline.monospacedDigit())
                                    .frame(minWidth: 30)
                            }
                            .fixedSize()
                        }
                    }
                    .background(Color(uiColor: .secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 22))

                    VStack(alignment: .leading, spacing: 12) {
                        Text("MỤC TIÊU")
                            .font(.caption.weight(.bold))
                            .tracking(1)
                            .foregroundStyle(.secondary)

                        Text((amount * Double(totalCells)).vnd)
                            .font(.system(size: 30, weight: .bold, design: .rounded))
                            .foregroundStyle(savingsAccent)

                        Text("\(totalCells) ô × \(amount.vnd)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(20)
                    .background(savingsAccent.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 22))

                    Button {
                        save()
                    } label: {
                        HStack(spacing: 10) {
                            if isSaving {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Image(systemName: "checkmark")
                            }

                            Text(isSaving ? "Đang lưu..." : "Tạo dây tích góp")
                        }
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(
                            canSave ? savingsAccent : Color.secondary.opacity(0.35),
                            in: RoundedRectangle(cornerRadius: 18)
                        )
                    }
                    .buttonStyle(.plain)
                    .disabled(!canSave)
                }
                .padding(20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Hủy") {
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .frame(minWidth: 44, minHeight: 44)
                }
            }
            .alert("Không thể tạo dây", isPresented: Binding(
                get: { errorMessage != nil },
                set: { if !$0 { errorMessage = nil } }
            )) {
                Button("Đóng", role: .cancel) {}
            } message: {
                Text(errorMessage ?? "Đã xảy ra lỗi.")
            }
        }
    }

    private func save() {
        guard canSave else { return }
        isSaving = true

        Task {
            do {
                try await store.add(
                    label: label.trimmingCharacters(in: .whitespacesAndNewlines),
                    periodAmount: amount,
                    totalCells: totalCells,
                    configuration: appStore.configuration
                )
                isSaving = false
                dismiss()
            } catch {
                isSaving = false
                errorMessage = error.localizedDescription
            }
        }
    }
}

private struct SavingsFormField<Content: View>: View {
    let title: String
    let systemImage: String
    @ViewBuilder let content: Content

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(savingsAccent)
                .frame(width: 40, height: 40)
                .background(savingsAccent.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))

            Text(title)
                .font(.subheadline.weight(.semibold))

            Spacer()

            HStack(spacing: 6) {
                content
            }
            .font(.subheadline.weight(.semibold))
        }
        .frame(minHeight: 70)
        .padding(.horizontal, 14)
    }
}
