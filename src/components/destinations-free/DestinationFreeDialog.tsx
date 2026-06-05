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
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { DestinationFree, DestinationFreeInput } from '@/types/master';

interface DestinationFreeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DestinationFreeInput) => void;
  initialData?: DestinationFree;
  isEditing?: boolean;
}

export function DestinationFreeDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing,
}: DestinationFreeDialogProps) {
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>(
    initialData?.provinceRef.id || ''
  );
  const [fieldErrors, setFieldErrors] = useState<{ province?: boolean }>({});

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DestinationFreeInput>();

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => store.listProvinces({ status: 'active' }),
  });

  useEffect(() => {
    if (open) {
      reset({
        name: initialData?.name || '',
        provinceRef: initialData?.provinceRef || { id: '', nameAtBooking: '' },
      });
      setSelectedProvinceId(initialData?.provinceRef.id || '');
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = (data: DestinationFreeInput) => {
    const missingFields: string[] = [];
    const newErrors: { province?: boolean } = {};

    if (!data.name.trim()) {
      missingFields.push('Tên điểm tham quan');
    }
    if (!selectedProvinceId) {
      missingFields.push('Tỉnh thành');
      newErrors.province = true;
    }

    if (missingFields.length > 0) {
      setFieldErrors(newErrors);
      toast.error(`Vui lòng điền đầy đủ các trường bắt buộc: ${missingFields.join(', ')}`);
      return;
    }

    setFieldErrors({});
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
          <DialogTitle>{isEditing ? 'Sửa điểm tham quan' : 'Thêm điểm tham quan mới'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên điểm tham quan *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Tên điểm tham quan là bắt buộc' })}
              placeholder="VD: Chợ Bến Thành, Bờ Hồ..."
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rawName">Tên chưa chuẩn hóa</Label>
            <Input
              id="rawName"
              {...register('rawName')}
              placeholder="VD: tên gốc từ file import, OCR..."
            />
          </div>

          <div className="space-y-2">
            <Label>Tỉnh thành *</Label>
            <Popover open={provinceOpen} onOpenChange={setProvinceOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={provinceOpen}
                  className={cn(
                    "w-full justify-between",
                    fieldErrors.province && 'border-destructive'
                  )}
                >
                  {selectedProvince ? selectedProvince.name : 'Chọn tỉnh thành...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Tìm tỉnh thành..." />
                  <CommandList>
                    <CommandEmpty>Không tìm thấy tỉnh thành.</CommandEmpty>
                    <CommandGroup>
                      {provinces.map((province) => (
                        <CommandItem
                          key={province.id}
                          value={province.name}
                          onSelect={() => {
                            setSelectedProvinceId(province.id);
                            setProvinceOpen(false);
                            if (fieldErrors.province) setFieldErrors({ ...fieldErrors, province: false });
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
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
