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
import { formatCurrency } from '@/lib/currency-utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import type { Allowance } from '@/types/tour';

interface AllowancesTabProps {
  tourId?: string;
  allowances: Allowance[];
  onChange?: (allowances: Allowance[]) => void;
}

export function AllowancesTab({ tourId, allowances, onChange }: AllowancesTabProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Allowance>({ date: '', name: '', price: 0, quantity: 1 });
  const [openProvince, setOpenProvince] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);
  const queryClient = useQueryClient();

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => store.listProvinces({ status: 'active' }),
  });

  const { data: allDetailedExpenses = [] } = useQuery({
    queryKey: ['detailedExpenses'],
    queryFn: () => store.listDetailedExpenses({ status: 'active' }),
  });

  // Filter detailed expenses to only show CTP category
  const detailedExpenses = allDetailedExpenses.filter(
    exp => exp.categoryRef?.nameAtBooking === 'CTP'
  );

  const addMutation = useMutation({
    mutationFn: async (allowance: Allowance) => {
      if (tourId) {
        await store.addAllowance(tourId, allowance);
      } else {
        onChange?.([...allowances, allowance]);
      }
    },
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        queryClient.invalidateQueries({ queryKey: ['tours'] });
      }
      toast.success('Allowance added');
      setFormData({ date: tour?.startDate || '', name: '', price: 0, quantity: 1 });
    },
    onError: (error) => {
      console.error('Error adding allowance:', error);
      toast.error('Failed to add allowance: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ index, allowance }: { index: number; allowance: Allowance }) => {
      if (tourId) {
        await store.updateAllowance(tourId, index, allowance);
      } else {
        const newAllowances = [...allowances];
        newAllowances[index] = allowance;
        onChange?.(newAllowances);
      }
    },
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        queryClient.invalidateQueries({ queryKey: ['tours'] });
      }
      toast.success('Allowance updated');
      setEditingIndex(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => {
      if (tourId) {
        return store.removeAllowance(tourId, index);
      }
      return Promise.resolve();
    },
    onSuccess: (_, index) => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        queryClient.invalidateQueries({ queryKey: ['tours'] });
      } else {
        onChange?.(allowances.filter((_, i) => i !== index));
      }
      toast.success('Allowance removed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Submitting allowance:', formData);

    // Validate required fields
    if (!formData.name || !formData.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingIndex !== null) {
      updateMutation.mutate({ index: editingIndex, allowance: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(allowances[index]);
    // Scroll to the form at the top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Open the combobox after a short delay to allow state to update
    setTimeout(() => {
      setOpenExpense(true);
    }, 100);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setFormData({ date: tour?.startDate || '', name: '', price: 0, quantity: 1 });
  };
  // Default date to tour start date when available
  const { data: tour } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: () => tourId ? store.getTour(tourId) : Promise.resolve(null),
    enabled: !!tourId,
  });

  useEffect(() => {
    if (!formData.date && tour?.startDate) {
      setFormData(prev => ({ ...prev, date: tour.startDate! }));
    }
  }, [tour?.startDate]);

  const handleCopy = (index: number) => {
    const allowanceToCopy = allowances[index];
    addMutation.mutate({ ...allowanceToCopy });
  };

  // Do not merge allowance rows; render each as-is

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingIndex !== null ? 'Edit Allowance' : 'Add Allowance'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Popover open={openExpense} onOpenChange={setOpenExpense}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openExpense}
                  className="justify-between"
                >
                  {formData.name || "Select allowance..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search allowance..." />
                  <CommandList>
                    <CommandEmpty>No allowance found.</CommandEmpty>
                    <CommandGroup>
                      {detailedExpenses.map((exp) => (
                        <CommandItem
                          key={exp.id}
                          value={exp.name}
                          onSelect={() => {
                            const today = new Date().toISOString().split('T')[0];
                            const defaultDate = tour?.startDate || today;
                            setFormData({
                              ...formData,
                              name: exp.name,
                              price: exp.price,
                              date: formData.date || defaultDate,
                              quantity: formData.quantity || 1
                            });
                            setOpenExpense(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.name === exp.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {exp.name} ({formatCurrency(exp.price)})
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
            <Input
              type="number"
              placeholder="Quantity"
              value={formData.quantity || 1}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              min="1"
            />
            <div className="flex gap-2">
              <Button type="submit" className="hover-scale flex-1">
                <Plus className="h-4 w-4 mr-2" />
                {editingIndex !== null ? 'Update' : 'Add'}
              </Button>
              {editingIndex !== null && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="rounded-lg border">
        <div className="p-4 border-b bg-muted/50">
          <h3 className="font-semibold">Allowances List</h3>
        </div>
        {allowances.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No allowances added yet
          </div>
        ) : (
          <Table className="min-w-[680px] sm:min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>
                  <span className="sm:hidden">Name</span>
                  <span className="hidden sm:inline">Name</span>
                </TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="w-[80px]">Qty</TableHead>
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
              {allowances
                .map((a, i) => ({ ...a, originalIndex: i }))
                .sort((a, b) => {
                  const n = (a.name || '').localeCompare(b.name || '');
                  if (n !== 0) return n;
                  const da = a.date ? new Date(a.date).getTime() : Infinity;
                  const db = b.date ? new Date(b.date).getTime() : Infinity;
                  return da - db;
                })
                .map((allowance: any, rowIndex: number) => {
                  const qty = allowance.quantity || 1;
                  const total = allowance.price * qty;
                  const isZeroPrice = (allowance.price ?? 0) === 0;
                  return (
                    <TableRow key={`${allowance.name}-${allowance.date}-${allowance.originalIndex}`} className={`animate-fade-in ${isZeroPrice ? 'bg-red-50 dark:bg-red-950' : ''}`}>
                      <TableCell className="font-medium">{rowIndex + 1}</TableCell>
                      <TableCell className="font-medium">{allowance.name}</TableCell>
                      <TableCell className={allowance.price === 0 ? 'text-destructive font-semibold' : ''}>
                        {formatCurrency(allowance.price)}
                        {allowance.price === 0 && (
                          <span className="ml-2 text-destructive" title="Price is zero">⚑</span>
                        )}
                      </TableCell>
                      <TableCell>{qty}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(total)}</TableCell>
                      <TableCell>{formatDate(allowance.date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(allowance.originalIndex)}
                            className="hover-scale"
                            title="Copy row"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(allowance.originalIndex)}
                            className="hover-scale"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(allowance.originalIndex)}
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
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={3} className="text-right">Total:</TableCell>
                <TableCell>
                  {allowances.reduce((sum, a) => sum + (a.quantity || 1), 0)} days
                </TableCell>
                <TableCell className="font-bold">
                  {formatCurrency(allowances.reduce((sum, a) => sum + (a.price * (a.quantity || 1)),0))}
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
