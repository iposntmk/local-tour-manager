import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MatchCandidate } from '@/lib/import-match-utils';

interface SuggestionChipsProps {
  item: { name?: string };
  hasMatch: boolean;
  suggestFunction?: ((name: string) => MatchCandidate<unknown>[]) | null;
  onApply: (candidate: { id?: string; name: string; price?: number }) => void;
  emptyText?: string;
}

/**
 * Suggestion chips shown when a row has no automatic match. Tapping a
 * chip applies the candidate's name+price back to the row, which then
 * re-runs the matcher and surfaces the green Matched badge.
 */
export function SuggestionChips({
  item,
  hasMatch,
  suggestFunction,
  onApply,
  emptyText = 'Gợi ý:',
}: SuggestionChipsProps) {
  if (hasMatch || !suggestFunction || !item.name) return null;
  const candidates = suggestFunction(item.name) as MatchCandidate<{ id?: string; name: string; price?: number }>[];
  if (candidates.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 pt-0.5">
      <span className="text-[10px] text-muted-foreground self-center">{emptyText}</span>
      {candidates.map((c) => (
        <Button
          key={c.item.id ?? c.item.name}
          variant="outline"
          size="sm"
          onClick={() => onApply(c.item)}
          className="h-5 px-1.5 text-[10px] border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-800"
          title={`${c.item.name} — ${c.percent}%`}
        >
          {c.item.name} · {c.percent}%
        </Button>
      ))}
    </div>
  );
}

interface ProvinceCandidatesProps {
  item: { name?: string; provinceCandidates?: string[] };
  /** Re-runs the matcher after applying a province variant. */
  matchFunction: ((name: string) => unknown) | null;
  onApply: (name: string) => void;
}

/**
 * Renders the province picker for an allowance row whose OCR produced
 * multiple province candidates. Picking a province rewrites the row's
 * name to `Công tác phí - <province>` and re-applies the matcher.
 */
export function ProvinceCandidates({ item, matchFunction, onApply }: ProvinceCandidatesProps) {
  const provinces = item.provinceCandidates;
  if (!provinces || provinces.length <= 1) return null;
  const currentProvince = (item.name || '').replace('Công tác phí - ', '');
  return (
    <div className="flex flex-wrap gap-1 pt-1">
      <span className="text-[10px] text-muted-foreground self-center">
        <MapPin className="inline h-3 w-3 mr-0.5" />
        Tỉnh:
      </span>
      {provinces.map((prov) => {
        const isActive = currentProvince === prov;
        return (
          <Button
            key={prov}
            variant="outline"
            size="sm"
            onClick={() => {
              const newName = `Công tác phí - ${prov}`;
              const matched = matchFunction?.(newName) as { name: string; price?: number; id?: string } | null;
              if (matched) onApply(matched.name);
              else onApply(newName);
            }}
            className={`h-5 px-1.5 text-[10px] ${
              isActive
                ? 'border-blue-500 bg-blue-50 text-blue-800'
                : 'border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-800'
            }`}
          >
            {prov}
          </Button>
        );
      })}
    </div>
  );
}
