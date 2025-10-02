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
import type { Meal } from '@/types/tour';

interface MealsTabProps {
  tourId: string;
  meals: Meal[];
}

export function MealsTab({ tourId, meals }: MealsTabProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Meal>({ name: '', price: 0, date: '' });
  const [openMeal, setOpenMeal] = useState(false);
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
    mutationFn: (meal: Meal) => store.addMeal(tourId, meal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Meal added');
      setFormData({ name: '', price: 0, date: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ index, meal }: { index: number; meal: Meal }) =>
      store.updateMeal(tourId, index, meal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Meal updated');
      setEditingIndex(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => store.removeMeal(tourId, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Meal removed');
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
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setFormData({ name: '', price: 0, date: '' });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingIndex !== null ? 'Edit Meal' : 'Add Meal'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Popover open={openMeal} onOpenChange={setOpenMeal}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openMeal}
                  className="justify-between"
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
                          {item.name} ({item.price.toLocaleString()} ₫)
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
          <h3 className="font-semibold">Meals List</h3>
        </div>
        {meals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No meals added yet
          </div>
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Meal</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Total Guests</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meals.map((meal, index) => {
                  const totalGuests = tour?.totalGuests || 0;
                  const totalAmount = meal.price * totalGuests;
                  return (
                    <TableRow key={index} className="animate-fade-in">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{meal.name}</TableCell>
                      <TableCell>{meal.price.toLocaleString()} ₫</TableCell>
                      <TableCell>{totalGuests}</TableCell>
                      <TableCell className="font-semibold">{totalAmount.toLocaleString()} ₫</TableCell>
                      <TableCell>{formatDate(meal.date)}</TableCell>
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
                Total: {meals.reduce((sum, meal) => sum + (meal.price * (tour?.totalGuests || 0)), 0).toLocaleString()} ₫
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
