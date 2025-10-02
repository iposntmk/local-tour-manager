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
import type { Destination } from '@/types/tour';

interface DestinationsTabProps {
  tourId: string;
  destinations: Destination[];
}

export function DestinationsTab({ tourId, destinations }: DestinationsTabProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Destination>({ name: '', price: 0, date: '' });
  const [openDestination, setOpenDestination] = useState(false);
  const queryClient = useQueryClient();

  const { data: tour } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: () => store.getTour(tourId),
  });

  const { data: touristDestinations = [] } = useQuery({
    queryKey: ['touristDestinations'],
    queryFn: () => store.listTouristDestinations({ status: 'active' }),
  });

  const addMutation = useMutation({
    mutationFn: (destination: Destination) => store.addDestination(tourId, destination),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Destination added');
      setFormData({ name: '', price: 0, date: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ index, destination }: { index: number; destination: Destination }) =>
      store.updateDestination(tourId, index, destination),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Destination updated');
      setEditingIndex(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => store.removeDestination(tourId, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Destination removed');
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
    setFormData({ name: '', price: 0, guests: 0, date: '' });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingIndex !== null ? 'Edit Destination' : 'Add Destination'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Popover open={openDestination} onOpenChange={setOpenDestination}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openDestination}
                  className="justify-between"
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
    </div>
  );
}
