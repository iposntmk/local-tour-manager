import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { toast } from 'sonner';
import type { Allowance, Tour } from '@/types/tour';
import { invalidateTourAggregateCaches, upsertById } from '@/lib/query-cache';
import type { DetailedExpense } from '@/types/master';
import { useAuth } from '@/contexts/AuthContext';
import { AllowanceForm } from '@/components/tours/AllowanceForm';
import { NewAllowanceDialog, ALLOWANCE_CATEGORY_IDS } from '@/components/tours/NewAllowanceDialog';
import { FormCollapsible } from '@/components/tours/FormCollapsible';
import { AllowancesDesktopTable } from '@/components/tours/AllowancesDesktopTable';
import { AllowancesMobileList } from '@/components/tours/mobile/AllowancesMobileList';
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
  const queryClient = useQueryClient();
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

  const detailedExpenses = allDetailedExpenses.filter(
    (exp) => exp.categoryRef?.id && ALLOWANCE_CATEGORY_IDS.includes(exp.categoryRef.id)
  );

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
    onError: (error) => toast.error('Thêm CTP thất bại: ' + (error instanceof Error ? error.message : 'lỗi không xác định')),
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
      if (tourId) return store.removeAllowance(tourId, index);
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

  const handleEdit = (index: number) => {
    if (readOnly || !canEditLine) return;
    setEditingIndex(index);
    setFormData(allowances[index]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setFormData({ date: tour?.startDate || '', name: '', price: 0, quantity: 1 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) { toast.error('Bạn không có quyền sửa CTP trong tour.'); return; }
    if (editingIndex === null && !canCreateLine) { toast.error('Bạn không có quyền thêm dòng CTP.'); return; }
    if (editingIndex !== null && !canEditLine) { toast.error('Bạn không có quyền sửa trường trong dòng CTP.'); return; }
    if (!formData.name || !formData.date) { toast.error('Vui lòng điền đầy đủ các trường bắt buộc'); return; }
    if (editingIndex !== null) {
      updateMutation.mutate({ index: editingIndex, allowance: formData });
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
    <div className="space-y-6">
      {!readOnly && canEditLine && (
        <FormCollapsible autoOpenKey={editingIndex}>
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
        </FormCollapsible>
      )}

      <div className="rounded-lg border">
        <div className="p-4 border-b bg-muted/50">
          <h3 className="font-semibold">Danh sách CTP</h3>
        </div>
        {allowances.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Chưa có phụ cấp nào</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
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
            </div>
            <div className="md:hidden">
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
            </div>
          </>
        )}
      </div>

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
    </div>
  );
}
