import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import type { DetailedExpense } from '@/types/master';
import { upsertById } from '@/lib/query-cache';

export const ALLOWANCE_CATEGORY_IDS = [
  '3f721484-4b40-4a57-a879-33d5f9c0368b',
  '1401bdaf-42cf-4d71-af0b-e3246f6e0486',
];

interface NewAllowanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
  guideId?: string;
  defaultCategoryId?: string;
  onCreated: (expense: { name: string; price: number; categoryId?: string }) => void;
}

export function NewAllowanceDialog({
  open,
  onOpenChange,
  readOnly,
  guideId,
  defaultCategoryId,
  onCreated,
}: NewAllowanceDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [categoryId, setCategoryId] = useState(defaultCategoryId || '');
  const [openCategory, setOpenCategory] = useState(false);

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['expenseCategories', guideId ?? null],
    queryFn: () => store.listExpenseCategories({ status: 'active', guideId }),
  });

  const allowanceCategories = expenseCategories.filter((c) => ALLOWANCE_CATEGORY_IDS.includes(c.id));

  const createAllowanceMutation = useMutation({
    mutationFn: () => {
      const category = expenseCategories.find((c) => c.id === categoryId);
      if (!category) throw new Error('Không tìm thấy nhóm CTP');
      return store.createDetailedExpense({
        name,
        price,
        categoryRef: { id: category.id, nameAtBooking: category.name },
        guideId,
      });
    },
    onSuccess: (newExpense) => {
      queryClient.setQueryData<DetailedExpense[]>(['detailedExpenses', guideId ?? null], (current) => upsertById(current, newExpense));
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses', guideId ?? null] });
      toast.success('Đã tạo CTP');
      onCreated({ name: newExpense.name, price: newExpense.price, categoryId: newExpense.categoryRef?.id });
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(`Tạo CTP thất bại: ${error.message}`),
  });

  const reset = () => { setName(''); setPrice(0); setCategoryId(defaultCategoryId || ''); };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('Vui lòng nhập tên CTP'); return; }
    if (price <= 0) { toast.error('Vui lòng nhập giá hợp lệ'); return; }
    if (!categoryId) { toast.error('Vui lòng chọn nhóm CTP'); return; }
    createAllowanceMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm CTP mới</DialogTitle>
          <DialogDescription>Tạo CTP trong master detailed expense để dùng lại cho các tour khác.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-allowance-name">Tên CTP</Label>
            <Input
              id="new-allowance-name"
              placeholder="ví dụ: CTP Hà Nội, Tiền ngủ Huế"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Nhóm CTP</Label>
            <Popover open={openCategory} onOpenChange={setOpenCategory}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox" className="w-full justify-between">
                  {categoryId ? allowanceCategories.find((c) => c.id === categoryId)?.name : 'Chọn nhóm CTP...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Tìm nhóm CTP..." />
                  <CommandList>
                    <CommandEmpty>Không tìm thấy nhóm CTP.</CommandEmpty>
                    <CommandGroup>
                      {allowanceCategories.map((cat) => (
                        <CommandItem key={cat.id} value={cat.name} onSelect={() => { setCategoryId(cat.id); setOpenCategory(false); }}>
                          <Check className={cn('mr-2 h-4 w-4', categoryId === cat.id ? 'opacity-100' : 'opacity-0')} />
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
            <Label>Giá mặc định (VND)</Label>
            <CurrencyInput placeholder="Giá mặc định" value={price} onChange={setPrice} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Hủy</Button>
          <Button type="button" onClick={handleSubmit} disabled={readOnly || createAllowanceMutation.isPending}>
            {createAllowanceMutation.isPending ? 'Đang tạo...' : 'Tạo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
