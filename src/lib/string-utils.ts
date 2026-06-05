/**
 * Normalize Vietnamese string by removing diacritics
 */
export function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Chuẩn hoá tên để SO KHỚP (matching): bỏ tiền tố "vé_" (khi yêu cầu), bỏ dấu
 * tiếng Việt + đ→d, chuyển thường, đổi mọi dấu câu thành khoảng trắng rồi gộp
 * khoảng trắng. Đây là hàm chuẩn hoá DÙNG CHUNG cho cả parser OCR
 * (destination-lookup) lẫn matcher ở bước review (import-match-utils), để hai
 * nơi không bị lệch luật. KHÔNG dùng cho việc phân tích giá/notes (xem
 * ocr-text-utils.normalize) vì ở đó dấu câu là dữ liệu cần giữ.
 */
export function normalizeForMatch(value?: string | null, stripPrefix = false): string {
  if (!value) return '';
  let s = value.trim();
  if (stripPrefix && s.toLowerCase().startsWith(DESTINATION_NAME_PREFIX.toLowerCase())) {
    s = s.slice(DESTINATION_NAME_PREFIX.length);
  }
  return removeDiacritics(s)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate search keywords from a name
 */
export function generateSearchKeywords(name: string): string[] {
  const normalized = removeDiacritics(name.toLowerCase().trim());
  const words = normalized.split(/\s+/);
  const keywords = new Set<string>();
  
  // Add full normalized name
  keywords.add(normalized.replace(/\s+/g, ''));
  
  // Add individual words
  words.forEach(word => {
    if (word.length > 1) {
      keywords.add(word);
    }
  });
  
  // Add initials
  if (words.length > 1) {
    keywords.add(words.map(w => w[0]).join(''));
  }
  
  return Array.from(keywords);
}

/**
 * Prefix applied to every tourist destination name (e.g. "vé_Đại Nội").
 */
export const DESTINATION_NAME_PREFIX = 'vé_';

/**
 * Ensure a destination name carries the standard prefix (idempotent).
 */
export function ensureDestinationPrefix(name: string): string {
  const trimmed = name.trim();
  return trimmed.toLowerCase().startsWith(DESTINATION_NAME_PREFIX.toLowerCase())
    ? trimmed
    : `${DESTINATION_NAME_PREFIX}${trimmed}`;
}

const stripDestinationPrefix = (name: string): string => {
  const trimmed = name.trim();
  return trimmed.toLowerCase().startsWith(DESTINATION_NAME_PREFIX.toLowerCase())
    ? trimmed.slice(DESTINATION_NAME_PREFIX.length).trim()
    : trimmed;
};

const stripProvinceSuffix = (name: string, provinceName?: string | null): string => {
  const province = provinceName?.trim();
  if (!province) return name.trim();

  const suffix = `_${province}`;
  return name.toLowerCase().endsWith(suffix.toLowerCase())
    ? name.slice(0, -suffix.length).trim()
    : name.trim();
};

/**
 * Return only the destination body, without "vé_" and known province suffixes.
 */
export function getDestinationBaseName(
  name: string,
  provinceNames: Array<string | null | undefined> = [],
  stripUnknownSuffix = false,
): string {
  const baseName = stripDestinationPrefix(name);
  const suffixes = provinceNames
    .filter((province): province is string => !!province?.trim())
    .sort((a, b) => b.length - a.length);

  for (const province of suffixes) {
    const stripped = stripProvinceSuffix(baseName, province);
    if (stripped !== baseName.trim()) return stripped;
  }

  if (stripUnknownSuffix && baseName.includes('_')) {
    return baseName.slice(0, baseName.lastIndexOf('_')).trim();
  }

  return baseName.trim();
}

/**
 * Canonical destination name: "vé_<destination>_<province>".
 */
export function ensureDestinationNameStructure(
  name: string,
  provinceName?: string | null,
  previousProvinceName?: string | null,
): string {
  const province = provinceName?.trim() || '';
  const baseName = getDestinationBaseName(name, [previousProvinceName, province]);
  const body = [baseName, province].filter(Boolean).join('_');
  return `${DESTINATION_NAME_PREFIX}${body}`;
}

/**
 * Normalize name for uniqueness check
 */
export function normalizeForUnique(str: string): string {
  return removeDiacritics(str.toLowerCase().trim());
}
