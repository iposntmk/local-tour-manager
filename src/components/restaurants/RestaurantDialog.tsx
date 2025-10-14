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
import type { Restaurant, RestaurantInput, RestaurantType } from '@/types/master';

interface RestaurantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant?: Restaurant;
  onSubmit: (data: RestaurantInput) => Promise<void>;
}

const restaurantTypes: { value: RestaurantType; label: string }[] = [
  { value: 'asian', label: 'Asian Cuisine' },
  { value: 'indian', label: 'Indian Cuisine' },
  { value: 'western', label: 'Western Cuisine' },
  { value: 'local', label: 'Local Cuisine' },
  { value: 'other', label: 'Other' },
];

export function RestaurantDialog({ open, onOpenChange, restaurant, onSubmit }: RestaurantDialogProps) {
  const [formData, setFormData] = useState<RestaurantInput>({
    name: restaurant?.name || '',
    restaurantType: restaurant?.restaurantType || 'asian',
    phone: restaurant?.phone || '',
    address: restaurant?.address || '',
    provinceRef: restaurant?.provinceRef || { id: '', nameAtBooking: '' },
    commissionForGuide: restaurant?.commissionForGuide || 0,
    note: restaurant?.note || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: boolean; province?: boolean }>({});
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>(restaurant?.provinceRef.id || '');

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => store.listProvinces({ status: 'active' }),
  });

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name,
        restaurantType: restaurant.restaurantType,
        phone: restaurant.phone || '',
        address: restaurant.address || '',
        provinceRef: restaurant.provinceRef,
        commissionForGuide: restaurant.commissionForGuide || 0,
        note: restaurant.note || '',
      });
      setSelectedProvinceId(restaurant.provinceRef.id);
    } else {
      setFormData({
        name: '',
        restaurantType: 'asian',
        phone: '',
        address: '',
        provinceRef: { id: '', nameAtBooking: '' },
        commissionForGuide: 0,
        note: '',
      });
      setSelectedProvinceId('');
    }
  }, [restaurant, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: boolean; province?: boolean } = {};
    const missingFields: string[] = [];

    if (!formData.name.trim()) {
      newErrors.name = true;
      missingFields.push('Restaurant Name');
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
            <DialogTitle>{restaurant ? 'Edit Restaurant' : 'Add New Restaurant'}</DialogTitle>
            <DialogDescription>
              {restaurant ? 'Update restaurant information' : 'Create a new restaurant profile'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Restaurant Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: false });
                }}
                placeholder="Restaurant name"
                className={errors.name ? 'border-destructive' : ''}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="restaurantType">Type *</Label>
              <Select
                value={formData.restaurantType}
                onValueChange={(value: RestaurantType) =>
                  setFormData({ ...formData, restaurantType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {restaurantTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+84 XXX XXX XXX"
              />
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
              <Label htmlFor="commissionForGuide">Commission for Guide (%)</Label>
              <Input
                id="commissionForGuide"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.commissionForGuide}
                onChange={(e) => setFormData({ ...formData, commissionForGuide: Number(e.target.value) })}
                placeholder="0"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Note</Label>
              <TextareaWithSave
                id="note"
                storageKey={restaurant ? `restaurant-note-edit-${restaurant.id}` : 'restaurant-note-create'}
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
              {isSubmitting ? 'Saving...' : restaurant ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
