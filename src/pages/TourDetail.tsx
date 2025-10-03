import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TourForm } from '@/components/tours/TourForm';
import { TourInfoForm } from '@/components/tours/TourInfoForm';
import { DestinationsTab } from '@/components/tours/DestinationsTab';
import { ExpensesTab } from '@/components/tours/ExpensesTab';
import { MealsTab } from '@/components/tours/MealsTab';
import { AllowancesTab } from '@/components/tours/AllowancesTab';
import { SummaryTab } from '@/components/tours/SummaryTab';
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
import type { Tour, TourInput, Destination, Expense, Meal, Allowance, TourSummary } from '@/types/tour';
import { formatDateDMY } from '@/lib/date-utils';

const TourDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<TourInput> | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  
  const isNewTour = id === 'new';

  const { data: tour, isLoading } = useQuery({
    queryKey: ['tour', id],
    queryFn: () => store.getTour(id!),
    enabled: !isNewTour,
  });

  const createMutation = useMutation({
    mutationFn: async (input: TourInput & { destinations: Destination[]; expenses: Expense[]; meals: Meal[]; allowances: Allowance[]; summary: TourSummary }) => {
      // Pass subcollections directly to createTour - it will handle them internally
      const createdTour = await store.createTour(input);
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

  const handleSave = (data: TourInput & { destinations: Destination[]; expenses: Expense[]; meals: Meal[]; allowances: Allowance[]; summary: TourSummary }) => {
    if (isNewTour) {
      createMutation.mutate(data);
    } else if (id) {
      // For updates, only update the basic tour info (not subcollections here)
      const { destinations, expenses, meals, allowances, ...tourInput } = data;
      updateMutation.mutate({ id, patch: { ...tourInput, summary: data.summary } });
    }
  };

  const handleInfoSave = (data: TourInput) => {
    if (id && !isNewTour) {
      updateMutation.mutate({ id, patch: data });
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
    // Only show Save button for Info tab
    // Other tabs (destinations, expenses, meals, allowances) auto-save
    // Summary tab is read-only
    return activeTab === 'info';
  };

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
      <div className="space-y-6 animate-fade-in">
        {isNewTour ? (
          <>
            {/* Header without tabs for new tour */}
            <div className={headerClasses}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/tours')}
                    className="hover-scale"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h1 className="text-lg sm:text-2xl md:text-3xl font-bold">New Tour</h1>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Create a new tour</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 sm:p-6 animate-scale-in">
              <TourForm onSubmit={handleSave} />
            </div>
          </>
        ) : tour ? (
          <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            {/* Header with tabs inside Tabs context */}
            <div className={headerClasses}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/tours')}
                    className="hover-scale h-9 w-9 sm:h-10 sm:w-10"
                    title="Back to tours list"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                  <div>
                    <h1 className="text-lg sm:text-2xl md:text-3xl font-bold">
                      {tour?.tourCode || 'Tour Details'}
                      {tour?.startDate && tour?.endDate && (
                        <span className="ml-2 text-sm sm:text-base text-muted-foreground">
                          | {formatDateDMY(tour.startDate)} - {formatDateDMY(tour.endDate)}
                        </span>
                      )}
                    </h1>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Manage tour information</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {shouldShowSaveButton() && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleHeaderSave}
                      className="hover-scale"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Info
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="hover-scale"
                  >
                    <Trash2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </div>

              <div className="pt-4">
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1 rounded-xl bg-background shadow-sm border p-1 h-auto">
                  <TabsTrigger value="info" className="text-xs sm:text-sm">Info</TabsTrigger>
                  <TabsTrigger value="destinations" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span>Destinations</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {tour.destinations?.length || 0} | {(tour.destinations.reduce((sum, d) => sum + (d.price * tour.totalGuests), 0) / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="expenses" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span>Expenses</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {tour.expenses?.length || 0} | {(tour.expenses.reduce((sum, e) => sum + (e.price * tour.totalGuests), 0) / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="meals" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span>Meals</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {tour.meals?.length || 0} | {(tour.meals.reduce((sum, m) => sum + (m.price * tour.totalGuests), 0) / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="allowances" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span>Allowances</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {tour.allowances?.length || 0} | {(tour.allowances.reduce((sum, a) => sum + (a.price * (a.quantity || 1)), 0) / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="summary" className="text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <span>Summary</span>
                      <span className="text-xs sm:text-sm font-bold">
                        {
                          ((tour.destinations?.length || 0) +
                           (tour.expenses?.length || 0) +
                           (tour.meals?.length || 0) +
                           (tour.allowances?.length || 0))
                        } | {
                          ((tour.destinations.reduce((sum, d) => sum + (d.price * tour.totalGuests), 0) +
                            tour.expenses.reduce((sum, e) => sum + (e.price * tour.totalGuests), 0) +
                            tour.meals.reduce((sum, m) => sum + (m.price * tour.totalGuests), 0) +
                            tour.allowances.reduce((sum, a) => sum + (a.price * (a.quantity || 1)), 0)) / 1000).toFixed(0)
                        }k
                      </span>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* Tab contents */}
            <TabsContent value="info" className="animate-fade-in">
              <div className="rounded-lg border bg-card p-6">
                <TourInfoForm initialData={tour} onSubmit={handleInfoSave} showSubmitButton={false} />
              </div>
            </TabsContent>

            <TabsContent value="destinations" className="animate-fade-in">
              <DestinationsTab tourId={tour.id} destinations={tour.destinations} />
            </TabsContent>

            <TabsContent value="expenses" className="animate-fade-in">
              <ExpensesTab tourId={tour.id} expenses={tour.expenses} />
            </TabsContent>

            <TabsContent value="meals" className="animate-fade-in">
              <MealsTab tourId={tour.id} meals={tour.meals} />
            </TabsContent>

            <TabsContent value="allowances" className="animate-fade-in">
              <AllowancesTab tourId={tour.id} allowances={tour.allowances} />
            </TabsContent>

            <TabsContent value="summary" className="animate-fade-in">
              <SummaryTab tour={tour} onSummaryUpdate={handleSummaryUpdate} />
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
