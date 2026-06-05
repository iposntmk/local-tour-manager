import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

export const DEFAULT_API_VERSION = '2023-07-31';

const contentTypes = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.bmp', 'image/bmp'],
  ['.tif', 'image/tiff'],
  ['.tiff', 'image/tiff'],
  ['.pdf', 'application/pdf'],
]);

export const readEnv = (names) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return '';
};

export const getAzureConfig = () => {
  const endpoint = readEnv(['AZURE_FORM_RECOGNIZER_ENDPOINT', 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT']);
  const key = readEnv(['AZURE_FORM_RECOGNIZER_KEY', 'AZURE_DOCUMENT_INTELLIGENCE_KEY', 'Azure-FormRecognizer']);
  const apiVersion = readEnv(['AZURE_FORM_RECOGNIZER_API_VERSION', 'AZURE_DOCUMENT_INTELLIGENCE_API_VERSION']) || DEFAULT_API_VERSION;
  return { endpoint, key, apiVersion };
};

export const getContentType = (fileName = '') =>
  contentTypes.get(extname(fileName).toLowerCase()) || 'application/octet-stream';

const buildAnalyzeUrl = (endpoint, apiVersion) => {
  const base = endpoint.replace(/\/+$/, '');
  const route = apiVersion.startsWith('2024-') ? 'documentintelligence' : 'formrecognizer';
  return `${base}/${route}/documentModels/prebuilt-layout:analyze?api-version=${apiVersion}`;
};

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const requestJson = async (url, key) => {
  const response = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': key },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Azure poll failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
};

export const analyzeDocumentBuffer = async ({
  endpoint,
  key,
  buffer,
  fileName,
  apiVersion = DEFAULT_API_VERSION,
}) => {
  const response = await fetch(buildAnalyzeUrl(endpoint, apiVersion), {
    method: 'POST',
    headers: {
      'Content-Type': getContentType(fileName),
      'Ocp-Apim-Subscription-Key': key,
    },
    body: buffer,
  });

  const operationLocation = response.headers.get('operation-location');
  if (!response.ok || !operationLocation) {
    const body = await response.text().catch(() => '');
    throw new Error(`Azure analyze failed (${response.status}): ${body || 'missing Operation-Location header'}`);
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = await requestJson(operationLocation, key);
    if (result.status === 'succeeded') return result;
    if (result.status === 'failed') throw new Error(`Azure analyze failed: ${JSON.stringify(result.error || result)}`);
    await sleep(1000);
  }
  throw new Error('Azure analyze timed out after 60 seconds');
};

export const analyzeDocumentFile = async ({ endpoint, key, filePath, apiVersion }) => {
  const absolutePath = resolve(filePath);
  const buffer = await readFile(absolutePath);
  return analyzeDocumentBuffer({ endpoint, key, buffer, fileName: absolutePath, apiVersion });
};
