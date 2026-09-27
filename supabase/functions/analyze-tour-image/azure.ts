const DEFAULT_API_VERSION = '2023-07-31';
const DEFAULT_MODEL = 'prebuilt-layout';
const POLL_TIMEOUT_MS = 90_000;

const contentTypes = new Map<string, string>([
  ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['png', 'image/png'],
  ['bmp', 'image/bmp'], ['tif', 'image/tiff'], ['tiff', 'image/tiff'], ['pdf', 'application/pdf'],
]);

// prebuilt-layout chỉ nhận các kiểu này. WebP/HEIC không được hỗ trợ: gửi thẳng lên
// Azure chỉ nhận về 400 khó hiểu, nên chặn sớm với thông báo rõ ràng.
const SUPPORTED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/bmp', 'image/tiff', 'application/pdf',
]);

export interface AzureOptions {
  apiVersion?: string;
  model?: string;
}

export interface AzureTiming {
  submitMs: number;
  pollMs: number;
  polls: number;
}

const guessContentType = (fileName = '', provided = '') => {
  if (provided) return provided;
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return contentTypes.get(ext) || 'application/octet-stream';
};

const assertSupported = (contentType: string) => {
  // Kiểu nhị phân chung: để Azure tự nhận dạng như trước.
  if (SUPPORTED_TYPES.has(contentType) || contentType === 'application/octet-stream') return contentType;
  throw new Error(
    `Azure OCR không hỗ trợ định dạng "${contentType}". Hãy dùng ảnh JPG, PNG, BMP, TIFF hoặc file PDF.`,
  );
};

const buildAnalyzeUrl = (endpoint: string, apiVersion: string, model: string) => {
  const base = endpoint.replace(/\/+$/, '');
  const route = apiVersion.startsWith('2024-') ? 'documentintelligence' : 'formrecognizer';
  return `${base}/${route}/documentModels/${model}:analyze?api-version=${apiVersion}`;
};

/** Đổi lỗi Azure thường gặp sang thông báo tiếng Việt người dùng hiểu được. */
const describeAzureError = (status: number, text: string) => {
  if (text.includes('InvalidContentLength')) {
    return 'Ảnh quá lớn so với giới hạn Azure (4MB). Hãy chụp lại ảnh nhỏ hơn hoặc dùng JPG/PNG.';
  }
  if (text.includes('InvalidContent') || text.includes('UnsupportedMediaType')) {
    return 'Azure không đọc được file này. Hãy dùng ảnh JPG, PNG, BMP, TIFF hoặc file PDF.';
  }
  if (status === 401 || status === 403) return 'Azure từ chối key/endpoint. Kiểm tra lại secret AZURE_FORM_RECOGNIZER_*.';
  if (status === 429) return 'Azure đang giới hạn tần suất (gói F0). Đợi vài giây rồi thử lại.';
  return `Azure analyze failed (${status}): ${text || 'missing Operation-Location header'}`;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Row = Record<string, unknown>;

/**
 * Chỉ giữ phần parser dùng (content, pages[].lines[].content, tables[].cells). Kết quả gốc
 * của prebuilt-layout kèm words/polygon/spans/styles, nặng gấp nhiều lần — cắt bớt giúp
 * response về client nhanh hơn.
 */
const slimAnalyzeResult = (analyzeResult: Row | undefined) => {
  if (!analyzeResult) return analyzeResult;
  const pages = (analyzeResult.pages as Row[] | undefined) || [];
  const tables = (analyzeResult.tables as Row[] | undefined) || [];
  return {
    content: analyzeResult.content,
    pages: pages.map((page) => ({
      lines: ((page.lines as Row[] | undefined) || []).map((line) => ({ content: line.content })),
    })),
    tables: tables.map((table) => ({
      rowCount: table.rowCount,
      columnCount: table.columnCount,
      cells: ((table.cells as Row[] | undefined) || []).map((cell) => ({
        rowIndex: cell.rowIndex, columnIndex: cell.columnIndex, content: cell.content,
      })),
    })),
  };
};

export async function analyzeWithAzure(
  endpoint: string,
  key: string,
  buffer: Uint8Array,
  contentType: string,
  fileName = '',
  options: AzureOptions = {},
) {
  const apiVersion = options.apiVersion || DEFAULT_API_VERSION;
  const model = options.model || DEFAULT_MODEL;
  const type = assertSupported(guessContentType(fileName, contentType));

  const submitStart = Date.now();
  const response = await fetch(buildAnalyzeUrl(endpoint, apiVersion, model), {
    method: 'POST',
    headers: { 'Content-Type': type, 'Ocp-Apim-Subscription-Key': key },
    body: buffer,
  });
  const operationLocation = response.headers.get('operation-location');
  if (!response.ok || !operationLocation) {
    const text = await response.text().catch(() => '');
    throw new Error(describeAzureError(response.status, text));
  }
  const submitMs = Date.now() - submitStart;

  // Layout một trang hiếm khi xong dưới 1s, nên chờ 1s rồi mới poll, sau đó poll mỗi 500ms.
  // Gói F0 giới hạn tần suất GET: poll dày hơn sẽ bị 429, khi đó chờ theo Retry-After.
  const pollStart = Date.now();
  const deadline = pollStart + POLL_TIMEOUT_MS;
  let polls = 0;
  let delay = 1000;
  while (Date.now() < deadline) {
    await sleep(delay);
    polls += 1;
    const poll = await fetch(operationLocation, { headers: { 'Ocp-Apim-Subscription-Key': key } });
    if (poll.status === 429) {
      await poll.body?.cancel();
      // Retry-After của F0 hay rất dè dặt (tới ~20s); thử lại sau tối đa 2s vẫn an toàn.
      delay = Math.min(2000, Math.max(1000, Number(poll.headers.get('retry-after')) * 1000 || 0));
      continue;
    }
    const result = await poll.json().catch(() => ({}));
    if (!poll.ok) throw new Error(`Azure poll failed (${poll.status}): ${JSON.stringify(result)}`);
    if (result.status === 'failed') throw new Error(`Azure analyze failed: ${JSON.stringify(result.error || result)}`);
    if (result.status === 'succeeded') {
      const timing: AzureTiming = { submitMs, pollMs: Date.now() - pollStart, polls };
      return { analyzeResult: slimAnalyzeResult(result.analyzeResult), timing };
    }
    delay = polls < 12 ? 500 : 1000;
  }
  throw new Error('Azure OCR quá thời gian chờ (90 giây). Vui lòng thử lại.');
}
