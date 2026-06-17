export const TOUR_SHEET_COLUMNS = [
  { key: 'code', width: 14, label: 'code' },
  { key: 'date', width: 14, label: 'ngày' },
  { key: 'service', width: 24, label: 'vé/ăn/uống/chi phí' },
  { key: 'serviceDate', width: 12, label: 'ngày' },
  { key: 'price', width: 12, label: 'vé/đ,giá' },
  { key: 'quantity', width: 10, label: 'số khách/ số ngày/ tổng số chai nước uống' },
  { key: 'total', width: 12, label: 'th.tiền' },
  { key: 'location', width: 22, label: 'Địa điểm/tỉnh' },
  { key: 'locationDate', width: 12, label: 'ngày' },
  { key: 'days', width: 8, label: 'ngày' },
  { key: 'ctp', width: 8, label: 'CTP' },
  { key: 'ctpTotal', width: 10, label: 'th.tiền' },
  { key: 'tourTotal', width: 14, label: '' },
  { key: 'vatRate', width: 8, label: 'VAT %' },
  { key: 'vatAmount', width: 12, label: 'Tiền VAT' },
  { key: 'guideNote', width: 24, label: 'Ghi chú HDV' },
  { key: 'attachmentCount', width: 12, label: 'Số chứng từ/ảnh' },
] as const;

export const TOUR_SHEET_COLUMN_WIDTHS = TOUR_SHEET_COLUMNS.map((column) => column.width);
export const TOUR_SHEET_COLUMN_KEYS = TOUR_SHEET_COLUMNS.map((column) => column.key);
export const TOUR_SHEET_HEADER2_LABELS = TOUR_SHEET_COLUMNS.map((column) => column.label);

export const TOUR_SHEET_HEADER_GROUPS = [
  { label: 'code', colSpan: 2, className: 'bg-sky-500 text-white' },
  { label: 'vé + ăn + uống + chi phí', colSpan: 5, className: 'bg-emerald-600 text-white' },
  { label: 'Công tác phí (CTP) + ngủ', colSpan: 5, className: 'bg-emerald-600 text-white' },
  { label: 'Tổng tour', colSpan: 1, className: 'bg-amber-400 text-amber-950' },
  { label: 'VAT + chứng từ', colSpan: 4, className: 'bg-amber-400 text-amber-950' },
] as const;
