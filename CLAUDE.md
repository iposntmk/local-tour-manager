# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Local Tour Manager is a comprehensive tour management web application built with React, TypeScript, Vite, and Supabase. It helps travel agencies and tour operators manage tours, expenses, destinations, guides, and generate professional Excel exports.

The app is PIN-protected (PIN: 0829101188) and stores the unlock state in sessionStorage.

## Development Commands

### Build & Run
```bash
npm run dev              # Start dev server with Vite
npm run build            # Production build
npm run build:dev        # Development mode build
npm run preview          # Preview production build
```

### Testing & Linting
```bash
npm test                 # Run Vitest tests
npm run lint             # Run ESLint
```

### Scripts
```bash
npm run backfill:total-days  # Run total_days backfill script (updates tour records)
```

## Architecture Overview

### Core Stack
- **Frontend**: React 18 + TypeScript + Vite + SWC
- **Routing**: React Router v6
- **UI**: shadcn-ui (Radix UI) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, auth, storage)
- **State Management**: TanStack Query (React Query) for server state
- **Forms**: React Hook Form + Zod validation
- **Excel Export**: ExcelJS (with complex formatting and formulas)

### Data Layer Architecture

The application uses a **Data Store pattern** with a clean abstraction layer:

1. **DataStore Interface** (`src/types/datastore.ts`): Defines all data operations
2. **SupabaseStore Implementation** (`src/lib/datastore/supabase-store.ts`): Concrete Supabase implementation
3. **Store Instance** (`src/lib/datastore/index.ts`): Singleton store export

This architecture allows for easy testing and potential backend swapping. All database interactions MUST go through the store interface.

### Key Type Definitions

**Tour Types** (`src/types/tour.ts`):
- `Tour`: Main tour entity with nested arrays (destinations, expenses, meals, allowances, shoppings)
- `EntityRef`: ID + nameAtBooking pattern for denormalized references (company, guide, nationality)
- `TourSummary`: Calculated financial summary (totalTabs, advancePayment, finalTotal, etc.)
- Tours use **inclusive date counting**: totalDays = (endDate - startDate) + 1

**Master Data Types** (`src/types/master.ts`):
- Guide, Company, Nationality, Province, TouristDestination, Shopping, ExpenseCategory, DetailedExpense
- All master entities have `searchKeywords` arrays for fuzzy search

**Database Schema** (`src/integrations/supabase/types.ts`):
- Auto-generated from Supabase schema
- Tours have separate child tables: `tour_destinations`, `tour_expenses`, `tour_meals`, `tour_allowances`, `tour_shoppings`

### Tour Summary Calculations

Tour summaries are **calculated on-demand** from tour details (destinations, expenses, meals, allowances):

- **totalTabs**: Sum of all destinations, expenses, meals, and allowances (with guest-based multiplication)
- **Calculation Flow**: totalTabs → subtract advancePayment → subtract collectionsForCompany → add companyTip → finalTotal

