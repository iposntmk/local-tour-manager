import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CopyIdRow } from '@/components/master/CopyIdRow';
import type { Nationality, NationalityInput } from '@/types/master';

interface NationalityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nationality?: Nationality;
  onSubmit: (data: NationalityInput) => Promise<void>;
}

export function NationalityDialog({ open, onOpenChange, nationality, onSubmit }: NationalityDialogProps) {
  const [formData, setFormData] = useState<NationalityInput>({
    name: nationality?.name || '',
    iso2: nationality?.iso2 || '',
    emoji: nationality?.emoji || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: boolean; iso2?: boolean; emoji?: boolean }>({});

  useEffect(() => {
    if (nationality) {
      setFormData({
        name: nationality.name || '',
        iso2: nationality.iso2 || '',
        emoji: nationality.emoji || '',
      });
    } else {
      setFormData({ name: '', iso2: '', emoji: '' });
    }
    setErrors({});
  }, [nationality, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields - only name is required
    const newErrors: { name?: boolean; iso2?: boolean; emoji?: boolean } = {};
    const missingFields: string[] = [];

    if (!formData.name.trim()) {
      newErrors.name = true;
      missingFields.push('Tên quốc gia');
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
      setFormData({ name: '', iso2: '', emoji: '' });
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
            <DialogTitle>{nationality ? 'Sửa quốc tịch' : 'Thêm quốc tịch mới'}</DialogTitle>
            <DialogDescription>
              {nationality ? 'Cập nhật thông tin quốc tịch' : 'Tạo quốc tịch mới'}
            </DialogDescription>
          </DialogHeader>
          {nationality && <CopyIdRow id={nationality.id} />}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên quốc gia *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: false });
                }}
                placeholder="Tên quốc gia"
                className={errors.name ? 'border-destructive' : ''}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="iso2">Mã ISO</Label>
                <Input
                  id="iso2"
                  value={formData.iso2}
                  onChange={(e) => {
                    setFormData({ ...formData, iso2: e.target.value.toUpperCase() });
                    if (errors.iso2) setErrors({ ...errors, iso2: false });
                  }}
                  placeholder="VN (không bắt buộc)"
                  className={errors.iso2 ? 'border-destructive' : ''}
                  maxLength={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="emoji">Emoji quốc kỳ</Label>
                <Input
                  id="emoji"
                  value={formData.emoji}
                  onChange={(e) => {
                    setFormData({ ...formData, emoji: e.target.value });
                    if (errors.emoji) setErrors({ ...errors, emoji: false });
                  }}
                  placeholder="🇻🇳 (không bắt buộc)"
                  className={errors.emoji ? 'border-destructive' : ''}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : nationality ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
