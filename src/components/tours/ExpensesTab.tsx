import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, ChevronsUpDown, Copy, MoreHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn, formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import type { Expense, Tour } from '@/types/tour';

interface ExpensesTabProps {
  tourId?: string;
  expenses: Expense[];
  onChange?: (expenses: Expense[]) => void;
  tour?: Tour | null;
}

export function ExpensesTab({ tourId, expenses, onChange, tour }: ExpensesTabProps) {
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
        queryClient.invalidateQueries({ queryKey: ['tours'] });
      }
      toast.success('Đã thêm chi phí');
      setFormData({ name: '', price: 0, date: tour?.startDate || '' });
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
        queryClient.invalidateQueries({ queryKey: ['tours'] });
      }
      toast.success('Đã cập nhật chi phí');
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
        queryClient.invalidateQueries({ queryKey: ['tours'] });
      } else {
        onChange?.(expenses.filter((_, i) => i !== index));
      }
      toast.success('Đã xóa chi phí');
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: ({ name, price, categoryId }: { name: string; price: number; categoryId: string }) => {
      const category = expenseCategories.find(c => c.id === categoryId);
      if (!category) {
        throw new Error('Không tìm thấy hạng mục');
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
      toast.success('Đã tạo chi phí chi tiết');
      setShowNewExpenseDialog(false);
      setNewExpenseName('');
      setNewExpensePrice(0);
      setNewExpenseCategoryId('');
      // Auto-select the newly created expense
      setFormData({ ...formData, name: newExpense.name, price: newExpense.price });
    },
    onError: (error: Error) => {
      toast.error(`Tạo chi phí thất bại: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate required fields
    if (!formData.name || !formData.date) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc');
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
    setFormData({ name: '', price: 0, date: tour?.startDate || '' });
  };

  const handleDuplicate = (index: number) => {
    const expenseToDuplicate = expenses[index];
    addMutation.mutate(expenseToDuplicate);
  };

  const handleGuestsUpdate = (index: number, newGuests: number) => {
    const totalGuests = tour?.totalGuests || 0;

    if (newGuests > totalGuests) {
      toast.error(`Số khách không được vượt quá tổng khách (${totalGuests})`);
      setEditingGuestsIndex(null);
      return;
    }

    if (newGuests < 0) {
      toast.error('Số khách không thể âm');
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
      toast.error('Vui lòng nhập tên chi phí');
      return;
    }
    if (newExpensePrice <= 0) {
      toast.error('Vui lòng nhập giá hợp lệ');
      return;
    }
    if (!newExpenseCategoryId) {
      toast.error('Vui lòng chọn hạng mục');
      return;
    }
    createExpenseMutation.mutate({
      name: newExpenseName.trim(),
      price: newExpensePrice,
      categoryId: newExpenseCategoryId
    });
  };

  // Default guests for new rows = tour totalGuests (only when not editing)
  if (editingIndex === null && formData.guests === undefined && (tour?.totalGuests || 0) > 0) {
    formData.guests = tour!.totalGuests;
  }

  // Check if water expense exists
  const waterExpenseNames = [
    'Nước uống cho khách 10k/1 khách / 1 ngày',
    'Nước uống cho khách 15k/1 khách / 1 ngày',
  ];
  const hasWaterExpense = expenses.some(exp => waterExpenseNames.includes(exp.name || ''));
  const showWaterWarning = tourId && !hasWaterExpense; // Only show for existing tours

  return (
    <div className="space-y-6">
      {showWaterWarning && (
        <div className="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                Thiếu chi phí nước uống
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Tour này chưa có dòng "Nước uống cho khách 10k/1 khách / 1 ngày". Vui lòng thêm chi phí này.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingIndex !== null ? 'Chỉnh sửa chi phí' : 'Thêm chi phí'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Popover open={openExpense} onOpenChange={setOpenExpense}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openExpense}
                    className="justify-between flex-1"
                  >
                    {formData.name || "Chọn chi phí..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Tìm chi phí..." />
                    <CommandList>
                      <CommandEmpty>Không tìm thấy chi phí.</CommandEmpty>
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
                            {exp.name} ({formatCurrency(exp.price)})
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
                title="Thêm loại chi phí mới"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CurrencyInput
              placeholder="Giá (VND)"
              value={formData.price}
              onChange={(price) => setFormData({ ...formData, price })}
            />
            <DateInput
              value={formData.date}
              onChange={(date) => setFormData({ ...formData, date })}
              required
            />
            <NumberInputMobile
              value={formData.guests}
              onChange={(val) => {
                setFormData({ ...formData, guests: val });
              }}
              min={0}
              placeholder="Số khách"
              className="w-full"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" className="hover-scale w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              {editingIndex !== null ? 'Cập nhật' : 'Thêm'}
            </Button>
            {editingIndex !== null && (
              <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                Hủy
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-lg border">
        <div className="p-4 border-b bg-muted/50">
          <h3 className="font-semibold">Danh sách chi phí</h3>
        </div>
        {expenses.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Chưa có chi phí nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 sm:w-[50px] p-1 sm:p-4">#</TableHead>
                  <TableHead className="min-w-[80px] sm:min-w-[120px] p-1 sm:p-4">
                    <span className="sm:hidden">CP</span>
                    <span className="hidden sm:inline">Chi phí</span>
                  </TableHead>
                  <TableHead className="min-w-[60px] sm:min-w-[80px] p-1 sm:p-4">Giá</TableHead>
                  <TableHead className="w-16 sm:w-[80px] p-1 sm:p-4">
                    <span className="sm:hidden">Khách</span>
                    <span className="hidden sm:inline">Tổng khách</span>
                  </TableHead>
                  <TableHead className="min-w-[60px] sm:min-w-[80px] p-1 sm:p-4">
                    <span className="sm:hidden">Tổng</span>
                    <span className="hidden sm:inline">Thành tiền</span>
                  </TableHead>
                  <TableHead className="min-w-[70px] sm:min-w-[90px] p-1 sm:p-4">Ngày</TableHead>
                  <TableHead className="text-right w-8 sm:w-[50px] p-1 sm:p-4">
                    <span className="sm:hidden">...</span>
                    <span className="hidden sm:inline">Thao tác</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const MERGE_NAMES = [
                    'Nước uống cho khách 15k/1 khách / 1 ngày',
                    'Nước uống cho khách 10k/1 khách / 1 ngày',
                  ];
                  const withIndex = expenses.map((e, i) => ({ ...e, originalIndex: i }));
                  const toMergeByName = MERGE_NAMES.map(name => ({
                    name,
                    rows: withIndex.filter(e => (e.name || '') === name),
                  }));
                  const others = withIndex.filter(e => !MERGE_NAMES.includes(e.name || ''));

                  const mergedBlock: any[] = [];
                  for (const group of toMergeByName) {
                    if (group.rows.length > 0) {
                      const totalGuests = group.rows.reduce((sum, e) => sum + (typeof e.guests === 'number' ? e.guests : 0), 0);
                      const unitPrice = group.rows[0].price || 0;
                      const earliestDate = group.rows.reduce((min: string | undefined, e) => {
                        if (!e.date) return min;
                        if (!min) return e.date;
                        return e.date < min ? e.date : min;
                      }, undefined as string | undefined);
                      mergedBlock.push({
                        name: group.name,
                        price: unitPrice,
                        guests: totalGuests,
                        date: earliestDate,
                        originalIndex: group.rows[0].originalIndex,
                        originalIndices: group.rows.map(e => e.originalIndex),
                        merged: true,
                      });
                    }
                  }

                  const displayList = [...others, ...mergedBlock]
                    .sort((a, b) => {
                      const da = a.date ? new Date(a.date).getTime() : Infinity;
                      const db = b.date ? new Date(b.date).getTime() : Infinity;
                      return da - db;
                    });

                  return displayList.map((expense: any, rowIndex: number) => {
                    const totalGuests = tour?.totalGuests || 0;
                    const expenseGuests = typeof expense.guests === 'number' ? expense.guests : 0;
                    const totalAmount = expense.price * expenseGuests;
                    const isZeroPrice = (expense.price ?? 0) === 0;
                    return (
                      <TableRow key={`${expense.originalIndex}-${expense.date}-${expense.merged ? 'merged' : 'row'}`} className={`animate-fade-in ${isZeroPrice ? 'bg-red-50 dark:bg-red-950' : ''}`}>
                        <TableCell className="font-medium">{rowIndex + 1}</TableCell>
                        <TableCell className="font-medium">{expense.name}</TableCell>
                      <TableCell className={expense.price === 0 ? 'text-destructive font-semibold' : ''}>
                        {formatCurrency(expense.price)}
                        {expense.price === 0 && (
                          <span className="ml-2 text-destructive" title="Giá bằng 0">⚑</span>
                        )}
                      </TableCell>
                        <TableCell>
                          <NumberInputMobile
                            value={expense.guests}
                            onChange={(val) => {
                              if (expense.merged) return;
                              const updated = { ...expense, guests: val } as Expense;
                              // Remove helper field before saving
                              const { originalIndex, ...clean } = updated as any;
                              updateMutation.mutate({ index: expense.originalIndex, expense: clean as Expense });
                            }}
                            min={0}
                            disabled={!!expense.merged}
                            className="w-16 sm:w-24"
                          />
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(totalAmount)}</TableCell>
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell className="text-right">
                          <div className="sm:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <span className="sr-only">Mở menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(expense.originalIndex)}>
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  Sửa
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(expense.originalIndex)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Nhân bản
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => deleteMutation.mutate(expense.originalIndex)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Xóa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="hidden sm:flex sm:gap-2 sm:justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(expense.originalIndex)}
                              className="hover-scale"
                              title="Sửa"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicate(expense.originalIndex)}
                              className="hover-scale"
                              title="Nhân bản"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(expense.originalIndex)}
                              className="hover-scale text-destructive hover:text-destructive"
                              title="Xóa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg flex justify-end">
              <div className="text-lg font-semibold">
                Total: {formatCurrency(expenses.reduce((sum, exp) => {
                  const g = typeof exp.guests === 'number' ? exp.guests : 0;
                  return sum + (exp.price * g);
                },0))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showNewExpenseDialog} onOpenChange={setShowNewExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm chi phí chi tiết mới</DialogTitle>
            <DialogDescription>
              Tạo chi phí chi tiết mới để có thể dùng lại cho các tour khác.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expense-name">Tên chi phí</Label>
              <Input
                id="expense-name"
                placeholder="ví dụ: Khách sạn, Di chuyển, Ăn uống"
                value={newExpenseName}
                onChange={(e) => setNewExpenseName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-category">Nhóm chi phí</Label>
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
                      : "Chọn nhóm chi phí..."}
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
              <Label htmlFor="expense-price">Giá mặc định (VND)</Label>
              <CurrencyInput
                id="expense-price"
                placeholder="Giá mặc định"
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
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleCreateNewExpense}
              disabled={createExpenseMutation.isPending}
            >
              {createExpenseMutation.isPending ? 'Đang tạo...' : 'Tạo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
