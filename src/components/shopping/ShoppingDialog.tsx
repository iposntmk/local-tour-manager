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
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ShoppingInput>({
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

  const handleFormSubmit = (data: ShoppingInput) => {
    // Validate required fields
    const missingFields: string[] = [];

    if (!data.name.trim()) {
      missingFields.push('Shopping Name');
    }

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Shopping' : 'Add New Shopping'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Shopping Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Shopping name is required' })}
              placeholder="e.g., Silk Village, Handicraft Center..."
              className={errors.name ? 'border-destructive' : ''}
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
