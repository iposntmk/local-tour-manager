import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDateDisplay } from '@/lib/date-utils';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date from YYYY-MM-DD to DD/MM/YYYY
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  return formatDateDisplay(dateString);
}

/**
 * Format date from DD/MM/YYYY to YYYY-MM-DD for input fields
 */
export function formatDateForInput(dateString: string): string {
  if (!dateString) return '';

  // Handle DD/MM/YYYY format
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  }

  return dateString;
}

/**
 * Parse date from DD/MM/YYYY to YYYY-MM-DD
 */
export function parseDate(dateString: string): string | null {
  if (!dateString) return null;

  // Handle DD/MM/YYYY format
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;

    // Validate the date parts
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (
      dayNum >= 1 && dayNum <= 31 &&
      monthNum >= 1 && monthNum <= 12 &&
      yearNum >= 1000 && yearNum <= 9999
    ) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Get CSS classes for highlighting required fields
 */
export function getRequiredFieldClasses(hasError: boolean, isRequired: boolean = true): string {
  if (hasError) {
    return 'border-destructive focus:border-destructive focus:ring-destructive';
  }
  if (isRequired) {
    return 'border-orange-300 focus:border-orange-500 focus:ring-orange-500';
  }
  return '';
}
