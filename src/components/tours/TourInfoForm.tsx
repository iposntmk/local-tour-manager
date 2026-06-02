import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { NumberInput } from '@/components/ui/number-input';
import { DateInput } from '@/components/ui/date-input';
import { Plus, Save } from 'lucide-react';
import { cn, getRequiredFieldClasses } from '@/lib/utils';
import { CompanyDialog } from '@/components/companies/CompanyDialog';
import { NationalityDialog } from '@/components/nationalities/NationalityDialog';
import { TourNationalitiesPicker } from '@/components/tours/TourNationalitiesPicker';
import { TourInfoCombobox } from '@/components/tours/TourInfoCombobox';
import { useTourInfoForm } from '@/hooks/useTourInfoForm';
import type { Tour, TourInput } from '@/types/tour';
import type { Access, TourInfoFieldKey } from '@/lib/tour-detail-permissions';

interface TourInfoFormProps {
  initialData?: Tour;
  onSubmit: (data: TourInput) => void;
  showSubmitButton?: boolean;
  readOnly?: boolean;
  fieldAccess?: Partial<Record<TourInfoFieldKey, Access>>;
}

export function TourInfoForm({ initialData, onSubmit, showSubmitButton = true, readOnly = false, fieldAccess }: TourInfoFormProps) {
  const {
    register, watch, setValue, formState: { errors },
    onFormSubmit,
    companyOpen, setCompanyOpen,
    landOperatorOpen, setLandOperatorOpen,
    guideOpen, setGuideOpen,
    selectedCompanyId, setSelectedCompanyId,
    selectedLandOperatorId, setSelectedLandOperatorId,
    selectedGuideId, setSelectedGuideId,
    selectedNationalities, setSelectedNationalities,
    totalGuests, totalDays,
    saveCompanyPref, handleSavePrefChange,
    canCreateCompanies, canCreateNationalities,
    companies, guides, nationalities,
    quickAddTarget, openQuickAdd, handleQuickAddOpenChange,
    handleCreateCompany, handleCreateNationality,
  } = useTourInfoForm(initialData, onSubmit);
  const canView = (field: TourInfoFieldKey) => fieldAccess?.[field]?.view ?? true;
  const canEdit = (field: TourInfoFieldKey) => !readOnly && (fieldAccess?.[field]?.edit ?? true);

  return (
    <form onSubmit={onFormSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {canView('tourCode') && (
          <div className="space-y-2">
            <Label htmlFor="tourCode">Mã tour *</Label>
            <Input
              id="tourCode"
              {...register('tourCode', { required: 'Bắt buộc nhập mã tour' })}
              placeholder="ví dụ: AT-250901"
              disabled={!canEdit('tourCode')}
              className={cn(getRequiredFieldClasses(!!errors.tourCode))}
            />
            {errors.tourCode && <p className="text-sm text-destructive">{errors.tourCode.message}</p>}
          </div>
        )}

        {canView('companies') && (
          <TourInfoCombobox
            label="Công ty mẹ"
            required
            items={companies}
            selectedId={selectedCompanyId}
            onSelect={setSelectedCompanyId}
            open={companyOpen}
            onOpenChange={setCompanyOpen}
            placeholder="Chọn công ty mẹ..."
            searchPlaceholder="Tìm công ty mẹ..."
            emptyText="Không tìm thấy công ty mẹ."
            canCreate={canCreateCompanies}
            disabled={!canEdit('companies')}
            onOpenNewDialog={() => openQuickAdd('company')}
            createButtonTitle="Thêm công ty mẹ"
          >
            {!initialData && canEdit('companies') && (
              <div className="flex items-center gap-2 pt-1">
                <Checkbox id="save-company-pref" checked={saveCompanyPref} onCheckedChange={handleSavePrefChange} />
                <Label htmlFor="save-company-pref" className="cursor-pointer text-sm text-muted-foreground select-none">
                  Lưu công ty mẹ cho lần tạo tour tiếp theo
                </Label>
              </div>
            )}
          </TourInfoCombobox>
        )}

        {canView('companies') && (
          <TourInfoCombobox
            label="Công ty land tour"
            required
            items={companies}
            selectedId={selectedLandOperatorId}
            onSelect={setSelectedLandOperatorId}
            open={landOperatorOpen}
            onOpenChange={setLandOperatorOpen}
            placeholder="Chọn công ty land tour..."
            searchPlaceholder="Tìm công ty land tour..."
            emptyText="Không tìm thấy công ty land tour."
            canCreate={canCreateCompanies}
            disabled={!canEdit('companies')}
            onOpenNewDialog={() => openQuickAdd('landOperator')}
            createButtonTitle="Thêm công ty land tour"
          />
        )}

        {canView('guide') && (
          <TourInfoCombobox
            label="Hướng dẫn viên"
            items={guides}
            selectedId={selectedGuideId}
            onSelect={setSelectedGuideId}
            open={guideOpen}
            onOpenChange={setGuideOpen}
            placeholder="Chọn hướng dẫn viên..."
            searchPlaceholder="Tìm hướng dẫn viên..."
            emptyText="Không tìm thấy hướng dẫn viên."
            disabled={!canEdit('guide')}
          />
        )}

        {canView('client') && (
          <div className="space-y-2">
            <Label htmlFor="clientName">Tên khách hàng *</Label>
            <Input
              id="clientName"
              {...register('clientName', { required: 'Bắt buộc nhập tên khách hàng' })}
              placeholder="ví dụ: Bà Nguyễn Thị A"
              disabled={!canEdit('client')}
            />
            {errors.clientName && <p className="text-sm text-destructive">{errors.clientName.message}</p>}
          </div>
        )}

        {canView('client') && (
          <div className="space-y-2">
            <Label>Quốc tịch *</Label>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <TourNationalitiesPicker
                  nationalities={nationalities}
                  value={selectedNationalities}
                  onChange={setSelectedNationalities}
                  totalGuests={totalGuests}
                  required
                  disabled={!canEdit('client')}
                />
              </div>
              {canCreateNationalities && canEdit('client') && (
                <Button type="button" variant="outline" size="icon" title="Thêm quốc tịch" aria-label="Thêm quốc tịch" onClick={() => openQuickAdd('nationality')}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {canView('pax') && (
          <div className="space-y-2">
            <Label htmlFor="adults">Người lớn *</Label>
            <NumberInput id="adults" value={watch('adults')} onChange={(v) => setValue('adults', v)} min={0} disabled={!canEdit('pax')} />
          </div>
        )}

        {canView('pax') && (
          <div className="space-y-2">
            <Label htmlFor="children">Trẻ em</Label>
            <NumberInput id="children" value={watch('children')} onChange={(v) => setValue('children', v)} min={0} disabled={!canEdit('pax')} />
          </div>
        )}

        {canView('pax') && (
          <div className="space-y-2">
            <Label>Tổng khách</Label>
            <Input value={totalGuests} disabled className="bg-muted" />
          </div>
        )}

        {canView('dates') && (
          <div className="space-y-2">
            <Label>Tổng số ngày</Label>
            <Input value={totalDays > 0 ? `${totalDays} ngày` : ''} disabled className="bg-muted" />
          </div>
        )}

        {canView('driver') && (
          <div className="space-y-2">
            <Label htmlFor="driverName">Tên tài xế</Label>
            <Input id="driverName" {...register('driverName')} placeholder="ví dụ: Anh Đức" disabled={!canEdit('driver')} />
          </div>
        )}

        {canView('client') && (
          <div className="space-y-2">
            <Label htmlFor="clientPhone">Điện thoại khách hàng</Label>
            <Input id="clientPhone" {...register('clientPhone')} placeholder="ví dụ: +84 912 345 678" disabled={!canEdit('client')} />
          </div>
        )}

        {canView('dates') && (
          <div className="space-y-2">
            <Label htmlFor="startDate">Ngày bắt đầu *</Label>
            <DateInput id="startDate" value={watch('startDate')} onChange={(v) => setValue('startDate', v)} disabled={!canEdit('dates')} />
            {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
          </div>
        )}

        {canView('dates') && (
          <div className="space-y-2">
            <Label htmlFor="endDate">Ngày kết thúc *</Label>
            <DateInput id="endDate" value={watch('endDate')} onChange={(v) => setValue('endDate', v)} disabled={!canEdit('dates')} />
            {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
          </div>
        )}
      </div>

      {canView('notes') && (
        <div className="space-y-2">
          <Label htmlFor="notes">Ghi chú</Label>
          <textarea
            id="notes"
            {...register('notes')}
            placeholder="Thêm ghi chú cho tour này..."
            rows={4}
            disabled={!canEdit('notes')}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </div>
      )}

      {showSubmitButton && !readOnly && (
        <div className="flex justify-end">
          <Button type="submit" className="hover-scale">
            <Save className="h-4 w-4 mr-2" />
            Lưu thông tin tour
          </Button>
        </div>
      )}

      <CompanyDialog
        open={quickAddTarget === 'company' || quickAddTarget === 'landOperator'}
        onOpenChange={handleQuickAddOpenChange}
        onSubmit={handleCreateCompany}
      />
      <NationalityDialog
        open={quickAddTarget === 'nationality'}
        onOpenChange={handleQuickAddOpenChange}
        onSubmit={handleCreateNationality}
      />
    </form>
  );
}
