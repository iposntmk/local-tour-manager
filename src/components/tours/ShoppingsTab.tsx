import { Fragment, useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit2, Check, ChevronsUpDown, Lock, MoreHorizontal, WalletCards, Flag } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CommissionPayment, PaymentMethod, Shopping, Tour } from '@/types/tour';
import { invalidateTourAggregateCaches, upsertById } from '@/lib/query-cache';
import type { Shopping as MasterShopping } from '@/types/master';
import { TourRowLabel } from '@/components/tours/TourRowIcon';
import { useAuth } from '@/contexts/AuthContext';

const REQUIRED_PIN = '0829101188';
const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
};

const getNetCommission = (shopping: Shopping) => shopping.netCommission ?? Math.max(0, shopping.price - (shopping.pitAmount || 0));
const getPaidTotal = (shopping: Shopping) => (shopping.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
const getPaymentRemaining = (shopping: Shopping) => Math.max(0, getNetCommission(shopping) - getPaidTotal(shopping));
const isFullyReceived = (shopping: Shopping) => getPaymentRemaining(shopping) <= 0 && (shopping.payments || []).length > 0;
const getCommissionStatus = (shopping: Shopping) => {
  const payments = shopping.payments || [];
  if (payments.length === 0) return 'pending';
  return getPaidTotal(shopping) >= getNetCommission(shopping) ? 'paid' : 'partial';
};
const getCommissionStatusLabel = (shopping: Shopping) => {
  const status = shopping.commissionStatus || getCommissionStatus(shopping);
  if (status === 'paid') return 'Đã nhận đủ';
  if (status === 'partial') return 'Một phần';
  return 'Chưa nhận';
};
const getCommissionBadgeVariant = (shopping: Shopping) => {
  const status = shopping.commissionStatus || getCommissionStatus(shopping);
  return status === 'paid' ? 'default' : status === 'partial' ? 'secondary' : 'outline';
};
const getCommissionRowClass = (shopping: Shopping) => {
  if ((shopping.price ?? 0) === 0) return 'bg-red-50 dark:bg-red-950';
  const status = shopping.commissionStatus || getCommissionStatus(shopping);
  if (status === 'paid') return 'bg-emerald-50/80 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/40';
  if (status === 'partial') return 'bg-amber-50/80 hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/40';
  return 'bg-red-100/80 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/50';
};

interface ShoppingsTabProps {
  tourId?: string;
  shoppings: Shopping[];
  onChange?: (shoppings: Shopping[]) => void;
  tour?: Tour | null;
  readOnly?: boolean;
}

export function ShoppingsTab({ tourId, shoppings, onChange, tour, readOnly = false }: ShoppingsTabProps) {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    const saved = sessionStorage.getItem('shopping.unlocked');
    return saved === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [openShopping, setOpenShopping] = useState(false);
  const [showNewShoppingDialog, setShowNewShoppingDialog] = useState(false);
  const [newShoppingName, setNewShoppingName] = useState('');
  const [formReceiveFull, setFormReceiveFull] = useState(false);
  const [formCashPayment, setFormCashPayment] = useState(false);
  const [expandedPaymentIndex, setExpandedPaymentIndex] = useState<number | null>(null);
  const [quickCashByShopping, setQuickCashByShopping] = useState<Record<string, boolean>>({});
  const [paymentForm, setPaymentForm] = useState<Omit<CommissionPayment, 'id' | 'tourShoppingId'>>({
    amount: 0,
    paymentMethod: 'cash',
    paidAt: new Date().toISOString().split('T')[0],
    note: '',
  });
  const queryClient = useQueryClient();
  const { isGuide, userProfile } = useAuth();
  const guideId = isGuide ? (userProfile?.id ?? undefined) : undefined;

  // Initialize formData with tour's start date
  const [formData, setFormData] = useState<Shopping>(() => ({
    name: '',
    price: 0,
    date: tour?.startDate || ''
  }));

  const { data: shoppingItems = [] } = useQuery({
    queryKey: ['shoppings', guideId ?? null],
    queryFn: () => store.listShoppings({ status: 'active', guideId }),
  });

  const updateFormCommission = (patch: Partial<Shopping>, options?: { manualPitAmount?: boolean }) => {
    const next = { ...formData, ...patch };
    const shouldAutoCalculatePit = !options?.manualPitAmount && (patch.price !== undefined || patch.pitRate !== undefined || patch.withholdsPit !== undefined);
    const pitAmount = next.withholdsPit
      ? shouldAutoCalculatePit
        ? Math.round((next.price || 0) * (next.pitRate || 0))
        : (next.pitAmount ?? Math.round((next.price || 0) * (next.pitRate || 0)))
      : 0;
    setFormData({
      ...next,
      pitAmount,
      netCommission: Math.max(0, (next.price || 0) - pitAmount),
    });
  };

  // Update formData date when tour data loads
  useEffect(() => {
    if (tour?.startDate) {
      setFormData(prev => prev.date ? prev : { ...prev, date: tour.startDate });
    }
  }, [tour?.startDate]);

  const addMutation = useMutation({
    mutationFn: async (shopping: Shopping) => {
      if (tourId) {
        await store.addTourShopping(tourId, shopping);
      } else {
        onChange?.([...shoppings, shopping]);
      }
    },
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        void invalidateTourAggregateCaches(queryClient, 'none');
      }
      toast.success('Đã thêm mục mua sắm');
      setFormData({ name: '', price: 0, date: tour?.startDate || '' });
      setFormReceiveFull(false);
      setFormCashPayment(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ index, shopping }: { index: number; shopping: Shopping }) => {
      if (tourId) {
        await store.updateTourShopping(tourId, index, shopping);
      } else {
        const newShoppings = [...shoppings];
        newShoppings[index] = shopping;
        onChange?.(newShoppings);
      }
    },
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        void invalidateTourAggregateCaches(queryClient, 'none');
      }
      toast.success('Đã cập nhật mục mua sắm');
      setEditingIndex(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => {
      if (tourId) {
        return store.removeTourShopping(tourId, index);
      }
      return Promise.resolve();
    },
    onSuccess: (_, index) => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        void invalidateTourAggregateCaches(queryClient, 'none');
      } else {
        onChange?.(shoppings.filter((_, i) => i !== index));
      }
      toast.success('Đã xóa mục mua sắm');
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: async ({ shopping, payment }: { shopping: Shopping; payment: Omit<CommissionPayment, 'id' | 'tourShoppingId'> }) => {
      if (!shopping.id) throw new Error('Chỉ thêm thanh toán sau khi mục mua sắm đã được lưu.');
      return store.addCommissionPayment({ ...payment, tourShoppingId: shopping.id });
    },
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        void invalidateTourAggregateCaches(queryClient, 'none');
      }
      setPaymentForm({
        amount: 0,
        paymentMethod: 'cash',
        paidAt: new Date().toISOString().split('T')[0],
        note: '',
      });
      toast.success('Đã thêm khoản nhận hoa hồng');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => store.deleteCommissionPayment(id),
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        void invalidateTourAggregateCaches(queryClient, 'none');
      }
      toast.success('Đã xóa khoản nhận hoa hồng');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const clearPaymentsMutation = useMutation({
    mutationFn: async (shopping: Shopping) => {
      const paymentIds = (shopping.payments || [])
        .map((payment) => payment.id)
        .filter((id): id is string => Boolean(id));
      await Promise.all(paymentIds.map((id) => store.deleteCommissionPayment(id)));
    },
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        void invalidateTourAggregateCaches(queryClient, 'none');
      }
      toast.success('Đã bỏ ghi nhận hoa hồng');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createShoppingMutation = useMutation({
    mutationFn: (name: string) => store.createShopping({ name, guideId }),
    onSuccess: (newShopping) => {
      queryClient.setQueryData<MasterShopping[]>(['shoppings', guideId ?? null], (current) => upsertById(current, newShopping));
      queryClient.invalidateQueries({ queryKey: ['shoppings', guideId ?? null] });
      toast.success('Đã tạo mục mua sắm');
      setShowNewShoppingDialog(false);
      setNewShoppingName('');
      // Auto-select the newly created shopping item
      setFormData({ ...formData, name: newShopping.name });
    },
    onError: (error: Error) => {
      toast.error(`Tạo mục mua sắm thất bại: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) {
      toast.error('Bạn không có quyền sửa mua sắm trong tour.');
      return;
    }

    // Validate required fields
    if (!formData.name || !formData.date) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    const shoppingToSave: Shopping = formReceiveFull && editingIndex === null
      ? {
          ...formData,
          payments: [
            {
              amount: getNetCommission(formData),
              paymentMethod: formCashPayment ? 'cash' : 'bank_transfer',
              paidAt: new Date().toISOString().split('T')[0],
              note: 'Nhận đủ',
            },
          ],
        }
      : formData;

    if (editingIndex !== null) {
      updateMutation.mutate({ index: editingIndex, shopping: shoppingToSave });
    } else {
      addMutation.mutate(shoppingToSave);
    }
  };

  const handleEdit = (index: number) => {
    if (readOnly) return;
    const shopping = shoppings[index];
    setEditingIndex(index);
    setFormData(shopping);
    setFormReceiveFull(isFullyReceived(shopping));
    setFormCashPayment((shopping.payments || [])[0]?.paymentMethod === 'cash');
    // Scroll to the form at the top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Open the combobox after a short delay to allow state to update
    setTimeout(() => {
      setOpenShopping(true);
    }, 100);
  };

  const handleDelete = (index: number) => {
    if (readOnly) return;
    if (confirm('Bạn có chắc chắn muốn xóa mục mua sắm này không?')) {
      deleteMutation.mutate(index);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setFormData({ name: '', price: 0, date: tour?.startDate || '' });
    setFormReceiveFull(false);
    setFormCashPayment(false);
  };

  const handleCreateNewShopping = () => {
    if (readOnly) return;
    if (!newShoppingName.trim()) {
      toast.error('Vui lòng nhập tên mục mua sắm');
      return;
    }
    createShoppingMutation.mutate(newShoppingName.trim());
  };

  const getQuickPaymentMethod = (shopping: Shopping, index: number): PaymentMethod => (
    quickCashByShopping[shopping.id || `index-${index}`] ? 'cash' : 'bank_transfer'
  );

  const handleAddPayment = (
    shopping: Shopping,
    amount: number,
    paymentPatch?: Partial<Omit<CommissionPayment, 'id' | 'tourShoppingId'>>,
  ) => {
    if (!shopping.id) {
      toast.error('Vui lòng lưu mục mua sắm trước khi thêm khoản nhận.');
      return;
    }

    const remaining = getPaymentRemaining(shopping);
    const paidAt = paymentPatch?.paidAt ?? paymentForm.paidAt;
    if (!amount || amount <= 0 || !paidAt) {
      toast.error('Vui lòng nhập số tiền và ngày nhận.');
      return;
    }
    if (amount > remaining) {
      toast.error('Số tiền nhận không được vượt quá số tiền còn lại.');
      return;
    }

    addPaymentMutation.mutate({
      shopping,
      payment: {
        ...paymentForm,
        ...paymentPatch,
        amount,
      },
    });
  };

  const handleQuickReceiveFull = (shopping: Shopping, index: number) => {
    handleAddPayment(shopping, getPaymentRemaining(shopping), {
      paymentMethod: getQuickPaymentMethod(shopping, index),
      paidAt: new Date().toISOString().split('T')[0],
      note: 'Nhận đủ',
    });
  };

  const handleClearPayments = (shopping: Shopping) => {
    if ((shopping.payments || []).length === 0) return false;
    if (!confirm('Bỏ tick sẽ xóa các khoản đã nhận của dòng này. Bạn có chắc chắn không?')) {
      return false;
    }
    clearPaymentsMutation.mutate(shopping);
    return true;
  };

  const totalGuests = tour ? tour.totalGuests : 1;
  const totalAmount = shoppings.reduce((sum, s) => sum + s.price, 0);
  const totalTip = shoppings.filter(s => s.name === 'TIP').reduce((sum, s) => sum + s.price, 0);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === REQUIRED_PIN) {
      setIsUnlocked(true);
      sessionStorage.setItem('shopping.unlocked', 'true');
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Mở khóa tab mua sắm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="pin" className="text-sm font-medium">
                  Nhập mã PIN (gợi ý: số điện thoại của bạn)
                </label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="Nhập mã PIN"
                  className={pinError ? 'border-red-500' : ''}
                  autoFocus
                />
                {pinError && (
                  <p className="text-sm text-red-500">PIN không đúng. Vui lòng thử lại.</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Mở khóa tab mua sắm
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Shopping Form */}
      {!readOnly && (
      <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4">
          {editingIndex !== null ? 'Chỉnh sửa mục mua sắm' : 'Thêm mục mua sắm'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Mục mua sắm *</label>
            <div className="flex gap-2">
              <Popover open={openShopping} onOpenChange={setOpenShopping}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="flex-1 justify-between"
                  >
                    {formData.name || "Chọn mục mua sắm..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Tìm mục mua sắm..." />
                    <CommandEmpty>Không tìm thấy mục mua sắm.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {shoppingItems.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={item.name}
                            onSelect={() => {
                              const nextPrice = item.price || formData.price;
                              const nextPitAmount = item.withholdsPit ? Math.round(nextPrice * (item.pitRate || 0)) : 0;
                              setFormData({
                                ...formData,
                                name: item.name,
                                price: nextPrice,
                                withholdsPit: item.withholdsPit,
                                pitRate: item.pitRate,
                                pitAmount: nextPitAmount,
                                netCommission: Math.max(0, nextPrice - nextPitAmount),
                              });
                              setOpenShopping(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.name === item.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {item.name}
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
                onClick={() => setShowNewShoppingDialog(true)}
                title="Thêm mục mua sắm mới"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Hoa hồng gộp *</label>
            <CurrencyInput
              value={formData.price}
              onChange={(value) => updateFormCommission({ price: value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-medium">
              <Checkbox
                checked={!!formData.withholdsPit}
                onCheckedChange={(checked) => updateFormCommission({ withholdsPit: checked === true })}
              />
              Trừ thuế TNCN
            </label>
            <div>
              <label className="text-sm font-medium mb-2 block">Tỷ lệ thuế (%)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                disabled={!formData.withholdsPit}
                value={formData.pitRate !== undefined ? formData.pitRate * 100 : ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : Number(e.target.value) / 100;
                  const pitAmount = formData.withholdsPit ? Math.round((formData.price || 0) * (value || 0)) : 0;
                  setFormData({
                    ...formData,
                    pitRate: value,
                    pitAmount,
                    netCommission: Math.max(0, (formData.price || 0) - pitAmount),
                  });
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tiền thuế</label>
              <CurrencyInput
                value={formData.pitAmount || 0}
                onChange={(value) => updateFormCommission({ pitAmount: value }, { manualPitAmount: true })}
              />
            </div>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
            Hoa hồng thực nhận: <span className="font-semibold">{formatCurrency(getNetCommission(formData))}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-medium">
              <Checkbox
                checked={formCashPayment}
                onCheckedChange={(checked) => setFormCashPayment(checked === true)}
              />
              Tiền mặt
            </label>
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-medium">
              <Checkbox
                checked={formReceiveFull}
                disabled={getNetCommission(formData) <= 0 || addPaymentMutation.isPending || clearPaymentsMutation.isPending}
                onCheckedChange={(checked) => {
                  const nextChecked = checked === true;
                  if (editingIndex !== null) {
                    const shopping = shoppings[editingIndex];
                    if (nextChecked) {
                      handleAddPayment(shopping, getPaymentRemaining(shopping), {
                        paymentMethod: formCashPayment ? 'cash' : 'bank_transfer',
                        paidAt: new Date().toISOString().split('T')[0],
                        note: 'Nhận đủ',
                      });
                      setFormReceiveFull(true);
                    } else if (handleClearPayments(shopping)) {
                      setFormReceiveFull(false);
                      setFormCashPayment(false);
                    }
                    return;
                  }
                  setFormReceiveFull(nextChecked);
                  if (!nextChecked) setFormCashPayment(false);
                }}
              />
              Nhận đủ
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Ngày *</label>
            <DateInput
              value={formData.date}
              onChange={(value) => setFormData({ ...formData, date: value })}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button type="submit">
            {editingIndex !== null ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Cập nhật
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Thêm
              </>
            )}
          </Button>
          {editingIndex !== null && (
            <Button type="button" variant="outline" onClick={handleCancel}>
              Hủy
            </Button>
          )}
        </div>
      </form>
      )}

      {/* Shoppings List */}
      <div className="rounded-lg border">
        <Table className="min-w-[1080px]">
          <TableHeader>
            <TableRow>
              <TableHead>
                <span className="sm:hidden">Mục</span>
                <span className="hidden sm:inline">Mục mua sắm</span>
              </TableHead>
              <TableHead>Giá</TableHead>
              <TableHead>Thuế</TableHead>
              <TableHead>Thực nhận</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Cảnh báo</TableHead>
              <TableHead>Tiền mặt</TableHead>
              <TableHead>Nhận đủ</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead className="w-[80px] sm:w-[100px]">
                <span className="sm:hidden">Tác</span>
                <span className="hidden sm:inline">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shoppings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  Chưa có mục mua sắm nào
                </TableCell>
              </TableRow>
            ) : (
              shoppings.map((shopping, index) => (
                <Fragment key={`shopping-${index}`}>
                <TableRow className={getCommissionRowClass(shopping)}>
                  <TableCell className="font-medium">
                    <TourRowLabel kind="shopping" label={shopping.name} />
                  </TableCell>
                  <TableCell className={shopping.price === 0 ? 'text-destructive font-semibold' : ''}>
                    {formatCurrency(shopping.price)}
                    {shopping.price === 0 && (
                      <span className="ml-2 text-destructive" title="Giá bằng 0">⚑</span>
                    )}
                  </TableCell>
                  <TableCell>{shopping.withholdsPit ? formatCurrency(shopping.pitAmount || 0) : '-'}</TableCell>
                  <TableCell>{formatCurrency(getNetCommission(shopping))}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto gap-2 px-2 py-1"
                      onClick={() => setExpandedPaymentIndex(expandedPaymentIndex === index ? null : index)}
                    >
                      <Badge variant={getCommissionBadgeVariant(shopping)}>{getCommissionStatusLabel(shopping)}</Badge>
                      <WalletCards className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    {getPaymentRemaining(shopping) > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950/60 dark:text-red-300">
                            <Flag className="h-3.5 w-3.5" />
                            Thiếu
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Thiếu thanh toán hoa hồng: còn lại {formatCurrency(getPaymentRemaining(shopping))}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!readOnly && (
                      <Checkbox
                        checked={!!quickCashByShopping[shopping.id || `index-${index}`]}
                        disabled={getPaymentRemaining(shopping) <= 0}
                        onCheckedChange={(checked) => {
                          const key = shopping.id || `index-${index}`;
                          setQuickCashByShopping((current) => ({
                            ...current,
                            [key]: checked === true,
                          }));
                        }}
                        aria-label="Chọn tiền mặt cho nhận nhanh"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {!readOnly && (
                      <Checkbox
                        checked={isFullyReceived(shopping)}
                        disabled={addPaymentMutation.isPending || clearPaymentsMutation.isPending}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            handleQuickReceiveFull(shopping, index);
                          } else {
                            handleClearPayments(shopping);
                          }
                        }}
                        aria-label="Nhận đủ hoa hồng"
                      />
                    )}
                  </TableCell>
                  <TableCell>{formatDate(shopping.date)}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleEdit(index)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(index)}
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
                        onClick={() => handleEdit(index)}
                        className="hover-scale"
                        title="Sửa"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(index)}
                        className="hover-scale text-destructive hover:text-destructive"
                        title="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    )}
                  </TableCell>
                </TableRow>
                {expandedPaymentIndex === index && (
                  <TableRow key={`payments-${index}`}>
                    <TableCell colSpan={10} className="bg-muted/30">
                      <div className="space-y-3 py-2">
                        <div className="grid gap-2 text-sm sm:grid-cols-3">
                          <div>Tổng đã nhận: <span className="font-semibold">{formatCurrency(getPaidTotal(shopping))}</span></div>
                          <div>Còn lại: <span className="font-semibold">{formatCurrency(getPaymentRemaining(shopping))}</span></div>
                          <div>Kỳ vọng: <span className="font-semibold">{formatCurrency(getNetCommission(shopping))}</span></div>
                        </div>
                        <div className="space-y-2">
                          {(shopping.payments || []).length === 0 ? (
                            <div className="text-sm text-muted-foreground">Chưa có khoản nhận nào</div>
                          ) : (
                            (shopping.payments || []).map((payment) => (
                              <div key={payment.id} className="flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm">
                                  <div className="font-medium">{formatCurrency(payment.amount)} · {paymentMethodLabels[payment.paymentMethod]}</div>
                                  <div className="text-muted-foreground">{formatDate(payment.paidAt)}{payment.note ? ` · ${payment.note}` : ''}</div>
                                </div>
                                {!readOnly && payment.id && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="self-start text-destructive hover:text-destructive sm:self-auto"
                                    onClick={() => deletePaymentMutation.mutate(payment.id!)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                        {!readOnly && (
                          <div className="grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-[minmax(160px,1fr)_160px_160px_minmax(160px,1fr)_auto_auto]">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Số tiền</Label>
                              <CurrencyInput
                                value={paymentForm.amount}
                                max={getPaymentRemaining(shopping)}
                                showQuickAmounts={false}
                                onChange={(value) => setPaymentForm({ ...paymentForm, amount: value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Hình thức</Label>
                              <Select
                                value={paymentForm.paymentMethod}
                                onValueChange={(value: PaymentMethod) => setPaymentForm({ ...paymentForm, paymentMethod: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">Tiền mặt</SelectItem>
                                  <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Ngày nhận</Label>
                              <Input
                                type="date"
                                value={paymentForm.paidAt}
                                onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Ghi chú</Label>
                              <Input
                                value={paymentForm.note || ''}
                                onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                                placeholder="Ghi chú"
                              />
                            </div>
                            <Button
                              type="button"
                              className="self-end whitespace-nowrap"
                              onClick={() => handleAddPayment(shopping, paymentForm.amount)}
                              disabled={addPaymentMutation.isPending || getPaymentRemaining(shopping) <= 0}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Thêm
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="self-end whitespace-nowrap"
                              onClick={() => handleAddPayment(shopping, getPaymentRemaining(shopping))}
                              disabled={addPaymentMutation.isPending || getPaymentRemaining(shopping) <= 0}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Nhận đủ
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
        {shoppings.length > 0 && (
          <div className="border-t p-4 bg-muted/50 space-y-2">
            <div className="flex justify-between items-center font-semibold">
              <span>Tổng giá trị mua sắm:</span>
              <span className="text-lg">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center font-semibold text-primary">
              <span>Tổng tiền tip:</span>
              <span className="text-lg">{formatCurrency(totalTip)}</span>
            </div>
          </div>
        )}
      </div>

      {/* New Shopping Item Dialog */}
      <Dialog open={showNewShoppingDialog} onOpenChange={setShowNewShoppingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm mục mua sắm mới</DialogTitle>
            <DialogDescription>
              Tạo mục mua sắm mới để thêm vào danh sách dùng chung.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-shopping-name">Tên mục mua sắm *</Label>
              <Input
                id="new-shopping-name"
                placeholder="ví dụ: TIP, Cửa hàng lưu niệm"
                value={newShoppingName}
                onChange={(e) => setNewShoppingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateNewShopping();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNewShoppingDialog(false);
                setNewShoppingName('');
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleCreateNewShopping}
              disabled={readOnly || createShoppingMutation.isPending}
            >
              {createShoppingMutation.isPending ? 'Đang tạo...' : 'Tạo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
