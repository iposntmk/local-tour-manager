import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MatchCandidate } from '@/lib/import-match-utils';
import { SubcollectionSummaryCard } from './import-review/SubcollectionSummaryCard';
import { SubcollectionRowCard } from './import-review/SubcollectionRowCard';
import { SubcollectionRowTable } from './import-review/SubcollectionRowTable';

export type SubcollectionMatchType = 'destination' | 'expense' | 'meal' | 'allowance' | 'summary';

export interface SubcollectionSectionProps {
  title: string;
  icon: React.ReactNode;
  items: any[];
  tourIndex: number;
  sectionKey: string;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  matchFunction: ((name: string) => { id: string; name: string; price?: number } | null) | null;
  suggestFunction?: ((name: string) => MatchCandidate<any>[]) | null;
  matchType: SubcollectionMatchType | string;
  masterData?: Array<{ id: string; name: string; price?: number }>;
  rawData?: any[];
}

/**
 * Container for a list of rows (destinations / expenses / meals / allowances
 * / summary). Renders an empty state when `items` is empty, the summary
 * card layout for `matchType === 'summary'`, or a stacked card list on
 * mobile + a table on desktop for the rest. All matching, combobox and
 * suggestion logic lives in the row components.
 */
export function SubcollectionSection({
  title,
  items,
  onUpdate,
  onRemove,
  matchFunction,
  suggestFunction,
  matchType,
  masterData = [],
  rawData = [],
}: SubcollectionSectionProps) {
  if (items.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-6 sm:py-8 border rounded-lg">
        No {title.toLowerCase()} found
      </div>
    );
  }

  if (matchType === 'summary') {
    return (
      <div className="space-y-2">
        {items.map((item, index) => (
          <SubcollectionSummaryCard
            key={index}
            item={item}
            rawItem={rawData?.[index]}
            onUpdate={(field, value) => onUpdate(index, field, value)}
          />
        ))}
      </div>
    );
  }

  const showDate = matchType !== 'allowance';
  const typedMatch = matchFunction as ((name: string) => { id: string; name: string; price?: number } | null) | null;
  const typedSuggest = suggestFunction as ((name: string) => MatchCandidate<unknown>[]) | null;
  const typedMaster = masterData as Array<{ id: string; name: string; price?: number }>;

  const onApplyMatch = (index: number, matched: { id?: string; name: string; price?: number }) => {
    onUpdate(index, 'name', matched.name);
    if (matched.price !== undefined) onUpdate(index, 'price', matched.price);
  };

  return (
    <div className="space-y-2 sm:space-y-0">
      <div className="space-y-2 sm:hidden">
        {items.map((item, index) => (
          <SubcollectionRowCard
            key={index}
            index={index}
            item={item}
            matchType={matchType as SubcollectionMatchType}
            matchFunction={typedMatch}
            suggestFunction={typedSuggest}
            masterData={typedMaster}
            rawItem={rawData?.[index]}
            showDate={showDate}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onApplyMatch={onApplyMatch}
          />
        ))}
      </div>
      <div className="hidden sm:block border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-xs">#</TableHead>
              <TableHead className="text-xs">Name / JSON</TableHead>
              <TableHead className="text-xs">Price / JSON</TableHead>
              {showDate && <TableHead className="text-xs">Date / JSON</TableHead>}
              <TableHead className="text-xs w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <SubcollectionRowTable
                key={index}
                index={index}
                item={item}
                matchType={matchType as SubcollectionMatchType}
                matchFunction={typedMatch}
                suggestFunction={typedSuggest}
                masterData={typedMaster}
                rawItem={rawData?.[index]}
                showDate={showDate}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onApplyMatch={onApplyMatch}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
