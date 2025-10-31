import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, ChevronsUpDown, MoreHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn, formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import type { Destination } from '@/types/tour';

interface DestinationsTabProps {
  tourId?: string;
  destinations: Destination[];
  onChange?: (destinations: Destination[]) => void;
}

export function DestinationsTab({ tourId, destinations, onChange }: DestinationsTabProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Destination>({ name: '', price: 0, date: '' });
  const [openDestination, setOpenDestination] = useState(false);
  const [showNewDestinationDialog, setShowNewDestinationDialog] = useState(false);
  const [newDestinationName, setNewDestinationName] = useState('');
  const [newDestinationPrice, setNewDestinationPrice] = useState(0);
  const [newDestinationProvinceId, setNewDestinationProvinceId] = useState('');
  const [openProvince, setOpenProvince] = useState(false);
  const queryClient = useQueryClient();

  const { data: tour } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: () => tourId ? store.getTour(tourId) : Promise.resolve(null),
    enabled: !!tourId,
  });

  // Default guests for new rows = tour totalGuests
  if (!tourId && formData.guests === undefined && (tour?.totalGuests || 0) > 0) {
    // create mode: avoid useEffect to keep it simple and synchronous
    formData.guests = tour!.totalGuests;
  }

  const { data: touristDestinations = [] } = useQuery({
    queryKey: ['touristDestinations'],
    queryFn: () => store.listTouristDestinations({ status: 'active' }),
  });

  // Map destination name -> province name (best-effort; case-insensitive)
  const nameToProvince = useMemo(() => {
    const map = new Map<string, string>();
    (touristDestinations || []).forEach(td => {
      const key = (td.name || '').trim().toLowerCase();
      if (!key) return;
      const provinceName = td.provinceRef?.nameAtBooking || 'Unknown';
      if (!map.has(key)) map.set(key, provinceName);
    });
    return map;
  }, [touristDestinations]);

  // Detect duplicate destination names (case-insensitive, trimmed)
  const duplicateDestinationNames = useMemo(() => {
    const counts = new Map<string, number>();
    destinations.forEach(d => {
      const k = (d.name || '').trim().toLowerCase();
      if (!k) return;
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, c]) => c > 1)
        .map(([k]) => k)
    );
  }, [destinations]);

  // Mutations and handlers used by row rendering (declare before rendering groups)
  const addMutation = useMutation({
    mutationFn: async (destination: Destination) => {
      if (tourId) {
        await store.addDestination(tourId, destination);
      } else {
        onChange?.([...destinations, destination]);
      }
    },
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        queryClient.invalidateQueries({ queryKey: ['tours'] });
      }
      toast.success('Destination added');
      setFormData({ name: '', price: 0, date: tour?.startDate || '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ index, destination }: { index: number; destination: Destination }) => {
      if (tourId) {
        await store.updateDestination(tourId, index, destination);
      } else {
        const newDests = [...destinations];
        newDests[index] = destination;
        onChange?.(newDests);
      }
    },
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        queryClient.invalidateQueries({ queryKey: ['tours'] });
      }
      toast.success('Destination updated');
      setEditingIndex(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => {
      if (tourId) {
        return store.removeDestination(tourId, index);
      }
      return Promise.resolve();
    },
    onSuccess: (_, index) => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        queryClient.invalidateQueries({ queryKey: ['tours'] });
      } else {
        // Create mode: call onChange with updated list
        onChange?.(destinations.filter((_, i) => i !== index));
      }
      toast.success('Destination removed');
    },
  });

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(destinations[index]);
    // Scroll to the form at the top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Open the combobox after a short delay to allow state to update
    setTimeout(() => {
      setOpenDestination(true);
    }, 100);
  };

  // Precompute grouped destination rows as React nodes
  const destinationGroupRows = useMemo(() => {
    const groups = new Map<string, any[]>();
    const items = destinations.map((d, i) => ({ ...d, originalIndex: i }));
    items.forEach(item => {
      const keyName = (item.name || '').trim().toLowerCase();
      const province = nameToProvince.get(keyName) || 'Unknown';
      const list = groups.get(province) || [];
      list.push(item);
      groups.set(province, list);
    });

    const sortedGroupNames = Array.from(groups.keys()).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return a.localeCompare(b);
    });

    const rows: any[] = [];
    sortedGroupNames.forEach(groupName => {
      const groupItems = (groups.get(groupName) || []).slice().sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Infinity;
        const db = b.date ? new Date(b.date).getTime() : Infinity;
        return da - db;
      });

      rows.push(
        <TableRow key={`group-${groupName}`} className="bg-muted/50">
          <TableCell colSpan={7} className="font-semibold">
            Province: {groupName} ({groupItems.length})
          </TableCell>
        </TableRow>
      );

      groupItems.forEach((destination: any, idx: number) => {
        const tourGuests = tour?.totalGuests || 0;
        const rowGuests = typeof destination.guests === 'number' ? destination.guests : 0;
        const totalAmount = destination.price * rowGuests;
        const nameKey = (destination.name || '').trim().toLowerCase();
        const isDupName = nameKey && duplicateDestinationNames.has(nameKey);
        const isZeroPrice = (destination.price ?? 0) === 0;
        rows.push(
          <TableRow key={`${groupName}-${destination.originalIndex}-${destination.date}`} className={`animate-fade-in ${isDupName || isZeroPrice ? 'bg-red-50 dark:bg-red-950' : ''}`}>
            <TableCell className="font-medium">{idx + 1}</TableCell>
            <TableCell className="font-medium">
              {destination.name}
              {(isDupName) && (
                <span className="ml-2 text-destructive" title="Duplicate destination name">⚑</span>
              )}
            </TableCell>
            <TableCell className={destination.price === 0 ? 'text-destructive font-semibold' : ''}>
              {formatCurrency(destination.price)}
              {destination.price === 0 && (
                <span className="ml-2 text-destructive" title="Price is zero">⚑</span>
              )}
            </TableCell>
            <TableCell>
              <NumberInputMobile
                value={destination.guests}
                onChange={(val) => {
                  if (val !== undefined && tourGuests && val > tourGuests) {
                    toast.warning(`Guests cannot exceed total tour guests (${tourGuests}).`);
                    val = tourGuests;
                  }
                  const updated: Destination = { ...destination, guests: val } as any;
                  if (tourId) {
                    updateMutation.mutate({ index: destination.originalIndex, destination: updated });
                  } else {
                    const newDests = [...destinations];
                    newDests[destination.originalIndex] = updated as any;
                    onChange?.(newDests);
                  }
                }}
                min={0}
                max={tourGuests}
                className="w-16 sm:w-24"
              />
            </TableCell>
            <TableCell className="font-semibold">{formatCurrency(totalAmount)}</TableCell>
            <TableCell>{formatDate(destination.date)}</TableCell>
            <TableCell className="text-right">
              {/* Responsive actions: dropdown on small screens, buttons on larger screens */}
              <div className="sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(destination.originalIndex)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate(destination.originalIndex)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="hidden sm:flex sm:gap-2 sm:justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(destination.originalIndex)}
                  className="hover-scale"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(destination.originalIndex)}
                  className="hover-scale text-destructive hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      });

    });

    return rows;
  }, [destinations, nameToProvince, tour?.totalGuests, duplicateDestinationNames, tourId, updateMutation, onChange]);

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => store.listProvinces({ status: 'active' }),
  });

  const createDestinationMutation = useMutation({
    mutationFn: ({ name, price, provinceId }: { name: string; price: number; provinceId: string }) => {
      const province = provinces.find(p => p.id === provinceId);
      if (!province) {
        throw new Error('Province not found');
      }
      return store.createTouristDestination({
        name,
        price,
        provinceRef: {
          id: provinceId,
          nameAtBooking: province.name
        }
      });
    },
    onSuccess: (newDestination) => {
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
      toast.success('Tourist destination created');
      setShowNewDestinationDialog(false);
      setNewDestinationName('');
      setNewDestinationPrice(0);
      setNewDestinationProvinceId('');
      // Auto-select the newly created destination
      setFormData({ ...formData, name: newDestination.name, price: newDestination.price });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create destination: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.date) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (editingIndex !== null) {
      // Disallow duplicate destination names (exclude current index)
      const targetName = formData.name.trim().toLowerCase();
      const isDuplicate = destinations.some((dest, idx) => idx !== editingIndex && dest.name.trim().toLowerCase() === targetName);
      if (isDuplicate) {
        toast.error('Destination name must be unique');
        return;
      }
      updateMutation.mutate({ index: editingIndex, destination: formData });
    } else {
      // Check for duplicate destination name
      const targetName = formData.name.trim().toLowerCase();
      const isDuplicate = destinations.some(dest => dest.name.trim().toLowerCase() === targetName);
      
      if (isDuplicate) {
        toast.error('A destination with this name already exists');
        return;
      }
      
      addMutation.mutate(formData);
    }
  };


  const handleCancel = () => {
    setEditingIndex(null);
    setFormData({ name: '', price: 0, date: tour?.startDate || '' });
  };

  const handleCreateNewDestination = () => {
    if (!newDestinationName.trim()) {
      toast.error('Please enter a destination name');
      return;
    }
    if (newDestinationPrice <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!newDestinationProvinceId) {
      toast.error('Please select a province');
      return;
    }
    createDestinationMutation.mutate({
      name: newDestinationName.trim(),
      price: newDestinationPrice,
      provinceId: newDestinationProvinceId
    });
  };

  // Default date to tour start date when available
  useEffect(() => {
    if (!formData.date && tour?.startDate) {
      setFormData(prev => ({ ...prev, date: tour.startDate! }));
    }
  }, [tour?.startDate]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingIndex !== null ? 'Edit Destination' : 'Add Destination'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Popover open={openDestination} onOpenChange={setOpenDestination}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openDestination}
                    className="flex-1 justify-between"
                  >
                    {formData.name || "Select destination..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search destination..." />
                    <CommandList>
                      <CommandEmpty>No destination found.</CommandEmpty>
                      <CommandGroup>
                        {touristDestinations.map((dest) => (
                          <CommandItem
                            key={dest.id}
                            value={dest.name}
                            onSelect={() => {
                              const today = new Date().toISOString().split('T')[0];
                              const defaultDate = tour?.startDate || today;
                              setFormData({
                                ...formData,
                                name: dest.name,
                                price: dest.price,
                                date: formData.date || defaultDate, // Keep existing date or use start date (fallback today)
                                guests: formData.guests ?? (tour?.totalGuests || undefined)
                              });
                              setOpenDestination(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.name === dest.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {dest.name} ({formatCurrency(dest.price)})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowNewDestinationDialog(true)}
                title="Add new destination"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CurrencyInput
              placeholder="Price (VND)"
              value={formData.price}
              onChange={(price) => setFormData({ ...formData, price })}
            />
            <DateInput
              value={formData.date}
              onChange={(date) => setFormData({ ...formData, date })}
              required
            />
            <NumberInputMobile
              value={formData.guests}
              onChange={(val) => {
                const max = tour?.totalGuests || 0;
                if (val !== undefined && max && val > max) {
                  toast.warning(`Guests cannot exceed total tour guests (${max}).`);
                  setFormData({ ...formData, guests: max });
                } else {
                  setFormData({ ...formData, guests: val });
                }
              }}
              min={0}
              max={tour?.totalGuests || 0}
              placeholder="Guests"
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="hover-scale">
              <Plus className="h-4 w-4 mr-2" />
              {editingIndex !== null ? 'Update' : 'Add'}
            </Button>
            {editingIndex !== null && (
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-lg border">
        <div className="p-4 border-b bg-muted/50">
          <h3 className="font-semibold">Destinations List</h3>
        </div>
        {destinations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No destinations added yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>
                    <span className="sm:hidden">Dest</span>
                    <span className="hidden sm:inline">Destination</span>
                  </TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="w-[80px]">
                    <span className="sm:hidden">Guests</span>
                    <span className="hidden sm:inline">Total Guests</span>
                  </TableHead>
                  <TableHead>
                    <span className="sm:hidden">Total</span>
                    <span className="hidden sm:inline">Total Amount</span>
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right w-[50px]">
                    <span className="sm:hidden">...</span>
                    <span className="hidden sm:inline">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{destinationGroupRows}</TableBody>
            </Table>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg flex justify-end">
              <div className="text-lg font-semibold">
                Total: {formatCurrency(destinations.reduce((sum, dest) => {
                  const g = typeof (dest as any).guests === 'number' ? (dest as any).guests : 0;
                  return sum + (dest.price * g);
                }, 0))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Destination Dialog */}
      <Dialog open={showNewDestinationDialog} onOpenChange={setShowNewDestinationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Tourist Destination</DialogTitle>
            <DialogDescription>
              Create a new tourist destination that can be reused across tours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-destination-name">Destination Name</Label>
              <Input
                id="new-destination-name"
                placeholder="e.g., Ha Long Bay, Hoi An"
                value={newDestinationName}
                onChange={(e) => setNewDestinationName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination-province">Province</Label>
              <Popover open={openProvince} onOpenChange={setOpenProvince}>
                <PopoverTrigger asChild>
                  <Button
                    id="destination-province"
                    variant="outline"
                    role="combobox"
                    aria-expanded={openProvince}
                    className="justify-between w-full"
                  >
                    {newDestinationProvinceId
                      ? provinces.find((prov) => prov.id === newDestinationProvinceId)?.name
                      : "Select province..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search province..." />
                    <CommandList>
                      <CommandEmpty>No province found.</CommandEmpty>
                      <CommandGroup>
                        {provinces.map((prov) => (
                          <CommandItem
                            key={prov.id}
                            value={prov.name}
                            onSelect={() => {
                              setNewDestinationProvinceId(prov.id);
                              setOpenProvince(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                newDestinationProvinceId === prov.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {prov.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-destination-price">Default Price (VND)</Label>
              <CurrencyInput
                id="new-destination-price"
                placeholder="Default price"
                value={newDestinationPrice}
                onChange={setNewDestinationPrice}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNewDestinationDialog(false);
                setNewDestinationName('');
                setNewDestinationPrice(0);
                setNewDestinationProvinceId('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateNewDestination}
              disabled={createDestinationMutation.isPending}
            >
              {createDestinationMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
