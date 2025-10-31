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
      toast.success('Tour created successfully');
      navigate('/tours');
    },
    onError: (error: Error) => {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('unique') || errorMessage.includes('duplicate') || errorMessage.includes('tour_code')) {
        toast.error('This tour code already exists. Please use a different tour code.');
      } else {
        toast.error(error.message || 'Failed to create tour');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Tour> }) =>
      store.updateTour(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour', id] });
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success('Tour updated successfully');
    },
    onError: (error: Error) => {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('unique') || errorMessage.includes('duplicate') || errorMessage.includes('tour_code')) {
        toast.error('This tour code already exists. Please use a different tour code.');
      } else {
        toast.error(error.message || 'Failed to update tour');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteTour(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success('Tour deleted successfully');
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
      toast.error('Cannot export tour that has not been saved yet');
      return;
    }
    try {
      await exportTourToExcel(displayTour as Tour);
      toast.success('Tour exported to Excel successfully');
    } catch (error) {
      toast.error('Failed to export tour to Excel');
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
                      title="Back to tours list"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold truncate">
                      {isNewTour ? 'New Tour' : (tour?.tourCode || 'Tour Details')}
                    </h1>
                  </div>

                  <div className="flex gap-1 sm:gap-2 items-center flex-shrink-0">
                    {isNewTour && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleHeaderSave}
                        className="hover-scale h-10 px-4"
                        title="Save tour"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        <span>Save Tour</span>
                      </Button>
                    )}
                    {!isNewTour && activeTab === 'info' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleHeaderSave}
                        className="hover-scale h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4"
                        title="Save tour info"
                      >
                        <Save className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Save Info</span>
                      </Button>
                    )}
                    {!isNewTour && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        className="hover-scale h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4 bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900"
                        title="Export to Excel"
                      >
                        <FileDown className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Export Excel</span>
                      </Button>
                    )}
                    {!isNewTour && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialogOpen(true)}
                        className="hover-scale h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4"
                        title="Delete tour"
                      >
                        <Trash2 className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Tour Info Summary - Separate row for mobile responsiveness */}
                {displayTour && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm px-2 sm:px-0">
                    <div className="flex items-baseline gap-1">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-semibold">{displayTour.startDate && displayTour.endDate ? formatDateRangeDisplay(displayTour.startDate, displayTour.endDate) : '-'}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-muted-foreground">Days:</span>
                      <span className="font-semibold">{displayTour.totalDays || 0}</span>
                    </div>
                    <span className="text-muted-foreground hidden sm:inline">|</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-muted-foreground">Adults:</span>
                      <span className="font-semibold">{displayTour.adults || 0}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-muted-foreground">Children:</span>
                      <span className="font-semibold">{displayTour.children || 0}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-muted-foreground">Guests:</span>
                      <span className="font-semibold">{totalGuests}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 sm:pt-4">
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 gap-1 rounded-xl bg-background shadow-sm border p-0.5 sm:p-1 h-auto">
                  <TabsTrigger value="info" className="text-xs sm:text-sm">Info</TabsTrigger>
                  <TabsTrigger value="destinations" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span className="sm:hidden">Dest</span>
                      <span className="hidden sm:inline">Destinations</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {displayTour?.destinations?.length || 0} | {formatCurrency(calculateTabTotals(displayTour).destinations)}
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="expenses" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span className="sm:hidden">Exp</span>
                      <span className="hidden sm:inline">Expenses</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {displayTour?.expenses?.length || 0} | {formatCurrency(calculateTabTotals(displayTour).expenses)}
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="meals" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span>Meals</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {displayTour?.meals?.length || 0} | {formatCurrency(calculateTabTotals(displayTour).meals)}
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="combined" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span className="sm:hidden">D+E+M</span>
                      <span className="hidden sm:inline">Dest+Exp+Meals</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {formatCurrency(calculateTabTotals(displayTour).destinations + calculateTabTotals(displayTour).expenses + calculateTabTotals(displayTour).meals)}
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="allowances" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span className="sm:hidden">Allow</span>
                      <span className="hidden sm:inline">Allowances</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {displayTour?.allowances?.length || 0} | {formatCurrency(calculateTabTotals(displayTour).allowances)}
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="summary" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span className="sm:hidden">Sum</span>
                      <span className="hidden sm:inline">Summary</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {formatCurrency(displayTour?.summary?.finalTotal ?? 0)}
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="shoppings" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span className="sm:hidden">Shop</span>
                      <span className="hidden sm:inline">Shopping</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {displayTour?.shoppings?.length || 0} | {formatCurrency(calculateTabTotals(displayTour).shoppings)}
                      </span>
                    </div>
                  </TabsTrigger>
                  {!isNewTour && (
                    <TabsTrigger value="images" className="text-xs sm:text-sm">
                      <div className="flex flex-col items-center">
                        <span className="sm:hidden">Img</span>
                        <span className="hidden sm:inline">Images</span>
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
              <div className="rounded-lg border bg-card p-6">
                <TourInfoForm initialData={isNewTour ? undefined : tour} onSubmit={handleInfoSave} showSubmitButton={false} />
              </div>
            </TabsContent>

            <TabsContent value="destinations" className="animate-fade-in">
              <DestinationsTab
                tourId={isNewTour ? undefined : id!}
                destinations={displayTour?.destinations || []}
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
                onChange={(exps) => {
                  if (isNewTour) {
                    setNewTourData({ ...newTourData, expenses: exps });
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="meals" className="animate-fade-in">
              <MealsTab
                tourId={isNewTour ? undefined : id!}
                meals={displayTour?.meals || []}
                onChange={(mls) => {
                  if (isNewTour) {
                    setNewTourData({ ...newTourData, meals: mls });
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="combined" className="animate-fade-in">
              <CombinedTab
                tourId={isNewTour ? undefined : id!}
                tour={displayTour}
              />
            </TabsContent>

            <TabsContent value="allowances" className="animate-fade-in">
              <AllowancesTab
                tourId={isNewTour ? undefined : id!}
                allowances={displayTour?.allowances || []}
                onChange={(allows) => {
                  if (isNewTour) {
                    setNewTourData({ ...newTourData, allowances: allows });
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="summary" className="animate-fade-in">
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
              <ShoppingsTab
                tourId={isNewTour ? undefined : id!}
                shoppings={displayTour?.shoppings || []}
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
            <AlertDialogTitle>Delete Tour</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tour? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default TourDetail;
