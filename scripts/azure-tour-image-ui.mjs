import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_API_VERSION,
  analyzeDocumentBuffer,
  getAzureConfig,
} from './azure-document-intelligence.mjs';
import { buildTourImportJson } from './tour-image-import-parser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, 'tour-ocr-ui.html');
const maxUploadBytes = 20 * 1024 * 1024;

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
};

const sendHtml = async (res) => {
  const html = await readFile(htmlPath, 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
};

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > maxUploadBytes) {
      reject(new Error('File upload exceeds 20MB'));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

const parseBoundary = (contentType = '') => {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return match?.[1] || match?.[2] || '';
};

const parsePartHeaders = (headerText) => {
  const name = headerText.match(/name="([^"]+)"/)?.[1] || '';
  const fileName = headerText.match(/filename="([^"]*)"/)?.[1] || '';
  return { name, fileName };
};

const parseMultipart = (buffer, boundary) => {
  const delimiter = Buffer.from(`--${boundary}`);
  const headerDivider = Buffer.from('\r\n\r\n');
  const fields = {};
  let file = null;
  let start = buffer.indexOf(delimiter);

  while (start >= 0) {
    start += delimiter.length;
    if (buffer[start] === 45 && buffer[start + 1] === 45) break;
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;

    const headerEnd = buffer.indexOf(headerDivider, start);
    if (headerEnd < 0) break;
    const next = buffer.indexOf(delimiter, headerEnd + headerDivider.length);
    if (next < 0) break;

    let contentEnd = next;
    if (buffer[contentEnd - 2] === 13 && buffer[contentEnd - 1] === 10) contentEnd -= 2;
    const headers = buffer.slice(start, headerEnd).toString('utf8');
    const content = buffer.slice(headerEnd + headerDivider.length, contentEnd);
    const part = parsePartHeaders(headers);

    if (part.fileName) file = { name: part.fileName, buffer: content };
    else if (part.name) fields[part.name] = content.toString('utf8').trim();
    start = next;
  }

  return { fields, file };
};

const handleAnalyze = async (req, res) => {
  const { endpoint, key, apiVersion } = getAzureConfig();
  if (!endpoint || !key) {
    sendJson(res, 500, { error: 'Missing Azure endpoint or key in .env' });
    return;
  }

  const boundary = parseBoundary(req.headers['content-type']);
  if (!boundary) {
    sendJson(res, 400, { error: 'Expected multipart upload' });
    return;
  }

  const body = await readBody(req);
  const { fields, file } = parseMultipart(body, boundary);
  if (!file?.buffer?.length) {
    sendJson(res, 400, { error: 'No image or PDF file uploaded' });
    return;
  }

  const result = await analyzeDocumentBuffer({
    endpoint,
    key,
    buffer: file.buffer,
    fileName: file.name,
    apiVersion: fields.apiVersion || apiVersion || DEFAULT_API_VERSION,
  });
  const importJson = buildTourImportJson(result.analyzeResult, {
    year: fields.year,
    company: fields.company,
    nationality: fields.nationality,
  });
  const tour = importJson[0]?.tour || {};
  sendJson(res, 200, {
    importJson,
    meta: {
      fileName: file.name,
      tourCode: tour.tourCode || '',
      startDate: tour.startDate || '',
      endDate: tour.endDate || '',
      totalGuests: tour.totalGuests || 0,
    },
  });
};

const handleRequest = async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      await sendHtml(res);
      return;
    }
    if (req.method === 'GET' && req.url === '/api/health') {
      const config = getAzureConfig();
      sendJson(res, 200, { hasEndpoint: Boolean(config.endpoint), hasKey: Boolean(config.key), apiVersion: config.apiVersion });
      return;
    }
    if (req.method === 'POST' && req.url === '/api/analyze') {
      await handleAnalyze(req, res);
      return;
    }
    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : 'Unexpected server error' });
  }
};

const listen = (server, port) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', () => resolve(port));
});

const start = async () => {
  const basePort = Number(process.env.PORT || 8787);
  for (let offset = 0; offset < 20; offset += 1) {
    const server = createServer(handleRequest);
    try {
      const port = await listen(server, basePort + offset);
      console.log(`Tour OCR UI: http://127.0.0.1:${port}/`);
      return;
    } catch (error) {
      if (error?.code !== 'EADDRINUSE') throw error;
    }
  }
  throw new Error('No available port found from 8787 to 8796');
};

start().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
