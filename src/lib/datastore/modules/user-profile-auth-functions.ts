import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type AuthSupabase = SupabaseClient<Database>;

async function extractFunctionErrorMessage(error: unknown): Promise<string | undefined> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.clone().json();
      if (body && typeof body.error === 'string') return body.error;
    } catch {
      // body không phải JSON - bỏ qua, dùng message mặc định.
    }
  }
  return (error as { message?: string })?.message;
}

export async function createAuthUserViaFunction(
  supabase: AuthSupabase,
  input: { email: string; password: string; fullName?: string },
): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ userId?: string; error?: string }>(
    'create-user',
    { body: input },
  );

  if (error) {
    const serverMessage = await extractFunctionErrorMessage(error);
    console.error('Error creating user (edge function):', serverMessage ?? error);
    throw new Error(
      serverMessage ??
        'Không thể tạo tài khoản. Hãy chắc chắn Edge Function "create-user" đã được deploy ' +
          '(supabase functions deploy create-user).',
    );
  }

  if (data?.error) throw new Error(data.error);
  if (!data?.userId) throw new Error('Edge Function "create-user" không trả về userId.');
  return data.userId;
}

export async function updateUserEmailViaFunction(
  supabase: AuthSupabase,
  userId: string,
  email: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
    'update-user-email',
    { body: { userId, email } },
  );

  if (error) {
    const serverMessage = await extractFunctionErrorMessage(error);
    console.error('Error updating user email (edge function):', serverMessage ?? error);
    throw new Error(serverMessage ?? 'Không thể cập nhật email người dùng.');
  }
}

export async function deleteUserViaFunction(supabase: AuthSupabase, userId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
    'delete-user',
    { body: { userId } },
  );

  if (error) {
    const serverMessage = await extractFunctionErrorMessage(error);
    console.error('Error deleting user (edge function):', serverMessage ?? error);
    throw new Error(
      serverMessage ??
        'Không thể xóa người dùng. Hãy chắc chắn Edge Function "delete-user" đã được deploy ' +
          '(supabase functions deploy delete-user).',
    );
  }

  if (data?.error) throw new Error(data.error);
}
