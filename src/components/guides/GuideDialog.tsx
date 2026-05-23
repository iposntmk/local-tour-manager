import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextareaWithSave } from '@/components/ui/textarea-with-save';
import { toast } from 'sonner';
import { CopyIdRow } from '@/components/master/CopyIdRow';
import { GuideLanguagesPicker } from '@/components/guides/GuideLanguagesPicker';
import type { Guide, GuideInput, Language } from '@/types/master';

interface GuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guide?: Guide;
  languages: Language[];
  onSubmit: (data: GuideInput) => Promise<void>;
}

export function GuideDialog({ open, onOpenChange, guide, languages, onSubmit }: GuideDialogProps) {
  const [formData, setFormData] = useState<GuideInput>({
    name: guide?.name || '',
    phone: guide?.phone || '',
    note: guide?.note || '',
    languageIds: guide?.languages?.map((language) => language.id) || [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: boolean }>({});

  useEffect(() => {
    if (!open) return;

    setFormData({
      name: guide?.name || '',
      phone: guide?.phone || '',
      note: guide?.note || '',
      languageIds: guide?.languages?.map((language) => language.id) || [],
      isDefault: guide?.isDefault || false,
    });
    setErrors({});
  }, [guide, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const newErrors: { name?: boolean } = {};
    const missingFields: string[] = [];

    if (!formData.name.trim()) {
      newErrors.name = true;
      missingFields.push('Tên');
    }

    if (missingFields.length > 0) {
      setErrors(newErrors);
      toast.error(`Vui lòng điền đầy đủ các trường bắt buộc: ${missingFields.join(', ')}`);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
      setFormData({ name: '', phone: '', note: '', languageIds: [] });
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{guide ? 'Sửa hướng dẫn viên' : 'Thêm hướng dẫn viên mới'}</DialogTitle>
            <DialogDescription>
              {guide ? 'Cập nhật thông tin hướng dẫn viên' : 'Tạo hồ sơ hướng dẫn viên mới'}
            </DialogDescription>
          </DialogHeader>
          {guide && <CopyIdRow id={guide.id} />}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: false });
                }}
                placeholder="Họ và tên"
                className={errors.name ? 'border-destructive' : ''}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+84 XXX XXX XXX"
              />
            </div>

            <div className="grid gap-2">
              <Label>Ngôn ngữ</Label>
              <GuideLanguagesPicker
                languages={languages}
                value={formData.languageIds || []}
                onChange={(languageIds) => setFormData({ ...formData, languageIds })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Ghi chú</Label>
              <TextareaWithSave
                id="note"
                storageKey={guide ? `guide-note-edit-${guide.id}` : 'guide-note-create'}
                value={formData.note}
                onValueChange={(value) => setFormData({ ...formData, note: value })}
                placeholder="Chuyên môn, lịch trống, v.v."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={!!formData.isDefault}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isDefault: checked === true })
                }
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                Dùng làm hướng dẫn viên mặc định cho tour mới
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : guide ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
