# Business Workflows — Local Tour Manager

## 1. Settlement Workflow (Quy trình thanh toán)

The most important workflow. Guides log tour costs, accountants review and approve.

### Status Flow
```
draft
  → [Guide submits] → submitted
      → [Accountant returns] → need_changes
          → [Guide resubmits] → submitted (loop)
      → [Accountant approves] → approved
          → [Anyone closes] → closed
          → [Admin reopens] → draft
```

### Permissions
| Action | Permission | Settlement Role |
|--------|-----------|----------------|
| Submit | `submit_settlement` | guide |
| Review lines | `review_settlement_line` | accountant |
| Approve/Return | `approve_settlement` | accountant |
| Reopen | `reopen_settlement` | admin |
| Mark paid | `mark_tour_paid` | accountant/admin |

### Key Functions (src/lib/settlement-utils.ts)
- `canEditTourData(tour)` — can currently modify line items (only when draft/need_changes)
- `canSubmitTour(tour)` — tour can be submitted
- `canReviewTour(tour)` — tour can be reviewed (submitted state)
- `validateSettlementReady(tour)` — pre-submit validation

### Key Functions (src/lib/tour-line-utils.ts)
- `areAllSettlementLinesApproved(tour)` — all lines have `lineStatus === 'valid'`
- `getReviewableSettlementLines(tour)` — lines that accountant can review
- `hasSettlementLinesNeedingFix(tour)` — any line has `need_more` or `invalid`

### UI Components
- `SettlementActionsBar` — workflow buttons in TourDetailHeader
- `SummaryWorkflowFooter` — export button + workflow buttons in Summary tab
- `LineReviewControl` — per-line review UI for accountants
- `SettlementHistoryPanel` — audit log of workflow events

### Excel Export Gate
**REMOVED** — Excel export is now allowed for ALL settlement statuses. No approval required. Changed in commit `101408f`.

---

## 2. Shopping Commission Workflow (Hoa hồng mua sắm)

### How It Works
1. Guide brings tourists to a shopping stop
2. Shop pays commission to guide (% of tourist spend)
3. PIT tax (thuế TNCN) may be withheld from commission

### Data Flow
- `Shopping` master data has: `commissionRate`, `withholdsPit`, `pitRate`
- When guide adds shopping to tour, these defaults are copied to `tour_shoppings`
- `pitAmount = commissionAmount * pitRate / 100`
- `netCommission = commissionAmount - pitAmount`
- Payments recorded as `CommissionPayment` records

### Commission Status
- `pending` — no payments yet
- `partial` — some paid
- `paid` — fully paid

### PIN Gate
Shopping commission recording is PIN-gated: `0829101188` (stored in sessionStorage)

### Key Utilities (src/lib/shopping-commission-utils.ts)
- `calcCommissionAmounts(shopping, amount)` — computes PIT and net commission
- `getCommissionStatus(shopping)` — derives status from payments

---

## 3. Tour Payment Tracking (Thanh toán tour)

Separate from shopping commission. Tracks whether the company has paid the guide for the tour.

- `paymentStatus: 'pending' | 'partial' | 'paid'` (computed by DB trigger)
- `paymentTotal` — sum of all payments (computed by DB trigger)
- `TourPayment` records: amount, method (cash/bank_transfer), paidAt, note
- UI: `TourPaymentsPanel`, `RecordPaymentDialog`

---

## 4. OCR Import Workflow (Nhập từ ảnh)

Guides can take a photo of a paper tour schedule and import it.

### Flow
1. Guide uploads image(s) in `ImportTourFromImageDialog`
2. Supabase Edge Function `analyze-tour-image` runs OCR (Claude Vision)
3. Response parsed by `src/lib/ocr/tour-image-parser.ts`
4. Review UI: `EnhancedImportReview` + `ImportTourReview`
5. Guide confirms/corrects matches, then imports

### Key OCR Files
- `ocr-extractors.ts` — regex patterns for dates, prices, names
- `visit-candidates.ts` — identifies visited places from text
- `destination-lookup.ts` — fuzzy-matches to master tourist_destinations
- `country-map.ts` — maps country names to nationality records

### Match Status
- `auto` — high-confidence auto-match
- `manual` — user selected from dropdown
- `new` — no match found, will create

---

## 5. Master Data Sharing (Chia sẻ dữ liệu gốc)

### Ownership Model
- Each master entity has `createdBy` (user ID)
- `isShared: true` — visible to ALL users
- `isShared: false` — visible only to creator + admins

### Rules
- Admins can modify ANY entity
- Non-admins can only modify their own entities
- `canModifyOwnedEntity()` from `src/lib/master-ownership.ts`

### Shopping/Guide Scoping
- `Shopping` master and `ExpenseCategory` have optional `guideId` field
- When set, entity is scoped to that guide (e.g., guide's personal shopping contacts)

---

## 6. Excel Export (Xuất Excel)

### Three export modes
1. **Single tour** — button in TourDetailHeader + SummaryWorkflowFooter
   - Handler: `handleExportExcel` in `useTourDetail.ts`
   - Function: `exportTourToExcel(tour)` in `src/lib/excel/excel-worksheet.ts`

2. **All tours → 1 file** — button in ToursHeaderControls
   - Handler: `handleExportAllSingle` in `useTourPageActions.ts`
   - Function: `exportAllToursToExcel(tours)` in `src/lib/excel/excel-all-tours.ts`

3. **All tours → ZIP by month** — button in ToursHeaderControls
   - Handler: `handleExportAll` in `useTourPageActions.ts`
   - Function: `exportAllToursToMonthlyZip(tours)` in `src/lib/excel/excel-all-tours.ts`

### Export requires: `export_tours` permission only. No settlement status check.

### Validation Warning
`validateTourNumbers(tour)` in `excel-helpers.ts` checks for NaN/Infinity in numeric fields. If issues found, `window.alert()` shows a warning but export still proceeds.

### Excel Layout
- Columns A–M (13 columns)
- 2 frozen header rows
- Landscape orientation
- Vietnamese currency formatting (₫)
- Color-coded: blue headers, yellow totals, green service sections
- TỔNG KẾT section shown only when advancePayment/collectionsForCompany/companyTip are non-zero
