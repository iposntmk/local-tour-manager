import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit2, Check, ChevronsUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn, formatDate } from '@/lib/utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import type { Shopping } from '@/types/tour';

interface ShoppingsTabProps {
  tourId: string;
  shoppings: Shopping[];
}

export function ShoppingsTab({ tourId, shoppings }: ShoppingsTabProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Shopping>({ name: '', price: 0, date: '' });
  const [openShopping, setOpenShopping] = useState(false);
  const queryClient = useQueryClient();

  const { data: tour } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: () => store.getTour(tourId),
  });

  const { data: shoppingItems = [] } = useQuery({
    queryKey: ['shoppings'],
    queryFn: () => store.listShoppings({ status: 'active' }),
  });

  const addMutation = useMutation({
    mutationFn: (shopping: Shopping) => store.addTourShopping(tourId, shopping),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Shopping added');
      setFormData({ name: '', price: 0, date: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ index, shopping }: { index: number; shopping: Shopping }) =>
      store.updateTourShopping(tourId, index, shopping),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Shopping updated');
      setEditingIndex(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => store.removeTourShopping(tourId, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Shopping removed');
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
      updateMutation.mutate({ index: editingIndex, shopping: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(shoppings[index]);
  };

  const handleDelete = (index: number) => {
    if (confirm('Are you sure you want to delete this shopping item?')) {
      deleteMutation.mutate(index);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setFormData({ name: '', price: 0, date: '' });
  };

  const totalGuests = tour ? tour.totalGuests : 1;
  const totalAmount = shoppings.reduce((sum, s) => sum + s.price * totalGuests, 0);

  return (
    <div className="space-y-6">
      {/* Add Shopping Form */}
      <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4">
          {editingIndex !== null ? 'Edit Shopping' : 'Add Shopping'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Shopping Item *</label>
            <Popover open={openShopping} onOpenChange={setOpenShopping}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {formData.name || "Select shopping..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Search shopping..." />
                  <CommandEmpty>No shopping found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {shoppingItems.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.name}
                          onSelect={() => {
                            setFormData({ ...formData, name: item.name });
                            setOpenShopping(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.name === item.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {item.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Price *</label>
            <CurrencyInput
              value={formData.price}
              onChange={(value) => setFormData({ ...formData, price: value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Date *</label>
            <DateInput
              value={formData.date}
              onChange={(value) => setFormData({ ...formData, date: value })}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button type="submit">
            {editingIndex !== null ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Update
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </>
            )}
          </Button>
          {editingIndex !== null && (
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Shoppings List */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shopping Item</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Guests</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shoppings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No shopping items added yet
                </TableCell>
              </TableRow>
            ) : (
              shoppings.map((shopping, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{shopping.name}</TableCell>
                  <TableCell>{shopping.price.toLocaleString()} ₫</TableCell>
                  <TableCell>{totalGuests}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {(shopping.price * totalGuests).toLocaleString()} ₫
                  </TableCell>
                  <TableCell>{formatDate(shopping.date)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(index)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {shoppings.length > 0 && (
          <div className="border-t p-4 bg-muted/50">
            <div className="flex justify-between items-center font-semibold">
              <span>Total Shopping Amount:</span>
              <span className="text-lg">{totalAmount.toLocaleString()} ₫</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
