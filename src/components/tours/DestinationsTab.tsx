import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, ChevronsUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn, formatDate } from '@/lib/utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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

  const { data: touristDestinations = [] } = useQuery({
    queryKey: ['touristDestinations'],
    queryFn: () => store.listTouristDestinations({ status: 'active' }),
  });

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => store.listProvinces({ status: 'active' }),
  });

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
      }
      toast.success('Destination added');
      setFormData({ name: '', price: 0, date: '' });
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
      } else {
        // Create mode: call onChange with updated list
        onChange?.(destinations.filter((_, i) => i !== index));
      }
      toast.success('Destination removed');
    },
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
      // Check for duplicate destination name when editing (case-insensitive, excluding current index)
      const isDuplicate = destinations.some((dest, i) => 
        i !== editingIndex && dest.name.toLowerCase() === formData.name.toLowerCase()
      );
      
      if (isDuplicate) {
        toast.error('A destination with this name already exists');
        return;
      }
      
      updateMutation.mutate({ index: editingIndex, destination: formData });
    } else {
      // Check for duplicate destination name
      const isDuplicate = destinations.some(dest => 
        dest.name.toLowerCase() === formData.name.toLowerCase()
      );
      
      if (isDuplicate) {
        toast.error('A destination with this name already exists');
        return;
      }
      
      addMutation.mutate(formData);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(destinations[index]);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setFormData({ name: '', price: 0, date: '' });
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

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingIndex !== null ? 'Edit Destination' : 'Add Destination'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                              setFormData({
                                ...formData,
                                name: dest.name,
                                price: dest.price,
                                date: formData.date || today // Keep existing date or use today
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
                            {dest.name} ({dest.price.toLocaleString()} ₫)
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
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Total Guests</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {destinations.map((destination, index) => {
                  const totalGuests = tour?.totalGuests || 0;
                  const totalAmount = destination.price * totalGuests;
                  return (
                    <TableRow key={index} className="animate-fade-in">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{destination.name}</TableCell>
                      <TableCell>{destination.price.toLocaleString()} ₫</TableCell>
                      <TableCell>{totalGuests}</TableCell>
                      <TableCell className="font-semibold">{totalAmount.toLocaleString()} ₫</TableCell>
                      <TableCell>{formatDate(destination.date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(index)}
                            className="hover-scale"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(index)}
                            className="hover-scale text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg flex justify-end">
              <div className="text-lg font-semibold">
                Total: {destinations.reduce((sum, dest) => sum + (dest.price * (tour?.totalGuests || 0)), 0).toLocaleString()} ₫
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
