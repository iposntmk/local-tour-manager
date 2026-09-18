import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import type { Expense, Tour } from '@/types/tour';
import { invalidateTourAggregateCaches } from '@/lib/query-cache';
import { getLineTotal, hasLineAttachments, isVatAmountValid } from '@/lib/tour-line-utils';
import { isWaterExpense, normalizeWaterExpenseLine } from '@/lib/water-expense-utils';
import { usePendingLineAttachments } from '@/hooks/usePendingLineAttachments';
import { useLineFormPersistence } from '@/hooks/useLineFormPersistence';
import { useTourLineAutosave } from '@/hooks/useTourLineAutosave';
import { useTourLineMutations } from '@/hooks/useTourLineMutations';
import { useApplyTourLineDefaults, useTourLineFallback } from '@/hooks/useTourLineDefaults';
import { useAuth } from '@/contexts/AuthContext';
import { ExpenseForm } from '@/components/tours/ExpenseForm';
import { NewExpenseDialog } from '@/components/tours/NewExpenseDialog';
import { ExpensesDesktopTable } from '@/components/tours/ExpensesDesktopTable';
import { ExpensesMobileList } from '@/components/tours/mobile/ExpensesMobileList';
import { TourLineTabLayout } from '@/components/tours/TourLineTabLayout';
import {
  canEditAnyTourLineField,
  canEditTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

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
  const [showNewExpenseDialog, setShowNewExpenseDialog] = useState(false);
  const queryClient = useQueryClient();
  const { pendingFiles, setPendingFiles, clearPendingFiles, uploadPendingFiles } = usePendingLineAttachments(tourId, 'expense');
  const { isGuide, userProfile } = useAuth();
  const guideId = isGuide ? (userProfile?.id ?? undefined) : undefined;
  const canEditLine = canEditAnyTourLineField(lineFieldAccess);
  const canCreateLine =
    canEditTourLineField(lineFieldAccess, 'name') &&
    canEditTourLineField(lineFieldAccess, 'date') &&
    canEditTourLineField(lineFieldAccess, 'price');
  const tourGuests = tour?.totalGuests || 0;
  const tourDays = tour?.totalDays || 1;
  const normalizeExpense = (expense: Expense) => normalizeWaterExpenseLine(expense, tourGuests, tourDays);
  const fallbackExpense = useTourLineFallback<Expense>(tour, 'endDate');
  const { formData, setFormData, editingIndex, setEditingIndex, resetForm } = useLineFormPersistence<Expense>({
    storageKey: `expenses:${tourId || 'new'}`,
    fallback: fallbackExpense,
  });
  useApplyTourLineDefaults({ fallback: fallbackExpense, editingIndex, setFormData });

  const { data: detailedExpenses = [] } = useQuery({
    queryKey: ['detailedExpenses', guideId ?? null],
    queryFn: () => store.listDetailedExpenses({ status: 'active', guideId }),
  });

  const { addMutation, updateMutation, deleteMutation } = useTourLineMutations<Expense>({
    tourId,
    collection: 'expenses',
    lineType: 'expense',
    items: expenses,
    onChange,
    addLine: (expense) => store.addExpense(tourId!, expense),
    updateLine: (index, expense) => store.updateExpense(tourId!, index, expense),
    removeLine: (index, expense) => store.removeExpense(tourId!, index, expense?.id),
    uploadPendingFiles,
    onOptimisticSubmit: resetForm,
    onRestoreForm: (expense) => setFormData(expense),
    onSettledForm: clearPendingFiles,
    messages: { added: 'Đã thêm chi phí', updated: 'Đã cập nhật chi phí', deleted: 'Đã xóa chi phí' },
  });

  const autosaveExpense = useTourLineAutosave<Expense>({
    tourId,
    collection: 'expenses',
    items: expenses,
    onChange,
    saveLine: (index, expense) => store.updateExpense(tourId!, index, expense),
    successMessage: 'Đã tự động lưu chi phí',
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
    setFormData(normalizeExpense(expenses[index]));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    clearPendingFiles();
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) { toast.error('Bạn không có quyền sửa chi phí trong tour.'); return; }
    if (editingIndex === null && !canCreateLine) { toast.error('Bạn không có quyền thêm dòng chi phí.'); return; }
    if (editingIndex !== null && !canEditLine) { toast.error('Bạn không có quyền sửa trường trong dòng chi phí.'); return; }
    if (!formData.name || !formData.date) { toast.error('Vui lòng điền đầy đủ các trường bắt buộc'); return; }
    const nextExpense = normalizeExpense(formData);
    if (!isVatAmountValid(nextExpense, tourGuests)) { toast.error('Tiền VAT không được vượt quá thành tiền.'); return; }
    if ((nextExpense.vatRate || 0) > 0 && !hasLineAttachments(nextExpense, pendingFiles)) {
      toast.warning('VAT lớn hơn 0 nhưng chưa có chứng từ.');
    }
    if (editingIndex !== null) {
      updateMutation.mutate({ index: editingIndex, line: nextExpense });
    } else {
      addMutation.mutate(nextExpense);
    }
  };

  const handleDuplicate = (index: number) => {
    if (readOnly || !canCreateLine) return;
    addMutation.mutate(normalizeExpense(expenses[index]));
  };

  const handleGuestsChange = (originalIndex: number, val: number | undefined) => {
    if (readOnly || !canEditTourLineField(lineFieldAccess, 'quantity')) return;
    const current = expenses[originalIndex];
    if (isWaterExpense(current)) {
      autosaveExpense(originalIndex, normalizeExpense(current));
      return;
    }
    if (val !== undefined && val > tourGuests) {
      toast.error(`Số khách không được vượt quá tổng khách (${tourGuests})`);
      return;
    }
    if (val !== undefined && val < 0) {
      toast.error('Số khách không thể âm');
      return;
    }
    const updatedExpense = { ...expenses[originalIndex], guests: val };
    autosaveExpense(originalIndex, updatedExpense as Expense);
  };

  const handleWaterDaysChange = (originalIndex: number, val: number | undefined) => {
    if (readOnly || !canEditTourLineField(lineFieldAccess, 'quantity')) return;
    if (val !== undefined && val < 0) {
      toast.error('Số ngày không thể âm');
      return;
    }
    const updated = normalizeExpense({ ...expenses[originalIndex], days: val ?? 0 });
    autosaveExpense(originalIndex, updated);
  };

  useEffect(() => {
    if (editingIndex === null) return;
    const latest = expenses[editingIndex];
    if (!latest || latest.id !== formData.id) return;
    const latestKey = (latest.attachments || []).map((item) => item.id).join('|');
    const formKey = (formData.attachments || []).map((item) => item.id).join('|');
    if (latestKey !== formKey) setFormData((prev) => ({ ...prev, attachments: latest.attachments || [] }));
  }, [editingIndex, expenses, formData.attachments, formData.id, setFormData]);

  const displayExpenses = useMemo(() => expenses.map((expense, i) => ({
      ...normalizeWaterExpenseLine(expense, tourGuests, tourDays),
      originalIndex: i,
    })).sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : Infinity;
      const db = b.date ? new Date(b.date).getTime() : Infinity;
      return da - db;
    }), [expenses, tourGuests, tourDays]);

  const expensesTotalAmount = useMemo(
    () => expenses.reduce(
      (sum, exp) => sum + getLineTotal(normalizeWaterExpenseLine(exp, tourGuests, tourDays), tourGuests),
      0,
    ),
    [expenses, tourGuests, tourDays]
  );

  const hasWaterExpense = expenses.some(isWaterExpense);
  const isDismissed = tour?.waterExpenseDismissed === true;
  const showWaterWarning = tourId && !hasWaterExpense && !isDismissed;

  useEffect(() => {
    if (editRequest && editRequest.index >= 0 && editRequest.index < expenses.length) {
      handleEdit(editRequest.index);
    }
  }, [editRequest?.key]);

  return (
    <>
      <TourLineTabLayout
        beforeList={showWaterWarning && (
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
        formVisible={!readOnly && canEditLine}
        autoOpenKey={editingIndex}
        form={
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
        }
        title="Danh sách chi phí"
        emptyMessage="Chưa có chi phí nào"
        itemCount={expenses.length}
        desktop={
          <ExpensesDesktopTable
            displayExpenses={displayExpenses}
            readOnly={readOnly}
            lineFieldAccess={lineFieldAccess}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={(idx) => deleteMutation.mutate(idx)}
            onGuestsChange={handleGuestsChange}
            onWaterDaysChange={handleWaterDaysChange}
            totalAmount={expensesTotalAmount}
            tourGuests={tourGuests}
            tourDays={tourDays}
          />
        }
        mobile={
          <ExpensesMobileList
            items={displayExpenses}
            readOnly={readOnly}
            lineFieldAccess={lineFieldAccess}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={(idx) => deleteMutation.mutate(idx)}
            onGuestsChange={handleGuestsChange}
            onWaterDaysChange={handleWaterDaysChange}
            totalAmount={expensesTotalAmount}
            tourGuests={tourGuests}
            tourDays={tourDays}
          />
        }
      />

      <NewExpenseDialog
        open={showNewExpenseDialog}
        onOpenChange={setShowNewExpenseDialog}
        readOnly={readOnly || !canEditTourLineField(lineFieldAccess, 'name') || !canEditTourLineField(lineFieldAccess, 'price')}
        guideId={guideId}
        onCreated={(exp) => setFormData((prev) => ({ ...prev, name: exp.name, price: exp.price }))}
      />
    </>
  );
}
