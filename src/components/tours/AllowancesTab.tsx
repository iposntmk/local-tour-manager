import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { toast } from 'sonner';
import type { Allowance, Tour } from '@/types/tour';
import { useTourLineMutations } from '@/hooks/useTourLineMutations';
import { useQuickAddLines } from '@/hooks/useQuickAddLines';
import { toCategorizedQuickAddSources } from '@/lib/quick-add-utils';
import { useAuth } from '@/contexts/AuthContext';
import { AllowanceForm } from '@/components/tours/AllowanceForm';
import { NewAllowanceDialog, ALLOWANCE_CATEGORY_IDS } from '@/components/tours/NewAllowanceDialog';
import { AllowancesDesktopTable } from '@/components/tours/AllowancesDesktopTable';
import { AllowancesMobileList } from '@/components/tours/mobile/AllowancesMobileList';
import { TourLineTabLayout } from '@/components/tours/TourLineTabLayout';
import { QuickAddChecklist } from '@/components/tours/QuickAddChecklist';
import {
  canEditAnyTourLineField,
  canEditTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

interface AllowancesTabProps {
  tourId?: string;
  allowances: Allowance[];
  onChange?: (allowances: Allowance[]) => void;
  tour?: Tour | null;
  readOnly?: boolean;
  editRequest?: { index: number; key: number };
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
}

export function AllowancesTab({ tourId, allowances, onChange, tour, readOnly = false, editRequest, lineFieldAccess }: AllowancesTabProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Allowance>({ date: '', name: '', price: 0, quantity: 1 });
  const [showNewAllowanceDialog, setShowNewAllowanceDialog] = useState(false);
  const { isGuide, userProfile } = useAuth();
  const guideId = isGuide ? (userProfile?.id ?? undefined) : undefined;
  const canEditLine = canEditAnyTourLineField(lineFieldAccess, ['name', 'price', 'date', 'quantity']);
  const canCreateLine =
    canEditTourLineField(lineFieldAccess, 'name') &&
    canEditTourLineField(lineFieldAccess, 'date') &&
    canEditTourLineField(lineFieldAccess, 'price');

  const { data: allDetailedExpenses = [] } = useQuery({
    queryKey: ['detailedExpenses', guideId ?? null],
    queryFn: () => store.listDetailedExpenses({ status: 'active', guideId }),
  });

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['expenseCategories', guideId ?? null],
    queryFn: () => store.listExpenseCategories({ status: 'active', guideId }),
  });

  const detailedExpenses = useMemo(
    () => allDetailedExpenses.filter(
      (exp) => exp.categoryRef?.id && ALLOWANCE_CATEGORY_IDS.includes(exp.categoryRef.id)
    ),
    [allDetailedExpenses]
  );

  const quickAddSources = useMemo(() => toCategorizedQuickAddSources(detailedExpenses), [detailedExpenses]);

  const allowanceCategories = expenseCategories.filter((c) => ALLOWANCE_CATEGORY_IDS.includes(c.id));

  const nameToCategoryId = useMemo(() => {
    const map = new Map<string, string>();
    for (const exp of allDetailedExpenses) {
      if (exp.categoryRef?.id) map.set(exp.name, exp.categoryRef.id);
    }
    return map;
  }, [allDetailedExpenses]);

  const getCategoryPriority = (allowance: Allowance): number => {
    const id = allowance.categoryId ?? nameToCategoryId.get(allowance.name);
    if (!id) return Number.POSITIVE_INFINITY;
    const idx = ALLOWANCE_CATEGORY_IDS.indexOf(id);
    return idx === -1 ? Number.POSITIVE_INFINITY : idx;
  };

  const resetForm = () => {
    setEditingIndex(null);
    setFormData({ date: tour?.startDate || '', name: '', price: 0, quantity: 1 });
  };

  const { addMutation, quickAddMutation, updateMutation, deleteMutation } = useTourLineMutations<Allowance>({
    tourId,
    collection: 'allowances',
    items: allowances,
    onChange,
    addLine: (allowance) => store.addAllowance(tourId!, allowance),
    updateLine: (index, allowance) => store.updateAllowance(tourId!, index, allowance),
    removeLine: (index, allowance) => store.removeAllowance(tourId!, index, allowance?.id),
    onOptimisticSubmit: resetForm,
    onRestoreForm: (allowance) => setFormData(allowance),
    messages: { added: 'Đã thêm CTP', updated: 'Đã cập nhật CTP', deleted: 'Đã xóa CTP' },
  });

  const quickAdd = useQuickAddLines<Allowance>({
    lineType: 'allowance',
    enabled: !readOnly && canCreateLine,
    sources: quickAddSources,
    lines: allowances,
    buildLine: (source) => ({
      date: tour?.startDate || '',
      name: source.name,
      price: source.price,
      quantity: 1,
      categoryId: source.categoryId,
    }),
    onAdd: (allowance) => quickAddMutation.mutate(allowance),
    onRemove: (index) => deleteMutation.mutate(index),
  });

  const handleEdit = (index: number) => {
    if (readOnly || !canEditLine) return;
    setEditingIndex(index);
    setFormData(allowances[index]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = resetForm;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) { toast.error('Bạn không có quyền sửa CTP trong tour.'); return; }
    if (editingIndex === null && !canCreateLine) { toast.error('Bạn không có quyền thêm dòng CTP.'); return; }
    if (editingIndex !== null && !canEditLine) { toast.error('Bạn không có quyền sửa trường trong dòng CTP.'); return; }
    if (!formData.name || !formData.date) { toast.error('Vui lòng điền đầy đủ các trường bắt buộc'); return; }
    if (editingIndex !== null) {
      updateMutation.mutate({ index: editingIndex, line: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  const handleCopy = (index: number) => {
    if (readOnly || !canCreateLine) return;
    addMutation.mutate({ ...allowances[index] });
  };

  useEffect(() => {
    if (!formData.date && tour?.startDate) {
      setFormData((prev) => ({ ...prev, date: tour.startDate! }));
    }
  }, [tour?.startDate]);

  useEffect(() => {
    if (!editRequest || readOnly) return;
    if (editRequest.index >= 0 && editRequest.index < allowances.length) {
      handleEdit(editRequest.index);
    }
  }, [editRequest?.key]);

  const sortedAllowancesWithSeparator = useMemo(() => {
    const sorted = allowances
      .map((a, i) => ({ ...a, originalIndex: i }))
      .sort((a, b) => {
        const pa = getCategoryPriority(a);
        const pb = getCategoryPriority(b);
        if (pa !== pb) return pa - pb;
        const da = a.date ? new Date(a.date).getTime() : Infinity;
        const db = b.date ? new Date(b.date).getTime() : Infinity;
        return da - db;
      });
    return sorted.map((allowance, rowIndex, arr) => ({
      ...allowance,
      showSeparator: rowIndex > 0 && getCategoryPriority(arr[rowIndex - 1]) !== getCategoryPriority(allowance),
    }));
  }, [allowances, nameToCategoryId]);

  const allowancesTotalAmount = useMemo(
    () => allowances.reduce((sum, a) => sum + a.price * (a.quantity || 1), 0),
    [allowances]
  );

  const allowancesTotalQuantity = useMemo(
    () => allowances.reduce((sum, a) => sum + (a.quantity || 1), 0),
    [allowances]
  );

  return (
    <>
      <TourLineTabLayout
        formVisible={!readOnly && canEditLine}
        autoOpenKey={editingIndex}
        form={
          <AllowanceForm
            formData={formData}
            onChange={setFormData}
            editingIndex={editingIndex}
            tour={tour}
            detailedExpenses={detailedExpenses}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onOpenNewDialog={() => {
              setShowNewAllowanceDialog(true);
            }}
            lineFieldAccess={lineFieldAccess}
          />
        }
        quickAdd={<QuickAddChecklist title="CTP thông dụng" quickAdd={quickAdd} groupOrder="usage" viewStorageKey="quickAdd.view.allowances" />}
        title="Danh sách CTP"
        emptyMessage="Chưa có phụ cấp nào"
        itemCount={allowances.length}
        desktop={
          <AllowancesDesktopTable
            allowances={allowances}
            getCategoryPriority={getCategoryPriority}
            readOnly={readOnly}
            lineFieldAccess={lineFieldAccess}
            onEdit={handleEdit}
            onCopy={handleCopy}
            onDelete={(idx) => deleteMutation.mutate(idx)}
            totalAmount={allowancesTotalAmount}
            totalQuantity={allowancesTotalQuantity}
          />
        }
        mobile={
          <AllowancesMobileList
            items={sortedAllowancesWithSeparator}
            readOnly={readOnly}
            lineFieldAccess={lineFieldAccess}
            onEdit={handleEdit}
            onCopy={handleCopy}
            onDelete={(idx) => deleteMutation.mutate(idx)}
            totalAmount={allowancesTotalAmount}
            totalQuantity={allowancesTotalQuantity}
          />
        }
      />

      <NewAllowanceDialog
        open={showNewAllowanceDialog}
        onOpenChange={setShowNewAllowanceDialog}
        readOnly={readOnly || !canEditTourLineField(lineFieldAccess, 'name') || !canEditTourLineField(lineFieldAccess, 'price')}
        guideId={guideId}
        defaultCategoryId={allowanceCategories[0]?.id}
        onCreated={(exp) => {
          const today = new Date().toISOString().split('T')[0];
          setFormData((prev) => ({
            ...prev,
            name: exp.name,
            price: exp.price,
            date: prev.date || tour?.startDate || today,
            quantity: prev.quantity || 1,
            categoryId: exp.categoryId,
          }));
        }}
      />
    </>
  );
}
