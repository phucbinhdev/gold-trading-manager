import Foundation

@main
struct SavingsLogicCheck {
    static func main() {
        var row = SavingsRow(
            id: UUID(),
            createdAt: Date(),
            label: "Dây kiểm tra",
            periodAmount: 5_000_000,
            periodsLeft: 17,
            remainingAmount: 85_000_000,
            closed: false,
            monthCells: [:],
            cellPaidAt: [:],
            cellNotes: [:],
            closedCount: 0
        )

        row.applyCompletedCells([1])
        precondition(row.totalCells == 17)
        precondition(row.periodsLeft == 16)

        row.applyCompletedCells([1, 2])
        precondition(row.totalCells == 17)
        precondition(row.periodsLeft == 15)

        row.applyCompletedCells([2])
        precondition(row.totalCells == 17)
        precondition(row.periodsLeft == 16)

        print("Savings logic check passed: totalCells=\(row.totalCells)")
    }
}
