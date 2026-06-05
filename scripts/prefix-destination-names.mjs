import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SECRET_KEY (preferred) or SUPABASE_PUBLISHABLE_KEY.');
  process.exit(1);
}

const PREFIX = 'vé_';
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mirrors src/lib/string-utils.ts (removeDiacritics + generateSearchKeywords)
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
const removeDiacritics = (str) =>
  str.normalize('NFD').replace(COMBINING_MARKS, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

const generateSearchKeywords = (name) => {
  const normalized = removeDiacritics(name.toLowerCase().trim());
  const words = normalized.split(/\s+/);
  const keywords = new Set();
  keywords.add(normalized.replace(/\s+/g, ''));
  words.forEach((word) => {
    if (word.length > 1) keywords.add(word);
  });
  if (words.length > 1) keywords.add(words.map((w) => w[0]).join(''));
  return Array.from(keywords);
};

const ensurePrefix = (name) => {
  const trimmed = (name ?? '').trim();
  return trimmed.startsWith(PREFIX) ? trimmed : `${PREFIX}${trimmed}`;
};

const sameArray = (a, b) =>
  Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);

async function run() {
  console.log(`Fetching tourist_destinations...${DRY_RUN ? ' (DRY RUN — no writes)' : ''}`);
  const { data: rows, error } = await supabase
    .from('tourist_destinations')
    .select('id,name,search_keywords')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching destinations:', error);
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows || []) {
    const current = row.name ?? '';
    const nextName = ensurePrefix(current);
    const nextKeywords = generateSearchKeywords(nextName);

    const nameUnchanged = nextName === current;
    const keywordsUnchanged = sameArray(row.search_keywords, nextKeywords);
    if (nameUnchanged && keywordsUnchanged) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[dry-run] "${current}" -> "${nextName}"  keywords: [${nextKeywords.join(', ')}]`);
      updated++;
      continue;
    }

    const { error: updErr } = await supabase
      .from('tourist_destinations')
      .update({ name: nextName, search_keywords: nextKeywords })
      .eq('id', row.id);

    if (updErr) {
      console.error(`Failed to update ${row.id} ("${current}"):`, updErr.message);
      failed++;
      continue;
    }
    console.log(`"${current}" -> "${nextName}"  keywords: [${nextKeywords.join(', ')}]`);
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, Skipped (already correct): ${skipped}, Failed: ${failed}`);
}

run().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
