import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEL_PATH = resolve(__dirname, 'destinations.xlsx');

const normalize = (value = '') =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

const oneLine = (value = '') =>
  value.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim().replace(/\s*\n\s*/g, ' ');

let destinationEntries = null;

const loadDestinations = () => {
  if (destinationEntries) return destinationEntries;
  const wb = xlsx.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(ws, { header: ['raw', 'normalized', 'price'] });
  const entries = [];
  for (const row of data) {
    if (!row.normalized) continue;
    const isFree = String(row.price || '').toLowerCase().trim() === 'free';
    const normName = normalize(row.normalized);
    const variants = [normName];
    if (row.raw) {
      for (const v of String(row.raw).split('/')) {
        const key = normalize(v.trim());
        if (key && !variants.includes(key)) variants.push(key);
      }
    }
    entries.push({ name: row.normalized, isFree, variants });
  }
  destinationEntries = entries;
  return entries;
};

export const findDestinationsInText = (visitText) => {
  const entries = loadDestinations();
  const text = normalize(oneLine(visitText));
  const allVariants = [];
  for (const entry of entries) {
    for (const variant of entry.variants) {
      allVariants.push({ name: entry.name, isFree: entry.isFree, variant });
    }
  }
  allVariants.sort((a, b) => b.variant.length - a.variant.length);
  let remaining = text;
  const matched = new Set();
  for (const { name, isFree, variant } of allVariants) {
    if (!remaining.includes(variant)) continue;
    if (!isFree) matched.add(name);
    remaining = remaining.replaceAll(variant, ' '.repeat(variant.length));
  }
  return [...matched];
};
