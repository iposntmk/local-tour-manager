import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const msPerDay = 24 * 60 * 60 * 1000;
const exclusiveDays = (start, end) => {
  try {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const diff = Math.floor((e.getTime() - s.getTime()) / msPerDay);
    return Math.max(0, diff);
  } catch {
    return 0;
  }
};

async function run() {
  console.log('Fetching tours to backfill total_days...');
  const { data: tours, error } = await supabase
    .from('tours')
    .select('id,start_date,end_date,total_days')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching tours:', error);
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;

  for (const t of tours || []) {
    const computed = exclusiveDays(t.start_date, t.end_date);
    // Update when null/undefined or mismatched
    if (typeof t.total_days !== 'number' || t.total_days !== computed) {
      const { error: updErr } = await supabase
        .from('tours')
        .update({ total_days: computed })
        .eq('id', t.id);
      if (updErr) {
        console.error(`Failed to update tour ${t.id}:`, updErr.message);
        continue;
      }
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`Backfill complete. Updated: ${updated}, Unchanged: ${skipped}`);
}

run().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});

