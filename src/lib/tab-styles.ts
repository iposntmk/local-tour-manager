/**
 * Shared Tailwind class constants for tour detail tab components.
 * Centralized so style changes propagate to all tabs at once.
 */

/* ── Desktop table ─────────────────────────────────────────── */

/** Bảng chính: font size mặc định cho toàn bộ table */
export const TABLE_BASE_CLASS = 'text-[10px]';

/** Header group row (Dịch vụ, CTP, Tổng kết …) */
export const TABLE_GROUP_HEADER = 'text-xs font-bold uppercase';

/** Column header (Tên, Ngày, Giá …) */
export const TABLE_COL_HEADER = 'text-[12px] font-bold';

/** Data cell bình thường */
export const TABLE_CELL = 'border border-slate-300 px-2 py-1 align-middle text-[12px]';

/** Subtotal / total row cell */
export const TABLE_TOTAL_CELL = 'border border-slate-300 bg-yellow-200 px-2 py-1 text-[12px] font-bold';

/** Summary row background */
export const TABLE_SUMMARY_BG = 'bg-blue-100';

/** Notes row */
export const TABLE_NOTES_CELL = 'border border-slate-300 bg-slate-100 px-2 py-2 text-sm text-red-600';

/* ── Mobile card ───────────────────────────────────────────── */

/** Card container */
export const MOBILE_CARD = 'rounded-md border bg-card px-2.5 py-1.5';

/** Card when flagged (giá 0 / trùng tên) */
export const MOBILE_CARD_FLAGGED = 'border-red-300 bg-red-50 dark:bg-red-950';

/** Item name text */
export const MOBILE_CARD_NAME = 'flex-1 min-w-0 truncate text-xs font-medium leading-snug';

/** Item name when flagged */
export const MOBILE_CARD_NAME_FLAGGED = 'text-red-600';

/** Amount (thành tiền) */
export const MOBILE_CARD_AMOUNT = 'shrink-0 text-xs font-bold tabular-nums';

/** Detail line (ngày · giá × SL …) */
export const MOBILE_CARD_META = 'mt-0.5 truncate text-[11px] text-muted-foreground';

/** Subtotal row (Tổng DV / Tổng CTP) */
export const MOBILE_SUBTOTAL = 'flex items-center justify-between rounded-md bg-yellow-100 px-2.5 py-1.5 text-xs font-bold';

/** Total bar (TỔNG CHI PHÍ) */
export const MOBILE_TOTAL_BAR = 'flex items-center justify-between rounded-lg bg-blue-100 px-2.5 py-2 font-bold';

/** Total label */
export const MOBILE_TOTAL_LABEL = 'text-xs';

/** Total amount */
export const MOBILE_TOTAL_AMOUNT = 'text-sm tabular-nums';

/** Section header button */
export const MOBILE_SECTION_BTN = 'flex w-full items-center justify-between gap-2 rounded-md px-1 py-0.5';

/** Section header label */
export const MOBILE_SECTION_LABEL = 'text-xs font-bold uppercase tracking-wide';

/** Section collapsed total */
export const MOBILE_SECTION_TOTAL = 'text-[11px] font-bold tabular-nums text-muted-foreground';

/** Summary section title */
export const MOBILE_SUMMARY_TITLE = 'text-[11px] font-bold uppercase tracking-wide text-slate-500';

/** Summary row */
export const MOBILE_SUMMARY_ROW = 'flex items-center justify-between rounded-md px-2.5 py-1.5';

/** Summary label */
export const MOBILE_SUMMARY_LABEL = 'text-xs font-medium';

/** Summary amount */
export const MOBILE_SUMMARY_AMOUNT = 'text-xs font-bold tabular-nums';

/** Notes block */
export const MOBILE_NOTES = 'rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700';

/** Show/hide buttons */
export const MOBILE_TOGGLE_BTN = 'flex items-center gap-0.5 rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-muted';

/** Chevron icons size */
export const MOBILE_CHEVRON_SIZE = 'h-3.5 w-3.5';

/* ── Mobile summary review ──────────────────────────────────── */

/** Section header row */
export const MOBILE_SEC_HEADER = 'flex items-center justify-between gap-2';

/** Section header text */
export const MOBILE_SEC_HEADER_TEXT = 'min-w-0 text-xs font-semibold';

/** Grouped card list container */
export const MOBILE_GROUP_CARD = 'divide-y rounded-md border bg-background';

/** Line index number */
export const MOBILE_INDEX = 'shrink-0 text-xs text-muted-foreground';

