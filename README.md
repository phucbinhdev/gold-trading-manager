# Gold Trading Manager + Room Rental Calculator

Multi-feature Next.js PWA application combining:
- 💰 **Gold Trading Manager** — Track gold portfolio and profits
- 🏠 **Room Rental Calculator** (Tính Tiền Trọ) — Manage room rental expenses

## Features

### Gold Trading
- Track gold transactions with real-time market prices
- Portfolio overview with profit/loss calculations
- Budget tracking
- Wishlist management
- Diary notes

### Room Rental Calculator
- Monthly billing management
- Electricity & water usage tracking
- Custom fees configuration
- VietQR payment code generation
- Bill history & record management

## Tech Stack

- **Framework:** Next.js 16 + React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **State:** None (uses Supabase for backend)
- **Database:** Supabase (PostgreSQL)
- **UI Components:** shadcn/ui + Radix UI
- **Package Manager:** npm/yarn
- **PWA:** next-pwa

## Environment Setup

Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Setup

Apply migrations in Supabase SQL Editor:
1. `supabase-schema.sql` — Core tables
2. `supabase-bank-migration.sql` — Bank configuration
3. `supabase-custom-fees-migration.sql` — Custom fees

## Getting Started

First, run the development server:

```bash
npm install
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Scripts

```bash
npm run dev       # Development server
npm run build     # Production build
npm run start     # Production server
npm run lint      # ESLint
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main home page (multi-tab)
│   ├── room-rental/       # Room rental routes
│   ├── config/            # Settings page
│   └── history/           # History page
├── components/
│   ├── gold/              # Gold trading components
│   ├── budget/            # Budget components
│   ├── ui/                # shadcn/ui components
│   └── RoomRental/        # Room rental components
├── lib/
│   ├── supabase/          # Supabase client & queries
│   ├── utils.ts           # Utility functions
│   └── vietqr.ts          # VietQR payment link generator
└── types/                 # TypeScript types
```

## Features & Navigation

- **Bottom Tab Navigation:** Home, Budget, Room Rental
- **Responsive Design:** Mobile-first PWA
- **Dark Mode:** Supported
- **Offline Support:** PWA enabled

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

---
*Last updated: 2026-04-12*
*Git config: phucbinh.2001@gmail.com*
