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
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Trash,
  ArrowUpDown,
  Upload,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { SearchInput } from '@/components/master/SearchInput';

// Define ProcessResult type for bulk import
type ProcessResult = 
  | { success: true; tour: Tour }
  | { success: false; skipped: true; tourCode?: string; error: string }
  | { success: false; skipped?: false; error: string };
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { exportTourToExcel, exportAllToursToMonthlyZip, exportAllToursToExcel } from '@/lib/excel-utils';
import { ImportTourDialogEnhanced } from '@/components/tours/ImportTourDialogEnhanced';
import { handleImportError, validateTourData, createImportError } from '@/lib/error-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { formatDateDMY, formatDateRangeDisplay } from '@/lib/date-utils';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import type { Tour, TourListResult, TourQuery } from '@/types/tour';
import Fuse from 'fuse.js';


// Truncate helper with ellipsis included in `max` length
const truncateText = (text: string | undefined | null, max = 15): string => {
  if (!text) return '';
  if (text.length <= max) return text;
  if (max <= 3) return text.slice(0, max);
  return text.slice(0, max - 3) + '...';
};

const Tours = () => {
  // Separate search inputs for code, date (dd-mm), and company
  const [searchCode, setSearchCode] = useState(() => localStorage.getItem('tours.search.code') || '');
  const [searchDate, setSearchDate] = useState(() => localStorage.getItem('tours.search.date') || '');
  const [searchCompany, setSearchCompany] = useState(() => localStorage.getItem('tours.search.company') || '');
  const [nationalityFilter, setNationalityFilter] = useState<string>(() => {
    const saved = localStorage.getItem('tours.nationalityFilter');
    return saved || 'all';
  });
  const [monthFilter, setMonthFilter] = useState<string>(() => {
    const saved = localStorage.getItem('tours.monthFilter');
    return saved || 'all';
  });
  const [sortBy, setSortBy] = useState<string>(() => {
    const saved = localStorage.getItem('tours.sortBy');
    return saved || 'startDate-asc';
  });
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    const saved = localStorage.getItem('tours.filtersExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20; // Show 20 tours per page
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Save filter states to localStorage
  useEffect(() => { localStorage.setItem('tours.search.code', searchCode); }, [searchCode]);
  useEffect(() => { localStorage.setItem('tours.search.date', searchDate); }, [searchDate]);
  useEffect(() => { localStorage.setItem('tours.search.company', searchCompany); }, [searchCompany]);

  useEffect(() => {
    localStorage.setItem('tours.nationalityFilter', nationalityFilter);
  }, [nationalityFilter]);

  useEffect(() => {
    localStorage.setItem('tours.monthFilter', monthFilter);
  }, [monthFilter]);

  useEffect(() => {
    localStorage.setItem('tours.sortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('tours.filtersExpanded', JSON.stringify(filtersExpanded));
  }, [filtersExpanded]);

  const baseTourQuery = useMemo((): TourQuery => {
    const query: TourQuery = {};
    const code = searchCode.trim();
    const date = searchDate.trim();
    const company = searchCompany.trim();

    if (code) {
      query.tourCodeLike = code;
    }
    if (date) {
      const m = date.match(/^(\d{1,2})[\/-](\d{1,2})$/);
      if (m) {
        const dd = m[1].padStart(2, '0');
        const mm = m[2].padStart(2, '0');
        // Primary: interpret as dd-mm -> -MM-DD
        query.dateLike = `-${mm}-${dd}`;
        // Alternate fallback: if user expectation was mm-dd
        query.dateLike2 = `-${dd}-${mm}`;
        // Also include raw user's input to honor %string% contains semantics
        query.dateRawLike = date;
      } else {
        // Fallback: accept raw substring
        query.dateLike = date;
        query.dateRawLike = date;
      }
    }
    if (company) {
      query.companyNameLike = company;
    }

    if (nationalityFilter !== 'all') {
      query.nationalityId = nationalityFilter;
    }

    if (monthFilter !== 'all') {
      // Filter by start date month only
      const [yearStr, monthStr] = monthFilter.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      if (!Number.isNaN(year) && !Number.isNaN(month)) {
        // Set both startDate and endDate to cover the entire month for start dates
        query.startDate = `${monthFilter}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        query.endDate = `${monthFilter}-${String(lastDay).padStart(2, '0')}`;
      }
    }

    // Add sorting to query
    const [field, order] = sortBy.split('-');
    query.sortBy = field as any;
    query.sortOrder = order as 'asc' | 'desc';

    return query;
  }, [searchCode, searchDate, searchCompany, nationalityFilter, monthFilter, sortBy]);

  const {
    data: toursResult,
    isLoading,
  } = useQuery({
    queryKey: ['tours', baseTourQuery, currentPage, pageSize],
    queryFn: () =>
      store.listTours(
        {
          ...baseTourQuery,
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
        },
        { includeDetails: false }
      ),
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // No need for client-side sorting anymore - database handles it
  const tours = (toursResult as TourListResult | undefined)?.tours ?? [];

  const totalTours = (toursResult as TourListResult | undefined)?.total ?? 0;
  const totalPages = totalTours > 0 ? Math.ceil(totalTours / pageSize) : 1;

  const { data: nationalities = [] } = useQuery({
    queryKey: ['nationalities'],
    queryFn: () => store.listNationalities({}),
  });

  // Removed bulk expense query (feature removed)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [nationalityFilter, monthFilter, searchCode, searchDate, searchCompany]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Get unique months from tours
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    tours.forEach(tour => {
      const month = tour.startDate.substring(0, 7);
      months.add(month);
    });
    return Array.from(months).sort().reverse();
  }, [tours]);


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

  // Commented out: deleteAllTours method doesn't exist in store
  // const deleteAllMutation = useMutation({
  //   mutationFn: () => store.deleteAllTours(),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['tours'] });
  //     toast.success('All tours deleted successfully');
  //   },
  //   onError: (error: Error) => {
  //     toast.error(error.message || 'Failed to delete all tours');
  //   },
  // });

  const handleDeleteAll = () => {
    toast.warning('Bulk delete not available. Please delete tours individually.');
  };

  // Removed saveAllTourInfoMutation (feature removed)

  // Removed addExpensesToAllMutation (feature removed)

  const fetchDetailedTour = async (tour: Tour): Promise<Tour> => {
    const detailedTour = await store.getTour(tour.id);
    if (!detailedTour) {
      throw new Error(`Unable to load details for tour ${tour.tourCode} from the database.`);
    }
    return detailedTour;
  };

  const handleExportAll = async () => {
    if (totalTours === 0) {
      toast.error('No tours to export');
      return;
    }

    try {
      const { tours: toursWithDetails } = await store.listTours({ ...baseTourQuery }, { includeDetails: true });

      if (toursWithDetails.length === 0) {
        toast.error('No tours to export');
        return;
      }

      await exportAllToursToMonthlyZip(toursWithDetails);
      toast.success('All tours exported by month (ZIP)');
    } catch (error) {
      console.error('Failed to export tours to Excel', error);
      toast.error('Failed to export tours ZIP. Please try again.');
    }
  };

  const handleExportAllSingle = async () => {
    if (totalTours === 0) {
      toast.error('No tours to export');
      return;
    }

    try {
      const { tours: toursWithDetails } = await store.listTours({ ...baseTourQuery }, { includeDetails: true });

      if (toursWithDetails.length === 0) {
        toast.error('No tours to export');
        return;
      }

      await exportAllToursToExcel(toursWithDetails);
      toast.success('All tours exported to a single Excel sheet');
    } catch (error) {
      console.error('Failed to export all tours to single Excel', error);
      toast.error('Failed to export single Excel. Please try again.');
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

      const matchesQueryFilters = (query: TourQuery | undefined, tour: Tour) => {
        if (!query) return true;

        if (query.tourCode && !tour.tourCode.toLowerCase().includes(query.tourCode.toLowerCase())) {
          return false;
        }

        if (query.clientName && !tour.clientName.toLowerCase().includes(query.clientName.toLowerCase())) {
          return false;
        }

        if (query.companyId && tour.companyRef?.id !== query.companyId) {
          return false;
        }

        if (query.guideId && tour.guideRef?.id !== query.guideId) {
          return false;
        }

        if (query.nationalityId && tour.clientNationalityRef?.id !== query.nationalityId) {
          return false;
        }

        if (query.startDate && tour.startDate < query.startDate) {
          return false;
        }

        if (query.endDate && tour.endDate > query.endDate) {
          return false;
        }

        return true;
      };

      const appendTourToCache = (newTour: Tour) => {
        const queries = queryClient.getQueriesData<TourListResult>({ queryKey: ['tours'] });

        queries.forEach(([queryKey, data]) => {
          if (!data) return;
          if (!Array.isArray(queryKey)) return;

          const baseQuery = (queryKey[1] ?? undefined) as TourQuery | undefined;
          if (!matchesQueryFilters(baseQuery, newTour)) {
            return;
          }

          const currentPageKey = queryKey[2] as number | undefined;
          const pageSizeKey = queryKey[3] as number | undefined;
          const updatedTotal = data.total + 1;

          if (currentPageKey && currentPageKey > 1) {
            queryClient.setQueryData(queryKey, {
              tours: data.tours,
              total: updatedTotal,
            });
            return;
          }

          const dedupedTours = data.tours.filter(tourItem => tourItem.id !== newTour.id);
          const orderedTours = [...dedupedTours, newTour].sort((a, b) =>
            (b.startDate ?? '').localeCompare(a.startDate ?? '')
          );
          const limit = typeof pageSizeKey === 'number' ? pageSizeKey : undefined;
          const limitedTours = typeof limit === 'number' ? orderedTours.slice(0, limit) : orderedTours;

          queryClient.setQueryData(queryKey, {
            tours: limitedTours,
            total: updatedTotal,
          });
        });
      };

      type ProcessResult =
        | { success: true; tour: Tour }
        | { success: false; error: string; skipped?: false }
        | { success: false; skipped: true; tourCode?: string; error: string };

      let processedCount = 0;
      let successCount = 0;
      let skippedCount = 0;
      let progressToastId: string | number | undefined;

      const updateProgressToast = () => {
        if (tours.length <= 10) return;
        const progress = Math.round((processedCount / tours.length) * 100);
        const descriptionParts = [`${successCount}/${tours.length} imported`];
        if (skippedCount > 0) {
          descriptionParts.push(`${skippedCount} skipped`);
        }

        progressToastId = toast.message(`Importing tours... ${progress}%`, {
          id: progressToastId,
          description: descriptionParts.join(' • '),
          duration: 1000,
        });
      };

      // Load existing tours to check for duplicates
      const { tours: existingTours } = await store.listTours({});
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
      const processWithConcurrency = async (toursToProcess: Partial<Tour>[], limit: number) => {
        const aggregatedResults: ProcessResult[] = [];

        const recordResult = <T extends ProcessResult>(result: T): T => {
          aggregatedResults.push(result);
          processedCount += 1;
          if (result.success) {
            successCount += 1;
          } else if ('skipped' in result && result.skipped) {
            skippedCount += 1;
          }
          updateProgressToast();
          return result;
        };

        for (let i = 0; i < toursToProcess.length; i += limit) {
          const batch = toursToProcess.slice(i, i + limit);
          await Promise.all(
            batch.map(async (tour, batchIndex) => {
              const globalIndex = i + batchIndex;

              // Check for duplicate tour code
              if (tour.tourCode && existingTourCodes.has(tour.tourCode.toLowerCase())) {
                return recordResult({
                  success: false,
                  skipped: true,
                  tourCode: tour.tourCode,
                  error: `Tour with tour code "${tour.tourCode}" already exists`,
                });
              }

              try {
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
                const cleanAllowances = tour.allowances?.map(({ matchedId, matchedPrice, ...allow }: any) => {
                  const normalized = { ...allow, date: normalizeDate(allow.date) } as any;
                  if ((!normalized.price || normalized.price === 0) && normalized.name) {
                    const m = autoMatch(normalized.name, expMap);
                    if (m) {
                      normalized.name = m.name;
                      normalized.price = Number(m.price) || 0;
                    }
                  }
                  return normalized;
                });

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

                appendTourToCache(createdTour);
                if (tour.tourCode) {
                  existingTourCodes.add(tour.tourCode.toLowerCase());
                }

                return recordResult({ success: true, tour: createdTour });
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
                return recordResult({ success: false, error: `${tourCode}: ${errorMsg}` });
              }
            })
          );
        }

        return aggregatedResults;
      };

      const allResults = await processWithConcurrency(tours, concurrencyLimit);

      // Separate successes, errors, and skipped tours
      allResults.forEach(result => {
        if (result.success) {
          results.push(result.tour);
        } else if ('skipped' in result && result.skipped) {
          skipped.push(('tourCode' in result ? result.tourCode : undefined) || 'Unknown');
        } else if (!result.success && 'error' in result) {
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

      await queryClient.invalidateQueries({ queryKey: ['tours'] });

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
      <div className="animate-fade-in">
        {/* Sticky Header - Always pinned to top */}
        <div className={`${headerClasses} border-b pb-4 pt-4 bg-gray-100 dark:bg-gray-900 sticky top-[57px] z-40 space-y-4`}>
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex-shrink min-w-0">
              <h1 className="text-base sm:text-2xl md:text-3xl font-bold">Tours</h1>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground truncate">Manage your tours and itineraries</p>
            </div>
            <div className="flex gap-1 sm:gap-2 items-center flex-shrink-0">
              <ImportTourDialogEnhanced
                onImport={handleImport}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover-scale h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4"
                  >
                    <Upload className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Import</span>
                  </Button>
                }
              />
              <Button
                onClick={handleExportAll}
                variant="outline"
                size="sm"
                className="hover-scale h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4"
                title="Export all tours into folders by month (ZIP)"
              >
                <FileDown className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export All Tours → Folders</span>
              </Button>
              <Button
                onClick={handleExportAllSingle}
                variant="outline"
                size="sm"
                className="hover-scale h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4"
                title="Export all tours to 1 Excel file (single sheet with grand total)"
              >
                <FileDown className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export All Tours → Single Sheet</span>
              </Button>
              {/* <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover-scale h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4"
                    title="Recalculate and save totalDays and totalGuests for all tours"
                  >
                    <Save className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Save All Tour Info</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Save All Tour Info & Summaries?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will recalculate and update for all tours:
                      <ul className="list-disc ml-4 mt-2">
                        <li><strong>totalDays</strong> and <strong>totalGuests</strong> from dates and guest counts</li>
                        <li><strong>Summary financials</strong> (Total Tabs, Final Total, etc.) from destinations, expenses, meals, and allowances</li>
                      </ul>
                      <div className="mt-2">This ensures all tour cards display the correct information, including the Final Total.</div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => saveAllTourInfoMutation.mutate()}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Save All Info & Summaries
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog> */}
              {/* <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover-scale h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4"
                    title={bulkExpense ? `Add "${bulkExpense.name}" to all tours` : 'Add Expenses to All'}
                  >
                    <PlusCircle className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Expenses to All</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sync Expenses to All Tours?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will sync <strong>"{bulkExpense?.name || 'the selected expense'}"</strong> for all tours to match their total days.
                      <div className="mt-2">
                        • If a tour has <strong>fewer</strong> rows than total days: missing rows will be added
                      </div>
                      <div>
                        • If a tour has <strong>more</strong> rows than total days: excess rows will be removed
                      </div>
                      <div>
                        • If a tour already has the correct number of rows: it will be skipped
                      </div>
                      {bulkExpense && <div className="mt-2">Price per expense: <strong>{bulkExpense.price.toLocaleString()} ₫</strong></div>}
                      <div className="mt-2 text-destructive">This action cannot be undone.</div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => addExpensesToAllMutation.mutate()}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Sync Expenses
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog> */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover-scale text-destructive hover:text-destructive h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4"
                  >
                    <Trash className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Delete All</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all tours from the database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete All Tours
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                onClick={() => navigate('/tours/new')}
                size="sm"
                className="hover-scale h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New Tour</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <SearchInput
              value={searchCode}
              onChange={setSearchCode}
              placeholder="Search tour code..."
            />
            <SearchInput
              value={searchDate}
              onChange={setSearchDate}
              placeholder="Search start date (dd-mm)"
            />
            <SearchInput
              value={searchCompany}
              onChange={setSearchCompany}
              placeholder="Search company..."
            />
          </div>

          {/* Filters */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-2">
                <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Filters</span>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="ml-auto h-7 w-7 p-0 sm:h-8 sm:w-8"
              >
                {filtersExpanded ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />}
              </Button>
            </div>

            <div className={`transition-all duration-200 overflow-hidden ${filtersExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      Nationality
                    </label>
                    <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
                      <SelectTrigger className="h-8 sm:h-10">
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
                      <SelectTrigger className="h-8 sm:h-10">
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

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <ArrowUpDown className="h-3 w-3" />
                      Sort By
                    </label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-8 sm:h-10">
                        <SelectValue placeholder="Sort by..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="startDate-desc">Start Date (Newest First)</SelectItem>
                        <SelectItem value="startDate-asc">Start Date (Oldest First)</SelectItem>
                        <SelectItem value="endDate-desc">End Date (Newest First)</SelectItem>
                        <SelectItem value="endDate-asc">End Date (Oldest First)</SelectItem>
                        <SelectItem value="tourCode-asc">Tour Code (A-Z)</SelectItem>
                        <SelectItem value="tourCode-desc">Tour Code (Z-A)</SelectItem>
                        <SelectItem value="clientName-asc">Client Name (A-Z)</SelectItem>
                        <SelectItem value="clientName-desc">Client Name (Z-A)</SelectItem>
                        <SelectItem value="createdAt-desc">Created (Newest First)</SelectItem>
                        <SelectItem value="createdAt-asc">Created (Oldest First)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="h-8 sm:h-10 sm:self-end">
                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Filter Results Info */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-base sm:text-lg font-semibold">
                    Showing {tours.length} of {totalTours} tours
                  </span>
                  {nationalityFilter !== 'all' && (
                    <Badge variant="secondary" className="text-sm font-medium">
                      {nationalities.find(n => n.id === nationalityFilter)?.name}
                    </Badge>
                  )}
                  {monthFilter !== 'all' && (
                    <Badge variant="default" className="text-sm sm:text-base font-semibold px-3 py-1">
                      {new Date(monthFilter + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : totalTours === 0 ? (
          <div className="text-center py-12 text-muted-foreground mt-6">
            {!hasActiveFilters && !(searchCode.trim() || searchDate.trim() || searchCompany.trim())
              ? 'No tours found. Create your first tour to get started.'
              : 'No tours match your current filters.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {tours.map((tour, index) => {
              return (
                <div
                  key={tour.id}
                  className="rounded-lg border bg-card p-4 sm:p-6 transition-all hover-scale animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/tours/${tour.id}`)}>
                        <div className="flex items-center gap-2 overflow-hidden flex-nowrap">
                          <h3 className="font-bold text-sm sm:text-base truncate" title={tour.tourCode}>{truncateText(tour.tourCode, 15)}</h3>
                          <Badge variant="outline" className="text-xs shrink-0 whitespace-nowrap">
                            {formatDateRangeDisplay(tour.startDate, tour.endDate)}
                          </Badge>
                          <Badge variant="outline" className="text-xs shrink-0 whitespace-nowrap">
                            {tour.totalDays || (tour.startDate && tour.endDate ? Math.max(0, differenceInDays(new Date(tour.endDate), new Date(tour.startDate)) + 1) : 0)}d
                          </Badge>
                          <Badge variant="outline" className="text-xs shrink-0 whitespace-nowrap">
                            {tour.totalGuests || ((tour.adults || 0) + (tour.children || 0))}p
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t cursor-pointer" onClick={() => navigate(`/tours/${tour.id}`)}>
                      <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Allowance:</span>
                          <span className="font-semibold">
                            {Math.round((tour.allowances?.reduce((sum, a) => sum + (a.price * (a.quantity || 1)), 0) || 0) / 1000)}k
                          </span>
                        </div>
                        {(tour.summary?.finalTotal !== undefined && tour.summary.finalTotal !== null && tour.summary.finalTotal !== 0) && (
                          <>
                            <span className="text-muted-foreground">|</span>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Final:</span>
                              <span className="font-semibold text-primary">
                                {Math.round(tour.summary.finalTotal / 1000)}k
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <div
                        className="grid grid-cols-2 gap-2 text-xs sm:text-sm cursor-pointer"
                        onClick={() => navigate(`/tours/${tour.id}`)}
                      >
                        <div className="min-w-0 overflow-hidden">
                          <p className="truncate" title={tour.companyRef.nameAtBooking}>
                            <span className="text-muted-foreground">Company: </span>
                            <span className="font-medium">
                              {truncateText(tour.companyRef.nameAtBooking, 15)}
                            </span>
                          </p>
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <p className="truncate" title={tour.clientNationalityRef.nameAtBooking}>
                            <span className="text-muted-foreground">Nationality: </span>
                            <span className="font-medium">
                              {truncateText(tour.clientNationalityRef.nameAtBooking, 15)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={(e) => handleExportSingle(tour, e)}
                        title="Export to Excel"
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={(e) => handleDuplicate(tour.id, e)}
                        title="Duplicate tour"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => handleDelete(tour.id, e)}
                        disabled={deleteMutation.isPending}
                        title="Delete tour"
                      >
                        <Trash2 className="h-4 w-4" />
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
        {totalTours > 0 && tours.length > 0 && (
          <div className="text-center text-sm text-muted-foreground mt-4">
            Showing
            {' '}
            {((currentPage - 1) * pageSize) + 1}
            {' '}
            to
            {' '}
            {((currentPage - 1) * pageSize) + tours.length}
            {' '}
            of {totalTours} tours
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tours;
