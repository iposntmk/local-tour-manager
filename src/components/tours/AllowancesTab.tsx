import { useState, useEffect, useMemo } from 'react';
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
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { Allowance, Tour } from '@/types/tour';
import { invalidateTourAggregateCaches, upsertById } from '@/lib/query-cache';
import type { DetailedExpense } from '@/types/master';
import { TourRowLabel } from '@/components/tours/TourRowIcon';

interface AllowancesTabProps {
  tourId?: string;
  allowances: Allowance[];
  onChange?: (allowances: Allowance[]) => void;
  tour?: Tour | null;
  readOnly?: boolean;
}

// Order matters: index = sort priority (CTP first, then Tiền ngủ).
const ALLOWANCE_CATEGORY_IDS = [
  '3f721484-4b40-4a57-a879-33d5f9c0368b',
  '1401bdaf-42cf-4d71-af0b-e3246f6e0486',
];

export function AllowancesTab({ tourId, allowances, onChange, tour, readOnly = false }: AllowancesTabProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Allowance>({ date: '', name: '', price: 0, quantity: 1 });
  const [openExpense, setOpenExpense] = useState(false);
  const [showNewAllowanceDialog, setShowNewAllowanceDialog] = useState(false);
  const [newAllowanceName, setNewAllowanceName] = useState('');
  const [newAllowancePrice, setNewAllowancePrice] = useState(0);
  const [newAllowanceCategoryId, setNewAllowanceCategoryId] = useState('');
  const [openAllowanceCategory, setOpenAllowanceCategory] = useState(false);
  const queryClient = useQueryClient();

  const { data: allDetailedExpenses = [] } = useQuery({
    queryKey: ['detailedExpenses'],
    queryFn: () => store.listDetailedExpenses({ status: 'active' }),
  });

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['expenseCategories'],
    queryFn: () => store.listExpenseCategories({ status: 'active' }),
  });

  const detailedExpenses = allDetailedExpenses.filter(
    exp => exp.categoryRef?.id && ALLOWANCE_CATEGORY_IDS.includes(exp.categoryRef.id)
  );

  const allowanceCategories = expenseCategories.filter(category => ALLOWANCE_CATEGORY_IDS.includes(category.id));

  // Lookup: allowance.name → categoryId (so we can sort/group existing
  // allowances by category even though only `name` is persisted).
  const nameToCategoryId = useMemo(() => {
    const map = new Map<string, string>();
    for (const exp of allDetailedExpenses) {
      if (exp.categoryRef?.id) map.set(exp.name, exp.categoryRef.id);
    }
    return map;
  }, [allDetailedExpenses]);

  const getCategoryPriority = (allowance: Allowance): number => {
    // Prefer the stored categoryId; fall back to name lookup for legacy
    // rows persisted before the column existed.
    const id = allowance.categoryId ?? nameToCategoryId.get(allowance.name);
    if (!id) return Number.POSITIVE_INFINITY;
    const idx = ALLOWANCE_CATEGORY_IDS.indexOf(id);
    return idx === -1 ? Number.POSITIVE_INFINITY : idx;
  };

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
        void invalidateTourAggregateCaches(queryClient, 'none');
      }
      toast.success('Đã thêm CTP');
      setFormData({ date: tour?.startDate || '', name: '', price: 0, quantity: 1 });
    },
    onError: (error) => {
      console.error('Error adding allowance:', error);
      toast.error('Thêm CTP thất bại: ' + (error instanceof Error ? error.message : 'lỗi không xác định'));
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
        void invalidateTourAggregateCaches(queryClient, 'none');
      }
      toast.success('Đã cập nhật CTP');
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
        void invalidateTourAggregateCaches(queryClient, 'none');
      } else {
        onChange?.(allowances.filter((_, i) => i !== index));
      }
      toast.success('Đã xóa CTP');
    },
  });

  const createAllowanceExpenseMutation = useMutation({
    mutationFn: ({ name, price, categoryId }: { name: string; price: number; categoryId: string }) => {
      const category = expenseCategories.find(c => c.id === categoryId);
      if (!category) {
        throw new Error('Không tìm thấy nhóm CTP');
      }

      return store.createDetailedExpense({
        name,
        price,
        categoryRef: {
          id: category.id,
          nameAtBooking: category.name,
        },
      });
    },
    onSuccess: (newExpense) => {
      const today = new Date().toISOString().split('T')[0];
      const defaultDate = tour?.startDate || today;

      queryClient.setQueryData<DetailedExpense[]>(['detailedExpenses'], (current) => upsertById(current, newExpense));
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses'] });
      toast.success('Đã tạo CTP');
      setShowNewAllowanceDialog(false);
      setNewAllowanceName('');
      setNewAllowancePrice(0);
      setNewAllowanceCategoryId('');
      setFormData({
        ...formData,
        name: newExpense.name,
        price: newExpense.price,
        date: formData.date || defaultDate,
        quantity: formData.quantity || 1,
        categoryId: newExpense.categoryRef?.id,
      });
    },
    onError: (error: Error) => {
      toast.error(`Tạo CTP thất bại: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) {
      toast.error('Bạn không có quyền sửa CTP trong tour.');
      return;
    }

    console.log('Submitting allowance:', formData);

    // Validate required fields
    if (!formData.name || !formData.date) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    if (editingIndex !== null) {
      updateMutation.mutate({ index: editingIndex, allowance: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  const handleEdit = (index: number) => {
    if (readOnly) return;
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

  const handleOpenNewAllowanceDialog = () => {
    setNewAllowanceCategoryId(allowanceCategories[0]?.id || '');
    setShowNewAllowanceDialog(true);
  };

  const handleCreateNewAllowance = () => {
    if (readOnly) return;
    if (!newAllowanceName.trim()) {
      toast.error('Vui lòng nhập tên CTP');
      return;
    }
    if (newAllowancePrice <= 0) {
      toast.error('Vui lòng nhập giá hợp lệ');
      return;
    }
    if (!newAllowanceCategoryId) {
      toast.error('Vui lòng chọn nhóm CTP');
      return;
    }

    createAllowanceExpenseMutation.mutate({
      name: newAllowanceName.trim(),
      price: newAllowancePrice,
      categoryId: newAllowanceCategoryId,
    });
  };

  useEffect(() => {
    if (!formData.date && tour?.startDate) {
      setFormData(prev => ({ ...prev, date: tour.startDate! }));
    }
  }, [tour?.startDate]);

  const handleCopy = (index: number) => {
    if (readOnly) return;
    const allowanceToCopy = allowances[index];
    addMutation.mutate({ ...allowanceToCopy });
  };

  // Do not merge allowance rows; render each as-is

  return (
    <div className="space-y-6">
      {!readOnly && (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingIndex !== null ? 'Chỉnh sửa CTP' : 'Thêm CTP'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Popover open={openExpense} onOpenChange={setOpenExpense}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={openExpense}
                    className="min-w-0 flex-1 justify-between"
                  >
                    <span className="truncate">{formData.name || "Chọn CTP..."}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Tìm CTP..." />
                    <CommandList>
                      <CommandEmpty>Không tìm thấy CTP.</CommandEmpty>
                      <CommandGroup>
                        {detailedExpenses.map((exp) => {
                          const categoryLabel = exp.categoryRef?.nameAtBooking || 'Khác';
                          return (
                            <CommandItem
                              key={exp.id}
                              value={`${exp.name} ${categoryLabel}`}
                              onSelect={() => {
                                const today = new Date().toISOString().split('T')[0];
                                const defaultDate = tour?.startDate || today;
                                setFormData({
                                  ...formData,
                                  name: exp.name,
                                  price: exp.price,
                                  date: formData.date || defaultDate,
                                  quantity: formData.quantity || 1,
                                  categoryId: exp.categoryRef?.id,
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
                              <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                                <span className="truncate">{exp.name}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  {categoryLabel} · {formatCurrency(exp.price)}
                                </span>
                              </span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Thêm CTP"
                aria-label="Thêm CTP"
                onClick={handleOpenNewAllowanceDialog}
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
              value={formData.quantity || 1}
              onChange={(val) => setFormData({ ...formData, quantity: val || 1 })}
              min={1}
              placeholder="Số lượng"
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="hover-scale flex-1">
              <Plus className="h-4 w-4 mr-2" />
              {editingIndex !== null ? 'Cập nhật' : 'Thêm'}
            </Button>
            {editingIndex !== null && (
              <Button type="button" variant="outline" onClick={handleCancel}>
                Hủy
              </Button>
            )}
          </div>
        </form>
      </div>
      )}

      <div className="rounded-lg border">
        <div className="p-4 border-b bg-muted/50">
          <h3 className="font-semibold">Danh sách CTP</h3>
        </div>
        {allowances.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Chưa có phụ cấp nào
          </div>
        ) : (
          <Table className="min-w-[680px] sm:min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>
                  <span className="sm:hidden">Tên</span>
                  <span className="hidden sm:inline">Tên</span>
                </TableHead>
                <TableHead>Giá</TableHead>
                <TableHead className="w-[80px]">SL</TableHead>
                <TableHead>
                  <span className="sm:hidden">Tổng</span>
                  <span className="hidden sm:inline">Thành tiền</span>
                </TableHead>
                <TableHead>Ngày</TableHead>
                <TableHead className="text-right w-[80px] sm:w-auto">
                  <span className="sm:hidden">Tác</span>
                  <span className="hidden sm:inline">Thao tác</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allowances
                .map((a, i) => ({ ...a, originalIndex: i }))
                .sort((a, b) => {
                  const pa = getCategoryPriority(a);
                  const pb = getCategoryPriority(b);
                  if (pa !== pb) return pa - pb;
                  const da = a.date ? new Date(a.date).getTime() : Infinity;
                  const db = b.date ? new Date(b.date).getTime() : Infinity;
                  return da - db;
                })
                .map((allowance: any, rowIndex: number, arr: any[]) => {
                  const qty = allowance.quantity || 1;
                  const total = allowance.price * qty;
                  const isZeroPrice = (allowance.price ?? 0) === 0;

                  const currentPriority = getCategoryPriority(allowance);
                  const prevAllowance = rowIndex > 0 ? arr[rowIndex - 1] : null;
                  const prevPriority = prevAllowance ? getCategoryPriority(prevAllowance) : null;
                  const showSeparator = prevPriority !== null && currentPriority !== prevPriority;

                  return (
                    <>
                      {showSeparator && (
                        <TableRow key={`separator-${rowIndex}`} className="border-t-2 border-primary">
                          <TableCell colSpan={7} className="h-0 p-0"></TableCell>
                        </TableRow>
                      )}
                      <TableRow key={`${allowance.name}-${allowance.date}-${allowance.originalIndex}`} className={`animate-fade-in ${isZeroPrice ? 'bg-red-50 dark:bg-red-950' : ''}`}>
                      <TableCell className="font-medium">{rowIndex + 1}</TableCell>
                      <TableCell className="font-medium">
                        <TourRowLabel kind="allowance" label={allowance.name} />
                      </TableCell>
                      <TableCell className={allowance.price === 0 ? 'text-destructive font-semibold' : ''}>
                        {formatCurrency(allowance.price)}
                        {allowance.price === 0 && (
                          <span className="ml-2 text-destructive" title="Giá bằng 0">⚑</span>
                        )}
                      </TableCell>
                      <TableCell>{qty}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(total)}</TableCell>
                      <TableCell>{formatDate(allowance.date)}</TableCell>
                      <TableCell className="text-right">
                        {!readOnly && (
                        <div className="sm:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Mở menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(allowance.originalIndex)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopy(allowance.originalIndex)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Sao chép
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => deleteMutation.mutate(allowance.originalIndex)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        )}
                        {!readOnly && (
                        <div className="hidden sm:flex sm:gap-2 sm:justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(allowance.originalIndex)}
                            className="hover-scale"
                            title="Sao chép dòng"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(allowance.originalIndex)}
                            className="hover-scale"
                            title="Sửa"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(allowance.originalIndex)}
                            className="hover-scale text-destructive hover:text-destructive"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        )}
                      </TableCell>
                    </TableRow>
                    </>
                  );
                })}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={3} className="text-right">Tổng cộng:</TableCell>
                <TableCell>
                  {allowances.reduce((sum, a) => sum + (a.quantity || 1), 0)} ngày
                </TableCell>
                <TableCell className="font-bold">
                  {formatCurrency(allowances.reduce((sum, a) => sum + (a.price * (a.quantity || 1)), 0))}
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={showNewAllowanceDialog} onOpenChange={setShowNewAllowanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm CTP mới</DialogTitle>
            <DialogDescription>
              Tạo CTP trong master detailed expense để dùng lại cho các tour khác.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-allowance-name">Tên CTP</Label>
              <Input
                id="new-allowance-name"
                placeholder="ví dụ: CTP Hà Nội, Tiền ngủ Huế"
                value={newAllowanceName}
                onChange={(e) => setNewAllowanceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowance-category">Nhóm CTP</Label>
              <Popover open={openAllowanceCategory} onOpenChange={setOpenAllowanceCategory}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    id="allowance-category"
                    variant="outline"
                    role="combobox"
                    aria-expanded={openAllowanceCategory}
                    className="w-full justify-between"
                  >
                    {newAllowanceCategoryId
                      ? allowanceCategories.find((cat) => cat.id === newAllowanceCategoryId)?.name
                      : "Chọn nhóm CTP..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Tìm nhóm CTP..." />
                    <CommandList>
                      <CommandEmpty>Không tìm thấy nhóm CTP.</CommandEmpty>
                      <CommandGroup>
                        {allowanceCategories.map((category) => (
                          <CommandItem
                            key={category.id}
                            value={category.name}
                            onSelect={() => {
                              setNewAllowanceCategoryId(category.id);
                              setOpenAllowanceCategory(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                newAllowanceCategoryId === category.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {category.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-allowance-price">Giá mặc định (VND)</Label>
              <CurrencyInput
                id="new-allowance-price"
                placeholder="Giá mặc định"
                value={newAllowancePrice}
                onChange={setNewAllowancePrice}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNewAllowanceDialog(false);
                setNewAllowanceName('');
                setNewAllowancePrice(0);
                setNewAllowanceCategoryId('');
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleCreateNewAllowance}
              disabled={readOnly || createAllowanceExpenseMutation.isPending}
            >
              {createAllowanceExpenseMutation.isPending ? 'Đang tạo...' : 'Tạo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
