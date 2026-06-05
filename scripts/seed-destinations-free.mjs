import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

if (!process.env.SUPABASE_SECRET_KEY) {
  console.error('Missing SUPABASE_SECRET_KEY env var');
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tuypgzkejqbbvubwomov.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const wb = XLSX.readFile('scripts/destinations.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const freeRows = data.slice(1).filter(r => String(r[2] || '').trim().toLowerCase() === 'free');

// Get first province for default
const { data: provinces } = await supabase.from('provinces').select('id, name').limit(1);
const defaultProvince = provinces?.[0] || { id: '', name: '' };

console.log(`Found ${freeRows.length} free destinations. Default province: ${defaultProvince.name}`);

let created = 0;
let skipped = 0;

for (const row of freeRows) {
  const rawName = String(row[0] || '').trim();
  const name = String(row[1] || '').trim();
  if (!name) { skipped++; continue; }

  const { data: existing } = await supabase
    .from('destinations_free')
    .select('id')
    .ilike('name', name)
    .maybeSingle();

  if (existing) { skipped++; continue; }

  const { error } = await supabase.from('destinations_free').insert({
    name,
    raw_name: rawName || null,
    province_id: defaultProvince.id || null,
    province_name_at_booking: defaultProvince.name || null,
    status: 'active',
    search_keywords: generateSearchKeywords(name),
  });

  if (error) {
    console.error(`Failed to create "${name}": ${error.message}`);
  } else {
    created++;
  }
}

console.log(`Done. Created: ${created}, Skipped: ${skipped}`);

function removeDiacritics(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function generateSearchKeywords(name) {
  const normalized = removeDiacritics(name.toLowerCase().trim());
  const words = normalized.split(/\s+/);
  const keywords = new Set();
  keywords.add(normalized.replace(/\s+/g, ''));
  words.forEach(word => { if (word.length > 1) keywords.add(word); });
  if (words.length > 1) keywords.add(words.map(w => w[0]).join(''));
  return Array.from(keywords);
}
