import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { toast } from 'sonner';
import { invalidateTourAggregateCaches, upsertById } from '@/lib/query-cache';
import { hasLineAttachments, isVatAmountValid } from '@/lib/tour-line-utils';
import { usePendingLineAttachments } from '@/hooks/usePendingLineAttachments';
import { useLineFormPersistence } from '@/hooks/useLineFormPersistence';
import { useTourLineAutosave } from '@/hooks/useTourLineAutosave';
import { useAuth } from '@/contexts/AuthContext';
import type { Meal, Tour } from '@/types/tour';
import type { DetailedExpense, ExpenseCategory, ExpenseCategoryInput } from '@/types/master';
import {
  canEditAnyTourLineField,
  canEditTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

interface UseMealsTabOptions {
  tourId?: string;
  meals: Meal[];
  onChange?: (meals: Meal[]) => void;
  tour?: Tour | null;
  readOnly?: boolean;
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
}

export function useMealsTab({ tourId, meals, onChange, tour, readOnly, lineFieldAccess }: UseMealsTabOptions) {
  const [openMeal, setOpenMeal] = useState(false);
  const [showNewMealDialog, setShowNewMealDialog] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [newMealPrice, setNewMealPrice] = useState(0);
  const [newMealCategoryId, setNewMealCategoryId] = useState('');
  const [openCategory, setOpenCategory] = useState(false);
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const queryClient = useQueryClient();
  const { pendingFiles, setPendingFiles, clearPendingFiles, uploadPendingFiles } = usePendingLineAttachments(tourId, 'meal');
  const { isGuide, userProfile } = useAuth();
  const guideId = isGuide ? (userProfile?.id ?? undefined) : undefined;
  const tourStartDate = tour?.startDate || '';
  const tourTotalGuests = tour?.totalGuests || 0;
  const fallbackMeal = useMemo<Meal>(() => ({
    name: '',
    price: 0,
    date: tourStartDate,
    guests: !tourId && tourTotalGuests > 0 ? tourTotalGuests : undefined,
  }), [tourStartDate, tourTotalGuests, tourId]);
  const {
    formData, setFormData, editingIndex, setEditingIndex, resetForm,
  } = useLineFormPersistence<Meal>({
    storageKey: `meals:${tourId || 'new'}`,
    fallback: fallbackMeal,
  });
  const canEditLine = canEditAnyTourLineField(lineFieldAccess);
  const canCreateLine =
    canEditTourLineField(lineFieldAccess, 'name') &&
    canEditTourLineField(lineFieldAccess, 'date') &&
    canEditTourLineField(lineFieldAccess, 'price');

  const { data: detailedExpenses = [] } = useQuery({
    queryKey: ['detailedExpenses', guideId ?? null],
    queryFn: () => store.listDetailedExpenses({ status: 'active', guideId }),
  });

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['expenseCategories', guideId ?? null],
    queryFn: () => store.listExpenseCategories({ status: 'active', guideId }),
  });

  const invalidate = async () => {
    if (tourId) {
      queryClient.invalidateQueries({ queryKey: ['tour', tourId, 'meals'] });
      queryClient.invalidateQueries({ queryKey: ['tour', tourId], refetchType: 'none' });
      void invalidateTourAggregateCaches(queryClient, 'none');
    }
  };

  const addMutation = useMutation({
    mutationFn: async (meal: Meal) => {
      if (tourId) return store.addMeal(tourId, meal);
      onChange?.([...meals, meal]);
      return undefined;
    },
    onSuccess: async (lineId) => {
      await uploadPendingFiles('meal', lineId);
      await invalidate();
      toast.success('Đã thêm bữa ăn');
      clearPendingFiles();
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ index, meal }: { index: number; meal: Meal }) => {
      if (tourId) await store.updateMeal(tourId, index, meal);
      else { const m = [...meals]; m[index] = meal; onChange?.(m); }
    },
    onSuccess: async (_, { meal }) => {
      await uploadPendingFiles('meal', meal.id);
      await invalidate();
      toast.success('Đã cập nhật bữa ăn');
      clearPendingFiles();
      resetForm();
    },
  });

  const autosaveMeal = useTourLineAutosave<Meal>({
    tourId,
    collection: 'meals',
    items: meals,
    onChange,
    saveLine: (index, meal) => store.updateMeal(tourId!, index, meal),
    successMessage: 'Đã tự động lưu bữa ăn',
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => tourId ? store.removeMeal(tourId, index) : Promise.resolve(),
    onSuccess: (_, index) => {
      invalidate();
      if (!tourId) onChange?.(meals.filter((_, i) => i !== index));
      toast.success('Đã xóa bữa ăn');
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: ExpenseCategoryInput) => store.createExpenseCategory({ ...data, guideId }),
    onSuccess: (category) => {
      queryClient.setQueryData<ExpenseCategory[]>(['expenseCategories', guideId ?? null], (c) => upsertById(c, category));
      queryClient.invalidateQueries({ queryKey: ['expenseCategories', guideId ?? null] });
      setNewMealCategoryId(category.id);
      setOpenCategory(false);
      setShowNewCategoryDialog(false);
      toast.success('Đã tạo nhóm chi phí');
    },
    onError: (error: Error) => toast.error(`Tạo nhóm chi phí thất bại: ${error.message}`),
  });

  const createMealMutation = useMutation({
    mutationFn: ({ name, price, categoryId }: { name: string; price: number; categoryId: string }) => {
      const category = expenseCategories.find(c => c.id === categoryId);
      if (!category) throw new Error('Không tìm thấy hạng mục');
      return store.createDetailedExpense({ name, price, categoryRef: { id: categoryId, nameAtBooking: category.name }, guideId });
    },
    onSuccess: (newMeal) => {
      queryClient.setQueryData<DetailedExpense[]>(['detailedExpenses', guideId ?? null], (c) => upsertById(c, newMeal));
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses', guideId ?? null] });
      toast.success('Đã tạo bữa ăn chi tiết');
      setShowNewMealDialog(false);
      setNewMealName(''); setNewMealPrice(0); setNewMealCategoryId('');
      setFormData(prev => ({ ...prev, name: newMeal.name, price: newMeal.price }));
    },
    onError: (error: Error) => toast.error(`Tạo bữa ăn thất bại: ${error.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) { toast.error('Bạn không có quyền sửa bữa ăn trong tour.'); return; }
    if (editingIndex === null && !canCreateLine) { toast.error('Bạn không có quyền thêm dòng bữa ăn.'); return; }
    if (editingIndex !== null && !canEditLine) { toast.error('Bạn không có quyền sửa trường trong dòng bữa ăn.'); return; }
    if (!formData.name || !formData.date) { toast.error('Vui lòng điền đầy đủ các trường bắt buộc'); return; }
    if (!isVatAmountValid(formData, tour?.totalGuests || 0)) { toast.error('Tiền VAT không được vượt quá thành tiền.'); return; }
    if ((formData.vatRate || 0) > 0 && !hasLineAttachments(formData, pendingFiles)) {
      toast.warning('VAT lớn hơn 0 nhưng chưa có chứng từ.');
    }
    if (editingIndex !== null) updateMutation.mutate({ index: editingIndex, meal: formData });
    else addMutation.mutate(formData);
  };

  const handleEdit = (index: number) => {
    if (readOnly || !canEditLine) return;
    clearPendingFiles();
    setEditingIndex(index);
    setFormData(meals[index]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    clearPendingFiles();
    resetForm();
  };

  const handleDuplicate = (index: number) => {
    if (!readOnly && canCreateLine) addMutation.mutate(meals[index]);
  };

  const handleCreateNewMeal = () => {
    if (readOnly || !canEditTourLineField(lineFieldAccess, 'name') || !canEditTourLineField(lineFieldAccess, 'price')) return;
    if (!newMealName.trim()) { toast.error('Vui lòng nhập tên bữa ăn'); return; }
    if (newMealPrice <= 0) { toast.error('Vui lòng nhập giá hợp lệ'); return; }
    if (!newMealCategoryId) { toast.error('Vui lòng chọn hạng mục'); return; }
    createMealMutation.mutate({ name: newMealName.trim(), price: newMealPrice, categoryId: newMealCategoryId });
  };

  const handleMobileGuestsChange = (originalIndex: number, val: number | undefined) => {
    if (readOnly || !canEditTourLineField(lineFieldAccess, 'quantity')) return;
    const tourGuests = tour?.totalGuests || 0;
    let gv = val;
    if (gv !== undefined && tourGuests && gv > tourGuests) {
      toast.warning(`Số khách không được vượt quá tổng khách của tour (${tourGuests}).`);
      gv = tourGuests;
    }
    const updated = { ...meals[originalIndex], guests: gv };
    autosaveMeal(originalIndex, updated as Meal);
  };

  const sortedMeals = useMemo(() =>
    meals.map((m, i) => ({ ...m, originalIndex: i }))
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Infinity;
        const db = b.date ? new Date(b.date).getTime() : Infinity;
        return da - db;
      }),
  [meals]);

  const mealsTotalAmount = useMemo(() =>
    meals.reduce((sum, m) => sum + m.price * (typeof m.guests === 'number' ? m.guests : 0), 0),
  [meals]);

  useEffect(() => {
    if (!formData.date && tourStartDate) setFormData((prev) => ({ ...prev, date: tourStartDate }));
  }, [formData.date, setFormData, tourStartDate]);

  useEffect(() => {
    if (editingIndex !== null || tourId || formData.guests !== undefined || tourTotalGuests <= 0) return;
    setFormData((prev) => ({ ...prev, guests: tourTotalGuests }));
  }, [editingIndex, formData.guests, setFormData, tourId, tourTotalGuests]);

  useEffect(() => {
    if (editingIndex === null) return;
    const latest = meals[editingIndex];
    if (!latest || latest.id !== formData.id) return;
    const latestKey = (latest.attachments || []).map((item) => item.id).join('|');
    const formKey = (formData.attachments || []).map((item) => item.id).join('|');
    if (latestKey !== formKey) setFormData((prev) => ({ ...prev, attachments: latest.attachments || [] }));
  }, [editingIndex, formData.attachments, formData.id, meals, setFormData]);

  return {
    editingIndex, formData, setFormData, openMeal, setOpenMeal,
    showNewMealDialog, setShowNewMealDialog,
    newMealName, setNewMealName, newMealPrice, setNewMealPrice,
    newMealCategoryId, setNewMealCategoryId, openCategory, setOpenCategory,
    showNewCategoryDialog, setShowNewCategoryDialog,
    detailedExpenses, expenseCategories,
    deleteMutation, createCategoryMutation, createMealMutation,
    handleSubmit, handleEdit, handleCancel, handleDuplicate,
    handleCreateNewMeal, handleMobileGuestsChange,
    handleCreateNewCategory: (data: ExpenseCategoryInput) => createCategoryMutation.mutate(data),
    sortedMeals, mealsTotalAmount,
    pendingFiles, setPendingFiles,
    updateMutation, autosaveMeal, tourId,
  };
}
