/**
 * Format currency without rounding (full amount with thousands separators and ₫)
 */
export function formatCurrency(value: number | undefined | null): string {
  const n = typeof value === 'number' ? value : 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  // Always use 'k' for thousands. No 'M'. No rounding.
  if (abs >= 1000) {
    const thousands = Math.trunc((abs / 1000) * 100) / 100; // truncate to 2 decimals
    const raw = thousands.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    const [intPart, fracPart] = raw.split('.') as [string, string?];
    // add thousands separator (dot) to integer part
    const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const formatted = fracPart && fracPart.length > 0 ? `${intWithDots},${fracPart}` : intWithDots;
    return `${sign}${formatted}k`;
  }
  // Below 1k, show integer as-is (assume integer VND input)
  return `${sign}${abs}`;
}

/**
 * Alias kept for backward compatibility; same behavior as formatCurrency
 */
export function formatCurrencyFull(value: number | undefined | null): string {
  return formatCurrency(value);
}
