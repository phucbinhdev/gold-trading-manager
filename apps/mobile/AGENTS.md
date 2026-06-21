# AGENTS.md

## Commands

| Command | Description |
|---------|-------------|
| `npm run start` | Start Expo dev server |
| `npm run ios` | Start on iOS simulator |
| `npm run android` | Start on Android emulator/device |
| `npm run web` | Start web target |
| `npm run lint` | Run Expo ESLint |
| `npx tsc --noEmit` | Type-check the mobile app |

## Stack

- Expo SDK 56
- React Native 0.85
- React 19
- Expo Router
- `expo-router/unstable-native-tabs`
- `@expo/ui/swift-ui`
- `expo-glass-effect`
- Supabase JS
- TanStack Query

## Environment

Use `EXPO_PUBLIC_*` env vars in `apps/mobile/.env.local`:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Native UI Rules

- Prefer `NativeTabs` for tab navigation so iOS 26 uses system liquid-glass tab chrome.
- Wrap every SwiftUI component from `@expo/ui/swift-ui` in `Host`.
- Put iOS-only SwiftUI components behind `.ios.tsx` files with React Native fallback files.
- Use Expo Router form sheets for CRUD forms before building custom modal components.
- Use `ScrollView contentInsetAdjustmentBehavior="automatic"` in route screens.
- Keep route files in `src/app/`; shared components and data code belong under `src/components`, `src/features`, or `src/lib`.

## Port Status

- Read-only dashboard tabs exist for gold, budget, room rental, savings, and iPad data.
- Native action buttons and segmented picker are wired through Expo UI/SwiftUI on iOS.
- Gold transaction creation is ported as the `gold-add` form-sheet route.
- Budget income/expense creation is ported as the `budget-add` form-sheet route.
- iPad import creation is ported as the `ipad-add` form-sheet route.
- Room Rental bill calculator is ported as the `rental-add` form-sheet route (auto-loads settings, shows live total preview).
- Savings creation is ported as the `savings-add` form-sheet route.
- iPad sale is ported as the `ipad-sell` form-sheet route (tap in-stock device in list to sell).
- Budget edit/delete and mark-as-paid toggle are not yet ported; add them as swipe actions or a detail route.
