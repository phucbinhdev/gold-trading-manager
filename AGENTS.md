# AGENTS.md

This file summarizes the current repository for coding agents working in this project.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Next.js development server with webpack |
| `npm run build` | Create a production build with webpack |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

The repo contains both `package-lock.json` and `yarn.lock`, but current scripts are npm-compatible. Prefer npm unless the user asks otherwise.

## Tech Stack

- **Framework:** Next.js 16.1.6 App Router + React 19.2.3
- **Language:** TypeScript with `strict` enabled
- **Styling:** Tailwind CSS v4, CSS variables in `app/globals.css`, `tw-animate-css`
- **Database:** Supabase/PostgreSQL via `@supabase/supabase-js`
- **Data fetching/cache:** TanStack Query v5
- **UI:** shadcn/ui style components, Radix UI primitives, lucide-react icons
- **PWA:** `@ducanh2912/next-pwa`
- **Other notable libraries:** `sonner`, `date-fns`, `react-hook-form`, `zod`, `recharts`, `vietqr`, `web-haptics`, `xlsx`

## Environment

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Both Supabase clients read these public env vars:

- `lib/supabase/client.ts` for feature pages that query typed tables directly.
- `lib/supabase/index.ts` for room-rental helper functions.

## Routes

| Path | Description |
|------|-------------|
| `/` | Gold trading manager |
| `/budget` | Budget tracking |
| `/room-rental` | Room rental billing calculator |
| `/config` | Room rental settings, custom fees, bank settings |
| `/history` | Room rental bill history and QR actions |
| `/savings` | Savings board |
| `/ipad` | iPad transaction/inventory manager |

The root layout uses Vietnamese locale (`lang="vi"`), wraps all pages with TanStack Query providers, renders the shared bottom navigation, haptic feedback, scroll restoration, and the global Sonner toaster.

## Project Structure

```text
app/                         Next.js App Router pages and route-local components
  savings/_components/       Savings board context, form, and board UI
components/
  budget/                    Budget feature UI
  diary/                     Diary UI
  gold/                      Gold trading UI and bottom navigation
  haptics/                   Web haptic feedback integration
  ipad/                      iPad manager UI
  navigation/                Pull-to-refresh and scroll restoration
  ui/                        shadcn/Radix-style shared UI primitives
  wishlist/                  Wishlist UI
lib/
  hooks/                     Shared client hooks
  supabase/                  Supabase clients and generated/handwritten types
  crypto/                    Encryption helpers
  query-keys.ts              Central TanStack Query key factory
  utils.ts                   Formatting and class utilities
  vietqr.ts                  VietQR bank helpers and payment links
types/                       Room-rental TypeScript interfaces
supabase/migrations/         SQL migrations to apply in Supabase
scripts/                     Backup/import utility scripts
public/                      PWA manifest and app icons/assets
```

## Database Migrations

Apply migrations through the Supabase SQL editor or the project's usual Supabase workflow. Current migration files are:

- `supabase/migrations/20260215000000_create_diary.sql`
- `supabase/migrations/20260215000001_add_ai_content_column.sql`
- `supabase/migrations/20260412000000_create_room_rental_tables.sql`
- `supabase/migrations/20260604000000_create_savings.sql`
- `supabase/migrations/20260604010000_align_savings_app_schema.sql`
- `supabase/migrations/20260605000000_create_ipad_transactions.sql`
- `supabase/migrations/20260605010000_add_ipad_debt_status.sql`
- `supabase/migrations/20260606000000_add_budget_sources.sql`
- `supabase/migrations/20260606000000_add_savings_cell_paid_at.sql`
- `supabase/migrations/20260606000000_update_ipad_inventory_status.sql`
- `supabase/migrations/20260606010000_add_budget_record_type.sql`
- `supabase/migrations/20260607000000_add_savings_cell_notes.sql`
- `supabase/migrations/import_backup_2026_02_15.sql`

Backup data and schema snapshots live under `supabase/backups/` and `backup/`. The main backup script is `scripts/backup-db.js`.

## Coding Notes

- Most feature pages are client components and use Supabase directly or through small helper functions.
- Prefer existing shared primitives from `components/ui/` and layout helpers from `components/ui/PageLayout.tsx`.
- Use `queryKeys` from `lib/query-keys.ts` for TanStack Query cache keys.
- Use the `@/*` path alias from `tsconfig.json`.
- Keep mobile/PWA constraints in mind: `app/globals.css` defines safe-area padding, tap targets, user-selection behavior, and app container widths.
- shadcn configuration uses the `new-york` style, neutral base color, CSS variables, and lucide icons.
- Do not commit `.env.local`; it is local-only.

## PWA

- Configured in `next.config.ts` with `@ducanh2912/next-pwa`.
- PWA output destination is `public`.
- PWA is disabled in development via `process.env.NODE_ENV === "development"`.
- Manifest is `public/manifest.json`; app icons are in `public/icons/`.

