import type { UseFormRegister } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GuideLanguagesPicker } from '@/components/guides/GuideLanguagesPicker';
import type { Language } from '@/types/master';
import type { SettlementRole } from '@/types/user';

interface UserGuideFieldsProps {
  settlementRole: SettlementRole;
  register: UseFormRegister<any>;
  isDefaultGuide: boolean;
  languageIds: string[];
  languages: Language[];
  onDefaultGuideChange: (value: boolean) => void;
  onLanguageIdsChange: (value: string[]) => void;
}

export function UserGuideFields({
  settlementRole,
  register,
  isDefaultGuide,
  languageIds,
  languages,
  onDefaultGuideChange,
  onLanguageIdsChange,
}: UserGuideFieldsProps) {
  if (settlementRole !== 'guide') return null;

  return (
    <div className="rounded-md border p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium">Thông tin hướng dẫn viên</h3>
        <p className="text-xs text-muted-foreground">
          Dùng cho danh sách chọn HDV khi tạo hoặc sửa tour.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Số điện thoại HDV</Label>
          <Input id="phone" type="tel" {...register('phone')} placeholder="+84 XXX XXX XXX" />
        </div>
        <div className="space-y-2">
          <Label>Ngôn ngữ</Label>
          <GuideLanguagesPicker
            languages={languages}
            value={languageIds}
            onChange={onLanguageIdsChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Ghi chú HDV</Label>
        <Textarea
          id="note"
          {...register('note')}
          placeholder="Chuyên môn, lịch trống, thông tin liên hệ phụ..."
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isDefaultGuide"
          checked={isDefaultGuide}
          onCheckedChange={(checked) => onDefaultGuideChange(checked === true)}
        />
        <Label htmlFor="isDefaultGuide" className="cursor-pointer">
          Dùng làm hướng dẫn viên mặc định cho tour mới
        </Label>
      </div>
    </div>
  );
}
