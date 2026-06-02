import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import type { Expense, Tour } from '@/types/tour';
import { invalidateTourAggregateCaches } from '@/lib/query-cache';
import { hasLineAttachments, isVatAmountValid } from '@/lib/tour-line-utils';
import { usePendingLineAttachments } from '@/hooks/usePendingLineAttachments';
import { useAuth } from '@/contexts/AuthContext';
import { ExpenseForm } from '@/components/tours/ExpenseForm';
import { NewExpenseDialog } from '@/components/tours/NewExpenseDialog';
import { ExpensesDesktopTable } from '@/components/tours/ExpensesDesktopTable';
import { ExpensesMobileList } from '@/components/tours/mobile/ExpensesMobileList';
import {
  canEditAnyTourLineField,
  canEditTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

const WATER_EXPENSE_NAMES = [
  'Nước uống cho khách 15k/1 khách / 1 ngày',
  'Nước uống cho khách 10k/1 khách / 1 ngày',
];

interface ExpensesTabProps {
  tourId?: string;
  expenses: Expense[];
  onChange?: (expenses: Expense[]) => void;
  tour?: Tour | null;
  readOnly?: boolean;
  editRequest?: { index: number; key: number };
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
}

export function ExpensesTab({ tourId, expenses, onChange, tour, readOnly = false, editRequest, lineFieldAccess }: ExpensesTabProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Expense>({ name: '', price: 0, date: '' });
  const [showNewExpenseDialog, setShowNewExpenseDialog] = useState(false);
  const queryClient = useQueryClient();
  const { pendingFiles, setPendingFiles, clearPendingFiles, uploadPendingFiles } = usePendingLineAttachments(tourId);
  const { isGuide, userProfile } = useAuth();
  const guideId = isGuide ? (userProfile?.id ?? undefined) : undefined;
  const canEditLine = canEditAnyTourLineField(lineFieldAccess);
  const canCreateLine =
    canEditTourLineField(lineFieldAccess, 'name') &&
    canEditTourLineField(lineFieldAccess, 'date') &&
    canEditTourLineField(lineFieldAccess, 'price');

  const { data: detailedExpenses = [] } = useQuery({
    queryKey: ['detailedExpenses', guideId ?? null],
    queryFn: () => store.listDetailedExpenses({ status: 'active', guideId }),
  });

  const addMutation = useMutation({
    mutationFn: async (expense: Expense) => {
      if (tourId) {
        return store.addExpense(tourId, expense);
      } else {
        onChange?.([...expenses, expense]);
        return undefined;
      }
    },
    onSuccess: async (lineId) => {
      await uploadPendingFiles('expense', lineId);
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        void invalidateTourAggregateCaches(queryClient, 'none');
      }
      toast.success('Đã thêm chi phí');
      clearPendingFiles();
      setFormData({ name: '', price: 0, date: tour?.endDate || '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ index, expense }: { index: number; expense: Expense }) => {
      if (tourId) {
        await store.updateExpense(tourId, index, expense);
      } else {
        const newExps = [...expenses];
        newExps[index] = expense;
        onChange?.(newExps);
      }
    },
    onSuccess: async (_, { expense }) => {
      await uploadPendingFiles('expense', expense.id);
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        void invalidateTourAggregateCaches(queryClient, 'none');
      }
      toast.success('Đã cập nhật chi phí');
      clearPendingFiles();
      setEditingIndex(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => {
      if (tourId) return store.removeExpense(tourId, index);
      return Promise.resolve();
    },
    onSuccess: (_, index) => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        void invalidateTourAggregateCaches(queryClient, 'none');
      } else {
        onChange?.(expenses.filter((_, i) => i !== index));
      }
      toast.success('Đã xóa chi phí');
    },
  });

  const dismissWaterMutation = useMutation({
    mutationFn: async () => {
      if (tourId) await store.updateTour(tourId, { waterExpenseDismissed: true });
    },
    onSuccess: () => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        void invalidateTourAggregateCaches(queryClient, 'none');
      }
      toast.success('Đã tắt cảnh báo nước uống cho tour này');
    },
  });

  const handleEdit = (index: number) => {
    if (readOnly || !canEditLine) return;
    clearPendingFiles();
    setEditingIndex(index);
    setFormData(expenses[index]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingIndex(null);
    clearPendingFiles();
    setFormData({ name: '', price: 0, date: tour?.endDate || '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) { toast.error('Bạn không có quyền sửa chi phí trong tour.'); return; }
    if (editingIndex === null && !canCreateLine) { toast.error('Bạn không có quyền thêm dòng chi phí.'); return; }
    if (editingIndex !== null && !canEditLine) { toast.error('Bạn không có quyền sửa trường trong dòng chi phí.'); return; }
    if (!formData.name || !formData.date) { toast.error('Vui lòng điền đầy đủ các trường bắt buộc'); return; }
    if (!isVatAmountValid(formData, tour?.totalGuests || 0)) { toast.error('Tiền VAT không được vượt quá thành tiền.'); return; }
    if ((formData.vatRate || 0) > 0 && !hasLineAttachments(formData, pendingFiles)) {
      toast.warning('VAT lớn hơn 0 nhưng chưa có chứng từ.');
    }
    if (editingIndex !== null) {
      updateMutation.mutate({ index: editingIndex, expense: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  const handleDuplicate = (index: number) => {
    if (readOnly || !canCreateLine) return;
    addMutation.mutate(expenses[index]);
  };

  const handleGuestsChange = (originalIndex: number, val: number | undefined) => {
    if (readOnly || !canEditTourLineField(lineFieldAccess, 'quantity')) return;
    const totalGuests = tour?.totalGuests || 0;
    if (val !== undefined && val > totalGuests) {
      toast.error(`Số khách không được vượt quá tổng khách (${totalGuests})`);
      return;
    }
    if (val !== undefined && val < 0) {
      toast.error('Số khách không thể âm');
      return;
    }
    const updatedExpense = { ...expenses[originalIndex], guests: val };
    updateMutation.mutate({ index: originalIndex, expense: updatedExpense as Expense });
  };

  const handleMobileGuestsChange = (originalIndex: number, val: number | undefined) => {
    if (readOnly || !canEditTourLineField(lineFieldAccess, 'quantity')) return;
    const updated = { ...expenses[originalIndex], guests: val };
    if (tourId) {
      updateMutation.mutate({ index: originalIndex, expense: updated as Expense });
    } else {
      const newExps = [...expenses];
      newExps[originalIndex] = updated as Expense;
      onChange?.(newExps);
    }
  };

  // Default guests for new rows
  if (editingIndex === null && formData.guests === undefined && (tour?.totalGuests || 0) > 0) {
    formData.guests = tour!.totalGuests;
  }

  const displayExpenses = useMemo(() => {
    const withIndex = expenses.map((e, i) => ({ ...e, originalIndex: i }));
    const toMergeByName = WATER_EXPENSE_NAMES.map((name) => ({
      name,
      rows: withIndex.filter((e) => (e.name || '') === name),
    }));
    const others = withIndex.filter((e) => !WATER_EXPENSE_NAMES.includes(e.name || ''));
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
          originalIndices: group.rows.map((e) => e.originalIndex),
          merged: true,
        });
      }
    }
    return [...others, ...mergedBlock].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : Infinity;
      const db = b.date ? new Date(b.date).getTime() : Infinity;
      return da - db;
    });
  }, [expenses]);

  const expensesTotalAmount = useMemo(
    () => expenses.reduce((sum, exp) => {
      const g = typeof exp.guests === 'number' ? exp.guests : 0;
      return sum + exp.price * g;
    }, 0),
    [expenses]
  );

  const hasWaterExpense = expenses.some((exp) => WATER_EXPENSE_NAMES.includes(exp.name || ''));
  const isDismissed = tour?.waterExpenseDismissed === true;
  const showWaterWarning = tourId && !hasWaterExpense && !isDismissed;

  useEffect(() => {
    if (editRequest && editRequest.index >= 0 && editRequest.index < expenses.length) {
      handleEdit(editRequest.index);
    }
  }, [editRequest?.key]);

  return (
    <div className="space-y-6">
      {showWaterWarning && (
        <div className="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Thiếu chi phí nước uống</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Tour này chưa có dòng "Nước uống cho khách 10k/1 khách / 1 ngày". Vui lòng thêm chi phí này.
              </p>
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <Checkbox checked={false} onCheckedChange={() => !readOnly && dismissWaterMutation.mutate()} disabled={readOnly} />
                <span className="text-sm text-yellow-700 dark:text-yellow-300">
                  Tour này không bao gồm chi phí nước uống (bỏ qua cảnh báo)
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {!readOnly && canEditLine && (
        <ExpenseForm
          formData={formData}
          onChange={setFormData}
          editingIndex={editingIndex}
          tour={tour}
          detailedExpenses={detailedExpenses}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onOpenNewDialog={() => setShowNewExpenseDialog(true)}
          tourId={tourId}
          pendingFiles={pendingFiles}
          onPendingFilesChange={setPendingFiles}
          lineFieldAccess={lineFieldAccess}
        />
      )}

      <div className="rounded-lg border">
        <div className="p-4 border-b bg-muted/50">
          <h3 className="font-semibold">Danh sách chi phí</h3>
        </div>
        {expenses.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Chưa có chi phí nào</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <ExpensesDesktopTable
                displayExpenses={displayExpenses}
                readOnly={readOnly}
                lineFieldAccess={lineFieldAccess}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={(idx) => deleteMutation.mutate(idx)}
                onGuestsChange={handleGuestsChange}
                totalAmount={expensesTotalAmount}
              />
            </div>
            <div className="md:hidden">
              <ExpensesMobileList
                items={displayExpenses}
                readOnly={readOnly}
                lineFieldAccess={lineFieldAccess}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={(idx) => deleteMutation.mutate(idx)}
                onGuestsChange={handleMobileGuestsChange}
                totalAmount={expensesTotalAmount}
              />
            </div>
          </>
        )}
      </div>

      <NewExpenseDialog
        open={showNewExpenseDialog}
        onOpenChange={setShowNewExpenseDialog}
        readOnly={readOnly || !canEditTourLineField(lineFieldAccess, 'name') || !canEditTourLineField(lineFieldAccess, 'price')}
        guideId={guideId}
        onCreated={(exp) => setFormData((prev) => ({ ...prev, name: exp.name, price: exp.price }))}
      />
    </div>
  );
}
