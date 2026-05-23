import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { CopyIdRow } from '@/components/master/CopyIdRow';
import type { Shopping, ShoppingInput } from '@/types/master';

interface ShoppingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ShoppingInput) => void;
  initialData?: Shopping;
  isEditing?: boolean;
}

export function ShoppingDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing,
}: ShoppingDialogProps) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ShoppingInput>({
    defaultValues: {
      name: initialData?.name || '',
      phone: initialData?.phone || '',
      address: initialData?.address || '',
      commissionRate: initialData?.commissionRate !== undefined ? initialData.commissionRate * 100 : undefined,
      withholdsPit: initialData?.withholdsPit || false,
      pitRate: initialData?.pitRate !== undefined ? initialData.pitRate * 100 : undefined,
    },
  });
  const withholdsPit = watch('withholdsPit');

  useEffect(() => {
    if (open) {
      reset({
        name: initialData?.name || '',
        phone: initialData?.phone || '',
        address: initialData?.address || '',
        commissionRate: initialData?.commissionRate !== undefined ? initialData.commissionRate * 100 : undefined,
        withholdsPit: initialData?.withholdsPit || false,
        pitRate: initialData?.pitRate !== undefined ? initialData.pitRate * 100 : undefined,
      });
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = (data: ShoppingInput) => {
    const missingFields: string[] = [];

    if (!data.name.trim()) {
      missingFields.push('Tên địa điểm mua sắm');
    }

    if (missingFields.length > 0) {
      toast.error(`Vui lòng điền đầy đủ các trường bắt buộc: ${missingFields.join(', ')}`);
      return;
    }

    onSubmit({
      ...data,
      phone: data.phone?.trim() || undefined,
      address: data.address?.trim() || undefined,
      commissionRate: Number.isFinite(Number(data.commissionRate)) ? Number(data.commissionRate) / 100 : undefined,
      withholdsPit: !!data.withholdsPit,
      pitRate: data.withholdsPit && Number.isFinite(Number(data.pitRate)) ? Number(data.pitRate) / 100 : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Sửa địa điểm mua sắm' : 'Thêm địa điểm mua sắm mới'}</DialogTitle>
        </DialogHeader>
        {isEditing && initialData?.id && <CopyIdRow id={initialData.id} />}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên địa điểm mua sắm *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Tên địa điểm mua sắm là bắt buộc' })}
              placeholder="VD: Làng lụa, Trung tâm thủ công mỹ nghệ..."
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" {...register('phone')} placeholder="VD: 0901234567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionRate">Tỷ lệ hoa hồng (%)</Label>
              <Input
                id="commissionRate"
                type="number"
                step="0.01"
                min="0"
                {...register('commissionRate', { valueAsNumber: true })}
                placeholder="VD: 30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <Textarea id="address" {...register('address')} placeholder="Nhập địa chỉ liên hệ" rows={3} />
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                id="withholdsPit"
                checked={!!withholdsPit}
                onCheckedChange={(checked) => setValue('withholdsPit', checked === true)}
              />
              Khấu trừ thuế TNCN
            </label>
            <input type="checkbox" className="hidden" {...register('withholdsPit')} />
            {withholdsPit && (
              <div className="space-y-2">
                <Label htmlFor="pitRate">Tỷ lệ thuế (%)</Label>
                <Input
                  id="pitRate"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('pitRate', { valueAsNumber: true })}
                  placeholder="VD: 10"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit">
              {isEditing ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
