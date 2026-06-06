const DEFAULT_API_VERSION = '2023-07-31';

const contentTypes = new Map<string, string>([
  ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['png', 'image/png'],
  ['bmp', 'image/bmp'], ['tif', 'image/tiff'], ['tiff', 'image/tiff'], ['pdf', 'application/pdf'],
]);

const guessContentType = (fileName = '', provided = '') => {
  if (provided) return provided;
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return contentTypes.get(ext) || 'application/octet-stream';
};

const buildAnalyzeUrl = (endpoint: string, apiVersion: string) => {
  const base = endpoint.replace(/\/+$/, '');
  const route = apiVersion.startsWith('2024-') ? 'documentintelligence' : 'formrecognizer';
  return `${base}/${route}/documentModels/prebuilt-layout:analyze?api-version=${apiVersion}`;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function analyzeDocument(
  endpoint: string,
  key: string,
  buffer: Uint8Array,
  contentType: string,
  apiVersion = DEFAULT_API_VERSION,
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

export function analyzeWithAzure(
  endpoint: string,
  key: string,
  buffer: Uint8Array,
  contentType: string,
  apiVersion?: string,
) {
  return analyzeDocument(endpoint, key, buffer, guessContentType('', contentType), apiVersion);
}
