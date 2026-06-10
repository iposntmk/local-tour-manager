# Data Model — Local Tour Manager

## Core Types (src/types/tour.ts)

### Tour (main entity)
```typescript
interface Tour {
  id: string;
  tourCode: string;
  companyRef: EntityRef;           // main company
  landOperatorRef?: EntityRef;     // optional land operator
  guideRef: EntityRef;             // guide (HDV)
  clientNationalityRef: EntityRef; // primary nationality
  clientNationalities: TourNationality[]; // multi-nationality with pax count
  clientName: string;
  adults: number;
  children: number;
  totalGuests: number;             // adults + children
  driverName: string;
  clientPhone: string;
  startDate: string;               // YYYY-MM-DD
  endDate: string;                 // YYYY-MM-DD
  totalDays: number;               // (endDate - startDate) + 1, INCLUSIVE
  notes?: string;
  // Settlement workflow
  settlementStatus: SettlementStatus; // draft|submitted|need_changes|approved|closed
  submissionCount: number;
  // Payment tracking (computed by DB triggers)
  paymentStatus: PaymentStatus;    // pending|partial|paid
  paymentTotal: number;
  payments?: TourPayment[];
  // Subcollections (loaded by getTour(), NOT by listTours())
  destinations: Destination[];
  expenses: Expense[];
  meals: Meal[];
  allowances: Allowance[];
  shoppings: Shopping[];           // Note: Shopping in tour.ts != Shopping in master.ts
  summary: TourSummary;
  // Denormalized warning flags (fast list queries)
  hasZeroPrice?: boolean;
  hasDuplicateDestNames?: boolean;
  missingWaterExpense?: boolean;
  hasUnpaidCommission?: boolean;
  allowanceTotal?: number;
  waterExpenseDismissed?: boolean;
}
```

### Tour Line Items (all extend LineReviewFields + LineEvidenceFields)
```typescript
interface LineReviewFields {
  lineStatus?: 'unchecked' | 'valid' | 'need_more' | 'invalid';
  lineComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
interface LineEvidenceFields {
  guideNote?: string;
  vatRate?: number;
  vatAmount?: number;
  attachments?: TourLineAttachment[];
}
interface Destination extends LineReviewFields, LineEvidenceFields {
  name: string; price: number; date: string; guests?: number;
  matchedId?: string; matchedPrice?: number;
}
// Expense and Meal are identical shape to Destination
interface Allowance extends LineReviewFields {
  date: string; name: string; price: number; quantity?: number;
  categoryId?: string; provinceCandidates?: string[];
}
interface Shopping extends LineReviewFields {  // tour Shopping (not master)
  name: string; price: number; date: string;
  withholdsPit?: boolean; pitRate?: number; pitAmount?: number;
  netCommission?: number; commissionStatus?: CommissionStatus;
  payments?: CommissionPayment[];
  matchedId?: string; matchedPrice?: number;
}
```

### Settlement Status Flow
```
draft → submitted → need_changes → submitted (loop)
                 → approved → closed
                           → draft (reopen)
```

### TourSummary (calculated, not stored)
```typescript
interface TourSummary {
  totalTabs: number;           // sum of all lines (price × guests multiplier)
  advancePayment?: number;
  totalAfterAdvance?: number;
  companyTip?: number;
  totalAfterTip?: number;
  collectionsForCompany?: number;
  totalAfterCollections?: number;
  finalTotal?: number;         // what the guide owes/receives
}
```
Calculated by `calculateTourSummary()` in `src/lib/tour-utils.ts`.

## Master Data Types (src/types/master.ts)

All master entities have: `id`, `status: 'active'|'inactive'`, `searchKeywords: string[]`, `createdAt`, `updatedAt`, `createdBy?`, `isShared?: boolean`

| Entity | Key fields |
|--------|-----------|
| Guide | name, phone, languages, isDefault, guideId scoping |
| Company | name, contactName, phone, email, isDefault |
| Nationality | name, iso2, emoji |
| Province | name |
| TouristDestination | name, rawName, price, provinceRef |
| DestinationFree | name, rawName, provinceRef (free-entrance places) |
| Shopping (master) | name, price, commissionRate, withholdsPit, pitRate, guideId |
| ExpenseCategory | name, guideId |
| DetailedExpense | name, price, categoryRef, guideId |
| Language | code, name, nativeName |

Note: `Shopping` exists in both `master.ts` (master data) and `tour.ts` (tour line item). They are different — don't confuse them.

## User Model (src/types/user.ts)

```typescript
type UserRole = 'admin' | 'editor' | 'viewer';
type UserStatus = 'active' | 'inactive';
type SettlementRole = 'none' | 'guide' | 'accountant';

interface UserProfile {
  role: UserRole;
  settlementRole: SettlementRole;
  permissions?: Permission[] | null; // granular overrides for editors
  status: UserStatus;
}
```

### Role → Default Permissions
- `admin`: ALL_PERMISSIONS (hardcoded; also hardcoded for iposntmk@gmail.com)
- `editor`: subset including export_tours, edit_*, submit_settlement
- `viewer`: view-only permissions

Effective permissions = `getEffectivePermissions(profile)` from `user-permissions.ts`.

### Settlement Roles
- `guide`: can submit tour for review, sees their own tours
- `accountant`: can review lines, approve/return settlement
- `none`: no settlement workflow involvement

## Database Tables

| Table | Description |
|-------|-------------|
| `tours` | Main tour records + denormalized warning flags |
| `tour_destinations` | Destination line items |
| `tour_expenses` | Expense line items |
| `tour_meals` | Meal line items |
| `tour_allowances` | Allowance (CTP) line items |
| `tour_shoppings` | Shopping stop line items |
| `shopping_commission_payments` | Commission payments for shopping stops |
| `tour_payments` | Tour-level payment records |
| `tour_images` | Image storage references |
| `tour_line_attachments` | VAT/evidence file attachments per line |
| `submission_history` | Settlement workflow event log |
| `user_profiles` | Users with roles, permissions, settlement_role |
| `companies` | Company master data |
| `guides` | Deprecated — merged into user_profiles |
| `nationalities` | Nationality master data |
| `provinces` | Province master data |
| `tourist_destinations` | Destination master data |
| `destinations_free` | Free-entrance destination master data |
| `shoppings` | Shopping master data |
| `expense_categories` | Expense category master data |
| `detailed_expenses` | Detailed expense master data |
| `languages` | Language master data |
| `guide_languages` | Many-to-many: guides ↔ languages |

**Cascading deletes**: deleting a tour cascades to all child tables.

## Important Constraints

- `totalDays` = `(endDate - startDate) + 1` (INCLUSIVE counting)
- Individual line items can specify `guests` to override `totalGuests` (clamped to tour total)
- `paymentTotal` / `paymentStatus` computed by DB triggers from `tour_payments`
- Warning flags (`hasZeroPrice` etc.) are denormalized to `tours` table via migration `20260608120000`
- `searchKeywords` arrays are auto-generated by `generateSearchKeywords()` from `src/lib/string-utils.ts`
