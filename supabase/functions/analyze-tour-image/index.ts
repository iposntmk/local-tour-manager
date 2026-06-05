// Edge Function: analyze-tour-image
// Nhận ảnh/PDF chương trình tour (base64), gọi Azure Document Intelligence
// (prebuilt-layout) bằng key giữ ở server, và trả về `analyzeResult` thô để
// client tự parse. Key Azure KHÔNG bao giờ lộ ra bundle client.
//
// Deploy:
//   supabase functions deploy analyze-tour-image
//   supabase secrets set AZURE_FORM_RECOGNIZER_ENDPOINT=... AZURE_FORM_RECOGNIZER_KEY=...
// Các biến SUPABASE_URL / SUPABASE_ANON_KEY được Supabase tự inject.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const DEFAULT_API_VERSION = '2023-07-31';
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildAnalyzeUrl = (endpoint: string, apiVersion: string) => {
  const base = endpoint.replace(/\/+$/, '');
  const route = apiVersion.startsWith('2024-') ? 'documentintelligence' : 'formrecognizer';
  return `${base}/${route}/documentModels/prebuilt-layout:analyze?api-version=${apiVersion}`;
};

const contentTypes = new Map<string, string>([
  ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['png', 'image/png'],
  ['bmp', 'image/bmp'], ['tif', 'image/tiff'], ['tiff', 'image/tiff'], ['pdf', 'application/pdf'],
]);

const guessContentType = (fileName = '', provided = '') => {
  if (provided) return provided;
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return contentTypes.get(ext) || 'application/octet-stream';
};

const decodeBase64 = (value: string): Uint8Array => {
  const clean = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

async function analyzeDocument(
  endpoint: string,
  key: string,
  apiVersion: string,
  buffer: Uint8Array,
  contentType: string,
) {
  const response = await fetch(buildAnalyzeUrl(endpoint, apiVersion), {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'Ocp-Apim-Subscription-Key': key },
    body: buffer,
  });

  const operationLocation = response.headers.get('operation-location');
  if (!response.ok || !operationLocation) {
    const text = await response.text().catch(() => '');
    throw new Error(`Azure analyze failed (${response.status}): ${text || 'missing Operation-Location header'}`);
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const poll = await fetch(operationLocation, { headers: { 'Ocp-Apim-Subscription-Key': key } });
    const result = await poll.json().catch(() => ({}));
    if (!poll.ok) throw new Error(`Azure poll failed (${poll.status}): ${JSON.stringify(result)}`);
    if (result.status === 'succeeded') return result;
    if (result.status === 'failed') throw new Error(`Azure analyze failed: ${JSON.stringify(result.error || result)}`);
    await sleep(1000);
  }
  throw new Error('Azure analyze timed out after 60 seconds');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const endpoint =
      Deno.env.get('AZURE_FORM_RECOGNIZER_ENDPOINT') || Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT');
    const key =
      Deno.env.get('AZURE_FORM_RECOGNIZER_KEY') || Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_KEY');
    const apiVersion =
      Deno.env.get('AZURE_FORM_RECOGNIZER_API_VERSION') || DEFAULT_API_VERSION;

    if (!supabaseUrl || !anonKey) return json({ error: 'Server misconfigured: missing Supabase env vars' }, 500);
    if (!endpoint || !key) return json({ error: 'Server misconfigured: missing Azure endpoint or key' }, 500);

    // Chỉ cho phép người dùng đã đăng nhập gọi OCR.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) return json({ error: 'Invalid or expired token' }, 401);

    const { fileName, contentType, dataBase64 } = await req.json().catch(() => ({}));
    if (!dataBase64 || typeof dataBase64 !== 'string') {
      return json({ error: 'dataBase64 is required' }, 400);
    }

    const buffer = decodeBase64(dataBase64);
    if (buffer.length === 0) return json({ error: 'Empty image payload' }, 400);
    if (buffer.length > MAX_UPLOAD_BYTES) return json({ error: 'File exceeds 20MB' }, 413);

    const result = await analyzeDocument(
      endpoint, key, apiVersion, buffer, guessContentType(fileName, contentType),
    );

    return json({ analyzeResult: result.analyzeResult }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return json({ error: message }, 500);
  }
});
