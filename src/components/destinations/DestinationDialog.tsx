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
import type { TouristDestination, TouristDestinationInput } from '@/types/master';

interface DestinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TouristDestinationInput) => void;
  initialData?: TouristDestination;
  isEditing?: boolean;
}

export function DestinationDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing,
}: DestinationDialogProps) {
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>(
    initialData?.provinceRef.id || ''
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TouristDestinationInput>();

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => store.listProvinces({ status: 'active' }),
  });

  useEffect(() => {
    if (open) {
      reset({
        name: initialData?.name || '',
        price: initialData?.price || 0,
        provinceRef: initialData?.provinceRef || { id: '', nameAtBooking: '' },
      });
      setSelectedProvinceId(initialData?.provinceRef.id || '');
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = (data: TouristDestinationInput) => {
    if (!selectedProvinceId) {
      return;
    }
    const selectedProvince = provinces.find((p) => p.id === selectedProvinceId);
    if (selectedProvince) {
      onSubmit({
        ...data,
        provinceRef: {
          id: selectedProvince.id,
          nameAtBooking: selectedProvince.name,
        },
      });
    }
  };

  const selectedProvince = provinces.find((p) => p.id === selectedProvinceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Destination' : 'Add New Destination'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Destination Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Destination name is required' })}
              placeholder="e.g., Đại Nội, Hội An Ancient Town..."
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Province *</Label>
            <Popover open={provinceOpen} onOpenChange={setProvinceOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={provinceOpen}
                  className="w-full justify-between"
                >
                  {selectedProvince ? selectedProvince.name : 'Select province...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search province..." />
                  <CommandEmpty>No province found.</CommandEmpty>
                  <CommandGroup>
                    {provinces.map((province) => (
                      <CommandItem
                        key={province.id}
                        value={province.name}
                        onSelect={() => {
                          setSelectedProvinceId(province.id);
                          setProvinceOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedProvinceId === province.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {province.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (VND) *</Label>
            <Input
              id="price"
              type="number"
              {...register('price', { 
                required: 'Price is required',
                valueAsNumber: true,
              })}
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
