import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ExpenseCategoryDialog } from '@/components/expense-categories/ExpenseCategoryDialog';
import { toast } from 'sonner';
import type { ExpenseCategory, ExpenseCategoryInput, DetailedExpense } from '@/types/master';
import { upsertById } from '@/lib/query-cache';

interface NewExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
  guideId?: string;
  onCreated: (expense: { name: string; price: number }) => void;
}

export function NewExpenseDialog({ open, onOpenChange, readOnly, guideId, onCreated }: NewExpenseDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [openCategory, setOpenCategory] = useState(false);
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['expenseCategories', guideId ?? null],
    queryFn: () => store.listExpenseCategories({ status: 'active', guideId }),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: ExpenseCategoryInput) => store.createExpenseCategory({ ...data, guideId }),
    onSuccess: (category) => {
      queryClient.setQueryData<ExpenseCategory[]>(['expenseCategories', guideId ?? null], (current) => upsertById(current, category));
      queryClient.invalidateQueries({ queryKey: ['expenseCategories', guideId ?? null] });
      setCategoryId(category.id);
      setOpenCategory(false);
      setShowNewCategoryDialog(false);
      toast.success('Đã tạo nhóm chi phí');
    },
    onError: (error: Error) => toast.error(`Tạo nhóm chi phí thất bại: ${error.message}`),
  });

  const createExpenseMutation = useMutation({
    mutationFn: () => {
      const category = expenseCategories.find((c) => c.id === categoryId);
      if (!category) throw new Error('Không tìm thấy hạng mục');
      return store.createDetailedExpense({ name, price, categoryRef: { id: categoryId, nameAtBooking: category.name }, guideId });
    },
    onSuccess: (newExpense) => {
      queryClient.setQueryData<DetailedExpense[]>(['detailedExpenses', guideId ?? null], (current) => upsertById(current, newExpense));
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses', guideId ?? null] });
      toast.success('Đã tạo chi phí chi tiết');
      onCreated({ name: newExpense.name, price: newExpense.price });
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(`Tạo chi phí thất bại: ${error.message}`),
  });

  const reset = () => { setName(''); setPrice(0); setCategoryId(''); };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('Vui lòng nhập tên chi phí'); return; }
    if (price <= 0) { toast.error('Vui lòng nhập giá hợp lệ'); return; }
    if (!categoryId) { toast.error('Vui lòng chọn hạng mục'); return; }
    createExpenseMutation.mutate();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm chi phí chi tiết mới</DialogTitle>
            <DialogDescription>Tạo chi phí chi tiết mới để có thể dùng lại cho các tour khác.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expense-name">Tên chi phí</Label>
              <Input
                id="expense-name"
                placeholder="ví dụ: Khách sạn, Di chuyển, Ăn uống"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nhóm chi phí</Label>
              <div className="flex gap-2">
                <Popover open={openCategory} onOpenChange={setOpenCategory}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" role="combobox" className="min-w-0 flex-1 justify-between">
                      <span className="truncate">
                        {categoryId ? expenseCategories.find((c) => c.id === categoryId)?.name : 'Chọn nhóm chi phí...'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Tìm nhóm chi phí..." />
                      <CommandList>
                        <CommandEmpty>Không tìm thấy nhóm chi phí.</CommandEmpty>
                        <CommandGroup>
                          {expenseCategories.map((cat) => (
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
                <Button type="button" variant="outline" size="icon" title="Thêm nhóm chi phí" onClick={() => setShowNewCategoryDialog(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Giá mặc định (VND)</Label>
              <CurrencyInput placeholder="Giá mặc định" value={price} onChange={setPrice} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Hủy</Button>
            <Button type="button" onClick={handleSubmit} disabled={readOnly || createExpenseMutation.isPending}>
              {createExpenseMutation.isPending ? 'Đang tạo...' : 'Tạo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ExpenseCategoryDialog
        open={showNewCategoryDialog}
        onOpenChange={setShowNewCategoryDialog}
        onSubmit={(data) => createCategoryMutation.mutate(data)}
      />
    </>
  );
}
