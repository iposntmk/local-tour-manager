import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextareaWithSave } from '@/components/ui/textarea-with-save';
import { toast } from 'sonner';
import { CopyIdRow } from '@/components/master/CopyIdRow';
import type { Company, CompanyInput } from '@/types/master';

interface CompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company;
  onSubmit: (data: CompanyInput) => Promise<void>;
}

export function CompanyDialog({ open, onOpenChange, company, onSubmit }: CompanyDialogProps) {
  const [formData, setFormData] = useState<CompanyInput>({
    name: company?.name || '',
    contactName: company?.contactName || '',
    phone: company?.phone || '',
    email: company?.email || '',
    note: company?.note || '',
    isDefault: company?.isDefault || false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: boolean }>({});

  useEffect(() => {
    if (!open) return;

    setFormData({
      name: company?.name || '',
      contactName: company?.contactName || '',
      phone: company?.phone || '',
      email: company?.email || '',
      note: company?.note || '',
      isDefault: company?.isDefault || false,
    });
    setErrors({});
  }, [company, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const newErrors: { name?: boolean } = {};
    const missingFields: string[] = [];

    if (!formData.name.trim()) {
      newErrors.name = true;
      missingFields.push('Tên công ty');
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
      setFormData({ name: '', contactName: '', phone: '', email: '', note: '', isDefault: false });
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
            <DialogTitle>{company ? 'Sửa công ty' : 'Thêm công ty mới'}</DialogTitle>
            <DialogDescription>
              {company ? 'Cập nhật thông tin công ty' : 'Tạo hồ sơ công ty mới'}
            </DialogDescription>
          </DialogHeader>
          {company && <CopyIdRow id={company.id} />}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên công ty *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: false });
                }}
                placeholder="Tên công ty"
                className={errors.name ? 'border-destructive' : ''}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contactName">Người liên hệ</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Tên người liên hệ"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@company.com"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Ghi chú</Label>
              <TextareaWithSave
                id="note"
                storageKey={company ? `company-note-edit-${company.id}` : 'company-note-create'}
                value={formData.note}
                onValueChange={(value) => setFormData({ ...formData, note: value })}
                placeholder="Thông tin bổ sung"
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
                Dùng làm công ty mặc định cho tour mới
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : company ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
