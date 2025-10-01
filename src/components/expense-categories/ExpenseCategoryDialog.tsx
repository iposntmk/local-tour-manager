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
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Category name is required' })}
              placeholder="e.g., Transportation, Accommodation..."
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
