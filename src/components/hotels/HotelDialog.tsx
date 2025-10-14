import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextareaWithSave } from '@/components/ui/textarea-with-save';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import type { Hotel, HotelInput, RoomType } from '@/types/master';

interface HotelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotel?: Hotel;
  onSubmit: (data: HotelInput) => Promise<void>;
}

const roomTypes: { value: RoomType; label: string }[] = [
  { value: 'single', label: 'Single Room' },
  { value: 'double', label: 'Double Room' },
  { value: 'group', label: 'Group Room' },
  { value: 'suite', label: 'Suite' },
];

export function HotelDialog({ open, onOpenChange, hotel, onSubmit }: HotelDialogProps) {
  const [formData, setFormData] = useState<HotelInput>({
    name: hotel?.name || '',
    ownerName: hotel?.ownerName || '',
    ownerPhone: hotel?.ownerPhone || '',
    roomType: hotel?.roomType || 'single',
    pricePerNight: hotel?.pricePerNight || 0,
    address: hotel?.address || '',
    provinceRef: hotel?.provinceRef || { id: '', nameAtBooking: '' },
    note: hotel?.note || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: boolean; ownerName?: boolean; ownerPhone?: boolean; province?: boolean }>({});
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>(hotel?.provinceRef.id || '');

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => store.listProvinces({ status: 'active' }),
  });

  useEffect(() => {
    if (hotel) {
      setFormData({
        name: hotel.name,
        ownerName: hotel.ownerName,
        ownerPhone: hotel.ownerPhone,
        roomType: hotel.roomType,
        pricePerNight: hotel.pricePerNight,
        address: hotel.address || '',
        provinceRef: hotel.provinceRef,
        note: hotel.note || '',
      });
      setSelectedProvinceId(hotel.provinceRef.id);
    } else {
      setFormData({
        name: '',
        ownerName: '',
        ownerPhone: '',
        roomType: 'single',
        pricePerNight: 0,
        address: '',
        provinceRef: { id: '', nameAtBooking: '' },
        note: '',
      });
      setSelectedProvinceId('');
    }
  }, [hotel, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: boolean; ownerName?: boolean; ownerPhone?: boolean; province?: boolean } = {};
    const missingFields: string[] = [];

    if (!formData.name.trim()) {
      newErrors.name = true;
      missingFields.push('Hotel Name');
    }
    if (!formData.ownerName.trim()) {
      newErrors.ownerName = true;
      missingFields.push('Owner Name');
    }
    if (!formData.ownerPhone.trim()) {
      newErrors.ownerPhone = true;
      missingFields.push('Owner Phone');
    }
    if (!selectedProvinceId) {
      newErrors.province = true;
      missingFields.push('Province');
    }

    if (missingFields.length > 0) {
      setErrors(newErrors);
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    setErrors({});
    const selectedProvince = provinces.find((p) => p.id === selectedProvinceId);
    if (!selectedProvince) {
      toast.error('Please select a valid province');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        provinceRef: {
          id: selectedProvince.id,
          nameAtBooking: selectedProvince.name,
        },
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProvince = provinces.find((p) => p.id === selectedProvinceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{hotel ? 'Edit Hotel' : 'Add New Hotel'}</DialogTitle>
            <DialogDescription>
              {hotel ? 'Update hotel information' : 'Create a new hotel profile'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Hotel Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: false });
                }}
                placeholder="Hotel name"
                className={errors.name ? 'border-destructive' : ''}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ownerName">Owner Name *</Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => {
                    setFormData({ ...formData, ownerName: e.target.value });
                    if (errors.ownerName) setErrors({ ...errors, ownerName: false });
                  }}
                  placeholder="Owner's name"
                  className={errors.ownerName ? 'border-destructive' : ''}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ownerPhone">Owner Phone *</Label>
                <Input
                  id="ownerPhone"
                  type="tel"
                  value={formData.ownerPhone}
                  onChange={(e) => {
                    setFormData({ ...formData, ownerPhone: e.target.value });
                    if (errors.ownerPhone) setErrors({ ...errors, ownerPhone: false });
                  }}
                  placeholder="+84 XXX XXX XXX"
                  className={errors.ownerPhone ? 'border-destructive' : ''}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="roomType">Room Type *</Label>
                <Select
                  value={formData.roomType}
                  onValueChange={(value: RoomType) =>
                    setFormData({ ...formData, roomType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pricePerNight">Price Per Night *</Label>
                <Input
                  id="pricePerNight"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.pricePerNight}
                  onChange={(e) => setFormData({ ...formData, pricePerNight: Number(e.target.value) })}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
              />
            </div>

            <div className="grid gap-2">
              <Label>Province *</Label>
              <Popover open={provinceOpen} onOpenChange={setProvinceOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={provinceOpen}
                    className={cn(
                      "w-full justify-between",
                      errors.province && 'border-destructive'
                    )}
                  >
                    {selectedProvince ? selectedProvince.name : 'Select province...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search province..." />
                    <CommandList>
                      <CommandEmpty>No province found.</CommandEmpty>
                      <CommandGroup>
                        {provinces.map((province) => (
                          <CommandItem
                            key={province.id}
                            value={province.name}
                            onSelect={() => {
                              setSelectedProvinceId(province.id);
                              setProvinceOpen(false);
                              if (errors.province) setErrors({ ...errors, province: false });
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

            <div className="grid gap-2">
              <Label htmlFor="note">Note</Label>
              <TextareaWithSave
                id="note"
                storageKey={hotel ? `hotel-note-edit-${hotel.id}` : 'hotel-note-create'}
                value={formData.note}
                onValueChange={(value) => setFormData({ ...formData, note: value })}
                placeholder="Additional information"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : hotel ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
