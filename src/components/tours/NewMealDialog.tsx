import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ExpenseCategoryDialog } from '@/components/expense-categories/ExpenseCategoryDialog';
import type { ExpenseCategory, ExpenseCategoryInput } from '@/types/master';

interface NewMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newMealName: string;
  setNewMealName: (name: string) => void;
  newMealPrice: number;
  setNewMealPrice: (price: number) => void;
  newMealCategoryId: string;
  setNewMealCategoryId: (id: string) => void;
  openCategory: boolean;
  setOpenCategory: (open: boolean) => void;
  showNewCategoryDialog: boolean;
  setShowNewCategoryDialog: (open: boolean) => void;
  expenseCategories: ExpenseCategory[];
  isPending: boolean;
  readOnly?: boolean;
  onSubmit: () => void;
  onCreateCategory: (data: ExpenseCategoryInput) => void;
}

export function NewMealDialog({
  open, onOpenChange,
  newMealName, setNewMealName,
  newMealPrice, setNewMealPrice,
  newMealCategoryId, setNewMealCategoryId,
  openCategory, setOpenCategory,
  showNewCategoryDialog, setShowNewCategoryDialog,
  expenseCategories, isPending, readOnly,
  onSubmit, onCreateCategory,
}: NewMealDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
    setNewMealName('');
    setNewMealPrice(0);
    setNewMealCategoryId('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm bữa ăn chi tiết mới</DialogTitle>
            <DialogDescription>Tạo bữa ăn chi tiết mới để có thể dùng lại cho các tour khác.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-meal-name">Tên bữa ăn</Label>
              <Input id="new-meal-name" placeholder="ví dụ: Bữa sáng, Bữa trưa, Bữa tối"
                value={newMealName} onChange={(e) => setNewMealName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-category">Nhóm chi phí</Label>
              <div className="flex gap-2">
                <Popover open={openCategory} onOpenChange={setOpenCategory}>
                  <PopoverTrigger asChild>
                    <Button type="button" id="meal-category" variant="outline" role="combobox"
                      aria-expanded={openCategory} className="min-w-0 flex-1 justify-between">
                      <span className="truncate">
                        {newMealCategoryId
                          ? expenseCategories.find(c => c.id === newMealCategoryId)?.name
                          : 'Chọn nhóm chi phí...'}
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
                          {expenseCategories.map(cat => (
                            <CommandItem key={cat.id} value={cat.name}
                              onSelect={() => { setNewMealCategoryId(cat.id); setOpenCategory(false); }}>
                              <Check className={cn('mr-2 h-4 w-4', newMealCategoryId === cat.id ? 'opacity-100' : 'opacity-0')} />
                              {cat.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button type="button" variant="outline" size="icon" title="Thêm nhóm chi phí"
                  onClick={() => setShowNewCategoryDialog(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-meal-price">Giá mặc định (VND)</Label>
              <CurrencyInput id="new-meal-price" placeholder="Giá mặc định"
                value={newMealPrice} onChange={setNewMealPrice} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Hủy</Button>
            <Button type="button" onClick={onSubmit} disabled={readOnly || isPending}>
              {isPending ? 'Đang tạo...' : 'Tạo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExpenseCategoryDialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}
        onSubmit={onCreateCategory} />
    </>
  );
}
