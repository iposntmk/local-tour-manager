/**
 * Format date to yyyy-mm-dd
 */
export function formatDateYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse yyyy-mm-dd to Date
 */
export function parseDateYMD(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Calculate days between two dates
 */
export function daysBetween(startDate: string, endDate: string): number {
  const start = parseDateYMD(startDate);
  const end = parseDateYMD(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Get current date in yyyy-mm-dd format
 */
export function todayYMD(): string {
  return formatDateYMD(new Date());
}

/**
 * Format date to dd/mm/yyyy for display
 */
export function formatDateDMY(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Flexible display for a single date:
 * - If year is current year: dd/mm
 * - Otherwise: dd/mm/yyyy
 */
export function formatDateDisplay(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  const nowYear = new Date().getFullYear();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return year === nowYear ? `${day}/${month}` : `${day}/${month}/${year}`;
}

/**
 * Date range display rules:
 * - Same month/year: dd - dd/mm (current year) or dd - dd/mm/yyyy (other year)
 * - Different months, same year (current): dd/mm - dd/mm
 * - Different months, same year (not current): dd/mm - dd/mm/yyyy
 * - Different years: dd/mm/yyyy - dd/mm/yyyy
 */
export function formatDateRangeDisplay(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  const nowYear = new Date().getFullYear();

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const sameMonthYear = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();

  if (sameMonthYear) {
    // Same month and year: dd-dd/mm or dd-dd/mm/yyyy
    const dd1 = pad2(start.getDate());
    const dd2 = pad2(end.getDate());
    const mm = pad2(start.getMonth() + 1);
    const y = start.getFullYear();
    return y === nowYear ? `${dd1}-${dd2}/${mm}` : `${dd1}-${dd2}/${mm}/${y}`;
  }

  // Different months
  const dd1 = pad2(start.getDate());
  const mm1 = pad2(start.getMonth() + 1);
  const dd2 = pad2(end.getDate());
  const mm2 = pad2(end.getMonth() + 1);
  const y1 = start.getFullYear();
  const y2 = end.getFullYear();

  if (y1 !== y2) {
    // Different years: show both years
    return `${dd1}/${mm1}/${y1} - ${dd2}/${mm2}/${y2}`;
  }

  if (y1 === nowYear && y2 === nowYear) {
    // Same year (current): no year shown
    return `${dd1}/${mm1} - ${dd2}/${mm2}`;
  }

  // Same year (not current): show year on end date only
  return `${dd1}/${mm1} - ${dd2}/${mm2}/${y2}`;
}
