import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, ChevronsUpDown, Copy } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn, formatDate } from '@/lib/utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { Expense } from '@/types/tour';

interface ExpensesTabProps {
  tourId?: string;
  expenses: Expense[];
  onChange?: (expenses: Expense[]) => void;
}

export function ExpensesTab({ tourId, expenses, onChange }: ExpensesTabProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Expense>({ name: '', price: 0, date: '' });
  const [openExpense, setOpenExpense] = useState(false);
  const [showNewExpenseDialog, setShowNewExpenseDialog] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpensePrice, setNewExpensePrice] = useState(0);
  const [newExpenseCategoryId, setNewExpenseCategoryId] = useState('');
  const [openCategory, setOpenCategory] = useState(false);
  const [editingGuestsIndex, setEditingGuestsIndex] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: tour } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: () => tourId ? store.getTour(tourId) : Promise.resolve(null),
    enabled: !!tourId,
  });

  const { data: detailedExpenses = [] } = useQuery({
    queryKey: ['detailedExpenses'],
    queryFn: () => store.listDetailedExpenses({ status: 'active' }),
  });

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['expenseCategories'],
    queryFn: () => store.listExpenseCategories({ status: 'active' }),
  });

  const addMutation = useMutation({
    mutationFn: async (expense: Expense) => {
      if (tourId) {
        await store.addExpense(tourId, expense);
      } else {
        onChange?.([...expenses, expense]);
      }
    },
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      }
      toast.success('Expense added');
      setFormData({ name: '', price: 0, date: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ index, expense }: { index: number; expense: Expense }) => {
      if (tourId) {
        console.log('Updating expense with guests:', expense.guests);
        await store.updateExpense(tourId, index, expense);
      } else {
        const newExps = [...expenses];
        newExps[index] = expense;
        onChange?.(newExps);
      }
    },
    onSuccess: (_, { expense }) => {
      if (tourId) {
        console.log('Expense updated successfully, guests:', expense.guests);
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      }
      toast.success('Expense updated');
      setEditingIndex(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => {
      if (tourId) {
        return store.removeExpense(tourId, index);
      }
      return Promise.resolve();
    },
    onSuccess: (_, index) => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      } else {
        onChange?.(expenses.filter((_, i) => i !== index));
      }
      toast.success('Expense removed');
    },
  });

  const createExpenseMutation = useMutation({
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
    onSuccess: (newExpense) => {
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses'] });
      toast.success('Detailed expense created');
      setShowNewExpenseDialog(false);
      setNewExpenseName('');
      setNewExpensePrice(0);
      setNewExpenseCategoryId('');
      // Auto-select the newly created expense
      setFormData({ ...formData, name: newExpense.name, price: newExpense.price });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create expense: ${error.message}`);
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
      updateMutation.mutate({ index: editingIndex, expense: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(expenses[index]);
    // Scroll to the form at the top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Open the combobox after a short delay to allow state to update
    setTimeout(() => {
      setOpenExpense(true);
    }, 100);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setFormData({ name: '', price: 0, date: '' });
  };

  const handleDuplicate = (index: number) => {
    const expenseToDuplicate = expenses[index];
    addMutation.mutate(expenseToDuplicate);
  };

  const handleGuestsUpdate = (index: number, newGuests: number) => {
    const totalGuests = tour?.totalGuests || 0;

    if (newGuests > totalGuests) {
      toast.error(`Guests cannot exceed total guests (${totalGuests})`);
      setEditingGuestsIndex(null);
      return;
    }

    if (newGuests < 0) {
      toast.error('Guests cannot be negative');
      setEditingGuestsIndex(null);
      return;
    }

    // Always set the guests value explicitly, even if it equals totalGuests
    // This ensures the value persists after save
    const updatedExpense = { ...expenses[index], guests: newGuests };
    updateMutation.mutate({ index, expense: updatedExpense });
    setEditingGuestsIndex(null);
  };

  const handleCreateNewExpense = () => {
    if (!newExpenseName.trim()) {
      toast.error('Please enter an expense name');
      return;
    }
    if (newExpensePrice <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!newExpenseCategoryId) {
      toast.error('Please select a category');
      return;
    }
    createExpenseMutation.mutate({
      name: newExpenseName.trim(),
      price: newExpensePrice,
      categoryId: newExpenseCategoryId
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingIndex !== null ? 'Edit Expense' : 'Add Expense'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-2">
              <Popover open={openExpense} onOpenChange={setOpenExpense}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openExpense}
                    className="justify-between flex-1"
                  >
                    {formData.name || "Select expense..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search expense..." />
                    <CommandList>
                      <CommandEmpty>No expense found.</CommandEmpty>
                      <CommandGroup>
                        {detailedExpenses.map((exp) => (
                          <CommandItem
                            key={exp.id}
                            value={exp.name}
                            onSelect={() => {
                              const today = new Date().toISOString().split('T')[0];
                              setFormData({ ...formData, name: exp.name, price: exp.price, date: formData.date || today });
                              setOpenExpense(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.name === exp.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {exp.name} ({exp.price.toLocaleString()} ₫)
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
                onClick={() => setShowNewExpenseDialog(true)}
                title="Add new expense type"
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
          <h3 className="font-semibold">Expenses List</h3>
        </div>
        {expenses.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No expenses added yet
          </div>
        ) : (
          <div>
            {(() => {
              // Group expenses by name
              const groupedExpenses = expenses.reduce((groups, expense, index) => {
                const name = expense.name;
                if (!groups[name]) {
                  groups[name] = [];
                }
                groups[name].push({ ...expense, originalIndex: index });
                return groups;
              }, {} as Record<string, Array<Expense & { originalIndex: number }>>);

              return Object.entries(groupedExpenses).map(([name, expenseGroup]) => (
                <div key={name} className="border-b last:border-b-0">
                  <div className="p-3 bg-muted/30 font-semibold text-sm sticky top-0">
                    {name} ({expenseGroup.length} {expenseGroup.length === 1 ? 'item' : 'items'})
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Expense</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total Guests</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenseGroup.map((expense, groupIndex) => {
                        const totalGuests = tour?.totalGuests || 0;
                        const expenseGuests = expense.guests ?? totalGuests;
                        const totalAmount = expense.price * expenseGuests;
                        return (
                          <TableRow key={expense.originalIndex} className="animate-fade-in">
                            <TableCell className="font-medium">{expense.originalIndex + 1}</TableCell>
                            <TableCell className="font-medium">{expense.name}</TableCell>
                            <TableCell>{expense.price.toLocaleString()} ₫</TableCell>
                            <TableCell>
                              {editingGuestsIndex === expense.originalIndex ? (
                                <Input
                                  type="number"
                                  min={0}
                                  max={totalGuests}
                                  defaultValue={expenseGuests}
                                  className="w-20 h-8"
                                  autoFocus
                                  onBlur={(e) => handleGuestsUpdate(expense.originalIndex, parseInt(e.target.value) || 0)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleGuestsUpdate(expense.originalIndex, parseInt(e.currentTarget.value) || 0);
                                    } else if (e.key === 'Escape') {
                                      setEditingGuestsIndex(null);
                                    }
                                  }}
                                />
                              ) : (
                                <div
                                  className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                                  onClick={() => setEditingGuestsIndex(expense.originalIndex)}
                                  title="Click to edit guests count"
                                >
                                  {expenseGuests}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">{totalAmount.toLocaleString()} ₫</TableCell>
                            <TableCell>{formatDate(expense.date)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(expense.originalIndex)}
                                  className="hover-scale"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDuplicate(expense.originalIndex)}
                                  className="hover-scale"
                                  title="Duplicate"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteMutation.mutate(expense.originalIndex)}
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
                  <div className="p-3 bg-muted/20 text-sm flex justify-end">
                    <div className="font-semibold">
                      {name} Subtotal: {expenseGroup.reduce((sum, exp) => sum + (exp.price * (exp.guests ?? tour?.totalGuests ?? 0)), 0).toLocaleString()} ₫
                    </div>
                  </div>
                </div>
              ));
            })()}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg flex justify-end">
              <div className="text-lg font-semibold">
                Total: {expenses.reduce((sum, exp) => sum + (exp.price * (exp.guests ?? tour?.totalGuests ?? 0)), 0).toLocaleString()} ₫
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showNewExpenseDialog} onOpenChange={setShowNewExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Detailed Expense</DialogTitle>
            <DialogDescription>
              Create a new detailed expense that can be reused across tours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expense-name">Expense Name</Label>
              <Input
                id="expense-name"
                placeholder="e.g., Hotel, Transport, Food"
                value={newExpenseName}
                onChange={(e) => setNewExpenseName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-category">Expense Category</Label>
              <Popover open={openCategory} onOpenChange={setOpenCategory}>
                <PopoverTrigger asChild>
                  <Button
                    id="expense-category"
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCategory}
                    className="justify-between w-full"
                  >
                    {newExpenseCategoryId
                      ? expenseCategories.find((cat) => cat.id === newExpenseCategoryId)?.name
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
                              setNewExpenseCategoryId(cat.id);
                              setOpenCategory(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                newExpenseCategoryId === cat.id ? "opacity-100" : "opacity-0"
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
              <Label htmlFor="expense-price">Default Price (VND)</Label>
              <CurrencyInput
                id="expense-price"
                placeholder="Default price"
                value={newExpensePrice}
                onChange={(price) => setNewExpensePrice(price)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNewExpenseDialog(false);
                setNewExpenseName('');
                setNewExpensePrice(0);
                setNewExpenseCategoryId('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateNewExpense}
              disabled={createExpenseMutation.isPending}
            >
              {createExpenseMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
