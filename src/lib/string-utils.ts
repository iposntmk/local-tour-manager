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
 * Normalize name for uniqueness check
 */
export function normalizeForUnique(str: string): string {
  return removeDiacritics(str.toLowerCase().trim());
}
