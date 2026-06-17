// Edge Function: update-user-email
// Cho phép admin cập nhật email tài khoản Supabase Auth của người dùng khác
// bằng service-role key, tránh giới hạn của client SDK.
//
// Deploy: supabase functions deploy update-user-email
// Supabase tự inject SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY.

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

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return json({ error: 'Invalid or expired token' }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

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

    const { userId, email } = await req.json().catch(() => ({}));
    if (!userId || typeof userId !== 'string') {
      return json({ error: 'userId is required' }, 400);
    }
    if (!email || typeof email !== 'string') {
      return json({ error: 'email is required' }, 400);
    }

    const { data: target, error: targetError } = await admin.auth.admin.getUserById(userId);
    if (targetError) {
      return json({ error: targetError.message }, 400);
    }

    const targetEmail = target?.user?.email ?? '';
    if (targetEmail === MASTER_ADMIN_EMAIL && caller.email !== MASTER_ADMIN_EMAIL) {
      return json({ error: 'Cannot modify the master admin account' }, 403);
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      email,
      email_confirm: true,
    });

    if (updateError) {
      const normalized = updateError.message.toLowerCase();
      const status = /invalid|exist|already/.test(normalized) ? 400 : 500;
      return json({ error: updateError.message }, status);
    }

    return json({ success: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return json({ error: message }, 500);
  }
});
