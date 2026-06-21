# Gold Trading Manager Mobile

Expo/React Native branch for the existing Next.js gold trading manager.

## Direction

- Expo SDK 56 + React Native 0.85
- Expo Router with `NativeTabs` for iOS 26 native tab behavior and liquid-glass tab chrome
- `@expo/ui/swift-ui` for SwiftUI-backed native controls
- `expo-glass-effect` available for iOS 26 form sheets and glass surfaces
- Supabase data wiring reuses the same database schema as the web app

## Setup

Create `apps/mobile/.env.local`:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Install and run:

```bash
npm install
npm run start
```

For the iOS 26 native component pass, test on iOS Simulator/device. Expo Go can run the app, but a development build is the right target when validating new native UI behavior.

```bash
npm run ios
```

## Current Port Status

- Tabs ported: Vàng, Budget, Tiền trọ, Tích góp, iPad, Cài đặt
- Data ported: Supabase read summaries for all tabs
- Native UI started: `NativeTabs`, SwiftUI `Button`, SwiftUI segmented `Picker`, SwiftUI `Form`/`Section`/`TextField`
- CRUD started: gold transaction creation lives in `gold-add`; Budget thu/chi creation lives in `budget-add`; iPad import creation lives in `ipad-add`
- Remaining work: port Room Rental, Savings, Budget edit/delete, and iPad sale/update forms into Expo Router form sheets using SwiftUI/Expo UI controls

## Checks

```bash
npx tsc --noEmit
npm run lint
```
