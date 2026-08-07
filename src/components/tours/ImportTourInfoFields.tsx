import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';
import { EntitySelector } from './EntitySelector';
import type { ReviewItem } from '@/hooks/useEnhancedImportReview';
import type { Company, Guide, Nationality } from '@/types/master';

export type ImportEntityType = 'companyRef' | 'guideRef' | 'clientNationalityRef';

interface Props {
  item: ReviewItem;
  warnings: string[];
  companies: Company[];
  guides: Guide[];
  nationalities: Nationality[];
  onUpdateField: (field: string, value: any) => void;
  onUpdateEntityRef: (entityType: ImportEntityType, entity: { id: string; name: string }) => void;
  onOpenCompanyDialog: () => void;
  onOpenNationalityDialog: () => void;
}

const FIELD_CLASS = 'h-7 text-xs';

/**
 * Tab "Info" của thẻ review import: toàn bộ trường thuộc tab Thông tin của tour.
 * Tách khỏi EnhancedImportTourCard để mỗi file giữ một trách nhiệm và dưới hạn dòng.
 */
export function ImportTourInfoFields({
  item, warnings, companies, guides, nationalities,
  onUpdateField, onUpdateEntityRef, onOpenCompanyDialog, onOpenNationalityDialog,
}: Props) {
  const { tour, raw } = item;
  const totalGuests = (Number(tour.adults) || 0) + (Number(tour.children) || 0);

  const updateCount = (field: 'adults' | 'children', value: string) =>
    onUpdateField(field, Math.max(0, Number(value) || 0));

  return (
    <div className="space-y-2">
      {warnings.length > 0 && (
        <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
          <div className="flex items-start gap-1">
            <AlertCircle className="h-3 w-3 text-yellow-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-yellow-800">Warnings:</div>
              <ul className="list-disc list-inside mt-0.5 text-xs text-yellow-700 space-y-0.5 break-words">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">Tên khách</Label>
          <Input value={tour.clientName || ''} onChange={(e) => onUpdateField('clientName', e.target.value)}
            className={`${FIELD_CLASS} ${!tour.clientName ? 'border-yellow-500' : ''}`} />
        </div>
        <div>
          <Label className="text-xs font-medium">Mã tour</Label>
          <Input value={tour.tourCode || ''} onChange={(e) => onUpdateField('tourCode', e.target.value)}
            className={`${FIELD_CLASS} ${!tour.tourCode ? 'border-yellow-500' : ''}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs font-medium">
            Công ty {raw.company && <span className="text-muted-foreground ml-1">({raw.company})</span>}
          </Label>
          <div className={!tour.companyRef?.id ? 'border border-yellow-500 rounded' : ''}>
            <EntitySelector entities={companies} selected={tour.companyRef}
              onSelect={(e) => onUpdateEntityRef('companyRef', e)}
              onCreateNew={onOpenCompanyDialog} placeholder="Chọn công ty" />
          </div>
        </div>
        <div>
          <Label className="text-xs font-medium">
            HDV {raw.guide && <span className="text-muted-foreground ml-1">({raw.guide})</span>}
          </Label>
          <div className={!tour.guideRef?.id ? 'border border-yellow-500 rounded' : ''}>
            <EntitySelector entities={guides} selected={tour.guideRef}
              onSelect={(e) => onUpdateEntityRef('guideRef', e)} placeholder="Chọn HDV" />
          </div>
        </div>
        <div>
          <Label className="text-xs font-medium">
            Quốc tịch {raw.nationality && <span className="text-muted-foreground ml-1">({raw.nationality})</span>}
          </Label>
          <div className={!tour.clientNationalityRef?.id ? 'border border-yellow-500 rounded' : ''}>
            <EntitySelector entities={nationalities} selected={tour.clientNationalityRef}
              onSelect={(e) => onUpdateEntityRef('clientNationalityRef', e)}
              onCreateNew={onOpenNationalityDialog} placeholder="Chọn quốc tịch" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs font-medium">Người lớn</Label>
          <Input type="number" inputMode="numeric" min={0} value={tour.adults ?? 0}
            onChange={(e) => updateCount('adults', e.target.value)}
            className={`${FIELD_CLASS} ${totalGuests <= 0 ? 'border-yellow-500' : ''}`} />
        </div>
        <div>
          <Label className="text-xs font-medium">Trẻ em</Label>
          <Input type="number" inputMode="numeric" min={0} value={tour.children ?? 0}
            onChange={(e) => updateCount('children', e.target.value)}
            className={FIELD_CLASS} />
        </div>
        <div>
          <Label className="text-xs font-medium">Tổng khách</Label>
          <Input value={totalGuests} readOnly disabled className={`${FIELD_CLASS} bg-muted`} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">Lái xe</Label>
          <Input value={tour.driverName || ''} onChange={(e) => onUpdateField('driverName', e.target.value)}
            className={FIELD_CLASS} />
        </div>
        <div>
          <Label className="text-xs font-medium">SĐT khách</Label>
          <Input value={tour.clientPhone || ''} onChange={(e) => onUpdateField('clientPhone', e.target.value)}
            className={FIELD_CLASS} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">Ngày bắt đầu</Label>
          <Input type="date" value={tour.startDate || ''} onChange={(e) => onUpdateField('startDate', e.target.value)}
            className={`${FIELD_CLASS} ${!tour.startDate ? 'border-yellow-500' : ''}`} />
        </div>
        <div>
          <Label className="text-xs font-medium">Ngày kết thúc</Label>
          <Input type="date" value={tour.endDate || ''} onChange={(e) => onUpdateField('endDate', e.target.value)}
            className={`${FIELD_CLASS} ${!tour.endDate ? 'border-yellow-500' : ''}`} />
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium">Ghi chú (khách sạn theo ngày từ OCR)</Label>
        <Textarea value={tour.notes || ''} onChange={(e) => onUpdateField('notes', e.target.value)}
          rows={3} className="text-xs min-h-16" />
      </div>
    </div>
  );
}
