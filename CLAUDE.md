# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Architecture Laws (MANDATORY)

You are an extremely disciplined senior developer. The following laws are non-negotiable and must be followed in every code change.

### 1. File Size Limit
- **Maximum 300–350 lines per file** (hard cap: 400 lines in exceptional cases).
- If a file would exceed this, **stop and split** into smaller modules before continuing.

### 2. Reusability (DRY)
- Follow **Don't Repeat Yourself** strictly.
- Extract shared logic into functions, hooks, utilities, components, or services.
- Write modular code that can be imported and reused across the codebase.

### 3. Design Principles (Non-negotiable)
- **Single Responsibility Principle**: each file/module has one clear responsibility.
- **Separation of Concerns**: business logic, UI, data access, validation, and error handling must be separated.
- **Encapsulation**: internals are not exposed unless explicitly needed by a caller.

### 4. Recommended Structure
```
utils/ or lib/    — shared pure functions
hooks/            — custom React hooks
services/         — API / store calls
components/       — UI components (as small as possible)
features/ or      — domain-specific modules
  modules/
types/            — TypeScript types
constants/        — app-wide constants
```

### 5. Before Writing a Feature
- Analyze and propose a multi-file split **before** writing code.
- Only write a single file when it is genuinely small with a clear reason.
- Always suggest a modular structure if a file risks growing large.

### 6. Self-Enforcement
- If code starts growing long, **stop, propose a split, then continue**.
- Before finalizing any output, verify no law is violated — fix violations before delivering.

## Project Overview

Local Tour Manager is a comprehensive tour management web application built with React, TypeScript, Vite, and Supabase. It helps travel agencies and tour operators manage tours, expenses, destinations, guides, and generate professional Excel exports.

The app uses **Supabase Auth** (email/password) with role-based access control (admin, editor, viewer). The UI is in Vietnamese.

## Development Commands

### Build & Run
```bash
npm run dev              # Start dev server (port 8080, auto-opens browser)
npm run dev:lan          # Dev server accessible on LAN
npm run build            # Production build
npm run build:dev        # Development mode build
npm run preview          # Preview production build
npm run deploy           # Deploy to GitHub Pages
```

### Testing & Linting
```bash
npm test                 # Run Vitest tests (jsdom, React Testing Library)
npm run lint             # Run ESLint
```

### Scripts
```bash
npm run backfill:total-days   # Run total_days backfill script
npm run upload:tour-images    # Upload tour images to Supabase storage
```

### Installed Local CLI Tools
```bash
supabase --version       # Supabase CLI is available
supabase status          # Check local Supabase services when applicable
supabase db diff         # Inspect database schema changes before migrations
supabase gen types typescript  # Regenerate Supabase TypeScript types when needed

gh --version             # GitHub CLI is available
gh auth status           # Verify GitHub authentication before operations
gh pr view               # Inspect pull requests
gh pr checks             # Inspect PR check status
gh run view --log        # Inspect GitHub Actions run logs
```

Use `gh` for GitHub PRs, issues, Actions runs/logs, and repository metadata when needed. Verify `gh auth status` before GitHub operations.

### Supabase Remote Access (already configured — do NOT ask)

The Supabase CLI is **installed AND logged in**, and this repo is **already linked** to the
remote project `tuypgzkejqbbvubwomov`. Treat this as a standing fact:

- **Do not ask the user to run `supabase login` / `supabase link`, and do not ask them to
  "verify auth/link" first.** It is done. Skip those preamble checks.
- **Run database/SQL operations directly against the linked remote, without asking for
  per-command confirmation.** This includes: `supabase db push`, `supabase migration up
  --linked`, `supabase db execute`, `supabase db diff`, `supabase gen types typescript
  --linked`, and applying SQL/migrations.
- Prefer committing schema changes as migration files in `supabase/migrations/` and applying
  them with `supabase db push` (so the change is reproducible), rather than one-off ad-hoc SQL.
- Edge Functions deploy directly too: `supabase functions deploy <name>` (e.g.
  `analyze-tour-image`). Set function secrets with `supabase secrets set ...`.
- Standing exception — confirm first ONLY for clearly irreversible data loss against remote
  (e.g. `drop table`, `truncate`, `delete`/`update` without a `WHERE`, dropping a column with
  data). Normal additive migrations and DDL do not need confirmation.
- All **application code** must still access the database through `store` from
  `@/lib/datastore` — never the Supabase client directly in components.

