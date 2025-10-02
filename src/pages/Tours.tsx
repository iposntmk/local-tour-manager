import { Layout } from '@/components/Layout';
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Calendar,
  Users,
  FileDown,
  FileText,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Trash,
} from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { exportTourToExcel, exportAllToursToExcel } from '@/lib/excel-utils';
import { exportTourToTxt } from '@/lib/text-export';
import { ImportTourDialogEnhanced } from '@/components/tours/ImportTourDialogEnhanced';
import { handleImportError, validateTourData, createImportError } from '@/lib/error-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import type { Tour } from '@/types/tour';
import Fuse from 'fuse.js';

const Tours = () => {
  const [search, setSearch] = useState('');
  const [nationalityFilter, setNationalityFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    const saved = localStorage.getItem('tours.filtersExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20); // Show 20 tours per page
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Save filters expanded state to localStorage
  useEffect(() => {
    localStorage.setItem('tours.filtersExpanded', JSON.stringify(filtersExpanded));
  }, [filtersExpanded]);

  const { data: tours = [], isLoading } = useQuery({
    queryKey: ['tours', search],
    queryFn: () => store.listTours({ tourCode: search }, { includeDetails: false }),
    staleTime: 30000, // Consider data fresh for 30 seconds
    cacheTime: 300000, // Keep in cache for 5 minutes
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

  // Paginate filtered tours
  const paginatedTours = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTours.slice(startIndex, endIndex);
  }, [filteredTours, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTours.length / pageSize);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [nationalityFilter, monthFilter, search]);

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
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to duplicate tour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteTour(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success('Tour deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete tour');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllTours(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      toast.success('All tours deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete all tours');
    },
  });

  const handleDeleteAll = () => {
    if (confirm('Are you sure you want to delete ALL tours? This action cannot be undone.')) {
      deleteAllMutation.mutate();
    }
  };

  const fetchDetailedTour = async (tour: Tour): Promise<Tour> => {
    const detailedTour = await store.getTour(tour.id);
    if (!detailedTour) {
      throw new Error(`Unable to load details for tour ${tour.tourCode} from the database.`);
    }
    return detailedTour;
  };

  const handleExportAll = async () => {
    if (tours.length === 0) {
      toast.error('No tours to export');
      return;
    }

    try {
      const toursWithDetails = await store.listTours({ tourCode: search }, { includeDetails: true });

      if (toursWithDetails.length === 0) {
        toast.error('No tours to export');
        return;
      }

      await exportAllToursToExcel(toursWithDetails);
      toast.success('All tours exported to Excel');
    } catch (error) {
      console.error('Failed to export tours to Excel', error);
      toast.error('Failed to export tours to Excel. Please try again.');
    }
  };

  const handleExportSingle = async (tour: Tour, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const detailedTour = await fetchDetailedTour(tour);
      await exportTourToExcel(detailedTour);
      toast.success(`Tour ${tour.tourCode} exported to Excel`);
    } catch (error) {
      console.error(`Failed to export tour ${tour.tourCode} to Excel`, error);
      const message =
        error instanceof Error && error.message.includes('Unable to load details')
          ? error.message
          : 'Failed to export tour to Excel. Please try again.';
      toast.error(message);
    }
  };

  const handleExportTxt = async (tour: Tour, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const detailedTour = await fetchDetailedTour(tour);
      exportTourToTxt(detailedTour);
      toast.success(`Tour ${tour.tourCode} exported to TXT`);
    } catch (error) {
      console.error(`Failed to export tour ${tour.tourCode} to TXT`, error);
      const message =
        error instanceof Error && error.message.includes('Unable to load details')
          ? error.message
          : 'Failed to export tour to TXT. Please try again.';
      toast.error(message);
    }
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateMutation.mutate(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Delete button clicked for tour ID:', id);
    if (confirm('Are you sure you want to delete this tour?')) {
      console.log('User confirmed deletion for tour ID:', id);
      deleteMutation.mutate(id);
    } else {
      console.log('User cancelled deletion');
    }
  };

  // Normalize dates to YYYY-MM-DD for DB
  const normalizeDate = (input?: string) => {
    if (!input) return input as any;
    const s = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (s.includes('/')) {
      const [a, b, c] = s.split('/');
      if (a && b && c) {
        if (a.length === 4) {
          // YYYY/MM/DD
          return `${a}-${b.padStart(2,'0')}-${c.padStart(2,'0')}`;
        }
        if (c.length === 4) {
          // DD/MM/YYYY or MM/DD/YYYY -> infer by month > 12
          const nb = parseInt(b, 10);
          const na = parseInt(a, 10);
          const mm = nb > 12 ? a : b;
          const dd = nb > 12 ? b : a;
          return `${c}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
        }
      }
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}`;
    }
    return s; // fallback
  };

  const importMutation = useMutation({
    mutationFn: async (tours: Partial<Tour>[]) => {
      const results = [];
      const errors = [];
      const skipped: string[] = [];

      // Load existing tours to check for duplicates
      const existingTours = await store.listTours({});
      const existingTourCodes = new Set(existingTours.map(t => t.tourCode.toLowerCase()));

      // Load master data once for auto-matching fallback
      const [masterDestinations, masterExpenses, masterShoppings] = await Promise.all([
        store.listTouristDestinations({}),
        store.listDetailedExpenses({}),
        store.listShoppings({}),
      ]);
      // Create lookup maps for faster matching (much faster than Fuse.js for exact matches)
      const destMap = new Map(masterDestinations.map(d => [d.name.toLowerCase(), d]));
      const expMap = new Map(masterExpenses.map(e => [e.name.toLowerCase(), e]));
      const mealMap = new Map(masterShoppings.map(m => [m.name.toLowerCase(), m]));
      
      const autoMatch = (name: string, map: Map<string, any>) => {
        if (!name?.trim()) return null;
        return map.get(name.toLowerCase()) || null;
      };

      // Process all tours in parallel with concurrency limit
      const concurrencyLimit = 10; // Process 10 tours at a time
      const processWithConcurrency = async (tours: Partial<Tour>[], limit: number) => {
        const results: any[] = [];

        for (let i = 0; i < tours.length; i += limit) {
          const batch = tours.slice(i, i + limit);
          const batchResults = await Promise.all(
            batch.map(async (tour, batchIndex) => {
              const globalIndex = i + batchIndex;
          try {
            // Check for duplicate tour code
            if (tour.tourCode && existingTourCodes.has(tour.tourCode.toLowerCase())) {
              return {
                success: false,
                skipped: true,
                tourCode: tour.tourCode,
                error: `Tour with tour code "${tour.tourCode}" already exists`
              };
            }

            // Validate tour data before attempting to create
            const validation = validateTourData(tour);
            if (!validation.valid) {
              throw new Error(validation.errors.join(', '));
            }

            // Clean matched properties and normalize dates + apply auto-match fallback
            const cleanDestinations = tour.destinations?.map(({ matchedId, matchedPrice, ...dest }) => {
              const normalized = { ...dest, date: normalizeDate(dest.date) } as any;
              if ((!normalized.price || normalized.price === 0) && normalized.name) {
                const m = autoMatch(normalized.name, destMap);
                if (m) {
                  normalized.name = m.name;
                  normalized.price = Number(m.price) || 0;
                }
              }
              return normalized;
            });
            const cleanExpenses = tour.expenses?.map(({ matchedId, matchedPrice, ...exp }) => {
              const normalized = { ...exp, date: normalizeDate(exp.date) } as any;
              if ((!normalized.price || normalized.price === 0) && normalized.name) {
                const m = autoMatch(normalized.name, expMap);
                if (m) {
                  normalized.name = m.name;
                  normalized.price = Number(m.price) || 0;
                }
              }
              return normalized;
            });
            const cleanMeals = tour.meals?.map(({ matchedId, matchedPrice, ...meal }) => {
              const normalized = { ...meal, date: normalizeDate(meal.date) } as any;
              if ((!normalized.price || normalized.price === 0) && normalized.name) {
                const m = autoMatch(normalized.name, mealMap);
                if (m) {
                  normalized.name = m.name;
                  normalized.price = Number(m.price) || 0;
                }
              }
              return normalized;
            });
            const cleanAllowances = tour.allowances?.map((allow) => ({
              ...allow,
              date: normalizeDate(allow.date),
            }));

            // Create the tour with all subcollections in one call
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
              startDate: normalizeDate(tour.startDate!)!,
              endDate: normalizeDate(tour.endDate!)!,
              destinations: cleanDestinations,
              expenses: cleanExpenses,
              meals: cleanMeals,
              allowances: cleanAllowances,
              summary: tour.summary,
            });

            return { success: true, tour: createdTour };
          } catch (error) {
            const tourCode = tour.tourCode || `Tour ${globalIndex + 1}`;
            const context = {
              operation: 'importTour',
              tourCode,
              tourIndex: globalIndex,
              data: tour,
              timestamp: new Date().toISOString(),
            };

            const errorMsg = handleImportError(error, context);
            return { success: false, error: `${tourCode}: ${errorMsg}` };
          }
            })
          );

          results.push(...batchResults);

          // Show progress for large imports
          if (tours.length > 10) {
            const processed = Math.min(i + limit, tours.length);
            const progress = Math.round((processed / tours.length) * 100);
            toast.message(`Importing tours... ${progress}% (${processed}/${tours.length})`, { duration: 1000 });
          }
        }

        return results;
      };

      const allResults = await processWithConcurrency(tours, concurrencyLimit);

      // Separate successes, errors, and skipped tours
      allResults.forEach(result => {
        if (result.success) {
          results.push(result.tour);
        } else if (result.skipped) {
          skipped.push(result.tourCode || 'Unknown');
        } else {
          errors.push(result.error);
        }
      });

      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }

      return { imported: results, skipped };
    },
    onSuccess: async (result, tours) => {
      const { imported, skipped } = result;

      // Instead of invalidating, directly set the query data to avoid refetching
      await queryClient.cancelQueries({ queryKey: ['tours'] });

      const previousTours = queryClient.getQueryData<Tour[]>(['tours']) || [];
      const newTours = [...previousTours, ...imported];

      // Update cache directly
      queryClient.setQueryData(['tours'], newTours);

      // Show success message with details
      if (skipped.length > 0) {
        toast.success(
          `${imported.length} tour(s) imported successfully. ${skipped.length} tour(s) skipped (already exist): ${skipped.join(', ')}`,
          { duration: 8000 }
        );
      } else {
        toast.success(`${imported.length} tour(s) imported successfully`);
      }
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
              <ImportTourDialogEnhanced onImport={handleImport} />
              <Button onClick={handleExportAll} variant="outline" className="hover-scale">
                <FileDown className="h-4 w-4 mr-2" />
                Export All
              </Button>
              <Button onClick={handleDeleteAll} variant="outline" className="hover-scale text-destructive hover:text-destructive">
                <Trash className="h-4 w-4 mr-2" />
                Delete All
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
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="ml-auto h-8 w-8 p-0"
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
            {paginatedTours.map((tour, index) => {
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

                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => handleExportSingle(tour, e)}
                      >
                        <FileDown className="h-3 w-3 mr-1" />
                        Export Excel
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => handleExportTxt(tour, e)}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Export TXT
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
                        disabled={deleteMutation.isPending}
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (pageNum > totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Pagination Info */}
        {filteredTours.length > 0 && (
          <div className="text-center text-sm text-muted-foreground mt-4">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredTours.length)} of {filteredTours.length} tours
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tours;
