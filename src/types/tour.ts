import type { CommissionStatus, PaymentMethod } from './master';

export type { CommissionStatus, PaymentMethod } from './master';

export interface EntityRef {
  id: string;
  nameAtBooking: string;
}

export interface TourNationality extends EntityRef {
  paxCount: number;
}

export type SettlementStatus =
  | 'draft'
  | 'submitted'
  | 'need_changes'
  | 'approved'
  | 'closed';

export type LineStatus = 'unchecked' | 'valid' | 'need_more' | 'invalid';

export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface TourPayment {
  id: string;
  tourId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  paidBy?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TourPaymentInput {
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  note?: string;
}

export interface CommissionPayment {
  id?: string;
  tourShoppingId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paidAt: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LineReviewFields {
  id?: string;
  lineStatus?: LineStatus;
  lineComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export type AttachmentLineType = 'destination' | 'meal' | 'expense';

export interface TourLineAttachment {
  id: string;
  tourId: string;
  lineType: AttachmentLineType;
  lineId: string;
  filePath: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: string;
  createdAt: string;
}

export interface LineEvidenceFields {
  guideNote?: string;
  vatRate?: number;
  vatAmount?: number;
  attachments?: TourLineAttachment[];
}

export interface Destination extends LineReviewFields, LineEvidenceFields {
  name: string;
  price: number;
  date: string;
  guests?: number;
  matchedId?: string;
  matchedPrice?: number;
}

export interface Expense extends LineReviewFields, LineEvidenceFields {
  name: string;
  price: number;
  date: string;
  guests?: number; // Number of guests for this expense (defaults to total guests)
  days?: number;
  matchedId?: string;
  matchedPrice?: number;
}

export interface Meal extends LineReviewFields, LineEvidenceFields {
  name: string;
  price: number;
  date: string;
  guests?: number;
  matchedId?: string;
  matchedPrice?: number;
}

export interface Allowance extends LineReviewFields {
  date: string;
  name: string;
  price: number;
  quantity?: number;
  categoryId?: string;
  provinceCandidates?: string[];
}

export interface Shopping extends LineReviewFields {
  name: string;
  price: number;
  date: string;
  withholdsPit?: boolean;
  pitRate?: number;
  pitAmount?: number;
  netCommission?: number;
  payments?: CommissionPayment[];
  commissionStatus?: CommissionStatus;
  matchedId?: string;
  matchedPrice?: number;
}

export type LineType = 'destination' | 'expense' | 'meal' | 'allowance' | 'shopping';

export interface SubmissionHistoryEvent {
  id: string;
  tourId: string;
  event: 'submitted' | 'returned' | 'approved' | 'reopened';
  actorId?: string;
  actorRole?: string;
  note?: string;
  createdAt: string;
}

export interface TourSummary {
  totalTabs: number;
  advancePayment?: number;
  totalAfterAdvance?: number;
  companyTip?: number;
  totalAfterTip?: number;
  collectionsForCompany?: number;
  totalAfterCollections?: number;
  finalTotal?: number;
}

export interface Tour {
  id: string;
  tourCode: string;
  companyRef: EntityRef;
  landOperatorRef?: EntityRef;
  guideRef: EntityRef;
  clientNationalityRef: EntityRef;
  clientNationalities: TourNationality[];
  clientName: string;
  adults: number;
  children: number;
  totalGuests: number;
  driverName: string;
  clientPhone: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
  // Settlement workflow
  settlementStatus: SettlementStatus;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  lockedAt?: string;
  submissionCount: number;
  // Payment tracking (computed from tour_payments by DB triggers)
  paymentStatus: PaymentStatus;
  paymentTotal: number;
  lastPaidAt?: string;
  lastPaymentMethod?: PaymentMethod;
  payments?: TourPayment[];
  // Subcollections stored as nested arrays
  destinations: Destination[];
  expenses: Expense[];
  meals: Meal[];
  allowances: Allowance[];
  shoppings: Shopping[];
  summary: TourSummary;
  waterExpenseDismissed?: boolean;
  // Denormalized warning flags (persisted to DB for fast list queries)
  hasZeroPrice?: boolean;
  hasDuplicateDestNames?: boolean;
  missingWaterExpense?: boolean;
  hasUnpaidCommission?: boolean;
  allowanceTotal?: number;
}

export interface TourInput {
  tourCode: string;
  companyRef: EntityRef;
  landOperatorRef?: EntityRef;
  guideRef: EntityRef;
  clientNationalityRef: EntityRef;
  clientNationalities?: TourNationality[];
  clientName: string;
  adults: number;
  children: number;
  driverName?: string;
  clientPhone?: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface TourQuery {
  tourCode?: string;
  // Optional granular search fields for better performance
  tourCodeLike?: string;
  dateLike?: string; // search substring for YYYY-MM-DD, e.g. "-10-05" for dd-mm
  dateLike2?: string; // optional alternate order fallback (e.g. "-05-10")
  dateRawLike?: string; // raw user input substring for contains matching
  companyNameLike?: string;
  landOperatorNameLike?: string;
  clientName?: string;
  companyId?: string;
  landOperatorId?: string;
  guideId?: string;
  startDate?: string;
  endDate?: string;
  nationalityId?: string;
  settlementStatus?: SettlementStatus;
  paymentStatus?: PaymentStatus;
  limit?: number;
  offset?: number;
  sortBy?: 'startDate' | 'endDate' | 'tourCode' | 'clientName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface TourListResult {
  tours: Tour[];
  total: number;
}

export interface TourImage {
  id: string;
  tour_id: string;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}
