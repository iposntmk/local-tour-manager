import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { MatchCandidate } from '@/lib/import-match-utils';
import { EntityCombobox } from './SubcollectionEntityCombobox';
import { SuggestionChips, ProvinceCandidates } from './SubcollectionChips';

interface SubcollectionRowTableProps {
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
 * Table row layout for one row, used on desktop (hidden sm:table-row).
 * On mobile this is replaced by the card row component.
 */
export function SubcollectionRowTable({
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
}: SubcollectionRowTableProps) {
  const matched = matchFunction && item.name ? matchFunction(item.name) : null;
  const hasMatch = matched !== null;
  const useCombobox = masterData.length > 0;
  const suggestionRanked =
    !hasMatch && suggestFunction && item.name
      ? (suggestFunction(item.name) as MatchCandidate<{ id: string; name: string; price?: number }>[])
      : [];
  const prependOptions = suggestionRanked.map((c) => c.item).filter(Boolean);

  return (
    <TableRow>
      <TableCell className="text-xs font-medium">{index + 1}</TableCell>
      <TableCell className="text-xs">
        <div className="space-y-1 min-w-0">
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
          {rawItem?.name && rawItem.name !== item.name && (
            <div className="text-xs text-muted-foreground break-words">JSON: "{rawItem.name}"</div>
          )}
          {hasMatch && (
            <Badge variant="default" className="text-xs bg-green-100 text-green-800">
              <Check className="h-3 w-3 mr-1" />
              Matched: {matched!.name}
            </Badge>
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
      </TableCell>
      <TableCell className="text-xs">
        <div className="space-y-1">
          <CurrencyInput
            value={item.price || 0}
            onChange={(v) => onUpdate(index, 'price', v)}
            size="compact"
          />
          {rawItem?.price !== undefined && (
            <div className="text-xs text-muted-foreground">JSON: {rawItem.price}</div>
          )}
          {hasMatch && matched?.price != null && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
              Master: {matched.price.toLocaleString()} ₫
            </Badge>
          )}
        </div>
      </TableCell>
      {showDate && (
        <TableCell className="text-xs">
          <div className="space-y-1">
            <Input
              type="date"
              value={item.date || ''}
              onChange={(e) => onUpdate(index, 'date', e.target.value)}
              className="h-7 text-xs"
            />
            {rawItem?.date && (
              <div className="text-xs text-muted-foreground break-words">JSON: "{rawItem.date}"</div>
            )}
          </div>
        </TableCell>
      )}
      <TableCell className="text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRemove(index)}
          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
          aria-label="Xoá dòng"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
