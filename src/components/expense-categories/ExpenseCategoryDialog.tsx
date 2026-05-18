import { useEffect, useRef, useState } from 'react';
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
  const [copied, setCopied] = useState(false);
  const copyHelperRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ExpenseCategoryInput>({
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

  const handleFormSubmit = (data: ExpenseCategoryInput) => {
    const missingFields: string[] = [];

    if (!data.name.trim()) {
      missingFields.push('Category Name');
    }

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    onSubmit(data);
  };

  const handleCopyId = () => {
    if (!initialData?.id) return;
    const text = initialData.id;

    const markCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(markCopied).catch(() => {
        toast.error('Không thể copy ID vào clipboard');
      });
      return;
    }

    // Insecure context (HTTP LAN): fallback uses an input mounted INSIDE
    // DialogContent (not document.body) — Radix marks body siblings inert
    // when the dialog is open, which silently breaks selection-based copy.
    const input = copyHelperRef.current;
    if (!input) {
      toast.error('Không thể copy ID. Vui lòng copy thủ công.');
      return;
    }
    input.value = text;
    input.focus();
    input.select();
    input.setSelectionRange(0, text.length);

    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }

    if (ok) {
      markCopied();
    } else {
      toast.error('Không thể copy ID. Vui lòng copy thủ công.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <input
          ref={copyHelperRef}
          tabIndex={-1}
          aria-hidden="true"
          readOnly
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            opacity: 0,
            pointerEvents: 'none',
          }}
        />
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category' : 'Add New Category'}</DialogTitle>
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
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Category name is required' })}
              placeholder="e.g., Transportation, Accommodation..."
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
