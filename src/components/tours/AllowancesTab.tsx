import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { Allowance } from '@/types/tour';

interface AllowancesTabProps {
  tourId: string;
  allowances: Allowance[];
}

export function AllowancesTab({ tourId, allowances }: AllowancesTabProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Allowance>({ date: '', province: '', amount: 0 });
  const [openProvince, setOpenProvince] = useState(false);
  const queryClient = useQueryClient();

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => store.listProvinces({ status: 'active' }),
  });

  const addMutation = useMutation({
    mutationFn: (allowance: Allowance) => store.addAllowance(tourId, allowance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      toast.success('Allowance added');
      setFormData({ date: '', province: '', amount: 0 });
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
    setFormData({ date: '', province: '', amount: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingIndex !== null ? 'Edit Allowance' : 'Add Allowance'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <Popover open={openProvince} onOpenChange={setOpenProvince}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openProvince}
                  className="justify-between"
                >
                  {formData.province || "Select province..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
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
                            setFormData({ ...formData, province: prov.name });
                            setOpenProvince(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.province === prov.name ? "opacity-100" : "opacity-0"
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
            <Input
              type="number"
              placeholder="Amount (VND)"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
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
          <h3 className="font-semibold">Allowances List</h3>
        </div>
        {allowances.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No allowances added yet
          </div>
        ) : (
          <div className="divide-y">
            {allowances.map((allowance, index) => (
              <div
                key={index}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/50 transition-colors animate-fade-in"
              >
                <div className="flex-1">
                  <div className="font-medium">{allowance.province}</div>
                  <div className="text-sm text-muted-foreground">
                    {allowance.amount.toLocaleString()} ₫ • {allowance.date}
                  </div>
                </div>
                <div className="flex gap-2">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
