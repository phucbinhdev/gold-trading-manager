# Gold Trading Manager for iOS

Native SwiftUI client for the four requested application modules.

## Native modules

- Gold portfolio, market price, transaction history, and transaction CRUD
- Monthly budgets with multiple sources, income, expenses, and paid states
- Savings wires with individual payment cells
- iPad inventory, sales, profit, and debt tracking

## Generate and run

```bash
cd ios/GoldManager
xcodegen generate
open GoldManager.xcodeproj
```

The app requires iOS 17 or newer. Copy `Config/Local.xcconfig.example` to
`Config/Local.xcconfig`, then set `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY`. The local config is injected at build time
and is not committed to the repository.

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
