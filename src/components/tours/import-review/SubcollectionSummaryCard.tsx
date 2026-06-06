import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';

interface SummaryCardProps {
  item: {
    totalTabs?: number;
    advancePayment?: number;
    totalAfterAdvance?: number;
    companyTip?: number;
    totalAfterTip?: number;
    collectionsForCompany?: number;
    totalAfterCollections?: number;
    finalTotal?: number;
  };
  rawItem?: {
    totalTabs?: number;
    advancePayment?: number;
    totalAfterAdvance?: number;
    companyTip?: number;
    totalAfterTip?: number;
    collectionsForCompany?: number;
    totalAfterCollections?: number;
    finalTotal?: number;
  };
  onUpdate: (field: string, value: number) => void;
}

interface Field {
  key: keyof SummaryCardProps['item'];
  label: string;
  editable: boolean;
}

const SUMMARY_FIELDS: Field[] = [
  { key: 'totalTabs', label: 'Total Tabs', editable: false },
  { key: 'advancePayment', label: 'Advance Payment', editable: true },
  { key: 'totalAfterAdvance', label: 'Total After Advance', editable: true },
  { key: 'companyTip', label: 'Company Tip', editable: true },
  { key: 'totalAfterTip', label: 'Total After Tip', editable: false },
  { key: 'collectionsForCompany', label: 'Collections For Company', editable: false },
  { key: 'totalAfterCollections', label: 'Total After Collections', editable: false },
  { key: 'finalTotal', label: 'Final Total', editable: false },
];

function JsonPeek({ value }: { value: number | undefined }) {
  if (value === undefined) return null;
  return <span className="text-xs text-muted-foreground ml-1">(JSON: {value})</span>;
}

export function SubcollectionSummaryCard({ item, rawItem, onUpdate }: SummaryCardProps) {
  return (
    <div className="border rounded-lg p-3 sm:p-4 bg-gray-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {SUMMARY_FIELDS.map((f) => {
          const value = (item[f.key] as number) || 0;
          return (
            <div key={f.key}>
              <Label className="text-xs font-medium">
                {f.label}
                <JsonPeek value={rawItem?.[f.key]} />
              </Label>
              {f.editable ? (
                <CurrencyInput
                  value={value}
                  onChange={(v) => onUpdate(f.key, v)}
                  size="compact"
                />
              ) : (
                <Input
                  type="number"
                  value={value}
                  readOnly
                  className="h-8 text-sm mt-1 bg-gray-100 cursor-not-allowed"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
