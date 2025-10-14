import { useState, useEffect, useRef } from 'react';
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
import type { ShopPlace, ShopPlaceInput, ShopPlaceType } from '@/types/master';

interface ShopPlaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopPlace?: ShopPlace;
  onSubmit: (data: ShopPlaceInput) => Promise<void>;
}

const shopPlaceTypes: { value: ShopPlaceType; label: string }[] = [
  { value: 'clothing', label: 'Clothing' },
  { value: 'food_and_beverage', label: 'Food & Beverage' },
  { value: 'souvenirs', label: 'Souvenirs' },
  { value: 'handicrafts', label: 'Handicrafts' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'other', label: 'Other' },
];

export function ShopPlaceDialog({ open, onOpenChange, shopPlace, onSubmit }: ShopPlaceDialogProps) {
  const [formData, setFormData] = useState<ShopPlaceInput>({
    name: shopPlace?.name || '',
    shopType: shopPlace?.shopType || 'souvenirs',
    phone: shopPlace?.phone || '',
    address: shopPlace?.address || '',
    provinceRef: shopPlace?.provinceRef || { id: '', nameAtBooking: '' },
    commissionForGuide: shopPlace?.commissionForGuide || 0,
    note: shopPlace?.note || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: boolean; province?: boolean }>({});
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>(shopPlace?.provinceRef.id || '');

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => store.listProvinces({ status: 'active' }),
  });
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{ id: string; label: string; subtitle?: string }>>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [hasAttemptedAddressLookup, setHasAttemptedAddressLookup] = useState(false);
  const addressQueryRef = useRef(formData.address);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressAbortControllerRef = useRef<AbortController | null>(null);
  const addressFieldRef = useRef<HTMLDivElement | null>(null);
  const skipNextAddressLookupRef = useRef(false);

  useEffect(() => {
    if (shopPlace) {
      setFormData({
        name: shopPlace.name,
        shopType: shopPlace.shopType,
        phone: shopPlace.phone || '',
        address: shopPlace.address || '',
        provinceRef: shopPlace.provinceRef,
        commissionForGuide: shopPlace.commissionForGuide || 0,
        note: shopPlace.note || '',
      });
      setSelectedProvinceId(shopPlace.provinceRef.id);
    } else {
      setFormData({
        name: '',
        shopType: 'souvenirs',
        phone: '',
        address: '',
        provinceRef: { id: '', nameAtBooking: '' },
        commissionForGuide: 0,
        note: '',
      });
      setSelectedProvinceId('');
    }
    addressQueryRef.current = shopPlace?.address || '';
    setAddressSuggestions([]);
    setIsAddressDropdownOpen(false);
    setHasAttemptedAddressLookup(false);
  }, [shopPlace, open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressFieldRef.current && !addressFieldRef.current.contains(event.target as Node)) {
        setIsAddressDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const query = addressQueryRef.current.trim();

    if (addressDebounceRef.current) {
      clearTimeout(addressDebounceRef.current);
      addressDebounceRef.current = null;
    }

    if (addressAbortControllerRef.current) {
      addressAbortControllerRef.current.abort();
      addressAbortControllerRef.current = null;
    }

    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      setIsAddressLoading(false);
      setHasAttemptedAddressLookup(false);
      return;
    }

    if (skipNextAddressLookupRef.current) {
      skipNextAddressLookupRef.current = false;
      setIsAddressLoading(false);
      setHasAttemptedAddressLookup(false);
      return;
    }

    addressDebounceRef.current = setTimeout(async () => {
      setIsAddressLoading(true);
      setHasAttemptedAddressLookup(true);
      const controller = new AbortController();
      addressAbortControllerRef.current = controller;

      try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('limit', '10');
        url.searchParams.set('countrycodes', 'vn');
        url.searchParams.set('q', query);

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            'Accept-Language': 'vi',
          },
        });

        if (!response.ok) {
          throw new Error(`Address lookup failed: ${response.statusText}`);
        }

        const results: Array<{
          place_id: string;
          display_name: string;
          address?: Record<string, string>;
          type?: string;
          class?: string;
        }> = await response.json();

        const ALLOWED_PROVINCES = [
          'Thừa Thiên-Huế',
          'Da Nang',
          'Đà Nẵng',
          'Quảng Nam',
        ];

        const filtered = results.filter((item) => {
          const address = item.address || {};
          const state = address.state || address.region || address.county || '';
          const city = address.city || address.town || address.municipality || address.village || '';
          const stateNormalized = state.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const cityNormalized = city.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

          const matchesState = ALLOWED_PROVINCES.some((target) => {
            const normalizedTarget = target.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return stateNormalized.toLowerCase().includes(normalizedTarget.toLowerCase());
          });

          const matchesCity = ALLOWED_PROVINCES.some((target) => {
            const normalizedTarget = target.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return cityNormalized.toLowerCase().includes(normalizedTarget.toLowerCase());
          });

          const hasRoad = Boolean(address.road);
          return (matchesState || matchesCity) && hasRoad;
        });

        const formatted = filtered.slice(0, 5).map((item) => {
          const address = item.address || {};
          const building = address.house_number ? `${address.house_number} ${address.road || ''}`.trim() : address.road || item.display_name;
          const ward = address.suburb || address.quarter || address.ward || address.village || '';
          const district = address.district || address.county || address.city_district || '';
          const province = address.state || address.region || '';

          const subtitleParts = [ward, district, province].filter(Boolean).map((segment) => segment.trim());

          const primaryLabelParts = [
            building,
            address.neighbourhood,
            address.city || address.town || address.municipality || address.village || '',
          ]
            .filter(Boolean)
            .map((segment) => segment.trim());

          const label = primaryLabelParts.length > 0 ? primaryLabelParts.join(', ') : item.display_name;

          return {
            id: item.place_id,
            label,
            subtitle: subtitleParts.join(', ') || undefined,
          };
        });

        setAddressSuggestions(formatted);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error(error);
          setAddressSuggestions([]);
        }
      } finally {
        setIsAddressLoading(false);
      }
    }, 400);

    return () => {
      if (addressDebounceRef.current) {
        clearTimeout(addressDebounceRef.current);
      }
      if (addressAbortControllerRef.current) {
        addressAbortControllerRef.current.abort();
      }
    };
  }, [formData.address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: boolean; province?: boolean } = {};
    const missingFields: string[] = [];

    if (!formData.name.trim()) {
      newErrors.name = true;
      missingFields.push('Shop Name');
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
            <DialogTitle>{shopPlace ? 'Edit Shop Place' : 'Add New Shop Place'}</DialogTitle>
            <DialogDescription>
              {shopPlace ? 'Update shop place information' : 'Create a new shop place profile'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Shop Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: false });
                }}
                placeholder="Shop name"
                className={errors.name ? 'border-destructive' : ''}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="shopType">Type *</Label>
              <Select
                value={formData.shopType}
                onValueChange={(value: ShopPlaceType) =>
                  setFormData({ ...formData, shopType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shopPlaceTypes.map((type) => (
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

            <div className="grid gap-2 relative" ref={addressFieldRef}>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onFocus={() => {
                  addressQueryRef.current = formData.address;
                  if (formData.address.trim().length >= 3 && addressSuggestions.length > 0) {
                    setIsAddressDropdownOpen(true);
                  }
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  addressQueryRef.current = value;
                  setFormData({ ...formData, address: value });
                  setIsAddressDropdownOpen(true);
                }}
                placeholder="Start typing to search for a Vietnamese address"
                autoComplete="off"
              />
              {isAddressDropdownOpen && (isAddressLoading || addressSuggestions.length > 0 || hasAttemptedAddressLookup) && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-md border bg-background shadow-sm max-h-56 overflow-y-auto z-50">
                  {isAddressLoading ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Searching addresses…</div>
                  ) : (
                    addressSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className="block w-full text-left px-3 py-2 hover:bg-accent focus:bg-accent focus:outline-none"
                        onClick={() => {
                          skipNextAddressLookupRef.current = true;
                          setFormData({ ...formData, address: suggestion.label });
                          addressQueryRef.current = suggestion.label;
                          setAddressSuggestions([]);
                          setHasAttemptedAddressLookup(false);
                          setIsAddressDropdownOpen(false);
                        }}
                      >
                        <div className="text-sm font-medium">{suggestion.label}</div>
                        {suggestion.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">{suggestion.subtitle}</div>
                        )}
                      </button>
                    ))
                  )}
                  {!isAddressLoading && addressSuggestions.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No suggestions found. Try adding more details.
                    </div>
                  )}
                  <div className="px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wide">
                    Data source: OpenStreetMap
                  </div>
                </div>
              )}
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
                storageKey={shopPlace ? `shop-place-note-edit-${shopPlace.id}` : 'shop-place-note-create'}
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
              {isSubmitting ? 'Saving...' : shopPlace ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