## Architecture Overview

### Core Stack
- **Frontend**: React 18 + TypeScript + Vite (SWC plugin, port 8080)
- **Routing**: React Router v6 (HashRouter for GitHub Pages compatibility)
- **UI**: shadcn-ui (Radix UI) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, auth, storage)
- **State Management**: TanStack Query (React Query v5) with 5-min staleTime, 30-min gcTime
- **Forms**: React Hook Form + Zod validation
- **Excel Export**: ExcelJS
- **PWA**: vite-plugin-pwa with autoUpdate, runtime caching for Google Fonts
- **Charts**: Recharts

### Authentication & Authorization

The app uses Supabase Auth with a custom `AuthContext` (`src/contexts/AuthContext.tsx`):

- **Auth flow**: Supabase `onAuthStateChange` listener in `App.tsx` manages session state
- **AuthProvider** wraps the app and provides: `user`, `userProfile`, `loading`, `hasPermission`, `isAdmin`, `isEditor`, `isViewer`
- **Three roles**: `admin` (full access), `editor` (CRUD tours + master data), `viewer` (read-only)
- **Permission checks**: `useAuth()` hook, `useRequirePermission()`, `useRequireAdmin()`, `PermissionGuard` component
- **Route protection**: Routes in `App.tsx` redirect unauthenticated users to `/auth`
- **User profiles** stored in `user_profiles` table, managed via `store.getUserProfile()`
- Permission definitions in `src/types/user.ts`

### Data Layer Architecture

The application uses a **Data Store pattern**:

1. **DataStore Interface** (`src/types/datastore.ts`): Defines all data operations
2. **SupabaseStore Implementation** (`src/lib/datastore/supabase-store.ts`): Concrete Supabase implementation
3. **Store Instance** (`src/lib/datastore/index.ts`): Singleton store export

All database interactions MUST go through the store interface. Never import Supabase client directly in components/pages.

### Key Type Definitions

**Tour Types** (`src/types/tour.ts`):
- `Tour`: Main tour entity with nested arrays (destinations, expenses, meals, allowances, shoppings)
- `EntityRef`: ID + nameAtBooking pattern for denormalized references (company, guide, nationality)
- `TourSummary`: Calculated financial summary (totalTabs, advancePayment, finalTotal, etc.)
- Tours use **inclusive date counting**: totalDays = (endDate - startDate) + 1

**Master Data Types** (`src/types/master.ts`):
- Guide, Company, Nationality, Province, TouristDestination, Shopping, ExpenseCategory, DetailedExpense
- All master entities have `searchKeywords` arrays for fuzzy search
- Ownership-aware entities (Shopping, Guide, etc.) have `isShared?: boolean` and optionally `guideId` for scoped access

**Commission Types** (`src/types/tour.ts`):
- `TourShopping` now includes: `withholdsPit`, `pitRate`, `pitAmount`, `netCommission`, `commissionStatus` (pending/partial/paid), `payments`
- `CommissionPayment`: `amount`, `paymentMethod` (cash/bank_transfer), `paidAt`, `note`, linked via `tourShoppingId`
- Shopping master data has: `commissionRate`, `withholdsPit`, `pitRate`

**User Types** (`src/types/user.ts`):
- `UserProfile`, `UserRole` (admin/editor/viewer), `Permission` (granular action permissions)
- `ROLE_PERMISSIONS` maps roles to allowed actions
- Helper functions: `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`

**Database Schema** (`src/integrations/supabase/types.ts`):
- Auto-generated from Supabase schema
- Tours have separate child tables: `tour_destinations`, `tour_expenses`, `tour_meals`, `tour_allowances`, `tour_shoppings`

### Tour Summary Calculations

Tour summaries are **calculated on-demand** from tour details:

- **totalTabs**: Sum of all destinations, expenses, meals, and allowances (with guest-based multiplication)
- **Calculation Flow**: totalTabs → subtract advancePayment → subtract collectionsForCompany → add companyTip → finalTotal