See `src/lib/tour-utils.ts`:
- `calculateTourSummary()`: Pure calculation function
- `enrichTourWithSummary()`: Enriches tour objects with calculated summaries
- Guest count clamping: Individual items can specify custom guest counts (clamped to tour's totalGuests)

**Important**: The store's `recalculateTourSummary()` method automatically updates summaries after any tour detail changes (add/update/remove destinations/expenses/meals/allowances).

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

**Critical Details**:
- Column structure: A-M (13 columns total)
- Two header rows (row 1 = section headers, row 2 = column headers)
- Frozen headers (first 2 rows)
- Landscape orientation, fit to 1 page width
- TỔNG KẾT section only displays when advancePayment, collectionsForCompany, or companyTip are non-zero

### Responsive Design & Header Modes

The app uses a custom `useHeaderMode` hook (`src/hooks/useHeaderMode.ts`) for adaptive sticky headers:

- **pin**: Sticky below top nav (default)
- **dock**: Sticky at bottom on mobile
- **freeze**: Sticky with backdrop blur

**Responsive Breakpoints**:
- Mobile: Default layout with bottom nav
- Desktop (md+): Top nav at ~64px height, no bottom nav
- Sticky headers use `top-0 md:top-16` pattern to account for top nav

### Page Structure

**Main Pages** (`src/pages/`):
- **Tours**: Main tour list with search/filter (default route `/`)
- **TourDetail**: Full tour editor with tabs (General Info, Destinations, Expenses, Meals, Allowances, Shopping, Images)
- **Statistics**: Analytics dashboard
- **Master Data Pages**: Companies, Guides, Nationalities, Provinces, Destinations, Shopping, ExpenseCategories, DetailedExpenses

**Layout** (`src/components/Layout.tsx`):
- Navigation wrapper (not used for all pages - some pages implement their own nav)

### Form Components & Patterns

**Tour Detail Tabs** (`src/components/tours/`):
- Each tab is a separate component (e.g., `ExpensesTab.tsx`, `DestinationsTab.tsx`)
- Tabs use local state + mutations to update tour data
- Format utilities: `formatCurrency()` from `src/lib/currency-utils.ts`, date utilities from `src/lib/date-utils.ts`

**Common Patterns**:
- Dialog-based CRUD: Most master data uses `<EntityDialog>` pattern
- Comboboxes for entity selection with fuzzy search (using Fuse.js)
- Currency inputs use custom `<CurrencyInput>` component (`src/components/ui/currency-input.tsx`)
- Date inputs use custom `<DateInput>` component for YYYY-MM-DD format

### Important Implementation Notes

1. **Always use the DataStore**: Never import Supabase client directly. Use `import { store } from '@/lib/datastore'`

2. **Tour Queries with includeDetails**:
   ```typescript
   // List view - don't load details (performance)
   store.listTours(query, { includeDetails: false })

   // Detail view - load full nested data
   store.getTour(id)  // Always includes details
   ```

3. **EntityRef Pattern**: When storing references, use `{ id, nameAtBooking }` to denormalize for historical accuracy

4. **Search Keywords**: Master data entities auto-generate search keywords on create/update using `generateSearchKeywords()` from `src/lib/string-utils.ts`

5. **Excel Export Validation**: Before export, validate tour data with `validateTourNumbers()` to catch NaN/Infinity issues

6. **Guest Count Logic**:
   - Tour has `adults`, `children`, `totalGuests` (computed: adults + children)
   - Individual expenses/destinations can override guests count
   - Clamping ensures guest counts don't exceed tour's totalGuests

7. **Date Handling**:
   - All dates stored as YYYY-MM-DD strings
   - Use `date-fns` for date calculations
   - Display formatting: `formatDateDisplay()` and `formatDateRangeDisplay()` from `src/lib/date-utils.ts`

8. **Mobile Considerations**:
   - Tables use responsive wrappers or custom mobile layouts
   - Bottom nav appears only on mobile
   - Touch-friendly button sizes and spacing

## Testing

**Test Setup**:
- Vitest with jsdom environment
- React Testing Library
- Setup file: `vitest.setup.ts`
- Config: `vitest.config.ts`

**Example**: See `src/components/tours/__tests__/ImportTourDialog.test.tsx`

## Environment Variables

Required `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Common Tasks

### Adding a New Master Data Entity
1. Define types in `src/types/master.ts` (Entity, EntityInput)
2. Add Supabase types in `src/integrations/supabase/types.ts`
3. Implement store methods in `src/lib/datastore/supabase-store.ts`
4. Create page component in `src/pages/`
5. Create dialog component in `src/components/{entity}/`
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

## Database Schema Notes

**Tables**:
- `tours` - Main tour records
- `tour_destinations`, `tour_expenses`, `tour_meals`, `tour_allowances`, `tour_shoppings` - Tour sub-collections
- `companies`, `guides`, `nationalities`, `provinces`, `tourist_destinations`, `shoppings`, `expense_categories`, `detailed_expenses` - Master data
- `tour_images` - Tour image storage references

**Cascading Deletes**: Deleting a tour cascades to all related sub-collection records (configured in Supabase).

**Denormalization**: Tours store `{entity}_name_at_booking` fields to preserve historical data even if master records are updated/deleted.
