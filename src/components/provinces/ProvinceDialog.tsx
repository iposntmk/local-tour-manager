import { useEffect, useState } from 'react';
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
import { toast } from 'sonner';
import { CopyIdRow } from '@/components/master/CopyIdRow';
import type { Province, ProvinceInput } from '@/types/master';

interface ProvinceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProvinceInput) => void;
  initialData?: Province;
  isEditing?: boolean;
}

export function ProvinceDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing,
}: ProvinceDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProvinceInput>({
    defaultValues: {
      name: initialData?.name || '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: initialData?.name || '',
      });
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = (data: ProvinceInput) => {
    const missingFields: string[] = [];

    if (!data.name.trim()) {
      missingFields.push('Tên tỉnh thành');
    }

    if (missingFields.length > 0) {
      toast.error(`Vui lòng điền đầy đủ các trường bắt buộc: ${missingFields.join(', ')}`);
      return;
    }

    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Sửa tỉnh thành' : 'Thêm tỉnh thành mới'}</DialogTitle>
        </DialogHeader>
        {isEditing && initialData?.id && <CopyIdRow id={initialData.id} />}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên tỉnh thành *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Tên tỉnh thành là bắt buộc' })}
              placeholder="VD: Hà Nội, Huế..."
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
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
