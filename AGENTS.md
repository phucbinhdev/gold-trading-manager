# AGENTS.md

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (Next.js with --webpack) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |

## Tech Stack

- **Framework:** Next.js 16.1.6 + React 19.2.3
- **Styling:** Tailwind CSS v4 + tw-animate-css
- **Database:** Supabase (PostgreSQL)
- **UI:** shadcn/ui + Radix UI components
- **Package Manager:** npm/yarn (yarn.lock present)

## Environment Setup

Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Migrations

Run migrations via Supabase SQL Editor:
- `supabase/migrations/20260215000000_create_diary.sql`
- `supabase/migrations/20260215000001_add_ai_content_column.sql`
- `supabase/migrations/20260412000000_create_room_rental_tables.sql`

Backup scripts available in `scripts/` (bash + Node.js).

## Routes

| Path | Description |
|------|-------------|
| `/` | Main home (gold trading) |
| `/room-rental` | Room rental billing |
| `/config` | Settings |
| `/history` | History |

## Project Structure

```
app/              # Next.js App Router pages
components/       # React components
  gold/           # Gold trading components
  budget/         # Budget components
  ui/             # Radix UI shadcn components
  wishlist/       # Wishlist components
  diary/          # Diary components
lib/
  supabase/       # Client, types, queries
  utils.ts        # Utility functions (cn, format)
  vietqr.ts       # VietQR payment generator
  crypto/        # Encryption utilities
types/            # TypeScript types
scripts/          # Backup scripts
```

## PWA

- Enabled via `@ducanh2912/next-pwa` in next.config.ts
- Service worker: `public/sw.js`
- Manifest: `public/manifest.json`