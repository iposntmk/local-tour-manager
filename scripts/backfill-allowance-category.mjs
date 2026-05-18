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

const APPLY = process.argv.includes('--apply');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const norm = (s) => (s || '').trim().toLowerCase();

async function run() {
  console.log(`Mode: ${APPLY ? 'APPLY (will write to DB)' : 'DRY RUN (no writes — pass --apply to commit)'}`);

  console.log('Loading detailed_expenses...');
  const { data: expenses, error: expErr } = await supabase
    .from('detailed_expenses')
    .select('name, category_id');
  if (expErr) {
    console.error('Error loading detailed_expenses:', expErr.message);
    process.exit(1);
  }

  // Build name -> category_id map. If a name maps to multiple distinct
  // category_ids, mark it ambiguous so we skip it during backfill.
  const nameMap = new Map();
  for (const e of expenses || []) {
    if (!e.name || !e.category_id) continue;
    const k = norm(e.name);
    const existing = nameMap.get(k);
    if (existing === undefined) {
      nameMap.set(k, e.category_id);
    } else if (existing !== '__AMBIGUOUS__' && existing !== e.category_id) {
      nameMap.set(k, '__AMBIGUOUS__');
    }
  }
  console.log(`Loaded ${expenses?.length || 0} detailed_expenses (${nameMap.size} distinct names).`);

  console.log('Loading tour_allowances with NULL category_id...');
  const { data: rows, error: rowErr } = await supabase
    .from('tour_allowances')
    .select('id, name, category_id')
    .is('category_id', null);
  if (rowErr) {
    console.error('Error loading tour_allowances:', rowErr.message);
    process.exit(1);
  }
  console.log(`Found ${rows?.length || 0} rows to consider.`);

  let matched = 0;
  let unmatched = 0;
  let ambiguous = 0;
  let updated = 0;
  let failed = 0;
  const unmatchedNames = new Map();
  const ambiguousNames = new Set();

  for (const r of rows || []) {
    const k = norm(r.name);
    const mapped = nameMap.get(k);
    if (!mapped) {
      unmatched++;
      unmatchedNames.set(r.name, (unmatchedNames.get(r.name) || 0) + 1);
      continue;
    }
    if (mapped === '__AMBIGUOUS__') {
      ambiguous++;
      ambiguousNames.add(r.name);
      continue;
    }
    matched++;
    if (APPLY) {
      const { error: upErr } = await supabase
        .from('tour_allowances')
        .update({ category_id: mapped })
        .eq('id', r.id);
      if (upErr) {
        failed++;
        console.error(`  ✗ ${r.id} (${r.name}): ${upErr.message}`);
      } else {
        updated++;
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Matched:    ${matched}`);
  console.log(`Ambiguous:  ${ambiguous}  (name maps to >1 category — skipped)`);
  console.log(`Unmatched:  ${unmatched}  (no detailed_expense with same name)`);
  if (APPLY) {
    console.log(`Updated:    ${updated}`);
    console.log(`Failed:     ${failed}`);
  } else {
    console.log(`Would update: ${matched} (run with --apply to commit)`);
  }

  if (ambiguousNames.size > 0) {
    console.log('\nAmbiguous names (need manual review):');
    for (const n of ambiguousNames) console.log(`  - ${n}`);
  }
  if (unmatchedNames.size > 0) {
    console.log('\nUnmatched names (no matching detailed_expense):');
    const sorted = [...unmatchedNames.entries()].sort((a, b) => b[1] - a[1]);
    for (const [n, c] of sorted) console.log(`  - ${n}  (×${c})`);
  }
}

run().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
