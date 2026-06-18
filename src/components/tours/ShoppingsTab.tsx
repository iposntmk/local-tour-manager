import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { CommissionPayment, PaymentMethod, Shopping, Tour } from '@/types/tour';
import { invalidateTourAggregateCaches } from '@/lib/query-cache';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingForm } from '@/components/tours/ShoppingForm';
import { ShoppingDesktopTable } from '@/components/tours/ShoppingDesktopTable';
import { FormCollapsible } from '@/components/tours/FormCollapsible';
import { NewShoppingDialog } from '@/components/tours/NewShoppingDialog';
import { ShoppingsMobileList } from '@/components/tours/mobile/ShoppingsMobileList';
import { getNetCommission, getPaymentRemaining, isFullyReceived } from '@/lib/shopping-commission-utils';
import { useShoppingCommissionMutations } from '@/hooks/useShoppingCommissionMutations';

const REQUIRED_PIN = '0829101188';
const DEFAULT_RECEIVE_FULL = true;

interface ShoppingsTabProps {
  tourId?: string;
  shoppings: Shopping[];
  onChange?: (shoppings: Shopping[]) => void;
  tour?: Tour | null;
  readOnly?: boolean;
}

export function ShoppingsTab({ tourId, shoppings, onChange, tour, readOnly = false }: ShoppingsTabProps) {
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem('shopping.unlocked') === 'true');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showNewShoppingDialog, setShowNewShoppingDialog] = useState(false);
  const [formReceiveFull, setFormReceiveFull] = useState(DEFAULT_RECEIVE_FULL);
  const [formCashPayment, setFormCashPayment] = useState(false);
  const [expandedPaymentIndex, setExpandedPaymentIndex] = useState<number | null>(null);
  const [quickCashByShopping, setQuickCashByShopping] = useState<Record<string, boolean>>({});
  const [paymentForm, setPaymentForm] = useState<Omit<CommissionPayment, 'id' | 'tourShoppingId'>>({
    amount: 0,
    paymentMethod: 'cash',
    paidAt: new Date().toISOString().split('T')[0],
    note: '',
  });
  const [formData, setFormData] = useState<Shopping>(() => ({
    name: '',
    price: 0,
    date: tour?.startDate || '',
  }));

  const queryClient = useQueryClient();
  const { isGuide, userProfile } = useAuth();
  const guideId = isGuide ? (userProfile?.id ?? undefined) : undefined;

  const { data: shoppingItems = [] } = useQuery({
    queryKey: ['shoppings', guideId ?? null],
    queryFn: () => store.listShoppings({ status: 'active', guideId }),
  });
  const { addPaymentMutation, deletePaymentMutation, clearPaymentsMutation } = useShoppingCommissionMutations(tourId);

  useEffect(() => {
    if (tour?.startDate) {
      setFormData((prev) => (prev.date ? prev : { ...prev, date: tour.startDate! }));
    }
  }, [tour?.startDate]);

  const addMutation = useMutation({
    mutationFn: async (shopping: Shopping) => {
      if (tourId) await store.addTourShopping(tourId, shopping);
      else onChange?.([...shoppings, shopping]);
    },
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        void invalidateTourAggregateCaches(queryClient, 'none');
      }
      toast.success('Đã thêm mục mua sắm');
      setFormData({ name: '', price: 0, date: tour?.startDate || '' });
      setFormReceiveFull(DEFAULT_RECEIVE_FULL);
      setFormCashPayment(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ index, shopping }: { index: number; shopping: Shopping }) => {
      if (tourId) await store.updateTourShopping(tourId, index, shopping);
      else {
        const updated = [...shoppings];
        updated[index] = shopping;
        onChange?.(updated);
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
    mutationFn: (index: number) =>
      tourId ? store.removeTourShopping(tourId, index) : Promise.resolve(),
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

  const handleAddPayment = (
    shopping: Shopping,
    amount: number,
    paymentPatch?: Partial<Omit<CommissionPayment, 'id' | 'tourShoppingId'>>,
  ) => {
    if (!shopping.id) { toast.error('Vui lòng lưu mục mua sắm trước khi thêm khoản nhận.'); return; }
    const remaining = getPaymentRemaining(shopping);
    const paidAt = paymentPatch?.paidAt ?? paymentForm.paidAt;
    if (!amount || amount <= 0 || !paidAt) { toast.error('Vui lòng nhập số tiền và ngày nhận.'); return; }
    if (amount > remaining) { toast.error('Số tiền nhận không được vượt quá số tiền còn lại.'); return; }
    addPaymentMutation.mutate(
      { shopping, payment: { ...paymentForm, ...paymentPatch, amount } },
      { onSuccess: () => setPaymentForm({ amount: 0, paymentMethod: 'cash', paidAt: new Date().toISOString().split('T')[0], note: '' }) }
    );
  };

  const handleClearPayments = (shopping: Shopping): boolean => {
    if ((shopping.payments || []).length === 0) return false;
    if (!confirm('Bỏ tick sẽ xóa các khoản đã nhận của dòng này. Bạn có chắc chắn không?')) return false;
    clearPaymentsMutation.mutate(shopping);
    return true;
  };

  const handleQuickReceiveFull = (shopping: Shopping, index: number) => {
    const method: PaymentMethod = quickCashByShopping[shopping.id || `index-${index}`] ? 'cash' : 'bank_transfer';
    handleAddPayment(shopping, getPaymentRemaining(shopping), {
      paymentMethod: method,
      paidAt: new Date().toISOString().split('T')[0],
      note: 'Nhận đủ',
    });
  };

  const handleFormReceiveFullChange = (checked: boolean) => {
    if (editingIndex !== null) {
      const shopping = shoppings[editingIndex];
      if (checked) {
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
    setFormReceiveFull(checked);
    if (!checked) setFormCashPayment(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) { toast.error('Bạn không có quyền sửa mua sắm trong tour.'); return; }
    if (!formData.name || !formData.date) { toast.error('Vui lòng điền đầy đủ các trường bắt buộc'); return; }
    const shouldCreateFullPayment = formReceiveFull && editingIndex === null && getNetCommission(formData) > 0;
    const shoppingToSave: Shopping = shouldCreateFullPayment
      ? {
          ...formData,
          payments: [{
            amount: getNetCommission(formData),
            paymentMethod: formCashPayment ? 'cash' : 'bank_transfer',
            paidAt: new Date().toISOString().split('T')[0],
            note: 'Nhận đủ',
          }],
        }
      : formData;
    if (editingIndex !== null) updateMutation.mutate({ index: editingIndex, shopping: shoppingToSave });
    else addMutation.mutate(shoppingToSave);
  };

  const handleEdit = (index: number) => {
    if (readOnly) return;
    const shopping = shoppings[index];
    setEditingIndex(index);
    setFormData(shopping);
    setFormReceiveFull(isFullyReceived(shopping));
    setFormCashPayment((shopping.payments || [])[0]?.paymentMethod === 'cash');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (index: number) => {
    if (readOnly) return;
    if (confirm('Bạn có chắc chắn muốn xóa mục mua sắm này không?')) deleteMutation.mutate(index);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setFormData({ name: '', price: 0, date: tour?.startDate || '' });
    setFormReceiveFull(DEFAULT_RECEIVE_FULL);
    setFormCashPayment(false);
  };

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

  const totalAmount = shoppings.reduce((sum, s) => sum + s.price, 0);
  const totalTip = shoppings.filter((s) => s.name === 'TIP').reduce((sum, s) => sum + s.price, 0);

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
                  onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
                  placeholder="Nhập mã PIN"
                  className={pinError ? 'border-red-500' : ''}
                  autoFocus
                />
                {pinError && <p className="text-sm text-red-500">PIN không đúng. Vui lòng thử lại.</p>}
              </div>
              <Button type="submit" className="w-full">Mở khóa tab mua sắm</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!readOnly && (
        <FormCollapsible autoOpenKey={editingIndex}>
          <ShoppingForm
            formData={formData}
            onChange={setFormData}
            editingIndex={editingIndex}
            tour={tour}
            shoppingItems={shoppingItems}
            formReceiveFull={formReceiveFull}
            formCashPayment={formCashPayment}
            onFormReceiveFullChange={handleFormReceiveFullChange}
            onFormCashPaymentChange={setFormCashPayment}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onOpenNewDialog={() => setShowNewShoppingDialog(true)}
            isPendingAdd={addPaymentMutation.isPending}
            isPendingClear={clearPaymentsMutation.isPending}
          />
        </FormCollapsible>
      )}

      <div className="rounded-lg border">
        <div className="hidden md:block overflow-x-auto">
          <ShoppingDesktopTable
            shoppings={shoppings}
            readOnly={readOnly}
            expandedPaymentIndex={expandedPaymentIndex}
            onSetExpandedPaymentIndex={setExpandedPaymentIndex}
            quickCashByShopping={quickCashByShopping}
            onSetQuickCashByShopping={setQuickCashByShopping}
            paymentForm={paymentForm}
            onPaymentFormChange={setPaymentForm}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddPayment={handleAddPayment}
            onDeletePayment={(id) => deletePaymentMutation.mutate(id)}
            onClearPayments={handleClearPayments}
            onQuickReceiveFull={handleQuickReceiveFull}
            isPendingAdd={addPaymentMutation.isPending}
            isPendingClear={clearPaymentsMutation.isPending}
            totalAmount={totalAmount}
            totalTip={totalTip}
          />
        </div>
        <div className="md:hidden">
          <ShoppingsMobileList
            shoppings={shoppings}
            readOnly={readOnly}
            isPendingAdd={addPaymentMutation.isPending}
            isPendingClear={clearPaymentsMutation.isPending}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddPayment={handleAddPayment}
            onDeletePayment={(id) => deletePaymentMutation.mutate(id)}
            onClearPayments={handleClearPayments}
            totalAmount={totalAmount}
            totalTip={totalTip}
          />
        </div>
      </div>

      <NewShoppingDialog
        open={showNewShoppingDialog}
        onOpenChange={setShowNewShoppingDialog}
        readOnly={readOnly}
        guideId={guideId}
        onCreated={(shopping) => setFormData((prev) => ({ ...prev, name: shopping.name }))}
      />
    </div>
  );
}
