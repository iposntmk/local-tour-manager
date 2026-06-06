import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { cn } from '@/lib/utils';
import type { MatchCandidate } from '@/lib/import-match-utils';
import { EntityCombobox } from './SubcollectionEntityCombobox';
import { SuggestionChips, ProvinceCandidates } from './SubcollectionChips';

interface SubcollectionRowCardProps {
  index: number;
  item: {
    name?: string;
    price?: number;
    date?: string;
    provinceCandidates?: string[];
    matchedId?: string;
  };
  matchType: 'destination' | 'expense' | 'meal' | 'allowance' | 'summary';
  matchFunction: ((name: string) => { id: string; name: string; price?: number } | null) | null;
  suggestFunction?: ((name: string) => MatchCandidate<unknown>[]) | null;
  masterData: Array<{ id: string; name: string; price?: number }>;
  rawItem?: { name?: string; price?: number; date?: string };
  showDate: boolean;
  onUpdate: (index: number, field: string, value: unknown) => void;
  onRemove: (index: number) => void;
  onApplyMatch: (index: number, matched: { id?: string; name: string; price?: number }) => void;
}

/**
 * Stacked card layout for one row, used on mobile (sm:hidden).
 * On desktop this is replaced by the table row component.
 */
export function SubcollectionRowCard({
  index,
  item,
  matchType,
  matchFunction,
  suggestFunction,
  masterData,
  rawItem,
  showDate,
  onUpdate,
  onRemove,
  onApplyMatch,
}: SubcollectionRowCardProps) {
  const matched = matchFunction && item.name ? matchFunction(item.name) : null;
  const hasMatch = matched !== null;
  const useCombobox = masterData.length > 0;
  const suggestionRanked =
    !hasMatch && suggestFunction && item.name
      ? (suggestFunction(item.name) as MatchCandidate<{ id: string; name: string; price?: number }>[])
      : [];
  const prependOptions = suggestionRanked.map((c) => c.item).filter(Boolean);

  return (
    <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Badge variant="outline" className="text-xs shrink-0">
            {matchType} {index + 1}
          </Badge>
          {hasMatch && (
            <Badge variant="default" className="text-xs bg-green-100 text-green-800 shrink-0">
              <Check className="h-3 w-3 mr-1" />
              Matched
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRemove(index)}
          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 shrink-0"
          aria-label="Xoá dòng"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div>
        <Label className="text-xs">
          Name
          {rawItem?.name && rawItem.name !== item.name && (
            <span className="text-xs text-muted-foreground ml-1">(JSON: "{rawItem.name}")</span>
          )}
        </Label>
        {useCombobox ? (
          <EntityCombobox
            value={item.name ?? null}
            options={masterData}
            prependOptions={prependOptions}
            onSelect={(opt) => onApplyMatch(index, opt)}
            placeholder={`Select ${matchType}...`}
            tone={hasMatch ? 'success' : 'warning'}
          />
        ) : (
          <Input
            value={item.name || ''}
            onChange={(e) => onUpdate(index, 'name', e.target.value)}
            className={cn(
              'h-7 text-xs',
              hasMatch ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50',
            )}
          />
        )}
        <SuggestionChips
          item={item}
          hasMatch={hasMatch}
          suggestFunction={suggestFunction}
          onApply={(c) => onApplyMatch(index, c)}
        />
        <ProvinceCandidates
          item={item}
          matchFunction={matchFunction}
          onApply={(name) => onUpdate(index, 'name', name)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">
            Price
            {rawItem?.price !== undefined && (
              <span className="text-xs text-muted-foreground ml-1">(JSON: {rawItem.price})</span>
            )}
          </Label>
          <CurrencyInput
            value={item.price || 0}
            onChange={(v) => onUpdate(index, 'price', v)}
            size="compact"
          />
        </div>
        {showDate && (
          <div>
            <Label className="text-xs">
              Date
              {rawItem?.date && (
                <span className="text-xs text-muted-foreground ml-1">(JSON: "{rawItem.date}")</span>
              )}
            </Label>
            <Input
              type="date"
              value={item.date || ''}
              onChange={(e) => onUpdate(index, 'date', e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}
