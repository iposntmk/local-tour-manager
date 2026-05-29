import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import { exportTourToExcel } from '@/lib/excel-utils';
import { invalidateTourAggregateCaches } from '@/lib/query-cache';
import { useAuth } from '@/contexts/AuthContext';
import type { Tour, TourInput, TourSummary } from '@/types/tour';

const WATER_EXPENSE_NAMES = [
  'Nước uống cho khách 10k/1 khách / 1 ngày',
  'Nước uống cho khách 15k/1 khách / 1 ngày',
];

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
  const { hasPermission } = useAuth();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [waterDismissedLocal, setWaterDismissedLocal] = useState(false);
  const [newTourData, setNewTourData] = useState<Partial<Tour>>({
    destinations: [], expenses: [], meals: [], shoppings: [], allowances: [], summary: emptyTourSummary,
  });

  const isNewTour = id === 'new';

  const canCreateTour = hasPermission('create_tours');
  const canEditTourInfo = hasPermission('edit_tour_info') || hasPermission('edit_tours');
  const canEditDestinations = hasPermission('edit_tour_destinations') || hasPermission('edit_tours');
  const canEditExpenses = hasPermission('edit_tour_expenses') || hasPermission('edit_tours');
  const canEditMeals = hasPermission('edit_tour_meals') || hasPermission('edit_tours');
  const canEditAllowances = hasPermission('edit_tour_allowances') || hasPermission('edit_tours');
  const canEditShoppings = hasPermission('edit_tour_shoppings') || hasPermission('edit_tours');
  const canEditSummary = hasPermission('edit_tour_summary') || hasPermission('edit_tours');
  const canExportTour = hasPermission('export_tours');
  const canDeleteTour = hasPermission('delete_tours');
  const canUploadTourImages = hasPermission('upload_tour_images') || hasPermission('edit_tours');
  const canDeleteTourImages = hasPermission('delete_tour_images') || hasPermission('edit_tours');

  const { data: tour, isLoading } = useQuery({
    queryKey: ['tour', id],
    queryFn: () => store.getTour(id!),
    enabled: !isNewTour,
  });

  const { data: tourImages = [] } = useQuery({
    queryKey: ['tourImages', id],
    queryFn: () => store.listTourImages(id!),
    enabled: !isNewTour && !!id,
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
          : error.message || 'Tạo tour thất bại'
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Tour> }) => store.updateTour(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', id] });
      void invalidateTourAggregateCaches(queryClient, 'none');
      toast.success('Cập nhật tour thành công');
    },
    onError: (error: Error) => {
      const msg = error.message.toLowerCase();
      toast.error(
        msg.includes('unique') || msg.includes('duplicate') || msg.includes('tour_code')
          ? 'Mã tour này đã tồn tại. Vui lòng dùng mã khác.'
          : error.message || 'Cập nhật tour thất bại'
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

  const displayTour = isNewTour ? newTourData as Tour : tour;
  const totalGuests = displayTour?.totalGuests || (displayTour?.adults || 0) + (displayTour?.children || 0) || 0;
  const hasUnpaidShoppings = (displayTour?.shoppings || []).some((s) => {
    if ((s.price ?? 0) <= 0) return false;
    return (s.payments || []).reduce((sum, p) => sum + p.amount, 0) < (s.netCommission ?? s.price);
  });
  const hasWaterExpense = (displayTour?.expenses || []).some((e) => WATER_EXPENSE_NAMES.includes(e.name || ''));
  const isWaterDismissed = displayTour?.waterExpenseDismissed === true;
  const showWaterWarning = !isNewTour && !hasWaterExpense && !isWaterDismissed && !waterDismissedLocal;

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
    setWaterDismissedLocal(true);
    dismissWaterMutation.mutate();
  }, [dismissWaterMutation]);

  return {
    id, tour, tourImages, displayTour, isNewTour, isLoading,
    newTourData, setNewTourData,
    deleteDialogOpen, setDeleteDialogOpen,
    activeTab, setActiveTab,
    historyOpen, setHistoryOpen,
    waterDismissedLocal, isWaterDismissed, showWaterWarning,
    totalGuests, hasUnpaidShoppings,
    canCreateTour, canEditTourInfo, canEditDestinations, canEditExpenses,
    canEditMeals, canEditAllowances, canEditShoppings, canEditSummary,
    canExportTour, canDeleteTour, canUploadTourImages, canDeleteTourImages,
    handleInfoSave, handleSummaryUpdate, handleDelete,
    handleHeaderSave, handleExportExcel, handleDismissWater,
  };
}
