// Edge Function: create-user
// Tạo tài khoản đăng nhập trong auth.users bằng Admin API (service-role),
// với email_confirm=true để user dùng được ngay mà KHÔNG cần xác nhận email
// và KHÔNG làm ảnh hưởng session của admin đang đăng nhập.
// Hồ sơ trong user_profiles do trigger on-insert tạo; client sẽ cập nhật sau.
//
// Deploy: supabase functions deploy create-user
// Các biến SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY
// được Supabase tự inject cho Edge Function.

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

    // Xác định người gọi qua JWT của họ.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return json({ error: 'Invalid or expired token' }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Chỉ admin đang hoạt động (hoặc master admin) mới được tạo user.
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

    const { email, password, fullName } = await req.json().catch(() => ({}));
    if (!email || typeof email !== 'string') {
      return json({ error: 'email is required' }, 400);
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return json({ error: 'password must be at least 6 characters' }, 400);
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? '' },
    });

    if (error) {
      const status = /already|exist|registered/i.test(error.message) ? 409 : 500;
      return json({ error: error.message }, status);
    }
    if (!data?.user) {
      return json({ error: 'Failed to create user' }, 500);
    }

    return json({ userId: data.user.id }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return json({ error: message }, 500);
  }
});
