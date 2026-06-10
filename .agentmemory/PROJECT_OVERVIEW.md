# Local Tour Manager — Project Overview

## What Is This

A Vietnamese tour management web app for travel agencies. Guides (HDV) log tour costs; accountants review and approve; managers export Excel reports. All UI text is **Vietnamese**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite (SWC), port 8080 |
| Routing | React Router v6, HashRouter (GitHub Pages compat) |
| UI | shadcn-ui (Radix UI) + Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| State | TanStack Query v5 (staleTime 5min, gcTime 30min) |
| Forms | React Hook Form + Zod |
| Excel | ExcelJS |
| Search | Fuse.js |
| Charts | Recharts |
| PWA | vite-plugin-pwa with autoUpdate |

## Core Business Domain

A **Tour** represents one trip. It has:
- Basic info: dates, guide, company, passengers, nationality
- 5 line-item subcollections: destinations, expenses, meals, allowances, shoppings
- A financial summary computed on-demand
- A **settlement workflow** (draft → submitted → reviewed → approved/closed)
- Commission tracking for shopping stops (with PIT tax withholding)

## Deployment

- GitHub Pages via `npm run deploy`
- Supabase project: `tuypgzkejqbbvubwomov` (already linked, do not re-link)
- Master admin email: `iposntmk@gmail.com` (hardcoded admin override in `user.ts`)

## Key Commands

```bash
npm run dev           # dev server port 8080
npm run build         # production build
npm run deploy        # deploy to GitHub Pages
npm test              # Vitest tests
supabase db push      # apply migrations to remote
supabase gen types typescript --linked  # regenerate types
```

## File Architecture Law (MANDATORY for all agents)

- **Max 300–350 lines per file** (hard cap 400)
- **DRY strictly** — extract shared logic into utils/hooks/services
- **Single Responsibility** — one file, one clear purpose
- **No Supabase client in components** — always go through `store` from `@/lib/datastore`
