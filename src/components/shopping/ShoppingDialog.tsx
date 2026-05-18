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
import { Copy, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ShoppingInput>({
    defaultValues: {
      name: initialData?.name || '',
    },
  });

  useEffect(() => {
    if (open) {
      setCopied(false);
      reset({
        name: initialData?.name || '',
      });
    }
  }, [open, initialData, reset]);

  const handleCopyId = async () => {
    if (initialData?.id) {
      try {
        await navigator.clipboard.writeText(initialData.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        const textArea = document.createElement('textarea');
        textArea.value = initialData.id;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleFormSubmit = (data: ShoppingInput) => {
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
        {isEditing && initialData?.id && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">ID:</span>
            <code className="flex-1 text-sm font-mono">{initialData.id}</code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleCopyId(); }}
              className="h-7 w-7 p-0"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}
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
