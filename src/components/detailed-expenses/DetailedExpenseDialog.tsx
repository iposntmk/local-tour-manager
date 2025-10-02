import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { DetailedExpense, DetailedExpenseInput } from '@/types/master';

interface DetailedExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DetailedExpenseInput) => void;
  initialData?: DetailedExpense;
  isEditing?: boolean;
}

export function DetailedExpenseDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing,
}: DetailedExpenseDialogProps) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialData?.categoryRef.id || ''
  );
  const [fieldErrors, setFieldErrors] = useState<{ category?: boolean }>({});

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<DetailedExpenseInput>();

  const { data: categories = [] } = useQuery({
    queryKey: ['expenseCategories'],
    queryFn: () => store.listExpenseCategories({ status: 'active' }),
  });

  useEffect(() => {
    if (open) {
      reset({
        name: initialData?.name || '',
        price: initialData?.price || 0,
        categoryRef: initialData?.categoryRef || { id: '', nameAtBooking: '' },
      });
      setSelectedCategoryId(initialData?.categoryRef.id || '');
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = (data: DetailedExpenseInput) => {
    // Validate required fields
    const missingFields: string[] = [];
    const newErrors: { category?: boolean } = {};

    if (!data.name.trim()) {
      missingFields.push('Expense Name');
    }
    if (data.price === undefined || data.price === null || data.price <= 0) {
      missingFields.push('Price');
    }
    if (!selectedCategoryId) {
      missingFields.push('Category');
      newErrors.category = true;
    }

    if (missingFields.length > 0) {
      setFieldErrors(newErrors);
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    setFieldErrors({});
    const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
    if (selectedCategory) {
      onSubmit({
        ...data,
        categoryRef: {
          id: selectedCategory.id,
          nameAtBooking: selectedCategory.name,
        },
      });
    }
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Detailed Expense' : 'Add New Detailed Expense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Expense Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Expense name is required' })}
              placeholder="e.g., Mineral Water, Cold Towels..."
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={categoryOpen}
                  className={cn(
                    "w-full justify-between",
                    fieldErrors.category && 'border-destructive'
                  )}
                >
                  {selectedCategory ? selectedCategory.name : 'Select category...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search category..." />
                  <CommandEmpty>No category found.</CommandEmpty>
                  <CommandGroup>
                    {categories.map((category) => (
                      <CommandItem
                        key={category.id}
                        value={category.name}
                        onSelect={() => {
                          setSelectedCategoryId(category.id);
                          setCategoryOpen(false);
                          if (fieldErrors.category) setFieldErrors({ ...fieldErrors, category: false });
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedCategoryId === category.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {category.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (VND) *</Label>
            <CurrencyInput
              value={watch('price')}
              onChange={(value) => setValue('price', value)}
              placeholder="0"
            />
            {errors.price && (
              <p className="text-sm text-destructive">{errors.price.message}</p>
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
