import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Trash2, FileDown } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TourForm } from '@/components/tours/TourForm';
import { TourInfoForm } from '@/components/tours/TourInfoForm';
import { DestinationsTab } from '@/components/tours/DestinationsTab';
import { ExpensesTab } from '@/components/tours/ExpensesTab';
import { MealsTab } from '@/components/tours/MealsTab';
import { ShoppingsTab } from '@/components/tours/ShoppingsTab';
import { AllowancesTab } from '@/components/tours/AllowancesTab';
import { SummaryTab } from '@/components/tours/SummaryTab';
import { TourImagesTab } from '@/components/tours/TourImagesTab';
import { CombinedTab } from '@/components/tours/CombinedTab';
import { toast } from 'sonner';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { formatCurrency } from '@/lib/currency-utils';
import { exportTourToExcel } from '@/lib/excel-utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Tour, TourInput, Destination, Expense, Meal, Allowance, Shopping, TourSummary } from '@/types/tour';
import { formatDateDMY, formatDateRangeDisplay } from '@/lib/date-utils';
import { formatDate } from '@/lib/utils';

// Helper function to clamp guests (same logic as SummaryTab)
const clampGuests = (guestValue: number | undefined, tourGuests: number): number => {
  if (typeof guestValue !== 'number') return tourGuests;
  if (!tourGuests) return guestValue;
  return Math.min(Math.max(guestValue, 0), tourGuests);
};

// Calculate totals using per-row guests (matching SummaryTab logic)
const calculateTabTotals = (tour: Tour | null | undefined) => {
  if (!tour) return { destinations: 0, expenses: 0, meals: 0, allowances: 0, shoppings: 0 };

  const tourGuests = tour.totalGuests || 0;

  const totalDestinations = (tour.destinations || []).reduce((sum, d) => {
    const g = clampGuests(d.guests as any, tourGuests);
    return sum + (d.price * g);
  }, 0);

  const totalExpenses = (tour.expenses || []).reduce((sum, e) => {
    const g = clampGuests(e.guests as any, tourGuests);
    return sum + (e.price * g);
  }, 0);

  const totalMeals = (tour.meals || []).reduce((sum, m) => {
    const g = clampGuests(m.guests as any, tourGuests);
    return sum + (m.price * g);
  }, 0);

  const totalAllowances = (tour.allowances || []).reduce((sum, a) => {
    return sum + (a.price * (a.quantity || 1));
  }, 0);

  const totalShoppings = (tour.shoppings || []).reduce((sum, s) => {
    return sum + s.price;
  }, 0);

  return {
    destinations: totalDestinations,
    expenses: totalExpenses,
    meals: totalMeals,
    allowances: totalAllowances,
    shoppings: totalShoppings,
  };
};

const TourDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<TourInput> | null>(null);
  const [activeTab, setActiveTab] = useState('info');

  // State for create mode (no tour ID)
  const [newTourData, setNewTourData] = useState<Partial<Tour>>({
    destinations: [],
    expenses: [],
    meals: [],
    shoppings: [],
    allowances: [],
    summary: {
      totalTabs: 0,
      advancePayment: 0,
      totalAfterAdvance: 0,
      companyTip: 0,
      totalAfterTip: 0,
      collectionsForCompany: 0,
      totalAfterCollections: 0,
      finalTotal: 0,
    },
  });

  const isNewTour = id === 'new';

  const { data: tour, isLoading } = useQuery({
    queryKey: ['tour', id],
    queryFn: () => store.getTour(id!),
    enabled: !isNewTour,
  });

  // Fetch tour images count
  const { data: tourImages = [] } = useQuery({
    queryKey: ['tourImages', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tour_images')
        .select('*')
        .eq('tour_id', id!);

      if (error) throw error;
      return data || [];
    },
    enabled: !isNewTour && !!id,
  });

  const createMutation = useMutation({
    mutationFn: async (input: TourInput) => {
      // Calculate totalGuests and totalDays
      const totalGuests = (input.adults || 0) + (input.children || 0);
      let totalDays = 0;
      if (input.startDate && input.endDate) {
        try {
          totalDays = Math.max(0, differenceInDays(new Date(input.endDate), new Date(input.startDate)) + 1);
        } catch {}
      }
      
      // Merge basic tour data with subcollections from newTourData
      const tourData = {
        ...input,
        totalGuests,
        totalDays,
        destinations: newTourData.destinations || [],
        expenses: newTourData.expenses || [],
        meals: newTourData.meals || [],
        allowances: newTourData.allowances || [],
        shoppings: newTourData.shoppings || [],
        summary: newTourData.summary!,
      };
      const createdTour = await store.createTour(tourData);
      return createdTour;
    },
    onSuccess: (newTour) => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success('Tạo tour thành công');
      navigate('/tours');
    },
    onError: (error: Error) => {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('unique') || errorMessage.includes('duplicate') || errorMessage.includes('tour_code')) {
        toast.error('Mã tour này đã tồn tại. Vui lòng dùng mã khác.');
      } else {
        toast.error(error.message || 'Tạo tour thất bại');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Tour> }) =>
      store.updateTour(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', id] });
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success('Cập nhật tour thành công');
    },
    onError: (error: Error) => {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('unique') || errorMessage.includes('duplicate') || errorMessage.includes('tour_code')) {
        toast.error('Mã tour này đã tồn tại. Vui lòng dùng mã khác.');
      } else {
        toast.error(error.message || 'Cập nhật tour thất bại');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteTour(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success('Xóa tour thành công');
      navigate('/tours');
    },
  });

  const handleInfoSave = (data: TourInput) => {
    if (isNewTour) {
      // For new tours, save to createMutation (totalDays calculated inside mutation)
      createMutation.mutate(data);
    } else if (id) {
      // For existing tours, update
      const totalGuests = (data.adults || 0) + (data.children || 0);
      let totalDays = 0;
      if (data.startDate && data.endDate) {
        try {
          totalDays = Math.max(0, differenceInDays(new Date(data.endDate), new Date(data.startDate)) + 1);
        } catch {}
      }
      updateMutation.mutate({ id, patch: { ...data, totalGuests, totalDays } });
    }
  };

  const handleSummaryUpdate = (summary: TourSummary) => {
    if (id && !isNewTour) {
      updateMutation.mutate({ id, patch: { summary } });
    }
  };

  const handleDelete = () => {
    if (id && !isNewTour) {
      deleteMutation.mutate(id);
    }
  };

  const handleHeaderSave = () => {
    // Only Info tab needs header save button
    // Other tabs auto-save when adding/updating/deleting items
    if (activeTab === 'info') {
      // Trigger info form submit
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const handleExportExcel = async () => {
    if (!displayTour || isNewTour) {
      toast.error('Không thể xuất tour chưa được lưu');
      return;
    }
    try {
      await exportTourToExcel(displayTour as Tour);
      toast.success('Xuất tour ra Excel thành công');
    } catch (error) {
      toast.error('Xuất tour ra Excel thất bại');
      console.error('Export error:', error);
    }
  };

  const shouldShowSaveButton = () => {
    // For create mode: show Save Tour button on Info tab
    // For edit mode: show Save Info button on Info tab
    // Other tabs auto-save
    return activeTab === 'info';
  };

  // Get the display data - either from existing tour or new tour data
  const displayTour = isNewTour ? newTourData as Tour : tour;
  const totalGuests = displayTour?.totalGuests || (displayTour?.adults || 0) + (displayTour?.children || 0) || 0;

  // Check if water expense exists
  const waterExpenseNames = [
    'Nước uống cho khách 10k/1 khách / 1 ngày',
    'Nước uống cho khách 15k/1 khách / 1 ngày',
  ];
  const hasWaterExpense = (displayTour?.expenses || []).some(exp =>
    waterExpenseNames.includes(exp.name || '')
  );
  const showWaterWarning = !isNewTour && !hasWaterExpense;

  const { classes: headerClasses } = useHeaderMode('tourdetail.headerMode');

  if (isLoading && !isNewTour) {
    return (
      <Layout>
        <div className="space-y-6 animate-fade-in">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-[400px] bg-muted rounded animate-pulse" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="animate-fade-in">
        {(isNewTour || tour) ? (
          <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            {/* Header with tabs inside Tabs context */}
            <div className={`${headerClasses} border-b py-2 sm:py-4 bg-blue-100 dark:bg-blue-900 z-40`}>
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate('/tours')}
                      className="hover-scale h-8 w-8 flex-shrink-0"
                      title="Quay lại danh sách tour"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold truncate">
                      {isNewTour ? 'Tour mới' : (tour?.tourCode || 'Chi tiết tour')}
                    </h1>
                  </div>

                  <div className="flex gap-1 sm:gap-2 items-center flex-shrink-0">
                    {isNewTour && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleHeaderSave}
                        className="hover-scale h-10 px-4"
                        title="Lưu tour"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        <span>Lưu tour</span>
                      </Button>
                    )}
                    {!isNewTour && activeTab === 'info' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleHeaderSave}
                        className="hover-scale h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4"
                        title="Lưu thông tin tour"
                      >
                        <Save className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Lưu</span>
                      </Button>
                    )}
                    {!isNewTour && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        className="hover-scale h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4 bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900"
                        title="Xuất Excel"
                      >
                        <FileDown className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Xuất Excel</span>
                      </Button>
                    )}
                    {!isNewTour && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialogOpen(true)}
                        className="hover-scale h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4"
                        title="Xóa tour"
                      >
                        <Trash2 className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Xóa</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Tour Info Summary - Separate row for mobile responsiveness */}
                {displayTour && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm px-2 sm:px-0">
                    <div className="flex items-baseline gap-1">
                      <span className="text-muted-foreground">Ngày:</span>
                      <span className="font-semibold">{displayTour.startDate && displayTour.endDate ? formatDateRangeDisplay(displayTour.startDate, displayTour.endDate) : '-'}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-muted-foreground">Số ngày:</span>
                      <span className="font-semibold">{displayTour.totalDays || 0}</span>
                    </div>
                    <span className="text-muted-foreground hidden sm:inline">|</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-muted-foreground">Người lớn:</span>
                      <span className="font-semibold">{displayTour.adults || 0}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-muted-foreground">Trẻ em:</span>
                      <span className="font-semibold">{displayTour.children || 0}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-muted-foreground">Khách:</span>
                      <span className="font-semibold">{totalGuests}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 sm:pt-4">
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 gap-1 rounded-xl bg-background shadow-sm border p-0.5 sm:p-1 h-auto">
                  <TabsTrigger value="info" className="text-xs sm:text-sm">Thông tin</TabsTrigger>
                  <TabsTrigger value="destinations" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span className="sm:hidden">Điểm</span>
                      <span className="hidden sm:inline">Điểm đến</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {displayTour?.destinations?.length || 0} | {formatCurrency(calculateTabTotals(displayTour).destinations)}
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="expenses" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span className="sm:hidden">CP</span>
                      <span className="hidden sm:inline">Chi phí</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {displayTour?.expenses?.length || 0} | {formatCurrency(calculateTabTotals(displayTour).expenses)}
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="meals" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span>Bữa ăn</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {displayTour?.meals?.length || 0} | {formatCurrency(calculateTabTotals(displayTour).meals)}
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="combined" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span className="sm:hidden">Tổng</span>
                      <span className="hidden sm:inline">Tổng hợp</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {formatCurrency(calculateTabTotals(displayTour).destinations + calculateTabTotals(displayTour).expenses + calculateTabTotals(displayTour).meals)}
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="allowances" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span className="sm:hidden">CTP</span>
                      <span className="hidden sm:inline">Công tác phí (CTP)</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {displayTour?.allowances?.length || 0} | {formatCurrency(calculateTabTotals(displayTour).allowances)}
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="summary" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span className="sm:hidden">TK</span>
                      <span className="hidden sm:inline">Tổng kết</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {formatCurrency(displayTour?.summary?.finalTotal ?? 0)}
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="shoppings" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span className="sm:hidden">Mua</span>
                      <span className="hidden sm:inline">Mua sắm</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {displayTour?.shoppings?.length || 0} | {formatCurrency(calculateTabTotals(displayTour).shoppings)}
                      </span>
                    </div>
                  </TabsTrigger>
                  {!isNewTour && (
                    <TabsTrigger value="images" className="text-xs sm:text-sm">
                      <div className="flex flex-col items-center">
                        <span className="sm:hidden">Ảnh</span>
                        <span className="hidden sm:inline">Hình ảnh</span>
                        <span className="text-xs sm:text-sm font-bold">
                          {tourImages.length}
                        </span>
                      </div>
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
            </div>

            {/* Tab contents */}
            <TabsContent value="info" className="animate-fade-in">
              {showWaterWarning && (
                <div className="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950 p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                        Thiếu chi phí nước uống
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Tour này chưa có dòng "Nước uống cho khách 10k/1 khách / 1 ngày". Vui lòng thêm chi phí này trong tab Chi phí.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="rounded-lg border bg-card p-6">
                <TourInfoForm initialData={isNewTour ? undefined : tour} onSubmit={handleInfoSave} showSubmitButton={false} />
              </div>
            </TabsContent>

            <TabsContent value="destinations" className="animate-fade-in">
              {showWaterWarning && (
                <div className="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950 p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                        Thiếu chi phí nước uống
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Tour này chưa có dòng "Nước uống cho khách 10k/1 khách / 1 ngày". Vui lòng thêm chi phí này trong tab Chi phí.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <DestinationsTab
                tourId={isNewTour ? undefined : id!}
                destinations={displayTour?.destinations || []}
                tour={displayTour}
                onChange={(dests) => {
                  if (isNewTour) {
                    setNewTourData({ ...newTourData, destinations: dests });
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="expenses" className="animate-fade-in">
              <ExpensesTab
                tourId={isNewTour ? undefined : id!}
                expenses={displayTour?.expenses || []}
                tour={displayTour}
                onChange={(exps) => {
                  if (isNewTour) {
                    setNewTourData({ ...newTourData, expenses: exps });
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="meals" className="animate-fade-in">
              {showWaterWarning && (
                <div className="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950 p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                        Thiếu chi phí nước uống
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Tour này chưa có dòng "Nước uống cho khách 10k/1 khách / 1 ngày". Vui lòng thêm chi phí này trong tab Chi phí.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <MealsTab
                tourId={isNewTour ? undefined : id!}
                meals={displayTour?.meals || []}
                tour={displayTour}
                onChange={(mls) => {
                  if (isNewTour) {
                    setNewTourData({ ...newTourData, meals: mls });
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="combined" className="animate-fade-in">
              {showWaterWarning && (
                <div className="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950 p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                        Thiếu chi phí nước uống
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Tour này chưa có dòng "Nước uống cho khách 10k/1 khách / 1 ngày". Vui lòng thêm chi phí này trong tab Chi phí.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <CombinedTab
                tour={displayTour}
              />
            </TabsContent>

            <TabsContent value="allowances" className="animate-fade-in">
              {showWaterWarning && (
                <div className="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950 p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                        Thiếu chi phí nước uống
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Tour này chưa có dòng "Nước uống cho khách 10k/1 khách / 1 ngày". Vui lòng thêm chi phí này trong tab Chi phí.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <AllowancesTab
                tourId={isNewTour ? undefined : id!}
                allowances={displayTour?.allowances || []}
                tour={displayTour}
                onChange={(allows) => {
                  if (isNewTour) {
                    setNewTourData({ ...newTourData, allowances: allows });
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="summary" className="animate-fade-in">
              {showWaterWarning && (
                <div className="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950 p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                        Thiếu chi phí nước uống
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Tour này chưa có dòng "Nước uống cho khách 10k/1 khách / 1 ngày". Vui lòng thêm chi phí này trong tab Chi phí.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <SummaryTab
                tour={displayTour as Tour}
                onSummaryUpdate={(summary) => {
                  if (isNewTour) {
                    setNewTourData({ ...newTourData, summary });
                  } else {
                    // Save to DB only when user edits input fields
                    // (advancePayment, collectionsForCompany, companyTip)
                    handleSummaryUpdate(summary);
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="shoppings" className="animate-fade-in">
              {showWaterWarning && (
                <div className="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950 p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                        Thiếu chi phí nước uống
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Tour này chưa có dòng "Nước uống cho khách 10k/1 khách / 1 ngày". Vui lòng thêm chi phí này trong tab Chi phí.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <ShoppingsTab
                tourId={isNewTour ? undefined : id!}
                shoppings={displayTour?.shoppings || []}
                tour={displayTour}
                onChange={(shops) => {
                  if (isNewTour) {
                    setNewTourData({ ...newTourData, shoppings: shops });
                  }
                }}
              />
            </TabsContent>
            <TabsContent value="images" className="animate-fade-in">
              {!isNewTour && tour && (
                <TourImagesTab tourId={id!} tourCode={tour.tourCode} />
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tour</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa tour này không? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default TourDetail;
