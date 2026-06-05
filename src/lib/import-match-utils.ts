import Fuse from 'fuse.js';
import { getDestinationBaseName, normalizeForMatch } from '@/lib/string-utils';

// Re-export để các nơi đang import từ đây (vd: test, EnhancedImportReview) vẫn chạy.
export { normalizeForMatch } from '@/lib/string-utils';

/** A candidate score at/above this percent is treated as an automatic match. */
export const AUTO_MATCH_PCT = 85;
/** Candidates below this percent are not even shown as suggestions. */
export const SUGGEST_MIN_PCT = 40;

export interface MatchCandidate<T> {
  item: T;
  /** Similarity expressed as 0–100 (100 = exact normalized match). */
  percent: number;
}

export interface Matcher<T> {
  /** Ranked candidates (highest percent first), filtered to >= SUGGEST_MIN_PCT. */
  suggest: (name: string, limit?: number) => MatchCandidate<T>[];
  /** Best single candidate, or null when nothing clears SUGGEST_MIN_PCT. */
  best: (name: string) => MatchCandidate<T> | null;
}

type DestinationLike = {
  name: string;
  rawName?: string | null;
  raw_name?: string | null;
  provinceRef?: { nameAtBooking?: string | null };
};

/** Convert a Fuse score (0 = perfect, 1 = worst) into a 0–100 similarity percent. */
const scoreToPercent = (score: number | undefined): number =>
  Math.round((1 - (score ?? 1)) * 100);

const splitAliasNames = (value?: string | null): string[] =>
  (value || '').split(/[\n,]+/).map((part) => part.trim()).filter(Boolean);

const matchKeyForName = (item: DestinationLike, name: string, stripPrefix: boolean): string => {
  const matchName = stripPrefix
    ? getDestinationBaseName(name, [item.provinceRef?.nameAtBooking], true)
    : name;
  return normalizeForMatch(matchName);
};

const matchKeysForItem = <T extends { name: string }>(item: T, stripPrefix: boolean): string[] => {
  const destination = item as DestinationLike;
  const names = [item.name, ...splitAliasNames(destination.rawName), ...splitAliasNames(destination.raw_name)];
  return [...new Set(names.map((name) => matchKeyForName(destination, name, stripPrefix)).filter(Boolean))];
};

/**
 * Build a reusable fuzzy matcher over master records. Matching runs on a
 * diacritic-insensitive, prefix-stripped normalization of each name so the
 * same logic powers both the preview suggestions and the final import.
 */
export function buildMatcher<T extends { name: string }>(items: T[], stripPrefix = false): Matcher<T> {
  const records = items.flatMap((item) => matchKeysForItem(item, stripPrefix).map((key) => ({ item, key })));
  // threshold 0.6 -> returns everything down to ~40% similarity; we filter precisely below.
  const fuse = new Fuse(records, {
    keys: ['key'],
    threshold: 0.6,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  const suggest = (name: string, limit = 5): MatchCandidate<T>[] => {
    const queryName = stripPrefix ? getDestinationBaseName(name, [], true) : name;
    const q = normalizeForMatch(queryName);
    if (!q) return [];

    const qTokens = new Set(q.split(' ').filter(Boolean));
    const byItem = new Map<T, number>();
    const remember = (item: T, percent: number) => {
      const prev = byItem.get(item);
      if (prev === undefined || percent > prev) byItem.set(item, percent);
    };

    records.forEach((r) => {
      // Exact normalized match is always 100%, even if Fuse would score it lower.
      if (r.key === q) { remember(r.item, 100); return; }
      // Order-independent token similarity (Dice) — Bitap penalises reordered
      // words ("hội an phố cổ" vs "phố cổ hội an"), Dice does not.
      const rTokens = r.key.split(' ').filter(Boolean);
      if (qTokens.size && rTokens.length) {
        let intersection = 0;
        rTokens.forEach((t) => { if (qTokens.has(t)) intersection += 1; });
        const dice = Math.round((2 * intersection / (qTokens.size + rTokens.length)) * 100);
        if (dice >= SUGGEST_MIN_PCT) remember(r.item, dice);
      }
    });

    // Fuse catches typos / missing spaces within tokens.
    fuse.search(q).forEach((r) => {
      const percent = scoreToPercent(r.score);
      if (percent >= SUGGEST_MIN_PCT) remember(r.item.item, percent);
    });

    return [...byItem.entries()]
      .map(([item, percent]) => ({ item, percent }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, limit);
  };

  const best = (name: string): MatchCandidate<T> | null => suggest(name, 1)[0] ?? null;

  return { suggest, best };
}
