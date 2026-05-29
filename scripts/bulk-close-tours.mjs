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
  console.error('Missing Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FROM_DATE = '2025-06-24';
const TO_DATE   = '2026-04-07';

async function run() {
  console.log(`\nBulk-close tours: start_date từ ${FROM_DATE} đến ${TO_DATE}`);
  console.log('settlement_status → closed  |  payment_status → paid\n');

  // Fetch tours in range
  const { data: tours, error: fetchError } = await supabase
    .from('tours')
    .select('id, tour_code, start_date, end_date, settlement_status, payment_status')
    .gte('start_date', FROM_DATE)
    .lte('start_date', TO_DATE)
    .order('start_date', { ascending: true });

  if (fetchError) {
    console.error('Lỗi khi lấy dữ liệu:', fetchError.message);
    process.exit(1);
  }

  if (!tours || tours.length === 0) {
    console.log('Không tìm thấy tour nào trong khoảng ngày này.');
    return;
  }

  console.log(`Tìm thấy ${tours.length} tour:\n`);
  for (const t of tours) {
    console.log(
      `  ${t.tour_code.padEnd(20)} ${t.start_date} → ${t.end_date}` +
      `   settlement: ${t.settlement_status}   payment: ${t.payment_status}`
    );
  }

  const ids = tours.map((t) => t.id);

  // Batch update settlement_status
  const { error: settlementError } = await supabase
    .from('tours')
    .update({ settlement_status: 'closed' })
    .in('id', ids);

  if (settlementError) {
    console.error('\nLỗi khi cập nhật settlement_status:', settlementError.message);
    process.exit(1);
  }

  // Batch update payment_status
  const { error: paymentError } = await supabase
    .from('tours')
    .update({ payment_status: 'paid' })
    .in('id', ids);

  if (paymentError) {
    console.error('\nLỗi khi cập nhật payment_status:', paymentError.message);
    process.exit(1);
  }

  console.log(`\n✓ Đã cập nhật ${ids.length} tour thành công.`);
}

run().catch((err) => {
  console.error('Lỗi không mong muốn:', err);
  process.exit(1);
});
