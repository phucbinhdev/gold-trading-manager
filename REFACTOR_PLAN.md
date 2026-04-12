# Refactor Plan

## Current Architecture

### Pages (Routes)
| Path | Page | Status |
|------|------|--------|
| `/` | app/page.tsx | Main SPA - tab navigation |
| `/history` | app/history/page.tsx | Separate route |
| `/config` | app/config/page.tsx | Separate route |
| `/budget` | app/budget/page.tsx | Separate route |
| `/room-rental` | app/room-rental/page.tsx | Separate route |

### Components
| Component | Location | Usage |
|-----------|----------|-------|
| BottomNav | components/gold/BottomNav.tsx | Main nav (active) |
| BottomNav (old) | components/BottomNav.tsx | Unused |
| Overview | components/gold/Overview.tsx | Home tab - gold stats |
| TransactionList | components/gold/TransactionList.tsx | History/Lịch sử tab |
| TransactionForm | components/gold/TransactionForm.tsx | Add gold transaction |
| BudgetPage | components/budget/BudgetPage.tsx | Budget tab |
| ExpenseItem | components/budget/ExpenseItem.tsx | Budget expense item |
| WishlistPage | components/wishlist/WishlistPage.tsx | Hidden |
| DiaryPage | components/diary/DiaryPage.tsx | Hidden |
| BillResult | components/BillResult.tsx | Room rental bill display |

## Issues Identified

### 1. Header Inconsistency
- `app/page.tsx` has inline header (lines 86-101)
- Each route page has its own header
- Not unified

**Recommendation:** Create `PageHeader` component

### 2. Bottom Navigation
- `components/gold/BottomNav.tsx` is tab-based (no routes)
- `components/BottomNav.tsx` is route-based (unused)

**Recommendation:** Use route-based nav, remove duplicate

### 3. Page Layout Patterns
Each page independently repeats:
- Title + subtitle pattern
- Loading state
- Empty state
- Card components

**Recommendation:** Create `PageContainer` component

### 4. Floating Action Button
- Hardcoded in `app/page.tsx` (lines 172-180)
- Different behavior per tab

**Recommendation:** Create `FloatingActionButton` component

### 5. BillResult Component
- Used in room-rental result
- Not used in history detail view consistently

**Status:** OK, can keep as is

### 6. Color Scheme
- Inconsistent use of colors across pages
- Some use green/yellow, some use blue

**Recommendation:** Define design tokens

## Proposed Component Hierarchy

```
PageLayout (wrapper)
├── PageHeader (title, subtitle, actions)
├── PageContent (main content)
├── FAB (floating action button)
└── BottomNav (navigation)

Components to create:
1. components/ui/PageLayout.tsx
2. components/ui/PageHeader.tsx  
3. components/ui/FAB.tsx
```

## Priority

### High (UI Consistency)
1. Create `PageHeader` - unify page titles
2. Clean up unused `BottomNav.tsx`
3. Standardize loading state component

### Medium (Refactor)
4. Create `PageLayout` wrapper for routes
5. Unify color tokens usage

### Low (Optimization)
6. Consider route-based navigation
7. Extract common patterns