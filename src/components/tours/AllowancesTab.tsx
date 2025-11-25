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
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import type { Allowance, Tour } from '@/types/tour';

interface AllowancesTabProps {
  tourId?: string;
  allowances: Allowance[];
  onChange?: (allowances: Allowance[]) => void;
  tour?: Tour | null;
}

export function AllowancesTab({ tourId, allowances, onChange, tour }: AllowancesTabProps) {
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
        queryClient.invalidateQueries({ queryKey: ['tours'] });
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
        queryClient.invalidateQueries({ queryKey: ['tours'] });
      } else {
        onChange?.(allowances.filter((_, i) => i !== index));
      }
      toast.success('Đã xóa CTP');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
          {editingIndex !== null ? 'Chỉnh sửa CTP' : 'Thêm CTP'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Popover open={openExpense} onOpenChange={setOpenExpense}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openExpense}
                  className="justify-between w-full"
                >
                  {formData.name || "Chọn CTP..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Tìm CTP..." />
                  <CommandList>
                    <CommandEmpty>Không tìm thấy CTP.</CommandEmpty>
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
                  const da = a.date ? new Date(a.date).getTime() : Infinity;
                  const db = b.date ? new Date(b.date).getTime() : Infinity;
                  return da - db;
                })
                .map((allowance: any, rowIndex: number, arr: any[]) => {
                  const qty = allowance.quantity || 1;
                  const total = allowance.price * qty;
                  const isZeroPrice = (allowance.price ?? 0) === 0;

                  // Determine group for current and previous allowance
                  const getGroup = (name: string) => {
                    const nameLower = (name || '').toLowerCase().trim();
                    if (nameLower.includes('công tác phí') || nameLower.includes('cong tac phi')) return 'ctp';
                    if (nameLower.includes('tiền ngủ') || nameLower.includes('tien ngu')) return 'ngu';
                    if (nameLower.includes('tiền xe') || nameLower.includes('tien xe')) return 'xe';
                    return 'other';
                  };

                  const currentGroup = getGroup(allowance.name);
                  const prevAllowance = rowIndex > 0 ? arr[rowIndex - 1] : null;
                  const prevGroup = prevAllowance ? getGroup(prevAllowance.name) : null;
                  const showSeparator = prevGroup && currentGroup !== prevGroup;

                  return (
                    <>
                      {showSeparator && (
                        <TableRow key={`separator-${rowIndex}`} className="border-t-2 border-primary">
                          <TableCell colSpan={7} className="h-0 p-0"></TableCell>
                        </TableRow>
                      )}
                      <TableRow key={`${allowance.name}-${allowance.date}-${allowance.originalIndex}`} className={`animate-fade-in ${isZeroPrice ? 'bg-red-50 dark:bg-red-950' : ''}`}>
                      <TableCell className="font-medium">{rowIndex + 1}</TableCell>
                      <TableCell className="font-medium">{allowance.name}</TableCell>
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
    </div>
  );
}
