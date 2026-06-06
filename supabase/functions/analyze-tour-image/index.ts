import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { analyzeWithAzure } from './azure.ts';
import { analyzeWithGoogleVision } from './google-vision.ts';

type Provider = 'azure' | 'google';

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

const decodeBase64 = (value: string): Uint8Array => {
  const clean = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !anonKey) return json({ error: 'Server misconfigured: missing Supabase env vars' }, 500);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) return json({ error: 'Invalid or expired token' }, 401);

    const { provider, fileName, contentType, dataBase64 } = await req.json().catch(() => ({})) as {
      provider?: string;
      fileName?: string;
      contentType?: string;
      dataBase64?: string;
    };
    if (!dataBase64 || typeof dataBase64 !== 'string') {
      return json({ error: 'dataBase64 is required' }, 400);
    }

    const buffer = decodeBase64(dataBase64);
    if (buffer.length === 0) return json({ error: 'Empty image payload' }, 400);
    if (buffer.length > MAX_UPLOAD_BYTES) return json({ error: 'File exceeds 20MB' }, 413);

    const selectedProvider: Provider = provider === 'google' ? 'google' : 'azure';
    let result: Record<string, unknown>;

    switch (selectedProvider) {
      case 'google': {
        const googleKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY') || Deno.env.get('google_cloud_vision');
        if (!googleKey) return json({ error: 'Server misconfigured: missing GOOGLE_CLOUD_VISION_API_KEY or google_cloud_vision' }, 500);
        result = await analyzeWithGoogleVision(googleKey, buffer, contentType || '');
        break;
      }
      case 'azure':
      default: {
        const endpoint =
          Deno.env.get('AZURE_FORM_RECOGNIZER_ENDPOINT') || Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT');
        const key =
          Deno.env.get('AZURE_FORM_RECOGNIZER_KEY') || Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_KEY');
        const apiVersion = Deno.env.get('AZURE_FORM_RECOGNIZER_API_VERSION');
        if (!endpoint || !key) return json({ error: 'Server misconfigured: missing Azure endpoint or key' }, 500);
        const azureResult = await analyzeWithAzure(endpoint, key, buffer, contentType || '', apiVersion);
        result = { analyzeResult: (azureResult as { analyzeResult?: unknown })?.analyzeResult };
        break;
      }
    }

    return json(result, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return json({ error: message }, 500);
  }
});