/** Edit button in compact list */
export const MOBILE_COMPACT_EDIT_BTN = 'inline-flex h-full w-9 flex-col items-center justify-center gap-0.5 rounded-md border border-border bg-background px-1 py-1 text-[10px] leading-none text-foreground disabled:opacity-30';

/** Reject comment row */
export const MOBILE_REJECT_COMMENT = 'mt-0.5 text-xs text-muted-foreground';

/* ── Mobile shopping card ───────────────────────────────────── */

/** Shopping card container (space-y for stacked rows) */
export const MOBILE_SHOP_CARD = 'rounded-lg border bg-card px-2.5 py-1.5 space-y-1.5';

/** Commission info row */
export const MOBILE_COMMISSION_ROW = 'flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pl-9';

/** Status action row */
export const MOBILE_STATUS_ROW = 'flex items-center justify-between gap-2 flex-wrap pl-9';

/** Payment detail card */
export const MOBILE_PAYMENT_CARD = 'flex items-center justify-between rounded-md border bg-background px-3 py-2';

/** Payment form container */
export const MOBILE_PAYMENT_FORM = 'space-y-2 rounded-md border bg-background p-2';

/** Total footer row (single-line totals) */
export const MOBILE_FOOTER = 'flex justify-between px-2 py-2 bg-muted/50 rounded-lg font-semibold text-sm';

/** Total footer (shoppings — multi-line) */
export const MOBILE_SHOP_FOOTER = 'border-t px-2 py-2 bg-muted/50 space-y-1 text-sm font-semibold rounded-lg';

/* ── Standard desktop table (Destinations, Expenses, Meals, Allowances) ── */

/** Table base font */
export const STD_TABLE_FONT = 'text-xs sm:text-sm';

/** Table header cell padding */
export const STD_TH_CELL = 'p-1 sm:p-4';

/** Flagged row (giá 0) */
export const STD_ROW_FLAGGED = 'bg-red-50 dark:bg-red-950';

/** Row entrance animation */
export const STD_ROW_ANIM = 'animate-fade-in';

/* ── Tour line tab shell + form controls ───────────────────── */

/** Shared spacing for Destinations / Expenses / Meals / Allowances / Shoppings tabs */
export const TOUR_LINE_TAB_STACK = 'space-y-6';

/** Shared list container */
export const TOUR_LINE_LIST_CARD = 'rounded-lg border';

/** Shared list header */
export const TOUR_LINE_LIST_HEADER = 'border-b bg-muted/50 p-4';

/** Shared list title */
export const TOUR_LINE_LIST_TITLE = 'font-semibold';

/** Shared empty state */
export const TOUR_LINE_EMPTY_STATE = 'p-8 text-center text-muted-foreground';

/** Shared desktop list wrapper */
export const TOUR_LINE_DESKTOP_LIST = 'hidden overflow-x-auto md:block';

/** Shared mobile list wrapper */
export const TOUR_LINE_MOBILE_LIST = 'md:hidden';

/** Shared form card */
export const TOUR_LINE_FORM_CARD = 'rounded-lg border bg-card p-4 sm:p-6';

/** Shared form title */
export const TOUR_LINE_FORM_TITLE = 'mb-4 text-base font-semibold sm:text-lg';

/** Shared form spacing */
export const TOUR_LINE_FORM = 'space-y-4';

/** Shared field stack */
export const TOUR_LINE_FIELDS = 'space-y-3';

/** Shared row for paired date / quantity inputs */
export const TOUR_LINE_INLINE_FIELDS = 'grid gap-2 sm:grid-cols-2';

/** Shared selector + add button row */
export const TOUR_LINE_SELECTOR_ROW = 'flex items-start gap-2';

/** Shared add button alignment next to selectors */
export const TOUR_LINE_SELECTOR_ADD_BUTTON = 'h-9 w-9 shrink-0 self-start sm:h-10 sm:w-10';

/** Shared compact date / number input sizing */
export const TOUR_LINE_COMPACT_INPUT = 'h-9 min-h-9 w-full text-sm sm:h-10 sm:min-h-10 sm:text-base';

/** Shared action row */
export const TOUR_LINE_ACTIONS = 'flex flex-col gap-2 sm:flex-row';

/** Shared submit button sizing */
export const TOUR_LINE_SUBMIT_BUTTON = 'hover-scale w-full sm:w-auto';

/** Shared cancel button sizing */
export const TOUR_LINE_CANCEL_BUTTON = 'w-full sm:w-auto';

/** Shared popover width for master-data comboboxes */
export const TOUR_LINE_COMBOBOX_POPOVER = 'w-[300px] p-0';
