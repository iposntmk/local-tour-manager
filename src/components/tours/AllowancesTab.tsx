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
import type { Allowance } from '@/types/tour';

interface AllowancesTabProps {
  tourId: string;
  allowances: Allowance[];
}

export function AllowancesTab({ tourId, allowances }: AllowancesTabProps) {
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
    mutationFn: (allowance: Allowance) => store.addAllowance(tourId, allowance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Allowance added');
      setFormData({ date: '', name: '', price: 0 });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ index, allowance }: { index: number; allowance: Allowance }) =>
      store.updateAllowance(tourId, index, allowance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Allowance updated');
      setEditingIndex(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => store.removeAllowance(tourId, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Allowance removed');
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
      updateMutation.mutate({ index: editingIndex, allowance: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(allowances[index]);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setFormData({ date: '', name: '', price: 0, quantity: 1 });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingIndex !== null ? 'Edit Allowance' : 'Add Allowance'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              placeholder="Amount (VND)"
              value={formData.price}
              onChange={(price) => setFormData({ ...formData, price })}
            />
            <Input
              type="number"
              placeholder="Quantity"
              value={formData.quantity || 1}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              min="1"
            />
            <DateInput
              value={formData.date}
              onChange={(date) => setFormData({ ...formData, date })}
              required
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allowances.map((allowance, index) => {
                const quantity = allowance.quantity || 1;
                const total = allowance.price * quantity;
                return (
                  <TableRow key={index} className="animate-fade-in">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{allowance.name}</TableCell>
                    <TableCell>{allowance.price.toLocaleString()} ₫</TableCell>
                    <TableCell>{quantity}</TableCell>
                    <TableCell className="font-semibold">{total.toLocaleString()} ₫</TableCell>
                    <TableCell>{formatDate(allowance.date)}</TableCell>
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
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={3} className="text-right">Total:</TableCell>
                <TableCell>
                  {allowances.reduce((sum, a) => sum + (a.quantity || 1), 0)} days
                </TableCell>
                <TableCell className="font-bold">
                  {allowances.reduce((sum, a) => sum + (a.price * (a.quantity || 1)), 0).toLocaleString()} ₫
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
