# Recent Changes Log

Last updated: 2026-06-10

## 2026-06-10 — Excel export gate removed (commit 101408f)
- **What**: Excel export now works for ALL tours regardless of settlement status
- **Files**: `src/hooks/useTourDetail.ts`, `src/components/tours/SummaryWorkflowFooter.tsx`
- **Before**: `handleExportExcel` blocked with `toast.error('Chỉ xuất Excel khi tất cả dòng đã duyệt và hồ sơ đã chốt.')`
- **After**: Only checks `canExportTour` permission and `!isNewTour`
- `SummaryWorkflowFooter.canExportNow` was `canExport && allApproved && (approved|closed)`, now just `canExport`

## 2026-06-08 — Warning flags denormalized on tours (commit 101408f includes migration)
- **Migration**: `supabase/migrations/20260608120000_add_warning_flags_to_tours.sql`
- **Added columns to `tours`**: `has_zero_price`, `has_duplicate_dest_names`, `missing_water_expense`, `has_unpaid_commission`, `allowance_total`
- **Why**: Fast list queries without expensive child table joins
- **Updated types**: `src/types/tour.ts` Tour interface

## 2026-06-05 to 06 — OCR import improvements
- Mobile-first review UI with fixed scrolling and tab nav
- Filter only active entities in import review
- Auto-match allowance on province select
- Filter `destinations_free` and derive per-province allowances
- Add `destinations_free` master data for free entrance places
- Added `rawName` field to both `tourist_destinations` and `destinations_free`
- **Migrations**: `20260605120000` through `20260605211000`

## 2026-06-01 to 03 — Settlement workflow hardening
- Tour line VAT, notes, and attachment support added
- Admin full-permissions enforced app-wide
- RLS policies hardened for tours and master data
- Guide profiles merged into user_profiles (deprecated `guides` table)
- User profile self-service (guides can update their own profile)
- Sync permission defaults and tour content policies
- **Migrations**: `20260601090000` through `20260602142000`

## 2026-05-23 — Shopping commission and PIT tax
- Shopping master data: `commissionRate`, `withholdsPit`, `pitRate`, `address`, `phone`
- Tour shoppings: `pitAmount`, `netCommission`, `commissionStatus`
- New `shopping_commission_payments` table
- `is_shared` field added to all master data tables
- **Migrations**: `20260523100000` through `20260523171000`

## 2026-05-20 — Major: Settlement workflow, nationalities, payment tracking
- Full settlement workflow: draft → submitted → approved → closed
- Multi-nationality support (`tour_nationalities` table)
- Tour payment tracking (DB triggers compute `payment_total`, `payment_status`)
- Land operator added to tours
- Granular permission system with user-level overrides
- **Migrations**: `20260520000000` through `20260520173000`

## Key Upcoming Work (not yet done)
- `window.alert()` in `excel-worksheet.ts` should be replaced with `toast.error()`
- TourDetailHeader "Xuất Excel" button may need debugging for specific user roles
