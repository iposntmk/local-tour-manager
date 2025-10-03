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
import type { Expense } from '@/types/tour';

interface ExpensesTabProps {
  tourId: string;
  expenses: Expense[];
}

export function ExpensesTab({ tourId, expenses }: ExpensesTabProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Expense>({ name: '', price: 0, date: '' });
  const [openExpense, setOpenExpense] = useState(false);
  const queryClient = useQueryClient();

  const { data: tour } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: () => store.getTour(tourId),
  });

  const { data: detailedExpenses = [] } = useQuery({
    queryKey: ['detailedExpenses'],
    queryFn: () => store.listDetailedExpenses({ status: 'active' }),
  });

  const addMutation = useMutation({
    mutationFn: (expense: Expense) => store.addExpense(tourId, expense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Expense added');
      setFormData({ name: '', price: 0, date: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ index, expense }: { index: number; expense: Expense }) =>
      store.updateExpense(tourId, index, expense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Expense updated');
      setEditingIndex(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => store.removeExpense(tourId, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Expense removed');
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
      // Check for duplicate expense name when editing (case-insensitive, excluding current index)
      const isDuplicate = expenses.some((exp, i) =>
        i !== editingIndex && exp.name.toLowerCase() === formData.name.toLowerCase()
      );

      if (isDuplicate) {
        toast.error('An expense with this name already exists');
        return;
      }

      updateMutation.mutate({ index: editingIndex, expense: formData });
    } else {
      // Check for duplicate expense name
      const isDuplicate = expenses.some(exp =>
        exp.name.toLowerCase() === formData.name.toLowerCase()
      );

      if (isDuplicate) {
        toast.error('An expense with this name already exists');
        return;
      }

      addMutation.mutate(formData);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(expenses[index]);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setFormData({ name: '', price: 0, date: '' });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingIndex !== null ? 'Edit Expense' : 'Add Expense'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Popover open={openExpense} onOpenChange={setOpenExpense}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openExpense}
                  className="justify-between"
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
                {expenses.map((expense, index) => {
                  const totalGuests = tour?.totalGuests || 0;
                  const totalAmount = expense.price * totalGuests;
                  return (
                    <TableRow key={index} className="animate-fade-in">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{expense.name}</TableCell>
                      <TableCell>{expense.price.toLocaleString()} ₫</TableCell>
                      <TableCell>{totalGuests}</TableCell>
                      <TableCell className="font-semibold">{totalAmount.toLocaleString()} ₫</TableCell>
                      <TableCell>{formatDate(expense.date)}</TableCell>
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
                Total: {expenses.reduce((sum, exp) => sum + (exp.price * (tour?.totalGuests || 0)), 0).toLocaleString()} ₫
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
