import { analyzeWithAzure } from './azure.ts';

// Azure Document Intelligence gói F0 từ chối file > 4MB; client đã nén ảnh trước khi gửi.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-file-name, x-content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const decodeBase64 = (value: string): Uint8Array => {
  const clean = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
  return Uint8Array.from(atob(clean), (char) => char.charCodeAt(0));
};

/**
 * Xác thực token bằng một fetch thẳng tới GoTrue thay vì import supabase-js từ esm.sh:
 * bỏ được gói phụ thuộc lớn nhất nên cold start của function nhanh hơn đáng kể.
 */
async function isValidUser(supabaseUrl: string, anonKey: string, authHeader: string): Promise<boolean> {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authHeader },
  });
  await response.body?.cancel();
  return response.ok;
}

interface OcrPayload {
  buffer: Uint8Array;
  contentType: string;
  fileName: string;
}

/**
 * Client mới gửi nhị phân thô (octet-stream; kiểu file ở `x-content-type`, tên ở `x-file-name`).
 * Vẫn nhận JSON `{ dataBase64 }` kiểu cũ để bản app đang cache (PWA) không bị gãy.
 */
async function readPayload(req: Request): Promise<OcrPayload | null> {
  const requestType = (req.headers.get('content-type') || '').split(';')[0].trim();
  if (requestType === 'application/json') {
    const body = await req.json().catch(() => ({})) as { fileName?: string; contentType?: string; dataBase64?: string };
    if (!body.dataBase64 || typeof body.dataBase64 !== 'string') return null;
    return { buffer: decodeBase64(body.dataBase64), contentType: body.contentType || '', fileName: body.fileName || '' };
  }
  const rawName = req.headers.get('x-file-name') || '';
  let fileName = rawName;
  try { fileName = decodeURIComponent(rawName); } catch { /* giữ nguyên tên gốc */ }
  const declaredType = req.headers.get('x-content-type') || '';
  const contentType = declaredType || (requestType === 'application/octet-stream' ? '' : requestType);
  return { buffer: new Uint8Array(await req.arrayBuffer()), contentType, fileName };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const endpoint =
      Deno.env.get('AZURE_FORM_RECOGNIZER_ENDPOINT') || Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT');
    const key = Deno.env.get('AZURE_FORM_RECOGNIZER_KEY') || Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_KEY');
    const apiVersion = Deno.env.get('AZURE_FORM_RECOGNIZER_API_VERSION');

    if (!supabaseUrl || !anonKey) return json({ error: 'Server misconfigured: missing Supabase env vars' }, 500);
    if (!endpoint || !key) return json({ error: 'Server misconfigured: missing Azure endpoint or key' }, 500);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);
    const startedAt = Date.now();
    // Kiểm tra token song song với việc đọc body để bớt một nhịp chờ.
    const [isAuthorized, payload] = await Promise.all([
      isValidUser(supabaseUrl, anonKey, authHeader),
      readPayload(req),
    ]);
    if (!isAuthorized) return json({ error: 'Invalid or expired token' }, 401);
    const authMs = Date.now() - startedAt;
    if (!payload) return json({ error: 'Thiếu dữ liệu ảnh' }, 400);
    if (payload.buffer.length === 0) return json({ error: 'Empty image payload' }, 400);
    if (payload.buffer.length > MAX_UPLOAD_BYTES) {
      return json({ error: 'Ảnh lớn hơn 4MB (giới hạn Azure). Hãy dùng ảnh nhỏ hơn.' }, 413);
    }

    const { analyzeResult, timing } = await analyzeWithAzure(
      endpoint, key, payload.buffer, payload.contentType, payload.fileName, { apiVersion },
    );
    return json({ analyzeResult, timing: { authMs, ...timing, totalMs: Date.now() - startedAt } }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return json({ error: message }, 500);
  }
});
