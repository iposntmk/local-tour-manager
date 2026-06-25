import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import { exportTourToExcel } from '@/lib/excel-utils';
import {
  invalidateTourAggregateCaches,
  TOUR_DETAIL_GC_TIME,
  TOUR_DETAIL_STALE_TIME,
} from '@/lib/query-cache';
import { toVietnameseError } from '@/lib/error-messages';
import { useAuth } from '@/contexts/AuthContext';
import { canEditTourData } from '@/lib/settlement-utils';
import { canAuthViewTourShopping } from '@/lib/shopping-access';
import { getTourInfoFieldAccess, getTourLineFieldAccess, getTourTabAccess } from '@/lib/tour-detail-permissions';
import { isWaterExpense } from '@/lib/water-expense-utils';
import { getShoppingCommissionInfo } from '@/lib/shopping-commission-utils';
import type { Tour, TourInput, TourSummary } from '@/types/tour';

const calcTotalDays = (startDate: string | undefined, endDate: string | undefined) => {
  if (!startDate || !endDate) return 0;
  try { return Math.max(0, differenceInDays(new Date(endDate), new Date(startDate)) + 1); } catch { return 0; }
};

const emptyTourSummary = {
  totalTabs: 0, advancePayment: 0, totalAfterAdvance: 0,
  companyTip: 0, totalAfterTip: 0, collectionsForCompany: 0,
  totalAfterCollections: 0, finalTotal: 0,
};

