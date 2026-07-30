import Foundation

extension SupabaseClient {
    func fetchBudgetSources(configuration: SupabaseConfiguration) async throws -> [BudgetSource] {
        try await restGet(
            [BudgetSource].self,
            configuration: configuration,
            path: "budget_sources",
            query: [
                URLQueryItem(name: "select", value: "*"),
                URLQueryItem(name: "is_active", value: "eq.true"),
                URLQueryItem(name: "order", value: "sort_order.asc,created_at.asc")
            ]
        )
    }

    func createBudgetSource(
        name: String,
        sortOrder: Int,
        configuration: SupabaseConfiguration
    ) async throws -> BudgetSource {
        struct Payload: Encodable, Sendable {
            let name: String
            let sortOrder: Int
            let isActive = true
            enum CodingKeys: String, CodingKey {
                case name
                case sortOrder = "sort_order"
                case isActive = "is_active"
            }
        }
        let rows: [BudgetSource] = try await restPost(
            Payload(name: name, sortOrder: sortOrder),
            response: [BudgetSource].self,
            configuration: configuration,
            path: "budget_sources"
        )
        guard let source = rows.first else { throw APIError.invalidResponse }
        return source
    }

    func updateBudgetSource(
        id: UUID,
        name: String? = nil,
        isActive: Bool? = nil,
        configuration: SupabaseConfiguration
    ) async throws -> BudgetSource {
        struct Payload: Encodable, Sendable {
            let name: String?
            let isActive: Bool?
            enum CodingKeys: String, CodingKey {
                case name
                case isActive = "is_active"
            }
        }
        let rows: [BudgetSource] = try await restPatch(
            Payload(name: name, isActive: isActive),
            response: [BudgetSource].self,
            configuration: configuration,
            path: "budget_sources",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
        guard let source = rows.first else { throw APIError.invalidResponse }
        return source
    }

    func fetchBudgetMonth(
        sourceId: UUID,
        monthKey: String,
        configuration: SupabaseConfiguration
    ) async throws -> BudgetMonth? {
        let rows: [BudgetMonth] = try await restGet(
            [BudgetMonth].self,
            configuration: configuration,
            path: "budget_months",
            query: [
                URLQueryItem(name: "select", value: "*"),
                URLQueryItem(name: "source_id", value: "eq.\(sourceId.uuidString.lowercased())"),
                URLQueryItem(name: "month_key", value: "eq.\(monthKey)"),
                URLQueryItem(name: "limit", value: "1")
            ]
        )
        return rows.first
    }

    func createBudgetMonth(
        sourceId: UUID,
        monthKey: String,
        configuration: SupabaseConfiguration
    ) async throws -> BudgetMonth {
        struct Payload: Encodable, Sendable {
            let monthKey: String
            let sourceId: UUID
            let totalIncome = 0
            enum CodingKeys: String, CodingKey {
                case monthKey = "month_key"
                case sourceId = "source_id"
                case totalIncome = "total_income"
            }
        }
        let rows: [BudgetMonth] = try await restPost(
            Payload(monthKey: monthKey, sourceId: sourceId),
            response: [BudgetMonth].self,
            configuration: configuration,
            path: "budget_months"
        )
        guard let month = rows.first else { throw APIError.invalidResponse }
        return month
    }

    func fetchBudgetEntries(
        budgetId: UUID,
        configuration: SupabaseConfiguration
    ) async throws -> [BudgetEntry] {
        try await restGet(
            [BudgetEntry].self,
            configuration: configuration,
            path: "budget_expenses",
            query: [
                URLQueryItem(name: "select", value: "*"),
                URLQueryItem(name: "budget_id", value: "eq.\(budgetId.uuidString.lowercased())"),
                URLQueryItem(name: "order", value: "created_at.asc")
            ]
        )
    }

    func updateBudgetIncome(
        id: UUID,
        totalIncome: Double,
        configuration: SupabaseConfiguration
    ) async throws {
        struct Payload: Encodable, Sendable {
            let totalIncome: Double
            enum CodingKeys: String, CodingKey { case totalIncome = "total_income" }
        }
        let _: [BudgetMonth] = try await restPatch(
            Payload(totalIncome: totalIncome),
            response: [BudgetMonth].self,
            configuration: configuration,
            path: "budget_months",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
    }

    func createBudgetEntry(
        budgetId: UUID,
        type: BudgetRecordType,
        name: String,
        amount: Double,
        note: String?,
        configuration: SupabaseConfiguration
    ) async throws -> BudgetEntry {
        struct Payload: Encodable, Sendable {
            let budgetId: UUID
            let recordType: BudgetRecordType
            let name: String
            let amount: Double
            let isSelected = true
            let isPaid = false
            let note: String?
            enum CodingKeys: String, CodingKey {
                case name, amount, note
                case budgetId = "budget_id"
                case recordType = "record_type"
                case isSelected = "is_selected"
                case isPaid = "is_paid"
            }
        }
        let rows: [BudgetEntry] = try await restPost(
            Payload(budgetId: budgetId, recordType: type, name: name, amount: amount, note: note),
            response: [BudgetEntry].self,
            configuration: configuration,
            path: "budget_expenses"
        )
        guard let entry = rows.first else { throw APIError.invalidResponse }
        return entry
    }

    func updateBudgetEntryFlags(
        id: UUID,
        isPaid: Bool,
        isSelected: Bool,
        configuration: SupabaseConfiguration
    ) async throws -> BudgetEntry {
        struct Payload: Encodable, Sendable {
            let isPaid: Bool
            let isSelected: Bool
            enum CodingKeys: String, CodingKey {
                case isPaid = "is_paid"
                case isSelected = "is_selected"
            }
        }
        let rows: [BudgetEntry] = try await restPatch(
            Payload(isPaid: isPaid, isSelected: isSelected),
            response: [BudgetEntry].self,
            configuration: configuration,
            path: "budget_expenses",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
        guard let entry = rows.first else { throw APIError.invalidResponse }
        return entry
    }

    func updateBudgetEntry(
        id: UUID,
        type: BudgetRecordType,
        name: String,
        amount: Double,
        note: String?,
        configuration: SupabaseConfiguration
    ) async throws -> BudgetEntry {
        struct Payload: Encodable, Sendable {
            let recordType: BudgetRecordType
            let name: String
            let amount: Double
            let note: String?

            enum CodingKeys: String, CodingKey {
                case name, amount, note
                case recordType = "record_type"
            }
        }

        let rows: [BudgetEntry] = try await restPatch(
            Payload(recordType: type, name: name, amount: amount, note: note),
            response: [BudgetEntry].self,
            configuration: configuration,
            path: "budget_expenses",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
        guard let entry = rows.first else { throw APIError.invalidResponse }
        return entry
    }

    func deleteBudgetEntry(id: UUID, configuration: SupabaseConfiguration) async throws {
        try await restDelete(
            configuration: configuration,
            path: "budget_expenses",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
    }

    func fetchSavings(configuration: SupabaseConfiguration) async throws -> [SavingsRow] {
        try await restGet(
            [SavingsRow].self,
            configuration: configuration,
            path: "savings",
            query: [
                URLQueryItem(name: "select", value: "*"),
                URLQueryItem(name: "order", value: "created_at.asc")
            ]
        )
    }

    func createSavings(
        label: String,
        periodAmount: Double,
        totalCells: Int,
        configuration: SupabaseConfiguration
    ) async throws {
        struct Payload: Encodable, Sendable {
            let label: String
            let periodAmount: Double
            let periodsLeft: Int
            let remainingAmount: Double
            let closed = false
            let monthCells: [String: Bool] = [:]
            let cellPaidAt: [String: String] = [:]
            let cellNotes: [String: String] = [:]
            let closedCount = 0
            enum CodingKeys: String, CodingKey {
                case label, closed
                case periodAmount = "period_amount"
                case periodsLeft = "periods_left"
                case remainingAmount = "remaining_amount"
                case monthCells = "month_cells"
                case cellPaidAt = "cell_paid_at"
                case cellNotes = "cell_notes"
                case closedCount = "closed_count"
            }
        }
        let payload = Payload(
            label: label,
            periodAmount: periodAmount,
            periodsLeft: totalCells,
            remainingAmount: periodAmount * Double(totalCells)
        )
        let _: [SavingsRow] = try await restPost(
            payload,
            response: [SavingsRow].self,
            configuration: configuration,
            path: "savings"
        )
    }

    func updateSavings(_ row: SavingsRow, configuration: SupabaseConfiguration) async throws {
        struct Payload: Encodable, Sendable {
            let closed: Bool
            let monthCells: [String: Bool]
            let cellPaidAt: [String: String]
            let cellNotes: [String: String]
            let periodsLeft: Int
            let remainingAmount: Double
            let closedCount: Int
            enum CodingKeys: String, CodingKey {
                case closed
                case monthCells = "month_cells"
                case cellPaidAt = "cell_paid_at"
                case cellNotes = "cell_notes"
                case periodsLeft = "periods_left"
                case remainingAmount = "remaining_amount"
                case closedCount = "closed_count"
            }
        }
        let _: [SavingsRow] = try await restPatch(
            Payload(
                closed: row.closed,
                monthCells: row.monthCells,
                cellPaidAt: row.cellPaidAt,
                cellNotes: row.cellNotes,
                periodsLeft: row.periodsLeft,
                remainingAmount: row.remainingAmount,
                closedCount: row.closedCount
            ),
            response: [SavingsRow].self,
            configuration: configuration,
            path: "savings",
            query: [URLQueryItem(name: "id", value: "eq.\(row.id.uuidString.lowercased())")]
        )
    }

    func deleteSavings(id: UUID, configuration: SupabaseConfiguration) async throws {
        try await restDelete(
            configuration: configuration,
            path: "savings",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
    }

    func fetchIpadTransactions(
        configuration: SupabaseConfiguration
    ) async throws -> [IpadTransaction] {
        try await restGet(
            [IpadTransaction].self,
            configuration: configuration,
            path: "ipad_transactions",
            query: [
                URLQueryItem(name: "select", value: "*"),
                URLQueryItem(name: "order", value: "purchase_date.desc,created_at.desc")
            ]
        )
    }

    func createIpadTransaction(
        purchaseDate: Date,
        status: IpadStatus,
        purchasePrice: Double,
        extraCost: Double,
        loanAmount: Double,
        sellingPrice: Double?,
        saleDate: Date?,
        note: String?,
        configuration: SupabaseConfiguration
    ) async throws {
        struct Payload: Encodable, Sendable {
            let purchaseDate: String
            let status: IpadStatus
            let deviceName = "iPad"
            let storage: String? = nil
            let color: String? = nil
            let serialNumber: String? = nil
            let purchasePrice: Double
            let extraCost: Double
            let loanAmount: Double
            let sellingPrice: Double?
            let saleDate: String?
            let note: String?
            enum CodingKeys: String, CodingKey {
                case status, storage, color, note
                case purchaseDate = "purchase_date"
                case deviceName = "device_name"
                case serialNumber = "serial_number"
                case purchasePrice = "purchase_price"
                case extraCost = "extra_cost"
                case loanAmount = "loan_amount"
                case sellingPrice = "selling_price"
                case saleDate = "sale_date"
            }
        }
        let _: [IpadTransaction] = try await restPost(
            Payload(
                purchaseDate: DateFormatters.formatDatabaseDay(purchaseDate),
                status: status,
                purchasePrice: purchasePrice,
                extraCost: extraCost,
                loanAmount: loanAmount,
                sellingPrice: status == .sold ? sellingPrice : nil,
                saleDate: status == .sold ? saleDate.map(DateFormatters.formatDatabaseDay) : nil,
                note: note
            ),
            response: [IpadTransaction].self,
            configuration: configuration,
            path: "ipad_transactions"
        )
    }

    func updateIpadStatus(
        id: UUID,
        status: IpadStatus,
        sellingPrice: Double?,
        saleDate: Date?,
        configuration: SupabaseConfiguration
    ) async throws {
        struct Payload: Encodable, Sendable {
            let status: IpadStatus
            let sellingPrice: Double?
            let saleDate: String?
            enum CodingKeys: String, CodingKey {
                case status
                case sellingPrice = "selling_price"
                case saleDate = "sale_date"
            }
        }
        let _: [IpadTransaction] = try await restPatch(
            Payload(
                status: status,
                sellingPrice: sellingPrice,
                saleDate: saleDate.map(DateFormatters.formatDatabaseDay)
            ),
            response: [IpadTransaction].self,
            configuration: configuration,
            path: "ipad_transactions",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
    }

    func updateIpadTransaction(
        id: UUID,
        purchaseDate: Date,
        status: IpadStatus,
        purchasePrice: Double,
        extraCost: Double,
        loanAmount: Double,
        sellingPrice: Double?,
        saleDate: Date?,
        note: String?,
        configuration: SupabaseConfiguration
    ) async throws {
        struct Payload: Encodable, Sendable {
            let purchaseDate: String
            let status: IpadStatus
            let purchasePrice: Double
            let extraCost: Double
            let loanAmount: Double
            let sellingPrice: Double?
            let saleDate: String?
            let note: String?

            enum CodingKeys: String, CodingKey {
                case status, note
                case purchaseDate = "purchase_date"
                case purchasePrice = "purchase_price"
                case extraCost = "extra_cost"
                case loanAmount = "loan_amount"
                case sellingPrice = "selling_price"
                case saleDate = "sale_date"
            }
        }

        let _: [IpadTransaction] = try await restPatch(
            Payload(
                purchaseDate: DateFormatters.formatDatabaseDay(purchaseDate),
                status: status,
                purchasePrice: purchasePrice,
                extraCost: extraCost,
                loanAmount: loanAmount,
                sellingPrice: status == .sold ? sellingPrice : nil,
                saleDate: status == .sold ? saleDate.map(DateFormatters.formatDatabaseDay) : nil,
                note: note
            ),
            response: [IpadTransaction].self,
            configuration: configuration,
            path: "ipad_transactions",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
    }

    func updateIpadDebt(
        id: UUID,
        paid: Bool,
        configuration: SupabaseConfiguration
    ) async throws {
        struct Payload: Encodable, Sendable {
            let debtPaid: Bool
            let debtPaidAt: String?
            enum CodingKeys: String, CodingKey {
                case debtPaid = "debt_paid"
                case debtPaidAt = "debt_paid_at"
            }
        }
        let _: [IpadTransaction] = try await restPatch(
            Payload(
                debtPaid: paid,
                debtPaidAt: paid ? DateFormatters.formatISO8601(Date()) : nil
            ),
            response: [IpadTransaction].self,
            configuration: configuration,
            path: "ipad_transactions",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
    }

    func deleteIpadTransaction(id: UUID, configuration: SupabaseConfiguration) async throws {
        try await restDelete(
            configuration: configuration,
            path: "ipad_transactions",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
    }

    func fetchRoomSettings(configuration: SupabaseConfiguration) async throws -> RoomSettings? {
        let rows: [RoomSettings] = try await restGet(
            [RoomSettings].self,
            configuration: configuration,
            path: "settings",
            query: [
                URLQueryItem(name: "select", value: "*"),
                URLQueryItem(name: "limit", value: "1")
            ]
        )
        return rows.first
    }

    func saveRoomSettings(
        existingId: UUID?,
        rentPrice: Double,
        electricPrice: Double,
        waterPrice: Double,
        bankId: String?,
        bankName: String?,
        accountNumber: String?,
        accountName: String?,
        configuration: SupabaseConfiguration
    ) async throws -> RoomSettings {
        struct Payload: Encodable, Sendable {
            let rentPrice: Double
            let electricPrice: Double
            let waterPrice: Double
            let bankId: String?
            let bankName: String?
            let accountNumber: String?
            let accountName: String?
            let updatedAt: String
            enum CodingKeys: String, CodingKey {
                case rentPrice = "rent_price"
                case electricPrice = "electric_price"
                case waterPrice = "water_price"
                case bankId = "bank_id"
                case bankName = "bank_name"
                case accountNumber = "account_number"
                case accountName = "account_name"
                case updatedAt = "updated_at"
            }
        }
        let payload = Payload(
            rentPrice: rentPrice,
            electricPrice: electricPrice,
            waterPrice: waterPrice,
            bankId: bankId,
            bankName: bankName,
            accountNumber: accountNumber,
            accountName: accountName,
            updatedAt: DateFormatters.formatISO8601(Date())
        )
        let rows: [RoomSettings]
        if let existingId {
            rows = try await restPatch(
                payload,
                response: [RoomSettings].self,
                configuration: configuration,
                path: "settings",
                query: [URLQueryItem(name: "id", value: "eq.\(existingId.uuidString.lowercased())")]
            )
        } else {
            rows = try await restPost(
                payload,
                response: [RoomSettings].self,
                configuration: configuration,
                path: "settings"
            )
        }
        guard let settings = rows.first else { throw APIError.invalidResponse }
        return settings
    }

    func fetchRoomFees(
        activeOnly: Bool,
        configuration: SupabaseConfiguration
    ) async throws -> [RoomCustomFee] {
        var query = [
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "order", value: "name.asc")
        ]
        if activeOnly {
            query.append(URLQueryItem(name: "is_active", value: "eq.true"))
        }
        return try await restGet(
            [RoomCustomFee].self,
            configuration: configuration,
            path: "custom_fees",
            query: query
        )
    }

    func createRoomFee(
        name: String,
        type: RoomFeeType,
        amount: Double,
        unitName: String?,
        configuration: SupabaseConfiguration
    ) async throws {
        struct Payload: Encodable, Sendable {
            let name: String
            let type: RoomFeeType
            let unitPrice: Double?
            let fixedAmount: Double?
            let unitName: String?
            let isActive = true
            enum CodingKeys: String, CodingKey {
                case name, type
                case unitPrice = "unit_price"
                case fixedAmount = "fixed_amount"
                case unitName = "unit_name"
                case isActive = "is_active"
            }
        }
        let _: [RoomCustomFee] = try await restPost(
            Payload(
                name: name,
                type: type,
                unitPrice: type == .unit ? amount : nil,
                fixedAmount: type == .fixed ? amount : nil,
                unitName: type == .unit ? unitName : nil
            ),
            response: [RoomCustomFee].self,
            configuration: configuration,
            path: "custom_fees"
        )
    }

    func setRoomFeeActive(
        id: UUID,
        active: Bool,
        configuration: SupabaseConfiguration
    ) async throws {
        struct Payload: Encodable, Sendable {
            let isActive: Bool
            enum CodingKeys: String, CodingKey { case isActive = "is_active" }
        }
        let _: [RoomCustomFee] = try await restPatch(
            Payload(isActive: active),
            response: [RoomCustomFee].self,
            configuration: configuration,
            path: "custom_fees",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
    }

    func deleteRoomFee(id: UUID, configuration: SupabaseConfiguration) async throws {
        try await restDelete(
            configuration: configuration,
            path: "custom_fees",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
    }

    func fetchRoomRecords(configuration: SupabaseConfiguration) async throws -> [RoomRecord] {
        try await restGet(
            [RoomRecord].self,
            configuration: configuration,
            path: "records",
            query: [
                URLQueryItem(name: "select", value: "*,record_custom_fees(*)"),
                URLQueryItem(name: "order", value: "month.desc")
            ]
        )
    }

    func createRoomRecord(
        month: Date,
        electricOld: Double,
        electricNew: Double,
        waterOld: Double,
        waterNew: Double,
        calculation: RoomBillCalculation,
        configuration: SupabaseConfiguration
    ) async throws -> RoomRecord {
        struct Payload: Encodable, Sendable {
            let month: String
            let electricOld: Double
            let electricNew: Double
            let waterOld: Double
            let waterNew: Double
            let rentAmount: Double
            let electricAmount: Double
            let waterAmount: Double
            let totalAmount: Double
            enum CodingKeys: String, CodingKey {
                case month
                case electricOld = "electric_old"
                case electricNew = "electric_new"
                case waterOld = "water_old"
                case waterNew = "water_new"
                case rentAmount = "rent_amount"
                case electricAmount = "electric_amount"
                case waterAmount = "water_amount"
                case totalAmount = "total_amount"
            }
        }
        let rows: [RoomRecord] = try await restPost(
            Payload(
                month: DateFormatters.formatDatabaseDay(month),
                electricOld: electricOld,
                electricNew: electricNew,
                waterOld: waterOld,
                waterNew: waterNew,
                rentAmount: calculation.rentAmount,
                electricAmount: calculation.electricAmount,
                waterAmount: calculation.waterAmount,
                totalAmount: calculation.totalAmount
            ),
            response: [RoomRecord].self,
            configuration: configuration,
            path: "records"
        )
        guard let record = rows.first else { throw APIError.invalidResponse }
        return record
    }

    func createRoomRecordFees(
        recordId: UUID,
        fees: [RoomFeeCalculation],
        configuration: SupabaseConfiguration
    ) async throws {
        struct Payload: Encodable, Sendable {
            let recordId: UUID
            let customFeeId: UUID
            let feeName: String
            let quantity: Double
            let amount: Double
            enum CodingKeys: String, CodingKey {
                case quantity, amount
                case recordId = "record_id"
                case customFeeId = "custom_fee_id"
                case feeName = "fee_name"
            }
        }
        guard !fees.isEmpty else { return }
        let payload = fees.map {
            Payload(
                recordId: recordId,
                customFeeId: $0.fee.id,
                feeName: $0.fee.name,
                quantity: $0.quantity,
                amount: $0.amount
            )
        }
        let _: [RoomRecordFee] = try await restPost(
            payload,
            response: [RoomRecordFee].self,
            configuration: configuration,
            path: "record_custom_fees"
        )
    }

    func deleteRoomRecord(id: UUID, configuration: SupabaseConfiguration) async throws {
        try await restDelete(
            configuration: configuration,
            path: "records",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
    }

    func fetchWishlist(configuration: SupabaseConfiguration) async throws -> [WishlistItem] {
        let items: [WishlistItem] = try await restGet(
            [WishlistItem].self,
            configuration: configuration,
            path: "wishlist",
            query: [
                URLQueryItem(name: "select", value: "*"),
                URLQueryItem(name: "order", value: "created_at.desc")
            ]
        )
        return items.sorted {
            if $0.isPurchased != $1.isPurchased { return !$0.isPurchased }
            return $0.priority.rank > $1.priority.rank
        }
    }

    func saveWishlistItem(
        id: UUID?,
        name: String,
        note: String?,
        price: Double?,
        priority: WishlistPriority,
        productURL: String?,
        configuration: SupabaseConfiguration
    ) async throws {
        struct Payload: Encodable, Sendable {
            let name: String
            let note: String?
            let price: Double?
            let priority: WishlistPriority
            let productURL: String?
            enum CodingKeys: String, CodingKey {
                case name, note, price, priority
                case productURL = "product_url"
            }
        }
        let payload = Payload(
            name: name,
            note: note,
            price: price,
            priority: priority,
            productURL: productURL
        )
        if let id {
            let _: [WishlistItem] = try await restPatch(
                payload,
                response: [WishlistItem].self,
                configuration: configuration,
                path: "wishlist",
                query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
            )
        } else {
            let _: [WishlistItem] = try await restPost(
                payload,
                response: [WishlistItem].self,
                configuration: configuration,
                path: "wishlist"
            )
        }
    }

    func toggleWishlistPurchased(
        id: UUID,
        purchased: Bool,
        configuration: SupabaseConfiguration
    ) async throws {
        struct Payload: Encodable, Sendable {
            let isPurchased: Bool
            enum CodingKeys: String, CodingKey { case isPurchased = "is_purchased" }
        }
        let _: [WishlistItem] = try await restPatch(
            Payload(isPurchased: purchased),
            response: [WishlistItem].self,
            configuration: configuration,
            path: "wishlist",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
    }

    func deleteWishlistItem(id: UUID, configuration: SupabaseConfiguration) async throws {
        try await restDelete(
            configuration: configuration,
            path: "wishlist",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
    }

    func fetchDiary(configuration: SupabaseConfiguration) async throws -> [DiaryEntry] {
        try await restGet(
            [DiaryEntry].self,
            configuration: configuration,
            path: "diary",
            query: [
                URLQueryItem(name: "select", value: "*"),
                URLQueryItem(name: "order", value: "date.desc")
            ]
        )
    }

    func saveDiaryEntry(
        id: UUID?,
        date: Date,
        encryptedContent: String,
        mood: String,
        moodLevel: Int,
        configuration: SupabaseConfiguration
    ) async throws {
        struct Payload: Encodable, Sendable {
            let date: String
            let content: String
            let mood: String
            let moodLevel: Int
            let isEncrypted = true
            enum CodingKeys: String, CodingKey {
                case date, content, mood
                case moodLevel = "mood_level"
                case isEncrypted = "is_encrypted"
            }
        }
        let payload = Payload(
            date: DateFormatters.formatDatabaseDay(date),
            content: encryptedContent,
            mood: mood,
            moodLevel: moodLevel
        )
        if let id {
            let _: [DiaryEntry] = try await restPatch(
                payload,
                response: [DiaryEntry].self,
                configuration: configuration,
                path: "diary",
                query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
            )
        } else {
            let _: [DiaryEntry] = try await restPost(
                payload,
                response: [DiaryEntry].self,
                configuration: configuration,
                path: "diary"
            )
        }
    }

    func deleteDiaryEntry(id: UUID, configuration: SupabaseConfiguration) async throws {
        try await restDelete(
            configuration: configuration,
            path: "diary",
            query: [URLQueryItem(name: "id", value: "eq.\(id.uuidString.lowercased())")]
        )
    }
}
