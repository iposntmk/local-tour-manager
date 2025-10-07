/**
 * Format currency to compact "k" format (thousands)
 * @param value - The value to format
 * @returns Formatted string with "k" suffix (e.g., "150k", "1.2M")
 */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || value === 0) {
    return '0';
  }

  const absValue = Math.abs(value);

  // For millions (1,000,000+)
  if (absValue >= 1000000) {
    return `${Math.round(value / 1000000)}M`;
  }

  // For thousands (1,000+)
  if (absValue >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }

  // For values less than 1000, show as is
  return Math.round(value).toString();
}

/**
 * Format currency with full locale string and VND
 * @param value - The value to format
 * @returns Formatted string with thousand separators and VND (e.g., "150,000 VND")
 */
export function formatCurrencyFull(value: number | undefined | null): string {
  if (value === undefined || value === null) {
    return '0 VND';
  }
  return `${value.toLocaleString('en-US')} VND`;
}
