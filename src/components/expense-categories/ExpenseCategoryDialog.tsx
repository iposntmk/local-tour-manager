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
import { toast } from 'sonner';
import { CopyIdRow } from '@/components/master/CopyIdRow';
import type { ExpenseCategory, ExpenseCategoryInput } from '@/types/master';

interface ExpenseCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ExpenseCategoryInput) => void;
  initialData?: ExpenseCategory;
  isEditing?: boolean;
}

export function ExpenseCategoryDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing,
}: ExpenseCategoryDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ExpenseCategoryInput>({
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

  const handleFormSubmit = (data: ExpenseCategoryInput) => {
    if (!data.name.trim()) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc: Tên danh mục');
      return;
    }
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Sửa danh mục' : 'Thêm danh mục mới'}</DialogTitle>
        </DialogHeader>
        {isEditing && initialData?.id && <CopyIdRow id={initialData.id} />}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên danh mục *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Tên danh mục là bắt buộc' })}
              placeholder="VD: Vận chuyển, Lưu trú..."
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
