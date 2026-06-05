import { describe, it, expect } from 'vitest';
import { buildMatcher, normalizeForMatch, SUGGEST_MIN_PCT } from '@/lib/import-match-utils';

const dest = (id: string, name: string, price = 0, province = '') => ({
  id,
  name,
  price,
  provinceRef: { id: `p-${id}`, nameAtBooking: province },
});

describe('normalizeForMatch', () => {
  it('strips diacritics, lowercases and collapses whitespace', () => {
    expect(normalizeForMatch('  Hội  An ')).toBe('hoi an');
  });

  it('drops the "vé_" destination prefix when requested', () => {
    expect(normalizeForMatch('vé_Hội An', true)).toBe('hoi an');
    expect(normalizeForMatch('vé_Hội An', false)).not.toBe('hoi an');
  });
});

describe('buildMatcher (destinations)', () => {
  const destinations = [
    dest('1', 'vé_Hội An_Quảng Nam', 120000, 'Quảng Nam'),
    dest('2', 'vé_Đại Nội_Huế', 200000, 'Huế'),
    dest('3', 'vé_Phố Cổ Hội An_Quảng Nam', 90000, 'Quảng Nam'),
  ];
  const matcher = buildMatcher(destinations, true);

  it('matches JSON "Hội An" to DB "vé_Hội An_Quảng Nam" at 100%', () => {
    const best = matcher.best('Hội An');
    expect(best?.item.id).toBe('1');
    expect(best?.percent).toBe(100);
  });

  it('matches diacritic-free input too', () => {
    expect(matcher.best('hoi an')?.item.id).toBe('1');
  });

  it('matches a structured destination name by its base name', () => {
    expect(matcher.best('vé_Hội An_Quảng Nam')?.item.id).toBe('1');
  });

  it('returns ranked suggestions for partial names', () => {
    const suggestions = matcher.suggest('hoi an pho co');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].percent).toBeGreaterThanOrEqual(SUGGEST_MIN_PCT);
    // suggestions are sorted by descending similarity
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1].percent).toBeGreaterThanOrEqual(suggestions[i].percent);
    }
  });

  it('returns nothing for an empty query', () => {
    expect(matcher.suggest('')).toEqual([]);
    expect(matcher.best('')).toBeNull();
  });
});