See `src/lib/tour-utils.ts`:
- `calculateTourSummary()`: Pure calculation function
- `enrichTourWithSummary()`: Enriches tour objects with calculated summaries
- Guest count clamping: Individual items can specify custom guest counts (clamped to tour's totalGuests)

### Master Data Sharing & Ownership

Master data entities support a shared/private ownership model:

- **`isShared` flag**: entities marked shared are globally visible to all users; private entities are scoped to their creator
- **`ShareToggleButton`** (`src/components/master/ShareToggleButton.tsx`): UI toggle that switches an entity between shared/private
- **`SharedBadge`**: displays a globe icon on shared entities in list views
- **Ownership enforcement** (`src/lib/master-ownership.ts`): `canModifyOwnedEntity()` / `ensureCanModifyOwnedEntity()` — admins can modify any entity; non-admins only their own
- Shopping entities additionally support `guideId` scoping so guides only manage their own shops

### Shopping Commission & PIT Tax

Shopping stops track commission payments with optional PIT (Personal Income Tax) withholding:

- Commission rate, PIT rate, and `withholdsPit` flag are configured on Shopping master data
- `ShoppingsTab` displays commission status (pending/partial/paid) with a PIN-gated payment recording UI (PIN: 0829101188)
- Payments recorded as `CommissionPayment` records with cash or bank transfer method
- `pitAmount` and `netCommission` are calculated fields derived from commission amount and PIT rate

### Excel Export System

Location: `src/lib/excel-utils.ts`

**Key Features**:
- Professional formatting with color-coded sections (blue headers, yellow totals, green service sections)
- Formula-based calculations for totals and summaries
- Duplicate destination name detection (highlighted in pink)
- Special merging logic for water bottle expenses ("Nước uống cho khách")
- Date range formatting with smart year display
- Vietnamese currency formatting (₫)

**Export Functions**:
1. `exportTourToExcel(tour)`: Single tour export with TỔNG KẾT section
2. `exportAllToursToExcel(tours)`: All tours in one sheet with grand total
3. `exportAllToursToMonthlyZip(tours)`: ZIP file organized by month folders

**Critical Details**: Column structure A-M (13 columns), two frozen header rows, landscape orientation, TỔNG KẾT only when advancePayment/collectionsForCompany/companyTip are non-zero.

### i18n System

Location: `src/lib/i18n.ts` — All UI text uses a Vietnamese translations object (`vi`) with a `t(key)` helper for nested key lookup. Import and use `t()` for any user-facing strings.

### Responsive Design

- `useHeaderMode` hook (`src/hooks/useHeaderMode.ts`): Adaptive sticky headers (pin/dock/freeze modes)
- Mobile: Bottom nav, sticky headers at bottom
- Desktop (md+): Top nav at ~64px height, no bottom nav
- Sticky headers use `top-0 md:top-16` pattern

### Page Structure

**Main Pages** (`src/pages/`):
- **Index**: PIN-gated entry page (legacy, redirects to auth)
- **Tours**: Main tour list with search/filter (default route `/`)
- **TourDetail**: Full tour editor with tabs
- **Statistics**: Analytics dashboard (PIN-protected: 0829101188, stored in sessionStorage)
- **Auth**: Supabase email/password login page
- **Users**: User profile management (admin only)
- **Master Data Pages**: Companies, Guides, Nationalities, Provinces, Destinations, Shopping, ExpenseCategories, DetailedExpenses
- **NotFound**: 404 page

**Tour Detail Tabs** (`src/components/tours/`):
- TourInfoForm, TourEditForm, TourForm — general info editing
- DestinationsTab, ExpensesTab, MealsTab, AllowancesTab, ShoppingsTab — standard CRUD tabs
- SummaryTab — financial summary display
- CombinedTab — combined view of destinations + expenses + meals
- TourImagesTab — image gallery management
- ImportTourDialog, ImportTourDialogEnhanced, ImportTourReview, EnhancedImportReview — Excel/CSV import

### Form Components & Patterns

- Dialog-based CRUD: `<EntityDialog>` pattern for master data
- Comboboxes with fuzzy search (Fuse.js via `<Command>` component)
- Custom inputs: `<CurrencyInput>`, `<DateInput>`, `<NumberInput>`, `<NumberInputMobile>`, `<TextareaWithSave>`
- `BulkImportDialog` (`src/components/master/BulkImportDialog.tsx`) for bulk CSV import of master data

### UI Libraries & Components

- **shadcn-ui** components in `src/components/ui/` (Radix UI primitives)
- **sonner** for toast notifications
- **Recharts** for statistics charts
- **Embla Carousel** for image carousels
- **react-day-picker** for date picker (calendar component)
- **cmdk** for command palette / combobox search

## Important Implementation Notes

1. **Always use the DataStore**: Import `{ store } from '@/lib/datastore'`, never Supabase client directly

2. **Tour Queries with includeDetails**:
   ```typescript
   store.listTours(query, { includeDetails: false })  // List view — no details
   store.getTour(id)  // Detail view — always includes full nested data
   ```

3. **EntityRef Pattern**: Store references as `{ id, nameAtBooking }` for historical accuracy

4. **Search Keywords**: Auto-generated via `generateSearchKeywords()` from `src/lib/string-utils.ts`

5. **Excel Export Validation**: Call `validateTourNumbers()` before export to catch NaN/Infinity

6. **Guest Count Logic**: `totalGuests = adults + children`; individual items can override guest count, clamped to tour's totalGuests

7. **Date Handling**: All dates are YYYY-MM-DD strings; use `date-fns` for calculations; display via `formatDateDisplay()` / `formatDateRangeDisplay()` from `src/lib/date-utils.ts`

8. **Auth hooks**: Use `useAuth()` for auth state, `useRequirePermission()` for granular access control, `useRequireAdmin()` for admin-only routes

9. **QueryClient defaults**: staleTime = 5 min, gcTime = 30 min, no refetch on window focus/reconnect

## Testing

- Vitest with jsdom environment, React Testing Library, `globals: true`
- Setup: `vitest.setup.ts`, config: `vitest.config.ts`
- Example: `src/components/tours/__tests__/ImportTourDialog.test.tsx`

## Environment Variables

Required `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key
VITE_SUPABASE_BUCKET=your_bucket_name
VITE_APP_BASE_PATH=/              # Optional: base path for deployment (default /)
```

## Common Tasks

### Adding a New Master Data Entity
1. Define types in `src/types/master.ts` (add `isShared?: boolean` if ownership-scoped)
2. Add Supabase types in `src/integrations/supabase/types.ts`
3. Implement store methods in `src/lib/datastore/supabase-store.ts`
4. Create page in `src/pages/` (wire `ShareToggleButton` if ownership applies)
5. Create dialog in `src/components/{entity}/`
6. Add route in `src/App.tsx`

### Adding a New Tour Tab
1. Create tab component in `src/components/tours/{TabName}Tab.tsx`
2. Add tab to `src/pages/TourDetail.tsx`
3. Update tour types if adding new nested data

### Modifying Excel Export Layout
- All layout logic in `src/lib/excel-utils.ts`
- Follow existing patterns for color fills, borders, formulas
- Test with `validateTourNumbers()` before finalizing
- Ensure column letters match (A-M structure)

## Troubleshooting

### `npm run dev` fails with `EPERM: operation not permitted, unlink` on Windows

**Symptom**: Dev server crashes immediately with:
```
Forced re-optimization of dependencies
error when starting dev server:
Error: EPERM: operation not permitted, unlink 'node_modules/.vite/deps/...'
```

**Root cause**: `optimizeDeps.force: true` in `vite.config.ts` makes Vite delete and recreate all dep cache files on every startup. On Windows, Windows Defender or antivirus locks newly-created files for scanning before Vite can unlink them — causing the EPERM crash.

**Fix**: Remove `force: true` from `optimizeDeps` in `vite.config.ts`:
```ts
// Before (broken on Windows)
optimizeDeps: {
  include: ["react", "react-dom", "fuse.js", "exceljs"],
  force: true,
},

// After (correct)
optimizeDeps: {
  include: ["react", "react-dom", "fuse.js", "exceljs"],
},
```

**If the cache is already corrupted** (EPERM persists even after removing `force`):
```cmd
rd /s /q node_modules\.vite
```
Then run `npm run dev` again.

**Do not re-add `force: true`** — it was a Lovable scaffold default that causes this Windows-specific bug. Vite detects dep changes automatically without it.

## Database Schema Notes

**Tables**:
- `tours` — Main tour records
- `tour_destinations`, `tour_expenses`, `tour_meals`, `tour_allowances`, `tour_shoppings` — Tour sub-collections
- `companies`, `guides`, `nationalities`, `provinces`, `tourist_destinations`, `shoppings`, `expense_categories`, `detailed_expenses` — Master data
- `tour_images` — Tour image storage references
- `user_profiles` — User role/status management

**Cascading Deletes**: Deleting a tour cascades to all related sub-collection records.

**Denormalization**: Tours store `{entity}_name_at_booking` fields to preserve historical data even if master records are updated/deleted.
