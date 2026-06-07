export const queryKeys = {
  gold: {
    root: ["gold"] as const,
    transactions: () => [...queryKeys.gold.root, "transactions"] as const,
    currentPrice: () => [...queryKeys.gold.root, "current-price"] as const,
  },
  roomRental: {
    root: ["room-rental"] as const,
    settings: () => [...queryKeys.roomRental.root, "settings"] as const,
    customFees: () => [...queryKeys.roomRental.root, "custom-fees"] as const,
    activeCustomFees: () =>
      [...queryKeys.roomRental.root, "custom-fees", "active"] as const,
    records: () => [...queryKeys.roomRental.root, "records"] as const,
    latestRecord: () => [...queryKeys.roomRental.root, "latest-record"] as const,
  },
  budget: {
    root: ["budget"] as const,
    sources: () => [...queryKeys.budget.root, "sources"] as const,
    month: (sourceId: string | null, monthKey: string) =>
      [...queryKeys.budget.root, "month", sourceId, monthKey] as const,
    expenses: (budgetId: string | null) =>
      [...queryKeys.budget.root, "expenses", budgetId] as const,
  },
  ipad: {
    root: ["ipad"] as const,
    transactions: () => [...queryKeys.ipad.root, "transactions"] as const,
  },
  savings: {
    root: ["savings"] as const,
    rows: () => [...queryKeys.savings.root, "rows"] as const,
  },
  vietqr: {
    root: ["vietqr"] as const,
    banks: () => [...queryKeys.vietqr.root, "banks"] as const,
  },
  diary: {
    root: ["diary"] as const,
    entries: () => [...queryKeys.diary.root, "entries"] as const,
  },
  wishlist: {
    root: ["wishlist"] as const,
    items: () => [...queryKeys.wishlist.root, "items"] as const,
  },
} as const;
