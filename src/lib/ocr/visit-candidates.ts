// Tách ô "Tham quan" của lịch trình thành các cụm điểm tham quan ứng viên.
// KHÔNG đối chiếu DB ở đây — việc khớp (token/fuzzy) do bên gọi đảm nhận, nhờ
// vậy mọi điểm xuất hiện trong OCR đều có cơ hội vào JSON dù chưa có trong DB.

import { normalize, oneLine } from './ocr-text-utils';

// Bỏ token nhiễu nội dòng: mã chuyến bay, giá, số điện thoại, phần sau '='.
const stripInlineNoise = (segment: string): string =>
  segment
    .replace(/\b[A-Za-z]{2}\d{2,}\b/g, ' ') // mã chuyến bay (VN1591)
    .replace(/\d+\s*k\s*\/?\s*p(?:ax)?\b[^,.]*/gi, ' ') // giá 70k/p x 6
    .replace(/\d{5,}/g, ' ') // số điện thoại
    .replace(/=.*/g, ' ') // '=9.50' và phần đuôi
    .replace(/\s{2,}/g, ' ')
    .trim();

// Cụm thuộc các nhóm này bị coi là nhiễu (di chuyển/đặt dịch vụ) → bỏ cả cụm.
const NOISE = /\bbook\b|san bay|\bsb\b|no guide|reaching out|\bhdv\b|\bvat\b|khong oto/;

// Từ dẫn nhập đứng đầu cụm (động từ/loại hình) — lột để còn lại tên điểm.
const LEAD = new Set([
  'tham', 'quan', 'di', 'oto', 'o', 'to', 'dap', 'xe',
  'thuyen', 'tour', 'city', 'cung', 'ghe', 've', 'don', 'tien',
]);

const stripLeadVerbs = (segment: string): string => {
  const tokens = segment.split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < tokens.length && LEAD.has(normalize(tokens[i]))) i += 1;
  return tokens.slice(i).join(' ').trim();
};

const letterCount = (value: string): number =>
  (value.match(/[a-zA-ZÀ-ỹ]/g) || []).length;

/**
 * Trả về danh sách cụm điểm tham quan ứng viên (giữ chữ gốc để hiển thị/đối
 * chiếu), đã lột động từ dẫn nhập và loại token nhiễu. Bỏ qua cụm đặt dịch vụ /
 * đón-tiễn sân bay và cụm trùng (so theo dạng đã chuẩn hoá).
 */
export const extractVisitCandidates = (visitText: string): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  // Tách theo xuống dòng và dấu , . ; - (mỗi dòng thường là một nhóm điểm).
  for (const rawSeg of (visitText || '').split(/[\n,.;-]+/)) {
    const cleaned = stripLeadVerbs(stripInlineNoise(oneLine(rawSeg)));
    if (letterCount(cleaned) < 2) continue;
    const norm = normalize(cleaned);
    if (NOISE.test(norm) || seen.has(norm)) continue;
    seen.add(norm);
    out.push(cleaned);
  }
  return out;
};