export function useTourDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, isAdmin, isGuide, userProfile } = useAuth();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [waterDismissedLocal, setWaterDismissedLocal] = useState(false);
  const [newTourData, setNewTourData] = useState<Partial<Tour>>({
    destinations: [], expenses: [], meals: [], shoppings: [], allowances: [], summary: emptyTourSummary,
  });

  const isNewTour = id === 'new';

  const canCreateTour = hasPermission('create_tours');
  const canExportTour = hasPermission('export_tours');
  const canDeleteTour = hasPermission('delete_tours');
  const canUploadTourImages = hasPermission('upload_tour_images') || hasPermission('edit_tours');
  const canDeleteTourImages = hasPermission('delete_tour_images') || hasPermission('edit_tours');

  // Lightweight info-only fetch on initial load (tour row + summary columns + nationalities
  // + payments). Sub-collections load lazily per-tab below so opening a tour no longer pulls
  // every line up-front.
  const { data: tourInfo, isLoading } = useQuery({
    queryKey: ['tour', id],
    queryFn: () => store.getTourInfo(id!),
    enabled: !isNewTour,
    staleTime: TOUR_DETAIL_STALE_TIME,
    gcTime: TOUR_DETAIL_GC_TIME,
  });

  const subEnabled = !isNewTour && !!id;

  const destinationsQuery = useQuery({
    queryKey: ['tour', id, 'destinations'],
    queryFn: () => store.listTourDestinations(id!),
    enabled: subEnabled,
    staleTime: TOUR_DETAIL_STALE_TIME,
    gcTime: TOUR_DETAIL_GC_TIME,
  });
  const expensesQuery = useQuery({
    queryKey: ['tour', id, 'expenses'],
    queryFn: () => store.listTourExpenses(id!),
    enabled: subEnabled,
    staleTime: TOUR_DETAIL_STALE_TIME,
    gcTime: TOUR_DETAIL_GC_TIME,
  });
  const mealsQuery = useQuery({
    queryKey: ['tour', id, 'meals'],
    queryFn: () => store.listTourMeals(id!),
    enabled: subEnabled,
    staleTime: TOUR_DETAIL_STALE_TIME,
    gcTime: TOUR_DETAIL_GC_TIME,
  });
  const allowancesQuery = useQuery({
    queryKey: ['tour', id, 'allowances'],
    queryFn: () => store.listTourAllowances(id!),
    enabled: subEnabled,
    staleTime: TOUR_DETAIL_STALE_TIME,
    gcTime: TOUR_DETAIL_GC_TIME,
  });

  const createMutation = useMutation({
    mutationFn: async (input: TourInput) => {
      const totalGuests = (input.adults || 0) + (input.children || 0);
      const totalDays = calcTotalDays(input.startDate, input.endDate);
      return store.createTour({
        ...input, totalGuests, totalDays,
        destinations: newTourData.destinations || [],
        expenses: newTourData.expenses || [],
        meals: newTourData.meals || [],
        allowances: newTourData.allowances || [],
        shoppings: newTourData.shoppings || [],
        summary: newTourData.summary!,
      });
    },
    onSuccess: () => { void invalidateTourAggregateCaches(queryClient); toast.success('Tạo tour thành công'); navigate('/tours'); },
    onError: (error: Error) => {
      const msg = error.message.toLowerCase();
      toast.error(
        msg.includes('unique') || msg.includes('duplicate') || msg.includes('tour_code')
          ? 'Mã tour này đã tồn tại. Vui lòng dùng mã khác.'
          : toVietnameseError(error, 'Tạo tour thất bại')
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Tour> }) => store.updateTour(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ['tour', id] });
      const previous = queryClient.getQueryData<Tour>(['tour', id]);
      // ['tour', id] now holds the info-only tour (empty sub-collection arrays), so do NOT
      // enrichTourWithSummary here — it would recompute totalTabs from empty arrays and zero
      // out the stored summary columns. Just merge the patched info fields.
      queryClient.setQueryData<Tour>(['tour', id], (current) =>
        current ? { ...current, ...patch } : current
      );
      return { previous };
    },
    onSuccess: (_, { id, patch }) => {
      const needsActiveRefetch =
        patch.totalGuests !== undefined ||
        patch.totalDays !== undefined ||
        patch.startDate !== undefined ||
        patch.endDate !== undefined;
      queryClient.invalidateQueries({ queryKey: ['tour', id], refetchType: needsActiveRefetch ? 'active' : 'none' });
      void invalidateTourAggregateCaches(queryClient, 'none');
      toast.success('Đã tự động lưu tour');
    },
    onError: (error: Error, variables, context) => {
      if (variables?.id && context?.previous) queryClient.setQueryData(['tour', variables.id], context.previous);
      const msg = error.message.toLowerCase();
      toast.error(
        msg.includes('unique') || msg.includes('duplicate') || msg.includes('tour_code')
          ? 'Mã tour này đã tồn tại. Vui lòng dùng mã khác.'
          : toVietnameseError(error, 'Cập nhật tour thất bại')
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteTour(id),
    onSuccess: () => { void invalidateTourAggregateCaches(queryClient); toast.success('Xóa tour thành công'); navigate('/tours'); },
  });

  const dismissWaterMutation = useMutation({
    mutationFn: async () => { if (id) await store.updateTour(id, { waterExpenseDismissed: true }); },
    onSuccess: () => {
      if (id) { queryClient.invalidateQueries({ queryKey: ['tour', id] }); void invalidateTourAggregateCaches(queryClient, 'none'); }
      toast.success('Đã tắt cảnh báo nước uống cho tour này');
    },
  });

  const baseForAccess = isNewTour ? (newTourData as Tour) : tourInfo;
  const canViewShoppings = canAuthViewTourShopping({
    isAdmin,
    isGuide,
    userId: userProfile?.id,
    tour: baseForAccess,
    isNewTour,
  });

  // Shoppings tab is sensitive: only fetch when the user may view it.
  const shoppingsQuery = useQuery({
    queryKey: ['tour', id, 'shoppings'],
    queryFn: () => store.listTourShoppings(id!),
    enabled: subEnabled && canViewShoppings,
    staleTime: TOUR_DETAIL_STALE_TIME,
    gcTime: TOUR_DETAIL_GC_TIME,
  });

  const tour = tourInfo ?? undefined;
  const displayTour: Tour | undefined = useMemo(() => {
    if (isNewTour) return newTourData as Tour;
    if (!tourInfo) return undefined;
    return {
      ...tourInfo,
      destinations: destinationsQuery.data ?? tourInfo.destinations,
      expenses: expensesQuery.data ?? tourInfo.expenses,
      meals: mealsQuery.data ?? tourInfo.meals,
      allowances: allowancesQuery.data ?? tourInfo.allowances,
      shoppings: shoppingsQuery.data ?? tourInfo.shoppings,
    };
  }, [isNewTour, newTourData, tourInfo, destinationsQuery.data, expensesQuery.data, mealsQuery.data, allowancesQuery.data, shoppingsQuery.data]);

  const tabAccess = getTourTabAccess(hasPermission, { canViewSensitiveShopping: canViewShoppings, isNewTour });
  const infoFieldAccess = getTourInfoFieldAccess(hasPermission, tabAccess.info);
  const lineFieldAccess = getTourLineFieldAccess(hasPermission);
  // Khóa chỉnh sửa khi hồ sơ đã gửi/duyệt/đóng: chỉ cho sửa lúc còn nháp hoặc
  // bị trả về (need_changes). Tour mới và admin không bị khóa.
  const settlementUnlocked = isNewTour || isAdmin || (displayTour ? canEditTourData(displayTour) : false);
  const canEditTourInfo = settlementUnlocked && Object.values(infoFieldAccess).some((access) => access.edit);
  const canEditDestinations = settlementUnlocked && tabAccess.destinations.edit;
  const canEditExpenses = settlementUnlocked && tabAccess.expenses.edit;
  const canEditMeals = settlementUnlocked && tabAccess.meals.edit;
  const canEditAllowances = settlementUnlocked && tabAccess.allowances.edit;
  const canEditShoppings = settlementUnlocked && tabAccess.shoppings.edit;
  const canEditSummary = settlementUnlocked && tabAccess.summary.edit;
  // Tour đã lưu nhưng bị khóa chỉnh sửa do trạng thái hồ sơ (đã gửi/duyệt/đóng).
  const isSettlementLocked = !isNewTour && !settlementUnlocked;
  const settlementStatus = displayTour?.settlementStatus;
  const totalGuests = displayTour?.totalGuests || (displayTour?.adults || 0) + (displayTour?.children || 0) || 0;
  // When the relevant sub-collection isn't loaded yet, fall back to the stored summary
  // columns on the info row (has_unpaid_commission / missing_water_expense) so tour-level
  // badges/warnings stay correct without forcing those tabs to load.
  const shoppingsLoaded = isNewTour || shoppingsQuery.data !== undefined;
  const shoppingCommissionInfo = getShoppingCommissionInfo(displayTour?.shoppings || []);
  const hasUnpaidShoppings = canViewShoppings && (
    shoppingsLoaded
      ? shoppingCommissionInfo.hasShoppings && !shoppingCommissionInfo.allPaid
      : (tourInfo?.hasUnpaidCommission ?? false)
  );
  const expensesLoaded = isNewTour || expensesQuery.data !== undefined;
  const hasWaterExpense = (displayTour?.expenses || []).some(isWaterExpense);
  const isWaterDismissed = displayTour?.waterExpenseDismissed === true;
  const showWaterWarning = !isNewTour && !isWaterDismissed && !waterDismissedLocal && (
    expensesLoaded ? !hasWaterExpense : (tourInfo?.missingWaterExpense ?? false)
  );

  const handleInfoSave = (data: TourInput) => {
    if ((isNewTour && !canCreateTour) || (!isNewTour && !canEditTourInfo)) { toast.error('Bạn không có quyền lưu thông tin tour.'); return; }
    if (isNewTour) {
      createMutation.mutate(data);
    } else if (id) {
      const totalGuests = (data.adults || 0) + (data.children || 0);
      const totalDays = calcTotalDays(data.startDate, data.endDate);
      updateMutation.mutate({ id, patch: { ...data, totalGuests, totalDays } });
    }
  };

  const handleSummaryUpdate = (summary: TourSummary) => {
    if (!canEditSummary) { toast.error('Bạn không có quyền sửa tổng kết tour.'); return; }
    if (id && !isNewTour) updateMutation.mutate({ id, patch: { summary } });
  };

  const handleDelete = () => {
    if (!canDeleteTour) { toast.error('Bạn không có quyền xóa tour.'); return; }
    if (id && !isNewTour) deleteMutation.mutate(id);
  };

  const handleHeaderSave = () => {
    if ((isNewTour && !canCreateTour) || (!isNewTour && !canEditTourInfo)) return;
    if (activeTab === 'info') { const form = document.querySelector('form') as HTMLFormElement; if (form) form.requestSubmit(); }
  };

  const handleExportExcel = async () => {
    if (!canExportTour) { toast.error('Bạn không có quyền xuất Excel.'); return; }
    if (!displayTour || isNewTour) { toast.error('Không thể xuất tour chưa được lưu'); return; }
    try { await exportTourToExcel(displayTour as Tour); toast.success('Xuất tour ra Excel thành công'); }
    catch (error) { toast.error('Xuất tour ra Excel thất bại'); console.error('Export error:', error); }
  };

  const handleDismissWater = useCallback(() => {
    if (!canEditExpenses) { toast.error('Bạn không có quyền cập nhật cảnh báo chi phí nước uống.'); return; }
    setWaterDismissedLocal(true);
    dismissWaterMutation.mutate();
  }, [canEditExpenses, dismissWaterMutation]);

  return {
    id, tour, displayTour, isNewTour, isLoading,
    newTourData, setNewTourData,
    deleteDialogOpen, setDeleteDialogOpen,
    activeTab, setActiveTab,
    historyOpen, setHistoryOpen,
    waterDismissedLocal, isWaterDismissed, showWaterWarning,
    isSettlementLocked, settlementStatus,
    totalGuests, hasUnpaidShoppings, tabAccess, infoFieldAccess, lineFieldAccess,
    canCreateTour, canEditTourInfo, canEditDestinations, canEditExpenses,
    canEditMeals, canEditAllowances, canViewShoppings, canEditShoppings, canEditSummary,
    canExportTour, canDeleteTour, canUploadTourImages, canDeleteTourImages,
    handleInfoSave, handleSummaryUpdate, handleDelete,
    handleHeaderSave, handleExportExcel, handleDismissWater,
  };
}
