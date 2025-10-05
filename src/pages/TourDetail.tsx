import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
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
import { toast } from 'sonner';
import { useHeaderMode } from '@/hooks/useHeaderMode';
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
import { formatDateDMY } from '@/lib/date-utils';

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
            <div className={`${headerClasses} border-b pb-4 pt-4 bg-blue-100 dark:bg-blue-900 sticky top-[57px] z-40`}>
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2 flex-shrink min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/tours')}
                    className="hover-scale h-8 w-8 flex-shrink-0"
                    title="Back to tours list"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-2xl md:text-3xl font-bold truncate">
                      {isNewTour ? 'New Tour' : (tour?.tourCode || 'Tour Details')}
                    </h1>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground truncate">
                      {isNewTour ? 'Create a new tour' : 'Manage tour information'}
                    </p>
                  </div>
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

              {/* Tour Info Summary - Always Visible */}
              {displayTour && (
                <div className="mt-4 p-4 rounded-lg border bg-card">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Start Date</p>
                      <p className="text-sm font-semibold">{displayTour.startDate ? new Date(displayTour.startDate).toLocaleDateString('en-GB') : '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">End Date</p>
                      <p className="text-sm font-semibold">{displayTour.endDate ? new Date(displayTour.endDate).toLocaleDateString('en-GB') : '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Days</p>
                      <p className="text-sm font-semibold">{displayTour.totalDays || 0} {displayTour.totalDays === 1 ? 'day' : 'days'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Adults</p>
                      <p className="text-sm font-semibold">{displayTour.adults || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Children</p>
                      <p className="text-sm font-semibold">{displayTour.children || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Guests</p>
                      <p className="text-sm font-semibold">{totalGuests}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 gap-1 rounded-xl bg-background shadow-sm border p-1 h-auto">
                  <TabsTrigger value="info" className="text-xs sm:text-sm">Info</TabsTrigger>
                  <TabsTrigger value="destinations" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span>Destinations</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {displayTour?.destinations?.length || 0} | {((displayTour?.destinations || []).reduce((sum, d) => sum + (d.price * totalGuests), 0) / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="expenses" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span>Expenses</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {displayTour?.expenses?.length || 0} | {((displayTour?.expenses || []).reduce((sum, e) => sum + (e.price * totalGuests), 0) / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="meals" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span>Meals</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {displayTour?.meals?.length || 0} | {((displayTour?.meals || []).reduce((sum, m) => sum + (m.price * totalGuests), 0) / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="shoppings" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span>Shopping</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {displayTour?.shoppings?.length || 0} | {((displayTour?.shoppings || []).reduce((sum, s) => sum + s.price, 0) / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="allowances" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span>Allowances</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {displayTour?.allowances?.length || 0} | {((displayTour?.allowances || []).reduce((sum, a) => sum + (a.price * (a.quantity || 1)), 0) / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="summary" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span>Summary</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {
                          ((displayTour?.destinations?.length || 0) +
                           (displayTour?.expenses?.length || 0) +
                           (displayTour?.meals?.length || 0) +
                           (displayTour?.shoppings?.length || 0) +
                           (displayTour?.allowances?.length || 0))
                        } | {
                          (((displayTour?.destinations || []).reduce((sum, d) => sum + (d.price * totalGuests), 0) +
                            (displayTour?.expenses || []).reduce((sum, e) => sum + (e.price * totalGuests), 0) +
                            (displayTour?.meals || []).reduce((sum, m) => sum + (m.price * totalGuests), 0) +
                            (displayTour?.shoppings || []).reduce((sum, s) => sum + s.price, 0) +
                            (displayTour?.allowances || []).reduce((sum, a) => sum + (a.price * (a.quantity || 1)), 0)) / 1000).toFixed(0)
                        }k
                      </span>
                    </div>
                  </TabsTrigger>
                  {!isNewTour && (
                    <TabsTrigger value="images" className="text-xs sm:text-sm">
                      Images
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
                    handleSummaryUpdate(summary);
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
