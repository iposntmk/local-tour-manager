// Edge Function: delete-user
// Xóa hoàn toàn một tài khoản — cả hồ sơ (user_profiles) lẫn tài khoản đăng nhập
// trong auth.users. Chỉ admin (hoặc master admin) mới được phép gọi.
//
// Deploy: supabase functions deploy delete-user
// Các biến môi trường SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY
// được Supabase tự inject cho Edge Function, không cần khai báo thủ công.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const MASTER_ADMIN_EMAIL = 'iposntmk@gmail.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: 'Server misconfigured: missing Supabase env vars' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401);
    }

    // Client gắn JWT của người gọi để xác định họ là ai.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return json({ error: 'Invalid or expired token' }, 401);
    }

    // Client service-role để thực hiện thao tác đặc quyền.
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Xác minh người gọi là admin đang hoạt động (hoặc master admin).
    let isAdmin = caller.email === MASTER_ADMIN_EMAIL;
    if (!isAdmin) {
      const { data: profile } = await admin
        .from('user_profiles')
        .select('role, status')
        .eq('id', caller.id)
        .single();
      isAdmin = profile?.role === 'admin' && profile?.status === 'active';
    }
    if (!isAdmin) {
      return json({ error: 'Forbidden: admin only' }, 403);
    }

    const { userId } = await req.json().catch(() => ({}));
    if (!userId || typeof userId !== 'string') {
      return json({ error: 'userId is required' }, 400);
    }

    // Không cho tự xóa chính mình.
    if (userId === caller.id) {
      return json({ error: 'Cannot delete your own account' }, 400);
    }

    // Bảo vệ tài khoản master admin khỏi bị xóa.
    const { data: target } = await admin.auth.admin.getUserById(userId);
    if (target?.user?.email === MASTER_ADMIN_EMAIL) {
      return json({ error: 'Cannot delete the master admin account' }, 400);
    }

    // Xóa hồ sơ trước (phòng khi không có FK cascade), rồi xóa tài khoản đăng nhập.
    await admin.from('user_profiles').delete().eq('id', userId);

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return json({ error: `Failed to delete auth user: ${deleteError.message}` }, 500);
    }

    return json({ success: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return json({ error: message }, 500);
  }
});
