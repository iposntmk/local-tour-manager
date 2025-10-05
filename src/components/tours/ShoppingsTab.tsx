import { useState, useEffect } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Shopping } from '@/types/tour';

interface ShoppingsTabProps {
  tourId?: string;
  shoppings: Shopping[];
  onChange?: (shoppings: Shopping[]) => void;
}

export function ShoppingsTab({ tourId, shoppings, onChange }: ShoppingsTabProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [openShopping, setOpenShopping] = useState(false);
  const [showNewShoppingDialog, setShowNewShoppingDialog] = useState(false);
  const [newShoppingName, setNewShoppingName] = useState('');
  const queryClient = useQueryClient();

  const { data: tour } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: () => tourId ? store.getTour(tourId) : Promise.resolve(null),
    enabled: !!tourId,
  });

  // Initialize formData with tour's end date
  const [formData, setFormData] = useState<Shopping>(() => ({
    name: '',
    price: 0,
    date: tour?.endDate || ''
  }));

  const { data: shoppingItems = [] } = useQuery({
    queryKey: ['shoppings'],
    queryFn: () => store.listShoppings({ status: 'active' }),
  });

  // Update formData date when tour data loads
  useEffect(() => {
    if (tour?.endDate && !formData.date) {
      setFormData(prev => ({ ...prev, date: tour.endDate }));
    }
  }, [tour?.endDate]);

  const addMutation = useMutation({
    mutationFn: async (shopping: Shopping) => {
      if (tourId) {
        await store.addTourShopping(tourId, shopping);
      } else {
        onChange?.([...shoppings, shopping]);
      }
    },
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      }
      toast.success('Shopping added');
      setFormData({ name: '', price: 0, date: tour?.endDate || '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ index, shopping }: { index: number; shopping: Shopping }) => {
      if (tourId) {
        await store.updateTourShopping(tourId, index, shopping);
      } else {
        const newShoppings = [...shoppings];
        newShoppings[index] = shopping;
        onChange?.(newShoppings);
      }
    },
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      }
      toast.success('Shopping updated');
      setEditingIndex(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => {
      if (tourId) {
        return store.removeTourShopping(tourId, index);
      }
      return Promise.resolve();
    },
    onSuccess: (_, index) => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      } else {
        onChange?.(shoppings.filter((_, i) => i !== index));
      }
      toast.success('Shopping removed');
    },
  });

  const createShoppingMutation = useMutation({
    mutationFn: (name: string) => store.createShopping({ name }),
    onSuccess: (newShopping) => {
      queryClient.invalidateQueries({ queryKey: ['shoppings'] });
      toast.success('Shopping item created');
      setShowNewShoppingDialog(false);
      setNewShoppingName('');
      // Auto-select the newly created shopping item
      setFormData({ ...formData, name: newShopping.name });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create shopping: ${error.message}`);
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
    setFormData({ name: '', price: 0, date: tour?.endDate || '' });
  };

  const handleCreateNewShopping = () => {
    if (!newShoppingName.trim()) {
      toast.error('Please enter a shopping name');
      return;
    }
    createShoppingMutation.mutate(newShoppingName.trim());
  };

  const totalGuests = tour ? tour.totalGuests : 1;
  const totalAmount = shoppings.reduce((sum, s) => sum + s.price, 0);
  const totalTip = shoppings.filter(s => s.name === 'TIP').reduce((sum, s) => sum + s.price, 0);

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
            <div className="flex gap-2">
              <Popover open={openShopping} onOpenChange={setOpenShopping}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="flex-1 justify-between"
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
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowNewShoppingDialog(true)}
                title="Add new shopping item"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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
              <TableHead>Date</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shoppings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No shopping items added yet
                </TableCell>
              </TableRow>
            ) : (
              shoppings.map((shopping, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{shopping.name}</TableCell>
                  <TableCell>{shopping.price.toLocaleString()} ₫</TableCell>
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
          <div className="border-t p-4 bg-muted/50 space-y-2">
            <div className="flex justify-between items-center font-semibold">
              <span>Total Shopping Amount:</span>
              <span className="text-lg">{totalAmount.toLocaleString()} ₫</span>
            </div>
            <div className="flex justify-between items-center font-semibold text-primary">
              <span>Total Tip:</span>
              <span className="text-lg">{totalTip.toLocaleString()} ₫</span>
            </div>
          </div>
        )}
      </div>

      {/* New Shopping Item Dialog */}
      <Dialog open={showNewShoppingDialog} onOpenChange={setShowNewShoppingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Shopping Item</DialogTitle>
            <DialogDescription>
              Create a new shopping item to add to the master shopping list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-shopping-name">Shopping Name *</Label>
              <Input
                id="new-shopping-name"
                placeholder="e.g., TIP, Souvenir Shop"
                value={newShoppingName}
                onChange={(e) => setNewShoppingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateNewShopping();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNewShoppingDialog(false);
                setNewShoppingName('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateNewShopping}
              disabled={createShoppingMutation.isPending}
            >
              {createShoppingMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
