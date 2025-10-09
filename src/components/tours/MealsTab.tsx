import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, ChevronsUpDown, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn, formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { Meal } from '@/types/tour';

interface MealsTabProps {
  tourId?: string;
  meals: Meal[];
  onChange?: (meals: Meal[]) => void;
}

export function MealsTab({ tourId, meals, onChange }: MealsTabProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Meal>({ name: '', price: 0, date: '' });
  const [openMeal, setOpenMeal] = useState(false);
  const [showNewMealDialog, setShowNewMealDialog] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [newMealPrice, setNewMealPrice] = useState(0);
  const [newMealCategoryId, setNewMealCategoryId] = useState('');
  const [openCategory, setOpenCategory] = useState(false);
  const queryClient = useQueryClient();

  const { data: tour } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: () => tourId ? store.getTour(tourId) : Promise.resolve(null),
    enabled: !!tourId,
  });

  // Default guests for new rows in create mode when not editing
  if (!tourId && formData.guests === undefined && (tour?.totalGuests || 0) > 0) {
    formData.guests = tour!.totalGuests;
  }

  const { data: detailedExpenses = [] } = useQuery({
    queryKey: ['detailedExpenses'],
    queryFn: () => store.listDetailedExpenses({ status: 'active' }),
  });

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['expenseCategories'],
    queryFn: () => store.listExpenseCategories({ status: 'active' }),
  });

  const addMutation = useMutation({
    mutationFn: async (meal: Meal) => {
      if (tourId) {
        await store.addMeal(tourId, meal);
      } else {
        onChange?.([...meals, meal]);
      }
    },
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        queryClient.invalidateQueries({ queryKey: ['tours'] });
      }
      toast.success('Meal added');
      setFormData({ name: '', price: 0, date: tour?.startDate || '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ index, meal }: { index: number; meal: Meal }) => {
      if (tourId) {
        await store.updateMeal(tourId, index, meal);
      } else {
        const newMeals = [...meals];
        newMeals[index] = meal;
        onChange?.(newMeals);
      }
    },
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        queryClient.invalidateQueries({ queryKey: ['tours'] });
      }
      toast.success('Meal updated');
      setEditingIndex(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => {
      if (tourId) {
        return store.removeMeal(tourId, index);
      }
      return Promise.resolve();
    },
    onSuccess: (_, index) => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        queryClient.invalidateQueries({ queryKey: ['tours'] });
      } else {
        onChange?.(meals.filter((_, i) => i !== index));
      }
      toast.success('Meal removed');
    },
  });

  const createMealMutation = useMutation({
    mutationFn: ({ name, price, categoryId }: { name: string; price: number; categoryId: string }) => {
      const category = expenseCategories.find(c => c.id === categoryId);
      if (!category) {
        throw new Error('Category not found');
      }
      return store.createDetailedExpense({
        name,
        price,
        categoryRef: {
          id: categoryId,
          nameAtBooking: category.name
        }
      });
    },
    onSuccess: (newMeal) => {
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses'] });
      toast.success('Detailed meal created');
      setShowNewMealDialog(false);
      setNewMealName('');
      setNewMealPrice(0);
      setNewMealCategoryId('');
      // Auto-select the newly created meal
      setFormData({ ...formData, name: newMeal.name, price: newMeal.price });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create meal: ${error.message}`);
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
      updateMutation.mutate({ index: editingIndex, meal: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(meals[index]);
    // Scroll to the form at the top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Open the combobox after a short delay to allow state to update
    setTimeout(() => {
      setOpenMeal(true);
    }, 100);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setFormData({ name: '', price: 0, date: tour?.startDate || '' });
  };

  const handleDuplicate = (index: number) => {
    const mealToDuplicate = meals[index];
    addMutation.mutate(mealToDuplicate);
  };

  const handleCreateNewMeal = () => {
    if (!newMealName.trim()) {
      toast.error('Please enter a meal name');
      return;
    }
    if (newMealPrice <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!newMealCategoryId) {
      toast.error('Please select a category');
      return;
    }
    createMealMutation.mutate({
      name: newMealName.trim(),
      price: newMealPrice,
      categoryId: newMealCategoryId
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingIndex !== null ? 'Edit Meal' : 'Add Meal'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-2">
              <Popover open={openMeal} onOpenChange={setOpenMeal}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openMeal}
                    className="flex-1 justify-between"
                  >
                    {formData.name || "Select meal..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search meal..." />
                    <CommandList>
                      <CommandEmpty>No meal found.</CommandEmpty>
                      <CommandGroup>
                        {detailedExpenses.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={item.name}
                            onSelect={() => {
                              const today = new Date().toISOString().split('T')[0];
                              setFormData({ ...formData, name: item.name, price: item.price, date: formData.date || today });
                              setOpenMeal(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.name === item.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {item.name} ({formatCurrency(item.price)})
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
                onClick={() => setShowNewMealDialog(true)}
                title="Add new meal"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CurrencyInput
              placeholder="Price (VND)"
              value={formData.price}
              onChange={(price) => setFormData({ ...formData, price })}
            />
            <Input
              type="number"
              min={0}
              max={tour?.totalGuests || 0}
              placeholder={`Guests (max ${tour?.totalGuests || 0})`}
              value={formData.guests ?? ''}
              onChange={(e) => {
                const max = tour?.totalGuests || 0;
                let val = e.target.value === '' ? undefined : Number(e.target.value);
                if (typeof val === 'number' && !Number.isNaN(val)) {
                  if (val < 0) val = 0;
                  if (max && val > max) {
                    toast.warning(`Guests cannot exceed total tour guests (${max}).`);
                    val = max;
                  }
                }
                setFormData({ ...formData, guests: val as any });
              }}
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
          <h3 className="font-semibold">Meals List</h3>
        </div>
        {meals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No meals added yet
          </div>
        ) : (
          <div>
            <Table className="min-w-[680px] sm:min-w-0">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>
                    <span className="sm:hidden">Meal</span>
                    <span className="hidden sm:inline">Meal</span>
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
                  <TableHead className="text-right w-[80px] sm:w-auto">
                    <span className="sm:hidden">Act</span>
                    <span className="hidden sm:inline">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meals
                  .map((m, i) => ({ ...m, originalIndex: i }))
                  .sort((a, b) => {
                    const da = a.date ? new Date(a.date).getTime() : Infinity;
                    const db = b.date ? new Date(b.date).getTime() : Infinity;
                    return da - db;
                  })
                  .map((meal: any, rowIndex: number) => {
                  const tourGuests = tour?.totalGuests || 0;
                  const rowGuests = typeof meal.guests === 'number' ? meal.guests : 0;
                  const totalAmount = meal.price * rowGuests;
                  const isZeroPrice = (meal.price ?? 0) === 0;
                  return (
                    <TableRow key={`${meal.originalIndex}-${meal.date}`} className={`animate-fade-in ${isZeroPrice ? 'bg-red-50 dark:bg-red-950' : ''}`}>
                      <TableCell className="font-medium">{rowIndex + 1}</TableCell>
                      <TableCell className="font-medium">{meal.name}</TableCell>
                      <TableCell className={meal.price === 0 ? 'text-destructive font-semibold' : ''}>
                        {formatCurrency(meal.price)}
                        {meal.price === 0 && (
                          <span className="ml-2 text-destructive" title="Price is zero">⚑</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="w-24"
                            min={0}
                            max={tourGuests}
                            value={meal.guests ?? ''}
                            onChange={(e) => {
                              let val = e.target.value === '' ? undefined : Number(e.target.value);
                              if (typeof val === 'number' && !Number.isNaN(val)) {
                                if (val < 0) val = 0;
                                if (tourGuests && val > tourGuests) {
                                  toast.warning(`Guests cannot exceed total tour guests (${tourGuests}).`);
                                  val = tourGuests;
                                }
                              }
                              const updated: Meal = { ...meal, guests: val as any } as any;
                              if (tourId) {
                                updateMutation.mutate({ index: meal.originalIndex, meal: updated });
                              } else {
                                const newMeals = [...meals];
                                newMeals[meal.originalIndex] = updated as any;
                                onChange?.(newMeals);
                              }
                            }}
                          />
                          {rowIndex > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              title="Copy guests from previous row"
                              onClick={() => {
                                const sorted = meals
                                  .map((m, i) => ({ ...m, originalIndex: i }))
                                  .sort((a, b) => {
                                    const da = a.date ? new Date(a.date).getTime() : Infinity;
                                    const db = b.date ? new Date(b.date).getTime() : Infinity;
                                    return da - db;
                                  });
                                const prev = sorted[rowIndex - 1];
                                const g = Math.min(prev.guests ?? tourGuests, tourGuests);
                                const updated: Meal = { ...meal, guests: g } as any;
                                if (tourId) updateMutation.mutate({ index: meal.originalIndex, meal: updated });
                                else {
                                  const newMeals = [...meals];
                                  newMeals[meal.originalIndex] = updated as any;
                                  onChange?.(newMeals);
                                }
                              }}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                          )}
                          {rowIndex < meals.length - 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              title="Copy guests to next row"
                              onClick={() => {
                                const sorted = meals
                                  .map((m, i) => ({ ...m, originalIndex: i }))
                                  .sort((a, b) => {
                                    const da = a.date ? new Date(a.date).getTime() : Infinity;
                                    const db = b.date ? new Date(b.date).getTime() : Infinity;
                                    return da - db;
                                  });
                                const g = Math.min(meal.guests ?? tourGuests, tourGuests);
                                const nxt = sorted[rowIndex + 1];
                                const updatedNext: Meal = { ...nxt, guests: g } as any;
                                if (tourId) updateMutation.mutate({ index: nxt.originalIndex, meal: updatedNext });
                                else {
                                  const newMeals = [...meals];
                                  newMeals[nxt.originalIndex] = updatedNext as any;
                                  onChange?.(newMeals);
                                }
                              }}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(totalAmount)}</TableCell>
                      <TableCell>{formatDate(meal.date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(meal.originalIndex)}
                            className="hover-scale"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(meal.originalIndex)}
                            className="hover-scale"
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(meal.originalIndex)}
                            className="hover-scale text-destructive hover:text-destructive"
                            title="Delete"
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
                Total: {formatCurrency(meals.reduce((sum, meal) => {
                  const g = typeof meal.guests === 'number' ? meal.guests : 0;
                  return sum + (meal.price * g);
                },0))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Meal Dialog */}
      <Dialog open={showNewMealDialog} onOpenChange={setShowNewMealDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Detailed Meal</DialogTitle>
            <DialogDescription>
              Create a new detailed meal that can be reused across tours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-meal-name">Meal Name</Label>
              <Input
                id="new-meal-name"
                placeholder="e.g., Breakfast, Lunch, Dinner"
                value={newMealName}
                onChange={(e) => setNewMealName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-category">Expense Category</Label>
              <Popover open={openCategory} onOpenChange={setOpenCategory}>
                <PopoverTrigger asChild>
                  <Button
                    id="meal-category"
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCategory}
                    className="justify-between w-full"
                  >
                    {newMealCategoryId
                      ? expenseCategories.find((cat) => cat.id === newMealCategoryId)?.name
                      : "Select category..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search category..." />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        {expenseCategories.map((cat) => (
                          <CommandItem
                            key={cat.id}
                            value={cat.name}
                            onSelect={() => {
                              setNewMealCategoryId(cat.id);
                              setOpenCategory(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                newMealCategoryId === cat.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {cat.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-meal-price">Default Price (VND)</Label>
              <CurrencyInput
                id="new-meal-price"
                placeholder="Default price"
                value={newMealPrice}
                onChange={setNewMealPrice}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNewMealDialog(false);
                setNewMealName('');
                setNewMealPrice(0);
                setNewMealCategoryId('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateNewMeal}
              disabled={createMealMutation.isPending}
            >
              {createMealMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
