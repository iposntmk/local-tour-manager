# Coding Rules — Local Tour Manager

## Non-Negotiable Laws

### 1. Max 300–350 lines per file (hard cap 400)
If a file grows beyond this, STOP and split into smaller modules before continuing.
Structure: `utils/`, `hooks/`, `services/`, `components/`, `lib/`, `types/`

### 2. Always use the store, never the Supabase client directly
```typescript
// CORRECT
import { store } from '@/lib/datastore';
const tour = await store.getTour(id);

// WRONG — never do this in components/pages/hooks
import { supabase } from '@/lib/datastore/supabase-client';
```

### 3. No approval/settlement checks on Excel export
Excel export was intentionally opened to all states. Do NOT re-add settlement status
checks to Excel export functions. See commit `101408f`.

### 4. UI text is Vietnamese
All user-visible strings must be Vietnamese. Use `t()` from `src/lib/i18n.ts` or inline Vietnamese strings.

### 5. Date handling
- All dates are `YYYY-MM-DD` strings in code and DB
- Use `date-fns` for calculations
- Display via `formatDateDisplay()` / `formatDateRangeDisplay()` from `src/lib/date-utils.ts`
- `totalDays` = `(endDate - startDate) + 1` (INCLUSIVE — never exclusive)

### 6. Guest count logic
- `totalGuests = adults + children`
- Individual line items can override `guests` field
- Override is CLAMPED to `tour.totalGuests` maximum

### 7. Search keywords
Auto-generate with `generateSearchKeywords()` from `src/lib/string-utils.ts` when creating/updating master data.

### 8. Currency display
Always use `formatCurrency()` from `src/lib/currency-utils.ts`. Outputs Vietnamese ₫ format.

### 9. Permissions — check before action
```typescript
const { hasPermission } = useAuth();
if (!hasPermission('edit_tours')) return;
```

### 10. Error messages in Vietnamese
Use `toVietnameseError(e, 'fallback message')` from `src/lib/error-messages.ts` for Supabase errors.

## Patterns

### Adding a new master data entity
1. Types in `src/types/master.ts` (add `isShared?: boolean` if ownership applies)
2. DB types in `src/integrations/supabase/types.ts`
3. Store methods in `src/lib/datastore/supabase-store.ts`
4. Page in `src/pages/`
5. Dialog in `src/components/{entity}/`
6. Route in `src/App.tsx`
7. Migration in `supabase/migrations/`

### Adding a new tour tab
1. Create `src/components/tours/{Name}Tab.tsx`
2. Add tab to `src/pages/TourDetail.tsx`
3. Add `TourTabKey` to `src/lib/tour-detail-permissions.ts`
4. Update tour types if new subcollection

### TanStack Query pattern
```typescript
const { data: tour } = useQuery({
  queryKey: ['tour', id],
  queryFn: () => store.getTour(id!),
  enabled: !isNewTour,
});

const mutation = useMutation({
  mutationFn: (input) => store.updateTour(id, input),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tour', id] });
    invalidateTourAggregateCaches(queryClient);
    toast.success('Lưu thành công');
  },
});
```

### Excel export — single tour
```typescript
import { exportTourToExcel } from '@/lib/excel-utils';
await exportTourToExcel(tour); // no approval check needed
```

### Excel validation (warning only — does NOT block export)
```typescript
import { validateTourNumbers } from '@/lib/excel/excel-helpers';
const issues = validateTourNumbers(tour); // returns string[]
```

## Common Mistakes to Avoid

| Mistake | Correct approach |
|---------|-----------------|
| Direct Supabase import in component | Use `store` from `@/lib/datastore` |
| Exclusive date counting (end - start) | Inclusive: `(end - start) + 1` |
| Blocking Excel export by settlement status | No status check — export any tour |
| Importing `areAllSettlementLinesApproved` in export path | Only in settlement workflow UI |
| Using `window.alert()` for errors | Use `toast.error()` from sonner |
| Hardcoding role checks (`role === 'admin'`) | Use `hasPermission()` |
| Skipping `generateSearchKeywords()` | Always run it on save for master data |
| Creating files > 400 lines | Split into modules first |

## Windows-Specific: Dev Server EPERM Fix

If `npm run dev` crashes with `EPERM: operation not permitted, unlink`:
1. `rd /s /q node_modules\.vite`
2. Remove `force: true` from `optimizeDeps` in `vite.config.ts` if present
3. Do NOT re-add `force: true`

## Supabase Workflow

```bash
# Schema change → always create migration file, then push
supabase db diff --local        # inspect diff
supabase db push                # apply to remote
supabase gen types typescript --linked > src/integrations/supabase/types.ts

# Edge function deploy
supabase functions deploy analyze-tour-image
```

Project ID: `tuypgzkejqbbvubwomov` — already linked. Never run `supabase login` or `supabase link`.
