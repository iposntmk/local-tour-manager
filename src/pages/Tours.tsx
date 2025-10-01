import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Users, FileDown, Copy, Trash2 } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { exportTourToExcel, exportAllToursToExcel } from '@/lib/excel-utils';
import { ImportTourDialog } from '@/components/tours/ImportTourDialog';
import type { Tour } from '@/types/tour';

const Tours = () => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tours = [], isLoading } = useQuery({
    queryKey: ['tours', search],
    queryFn: () => store.listTours({ tourCode: search }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateTour(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success('Tour duplicated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteTour(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success('Tour deleted successfully');
    },
  });

  const handleExportAll = () => {
    if (tours.length === 0) {
      toast.error('No tours to export');
      return;
    }
    exportAllToursToExcel(tours);
    toast.success('All tours exported to Excel');
  };

  const handleExportSingle = (tour: Tour, e: React.MouseEvent) => {
    e.stopPropagation();
    exportTourToExcel(tour);
    toast.success(`Tour ${tour.tourCode} exported to Excel`);
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateMutation.mutate(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this tour?')) {
      deleteMutation.mutate(id);
    }
  };

  const importMutation = useMutation({
    mutationFn: async (tours: Partial<Tour>[]) => {
      const results = [];
      const errors = [];

      for (let i = 0; i < tours.length; i++) {
        const tour = tours[i];
        try {
          // Validate that required EntityRefs have valid IDs (not empty strings)
          if (!tour.companyRef?.id) {
            throw new Error('Company is required');
          }
          if (!tour.guideRef?.id) {
            throw new Error('Guide is required');
          }
          if (!tour.clientNationalityRef?.id) {
            throw new Error('Client nationality is required');
          }

          // Create the main tour record
          const createdTour = await store.createTour({
            tourCode: tour.tourCode!,
            companyRef: tour.companyRef,
            guideRef: tour.guideRef,
            clientNationalityRef: tour.clientNationalityRef,
            clientName: tour.clientName!,
            adults: tour.adults!,
            children: tour.children!,
            driverName: tour.driverName,
            clientPhone: tour.clientPhone,
            startDate: tour.startDate!,
            endDate: tour.endDate!,
          });

          // Add subcollections
          if (tour.destinations && tour.destinations.length > 0) {
            await Promise.all(
              tour.destinations.map(dest => store.addDestination(createdTour.id, dest))
            );
          }

          if (tour.expenses && tour.expenses.length > 0) {
            await Promise.all(
              tour.expenses.map(exp => store.addExpense(createdTour.id, exp))
            );
          }

          if (tour.meals && tour.meals.length > 0) {
            await Promise.all(
              tour.meals.map(meal => store.addMeal(createdTour.id, meal))
            );
          }

          if (tour.allowances && tour.allowances.length > 0) {
            await Promise.all(
              tour.allowances.map(allowance => store.addAllowance(createdTour.id, allowance))
            );
          }

          results.push(createdTour);
        } catch (error) {
          const tourCode = tour.tourCode || `Tour ${i + 1}`;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${tourCode}: ${errorMsg}`);
          console.error(`Failed to import ${tourCode}:`, error);
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }

      return results;
    },
    onSuccess: (results, tours) => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success(`${results.length} tour(s) imported successfully`);
    },
    onError: (error) => {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import tours';
      toast.error(errorMessage, { duration: 5000 });
    },
  });

  const handleImport = (tours: Partial<Tour>[]) => {
    importMutation.mutate(tours);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Tours</h1>
            <p className="text-muted-foreground">Manage your tours and itineraries</p>
          </div>
          <div className="flex gap-2">
            <ImportTourDialog onImport={handleImport} />
            <Button onClick={handleExportAll} variant="outline" className="hover-scale">
              <FileDown className="h-4 w-4 mr-2" />
              Export All
            </Button>
            <Button onClick={() => navigate('/tours/new')} className="hover-scale">
              <Plus className="h-4 w-4 mr-2" />
              New Tour
            </Button>
          </div>
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by tour code or client name..."
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tours.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No tours found. Create your first tour to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tours.map((tour, index) => (
              <div
                key={tour.id}
                onClick={() => navigate(`/tours/${tour.id}`)}
                className="rounded-lg border bg-card p-6 cursor-pointer hover:bg-accent/50 transition-all hover-scale animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-lg">{tour.tourCode}</h3>
                    <span className="text-xs text-muted-foreground">{tour.totalDays}d</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{tour.clientName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {tour.startDate} → {tour.endDate}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{tour.companyRef.nameAtBooking}</span>
                    <span className="font-medium">{tour.guideRef.nameAtBooking}</span>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => handleExportSingle(tour, e)}
                    >
                      <FileDown className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleDuplicate(tour.id, e)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => handleDelete(tour.id, e)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tours;
