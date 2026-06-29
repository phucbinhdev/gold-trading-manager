# Gold Trading Manager for iOS

Native SwiftUI client for the four requested application modules.

## Native modules

- Gold portfolio, market price, transaction history, and transaction CRUD
- Monthly budgets with multiple sources, income, expenses, and paid states
- Savings wires with individual payment cells
- iPad inventory, sales, profit, and debt tracking

## Home screen widgets

Four data-driven widgets, one per screen (small + medium families):

- **Vàng** — current total value, profit, market price, capital, and realized gain
- **Tính nợ** — remaining balance, total income, and planned expenses for the selected source/month
- **Tích góp** — overall progress ring with paid / goal / remaining
- **iPad** — current-month profit, capital, revenue, and unpaid debt

The app does not bundle networking into the widget extension. Instead each store
writes a compact summary snapshot into the shared App Group
`group.com.phucbinh.goldmanager` after every successful load (and on relevant
edits), then calls `WidgetCenter` to refresh. The widget reads that snapshot, so
it renders instantly and updates whenever the app syncs. Tapping a widget deep
links into the matching tab via `goldmanager://tab/<name>`. Both targets must
keep the App Group capability enabled for sharing to work; if it is missing the
widgets degrade gracefully to a "Mở app để cập nhật" placeholder.

## Generate and run

```bash
cd ios/GoldManager
Scripts/sync-env-xcconfig.sh
xcodegen generate
open GoldManager.xcodeproj
```

The app requires iOS 17 or newer. `Scripts/sync-env-xcconfig.sh` reads the
repo root `.env.local` and generates `Config/Local.xcconfig` for Xcode. It
accepts the web app keys `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, or the native aliases
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The local
config is injected at build time and is not committed to the repository.

The Supabase project must allow the anon role to select, insert, and delete
rows in the same tables used by the web application.

## Verification

Run strict Swift 6 checking:

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
SDK_PATH="$(xcrun --sdk iphonesimulator --show-sdk-path)"
xcrun swiftc -typecheck -parse-as-library -swift-version 6 \
  -strict-concurrency=complete \
  -target arm64-apple-ios17.0-simulator -sdk "$SDK_PATH" \
  -module-name GoldManager Sources/*.swift
```

Run the live read-only Supabase and encryption smoke check:

```bash
set -a
source ../../.env.local
set +a

xcrun swiftc -swift-version 6 -strict-concurrency=complete \
  -o /tmp/gold-manager-smoke \
  Sources/Models.swift Sources/BudgetModels.swift Sources/IpadModels.swift \
  Sources/RoomModels.swift Sources/PersonalModels.swift Sources/Services.swift \
  Sources/FeatureAPI.swift Tools/SmokeCheck.swift \
  -framework Security

/tmp/gold-manager-smoke
```
