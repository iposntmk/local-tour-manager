import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { LineAttachmentUploader } from './LineAttachmentUploader';
import { getSuggestedVatAmount, hasLineAttachments } from '@/lib/tour-line-utils';
import { t } from '@/lib/i18n';
import type { AttachmentLineType, Destination, Expense, Meal } from '@/types/tour';
import type { Access } from '@/lib/tour-detail-permissions';

type LineData = Destination | Expense | Meal;

interface LineEvidenceFieldsProps<T extends LineData> {
  line: T;
  onChange: (line: T) => void;
  totalGuests: number;
  tourId?: string;
  lineType: AttachmentLineType;
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
  access?: Access;
}

export function LineEvidenceFields<T extends LineData>({
  line,
  onChange,
  totalGuests,
  tourId,
  lineType,
  pendingFiles,
  onPendingFilesChange,
  access,
}: LineEvidenceFieldsProps<T>) {
  if (access?.view === false) return null;
  const disabled = access?.edit === false;

  const updateVatRate = (rawValue: string) => {
    if (disabled) return;
    const vatRate = rawValue === '' ? 0 : Number(rawValue);
    onChange({
      ...line,
      vatRate,
      vatAmount: getSuggestedVatAmount(line, totalGuests, vatRate),
    });
  };

  const showMissingEvidenceHint = (line.vatRate || 0) > 0 && !hasLineAttachments(line, pendingFiles);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
      <div className="space-y-2">
        <Label>{t('tourEvidence.guideNote')}</Label>
        <Textarea
          rows={3}
          value={line.guideNote || ''}
          disabled={disabled}
          onChange={(event) => onChange({ ...line, guideNote: event.target.value })}
          placeholder={t('tourEvidence.guideNotePlaceholder')}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('tourEvidence.vatRate')}</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={line.vatRate ?? 0}
            disabled={disabled}
            onChange={(event) => updateVatRate(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('tourEvidence.vatAmount')}</Label>
          <CurrencyInput
            value={line.vatAmount || 0}
            onChange={(vatAmount) => onChange({ ...line, vatAmount })}
            showQuickAmounts={false}
            disabled={disabled}
          />
        </div>
      </div>

      {showMissingEvidenceHint && (
        <p className="text-xs text-amber-600">{t('tourEvidence.missingVatEvidence')}</p>
      )}

      <LineAttachmentUploader
        tourId={tourId}
        lineType={lineType}
        lineId={line.id}
        attachments={line.attachments}
        pendingFiles={pendingFiles}
        onPendingFilesChange={onPendingFilesChange}
        disabled={disabled}
      />
    </div>
  );
}
