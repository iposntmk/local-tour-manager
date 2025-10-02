import { Layout } from '@/components/Layout';
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Users, FileDown, Copy, Trash2, ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { exportTourToExcel, exportAllToursToExcel } from '@/lib/excel-utils';
import { ImportTourDialog } from '@/components/tours/ImportTourDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import type { Tour } from '@/types/tour';

const Tours = () => {
  const [search, setSearch] = useState('');
  const [nationalityFilter, setNationalityFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    const saved = localStorage.getItem('tours.filtersExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Save filters expanded state to localStorage
  useEffect(() => {
    localStorage.setItem('tours.filtersExpanded', JSON.stringify(filtersExpanded));
  }, [filtersExpanded]);

  const { data: tours = [], isLoading } = useQuery({
    queryKey: ['tours', search],
    queryFn: () => store.listTours({ tourCode: search }),
  });

  const { data: nationalities = [] } = useQuery({
    queryKey: ['nationalities'],
    queryFn: () => store.listNationalities({}),
  });

  // Filter tours by nationality and month
  const filteredTours = useMemo(() => {
    return tours.filter(tour => {
      // Nationality filter
      if (nationalityFilter !== 'all' && tour.clientNationalityRef.id !== nationalityFilter) {
        return false;
      }

      // Month filter
      if (monthFilter !== 'all') {
        const tourMonth = tour.startDate.substring(0, 7); // YYYY-MM format
        if (tourMonth !== monthFilter) {
          return false;
        }
      }

      return true;
    });
  }, [tours, nationalityFilter, monthFilter]);

  // Get unique months from tours
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    tours.forEach(tour => {
      const month = tour.startDate.substring(0, 7);
      months.add(month);
    });
    return Array.from(months).sort().reverse();
  }, [tours]);

  const toggleCardExpansion = (tourId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tourId)) {
        newSet.delete(tourId);
      } else {
        newSet.add(tourId);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setNationalityFilter('all');
    setMonthFilter('all');
  };

  const hasActiveFilters = nationalityFilter !== 'all' || monthFilter !== 'all';

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

  const { classes: headerClasses } = useHeaderMode('tours.headerMode');

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Sticky Header - Always pinned to top */}
        <div className={headerClasses}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Tours</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage your tours and itineraries</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
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

          {/* Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="h-8 w-8 p-0"
              >
                {filtersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>

            <div className={`transition-all duration-200 overflow-hidden ${filtersExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      Nationality
                    </label>
                    <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Nationalities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Nationalities</SelectItem>
                        {nationalities.map(nationality => (
                          <SelectItem key={nationality.id} value={nationality.id}>
                            {nationality.emoji} {nationality.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Month
                    </label>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Months" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {availableMonths.map(month => (
                          <SelectItem key={month} value={month}>
                            {new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="sm:self-end">
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Filter Results Info */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 text-sm mt-3">
                  <span className="text-muted-foreground">
                    Showing {filteredTours.length} of {tours.length} tours
                  </span>
                  {nationalityFilter !== 'all' && (
                    <Badge variant="secondary">
                      {nationalities.find(n => n.id === nationalityFilter)?.name}
                    </Badge>
                  )}
                  {monthFilter !== 'all' && (
                    <Badge variant="secondary">
                      {new Date(monthFilter + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredTours.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {tours.length === 0 ? 'No tours found. Create your first tour to get started.' : 'No tours match your filters.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTours.map((tour, index) => {
              const isExpanded = expandedCards.has(tour.id);
              return (
                <div
                  key={tour.id}
                  className="rounded-lg border bg-card p-4 sm:p-6 transition-all hover-scale animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 cursor-pointer" onClick={() => navigate(`/tours/${tour.id}`)}>
                        <h3 className="font-bold text-base sm:text-lg">{tour.tourCode}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {tour.clientNationalityRef.nameAtBooking}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{tour.totalDays}d</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => toggleCardExpansion(tour.id, e)}
                        className="h-8 w-8 p-0"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>

                    <div className="space-y-2 text-sm cursor-pointer" onClick={() => navigate(`/tours/${tour.id}`)}>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{tour.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {formatDate(tour.startDate)} → {formatDate(tour.endDate)}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="space-y-2 text-sm pt-2 border-t cursor-pointer" onClick={() => navigate(`/tours/${tour.id}`)}>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground text-xs">Company</span>
                            <p className="font-medium truncate">{tour.companyRef.nameAtBooking}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Guide</span>
                            <p className="font-medium truncate">{tour.guideRef.nameAtBooking}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Adults</span>
                            <p className="font-medium">{tour.adults}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Children</span>
                            <p className="font-medium">{tour.children}</p>
                          </div>
                          {tour.driverName && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground text-xs">Driver</span>
                              <p className="font-medium truncate">{tour.driverName}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!isExpanded && (
                      <div className="pt-3 border-t flex items-center justify-between text-sm cursor-pointer" onClick={() => navigate(`/tours/${tour.id}`)}>
                        <span className="text-muted-foreground truncate flex-1">{tour.companyRef.nameAtBooking}</span>
                        <span className="font-medium truncate ml-2">{tour.guideRef.nameAtBooking}</span>
                      </div>
                    )}

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
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tours;
