import { baseVi } from './i18n/base';
import { masterDataVi } from './i18n/master-data';
import { tourVi } from './i18n/tours';

export const vi = {
  ...baseVi,
  ...tourVi,
  ...masterDataVi,
};

// Helper function to get nested translation
export function t(key: string): string {
  const keys = key.split('.');
  let value: unknown = vi;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }

  return typeof value === 'string' ? value : key;
}

export default vi;