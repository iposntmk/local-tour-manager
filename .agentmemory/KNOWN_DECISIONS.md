# Known Decisions & Design Rationale

## Excel Export — No Settlement Gate
**Decision**: Excel export is allowed for ALL tours regardless of settlement status.
**Why**: Users need to export drafts for review. The original approval gate was too restrictive.
**Changed**: Commit `101408f` — removed from `useTourDetail.ts:handleExportExcel` and `SummaryWorkflowFooter.tsx:canExportNow`.
**Affected files**: `src/hooks/useTourDetail.ts`, `src/components/tours/SummaryWorkflowFooter.tsx`
**DO NOT revert** this decision.

## Master Admin Hardcode
**Decision**: `iposntmk@gmail.com` is always treated as `admin` regardless of DB role.
**Why**: Safety fallback so the owner can never be locked out.
**Location**: `src/types/user.ts` in `dbRowToUserProfile()`.

## HashRouter for GitHub Pages
**Decision**: Use React Router `HashRouter` instead of `BrowserRouter`.
**Why**: GitHub Pages doesn't support server-side routing. Hash-based URLs work with static hosting.
**Location**: `src/App.tsx`

## TanStack Query Conservative Defaults
**Decision**: `staleTime: 5min`, `gcTime: 30min`, no refetchOnWindowFocus, no refetchOnReconnect.
**Why**: Reduce unnecessary Supabase reads. Tour data doesn't change that frequently.
**Location**: `src/main.tsx` QueryClient config.

## listTours vs getTour — includeDetails
**Decision**: `listTours` never loads nested subcollections by default.
**Why**: Performance. Loading destinations/expenses/meals for 100 tours at once is expensive.
**Pattern**: `listTours({ includeDetails: false })` for list views, `getTour(id)` for detail.
**Location**: `src/lib/datastore/modules/tour-operations/tour-data.ts`

## EntityRef Denormalization
**Decision**: References to master data store both `id` and `nameAtBooking`.
**Why**: Historical accuracy. If a company changes its name, old tours still show the name at the time of booking.
**Pattern**: `{ id: string; nameAtBooking: string }`

## Guides Merged into user_profiles
**Decision**: The `guides` table was deprecated; guide data merged into `user_profiles`.
**Why**: Simplify auth — every guide is a user, no need for two separate entities.
**Migration**: `20260602100000_merge_guides_into_user_profiles.sql`
**Impact**: `guideRef.id` on tours now references `user_profiles.id`. Old guide FK renamed.

## Shopping Commission PIN Gate
**Decision**: Recording commissions requires PIN `0829101188`.
**Why**: Prevents accidental commission recording. Only accountants/owners should mark payments.
**PIN stored in**: sessionStorage (clears on browser close)

## Statistics PIN Gate
**Decision**: Statistics page requires PIN `0829101188` (same as commission PIN).
**Location**: `src/components/statistics/PinGate.tsx`

## Warning Flags Denormalized on Tours Table
**Decision**: `hasZeroPrice`, `hasDuplicateDestNames`, `missingWaterExpense`, `hasUnpaidCommission`, `allowanceTotal` are stored directly on the `tours` table.
**Why**: Fast list queries without joining/aggregating all child tables.
**Migration**: `20260608120000_add_warning_flags_to_tours.sql`
**These are updated**: when tour items are saved via store mutations.

## DestinationsFree — Separate Entity
**Decision**: Free-entrance tourist destinations are tracked separately from paid `tourist_destinations`.
**Why**: OCR import needs to identify free-entrance places to set price = 0 automatically.
**Type**: `DestinationFree` in `src/types/master.ts`, table `destinations_free`.

## Water Expense Warning
**Decision**: Tours without a water expense line ("Nước uống cho khách ...k/1 khách / 1 ngày") show a warning badge.
**Why**: Guides commonly forget to add water expense; it's always required.
**Dismissed per-tour**: `waterExpenseDismissed` flag on the Tour.
**WATER_EXPENSE_NAMES**: defined in `src/hooks/useTourDetail.ts`.

## `window.alert` in Excel Export (warning only)
**Decision**: `excel-worksheet.ts` uses `window.alert()` for validation warnings.
**Why**: Simple synchronous warning that doesn't block the export.
**Behavior**: Shows alert if NaN/Infinity/duplicate names found, THEN proceeds to export anyway.
**Improvement opportunity**: Replace with toast notification in future.

## vite.config.ts — No `force: true` in optimizeDeps
**Decision**: `optimizeDeps.force: true` must NOT be set.
**Why**: Windows Defender locks newly-created Vite cache files before Vite can unlink them → EPERM crash on startup. This was the default from Lovable scaffold but causes a Windows-specific bug.
