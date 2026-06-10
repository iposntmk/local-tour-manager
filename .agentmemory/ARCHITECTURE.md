# Architecture — Local Tour Manager

## Directory Structure

```
src/
├── App.tsx                          # Router, auth guard, route definitions
├── main.tsx                         # React entry point
├── contexts/
│   └── AuthContext.tsx              # Auth state, hasPermission(), roles
├── hooks/
│   ├── useTourDetail.ts             # Main hook for TourDetail page (all logic)
│   └── useHeaderMode.ts             # Sticky header behavior (pin/dock/freeze)
├── pages/
│   ├── Tours.tsx                    # Tour list page (default route /)
│   ├── TourDetail.tsx               # Tour detail/editor page
│   ├── Statistics.tsx               # Analytics (PIN-protected: 0829101188)
│   ├── Auth.tsx                     # Supabase login
│   ├── Users.tsx                    # User management (admin only)
│   ├── tours/                       # Sub-components for Tours page
│   │   ├── useTourPageActions.ts    # Export, delete, duplicate handlers
│   │   ├── useTourFilters.ts        # Filter state management
│   │   ├── tour-table-config.ts     # Column definitions
│   │   ├── ToursHeaderControls.tsx  # Top toolbar with export buttons
│   │   ├── ToursDesktopTable.tsx    # Desktop table view
│   │   ├── ToursMobileCards.tsx     # Mobile card view
│   │   └── ...
│   └── [MasterData pages]           # Companies, Guides, Destinations, etc.
├── components/
│   ├── tours/                       # All tour-related components
│   │   ├── TourDetailHeader.tsx     # Header with tabs + action buttons
│   │   ├── SettlementActionsBar.tsx # Submit/approve/reopen workflow buttons
│   │   ├── SummaryWorkflowFooter.tsx# Export button + workflow in Summary tab
│   │   ├── SummaryTab.tsx           # Financial summary display
│   │   ├── DestinationsTab.tsx      # CRUD tab for destinations
│   │   ├── ExpensesTab.tsx          # CRUD tab for expenses
│   │   ├── MealsTab.tsx             # CRUD tab for meals
│   │   ├── AllowancesTab.tsx        # CRUD tab for allowances (CTP)
│   │   ├── ShoppingsTab.tsx         # Shopping + commission tracking
│   │   ├── CombinedTab.tsx          # Combined destinations+expenses+meals view
│   │   ├── TourImagesTab.tsx        # Image gallery
│   │   └── import-review/           # OCR import review sub-components
│   ├── master/                      # Shared master data components
│   │   ├── BulkImportDialog.tsx     # CSV bulk import
│   │   └── ShareToggleButton.tsx    # shared/private toggle
│   └── ui/                          # shadcn-ui primitives
├── lib/
│   ├── datastore/                   # DATA LAYER — all DB access here
│   │   ├── index.ts                 # Exports singleton `store`
│   │   ├── supabase-store.ts        # Main SupabaseStore class
│   │   ├── supabase-client.ts       # Supabase client singleton
│   │   └── modules/                 # Store split by domain
│   │       ├── mappers.ts           # DB row ↔ Tour type conversion
│   │       ├── tour-operations/     # Tour CRUD, items, settlement, payments
│   │       └── master-data/         # Guide, Company, Province, etc.
│   ├── excel/                       # Excel export logic
│   │   ├── excel-worksheet.ts       # Single tour → worksheet
│   │   ├── excel-all-tours.ts       # Multi-tour export + ZIP
│   │   ├── excel-helpers.ts         # Shared helpers, validateTourNumbers
│   │   └── excel-import.ts          # Import from Excel
│   ├── excel-utils.ts               # Re-exports from excel/
│   ├── ocr/                         # OCR image → tour data parsing
│   │   ├── tour-image-parser.ts     # Entry point
│   │   ├── ocr-extractors.ts        # Field extraction patterns
│   │   ├── visit-candidates.ts      # Match visited places
│   │   └── destination-lookup.ts    # Match to master destinations
│   ├── tour-utils.ts                # calculateTourSummary(), enrichTourWithSummary()
│   ├── tour-detail-permissions.ts   # Per-tab, per-field access control
│   ├── settlement-utils.ts          # canEditTourData(), canSubmitTour(), etc.
│   ├── tour-line-utils.ts           # areAllSettlementLinesApproved(), etc.
│   ├── master-ownership.ts          # canModifyOwnedEntity()
│   ├── shopping-commission-utils.ts # PIT/commission calculations
│   ├── i18n.ts                      # Vietnamese translations (t() helper)
│   ├── string-utils.ts              # generateSearchKeywords()
│   ├── date-utils.ts                # formatDateDisplay(), formatDateRangeDisplay()
│   ├── currency-utils.ts            # formatCurrency() → Vietnamese ₫
│   └── permissions.ts               # UI permission labels/groupings
├── types/
│   ├── tour.ts                      # Tour, Destination, Expense, Meal, Allowance, Shopping types
│   ├── master.ts                    # Guide, Company, Province, TouristDestination, etc.
│   ├── user.ts                      # UserProfile, UserRole, Permission, SettlementRole
│   ├── user-permissions.ts          # ROLE_PERMISSIONS, ALL_PERMISSIONS, getEffectivePermissions
│   └── datastore.ts                 # DataStore interface (contract for all DB ops)
└── integrations/supabase/
    └── types.ts                     # Auto-generated Supabase DB types
```

## Data Flow Pattern

```
Component / Page
    → hook (useTourDetail, useTourPageActions, etc.)
        → store.method()  [from @/lib/datastore]
            → SupabaseStore → Supabase DB
        → TanStack Query (cache, invalidation)
```

**NEVER** import `supabase` client directly in components. Always use `store`.

## Key Patterns

### EntityRef Pattern
Historical denormalization — when a tour references a guide or company, it stores both `id` and `nameAtBooking`. The display name never changes even if master data is edited.

```typescript
interface EntityRef {
  id: string;
  nameAtBooking: string;
}
```

### Store Usage
```typescript
import { store } from '@/lib/datastore';

// List (no nested data for performance)
store.listTours(query, { includeDetails: false })

// Detail (includes destinations, expenses, meals, allowances, shoppings)
store.getTour(id)
```

### Query Keys Pattern
```typescript
['tour', id]       // single tour
['tours']          // list
['settlement-pending-count']
['tour-images', id]
```

After mutation, call `invalidateTourAggregateCaches(queryClient)` from `@/lib/query-cache`.

### Permission Check Pattern
```typescript
const { hasPermission, isAdmin, isGuide } = useAuth();
const canEdit = hasPermission('edit_tours');
```

## Responsive Design

- Mobile: bottom nav, sticky headers pinned to bottom
- Desktop (md+): top nav ~64px, no bottom nav
- Sticky headers: `top-0 md:top-16` pattern
- `useHeaderMode` hook controls sticky behavior
