import { Layout } from '@/components/Layout';
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Calendar as CalendarIcon,
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
  RefreshCw,
  Flag,
  Baby,
  Database,
  Download,
  Image as ImageIcon,
  FolderArchive,
  FileSpreadsheet,
} from 'lucide-react';
import JSZip from 'jszip';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { differenceInDays, format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
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
import { formatCurrency } from '@/lib/currency-utils';
import { formatDateDMY, formatDateRangeDisplay } from '@/lib/date-utils';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import type { Tour, TourListResult, TourQuery } from '@/types/tour';
import Fuse from 'fuse.js';
import { generateFullSQLBackup, downloadSQLBackup } from '@/lib/sql-backup';


// Truncate helper with ellipsis included in `max` length
const truncateText = (text: string | undefined | null, max = 15): string => {
  if (!text) return '';
  if (text.length <= max) return text;
  if (max <= 3) return text.slice(0, max);
  return text.slice(0, max - 3) + '...';
};

const Tours = () => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isDownloadingImages, setIsDownloadingImages] = useState(false);
  
  // Separate search inputs for code, date range, and company
  const [searchCode, setSearchCode] = useState(() => localStorage.getItem('tours.search.code') || '');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const saved = localStorage.getItem('tours.search.dateRange');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        from: parsed.from ? new Date(parsed.from) : undefined,
        to: parsed.to ? new Date(parsed.to) : undefined,
      };
    }
    return undefined;
  });
  const [searchCompany, setSearchCompany] = useState(() => localStorage.getItem('tours.search.company') || '');
  const [nationalityFilter, setNationalityFilter] = useState<string>(() => {
    const saved = localStorage.getItem('tours.nationalityFilter');
    return saved || 'all';
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const saved = localStorage.getItem('tours.selectedMonth');
    return saved || 'all';
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const saved = localStorage.getItem('tours.selectedYear');
    // Default to current year if no saved value or if saved value is 'all'
    if (!saved || saved === 'all') {
      const currentYear = new Date().getFullYear().toString();
      localStorage.setItem('tours.selectedYear', currentYear);
      return currentYear;
    }
    return saved;
  });
  const [sortBy, setSortBy] = useState<string>(() => {
    const saved = localStorage.getItem('tours.sortBy');
    return saved || 'startDate-asc';
  });
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    const saved = localStorage.getItem('tours.filtersExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [searchExpanded, setSearchExpanded] = useState(() => {
    const saved = localStorage.getItem('tours.searchExpanded');
    return saved !== null ? JSON.parse(saved) : false;
  });
  // Pagination disabled; show all results
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Save filter states to localStorage
  useEffect(() => { localStorage.setItem('tours.search.code', searchCode); }, [searchCode]);
  useEffect(() => {
    localStorage.setItem('tours.search.dateRange', JSON.stringify(dateRange || {}));
  }, [dateRange]);
  useEffect(() => { localStorage.setItem('tours.search.company', searchCompany); }, [searchCompany]);

  useEffect(() => {
    localStorage.setItem('tours.nationalityFilter', nationalityFilter);
  }, [nationalityFilter]);

  useEffect(() => {
    localStorage.setItem('tours.selectedMonth', selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    localStorage.setItem('tours.selectedYear', selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    localStorage.setItem('tours.sortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('tours.filtersExpanded', JSON.stringify(filtersExpanded));
  }, [filtersExpanded]);

  useEffect(() => {
    localStorage.setItem('tours.searchExpanded', JSON.stringify(searchExpanded));
  }, [searchExpanded]);

  const baseTourQuery = useMemo((): TourQuery => {
    const query: TourQuery = {};
    const code = searchCode.trim();
    const company = searchCompany.trim();

    if (code) {
      query.tourCodeLike = code;
    }

    // Date range filter
    if (dateRange?.from) {
      query.startDate = format(dateRange.from, 'yyyy-MM-dd');
    }
    if (dateRange?.to) {
      query.endDate = format(dateRange.to, 'yyyy-MM-dd');
    }

    if (company) {
      query.companyNameLike = company;
    }

    if (nationalityFilter !== 'all') {
      query.nationalityId = nationalityFilter;
    }

    // Month and Year filter (only apply if no date range is selected)
    if (!dateRange?.from && !dateRange?.to && selectedMonth !== 'all' && selectedYear !== 'all') {
      const year = Number(selectedYear);
      const month = Number(selectedMonth);
      if (!Number.isNaN(year) && !Number.isNaN(month)) {
        const monthStr = String(month).padStart(2, '0');
        query.startDate = `${year}-${monthStr}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        query.endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
      }
    }

    // Add sorting to query
    const [field, order] = sortBy.split('-');
    query.sortBy = field as any;
    query.sortOrder = order as 'asc' | 'desc';

    return query;
  }, [searchCode, dateRange, searchCompany, nationalityFilter, selectedMonth, selectedYear, sortBy]);

  // Disable pagination entirely: always fetch ALL matching tours

  const {
    data: toursResult,
    isLoading,
  } = useQuery({
    queryKey: ['tours', baseTourQuery],
    queryFn: () => store.listTours({ ...baseTourQuery }, { includeDetails: true }),
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // No need for client-side sorting anymore - database handles it
  const tours = (toursResult as TourListResult | undefined)?.tours ?? [];

  const totalTours = (toursResult as TourListResult | undefined)?.total ?? 0;

  // Calculate total final amount for filtered tours (current page)
  const filteredToursTotal = useMemo(() => {
    return tours.reduce((sum, tour) => {
      const finalTotal = tour.summary?.finalTotal ?? 0;
      return sum + finalTotal;
    }, 0);
  }, [tours]);

  // Fetch grand total of ALL tours in database
  const { data: allToursData } = useQuery({
    queryKey: ['tours-grand-total'],
    queryFn: async () => {
      const { tours: allTours } = await store.listTours({}, { includeDetails: true });
      const grandTotal = allTours.reduce((sum, tour) => {
        const finalTotal = tour.summary?.finalTotal ?? 0;
        return sum + finalTotal;
      }, 0);
      return { count: allTours.length, grandTotal };
    },
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: nationalities = [] } = useQuery({
    queryKey: ['nationalities'],
    queryFn: () => store.listNationalities({}),
  });

  // Removed bulk expense query (feature removed)

  // No pagination --> no page state updates needed

  // Get unique years from tours
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    tours.forEach(tour => {
      const year = parseInt(tour.startDate.substring(0, 4));
      years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [tours]);

  // Months array (1-12)
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];


  const clearFilters = () => {
    setNationalityFilter('all');
    setSelectedMonth('all');
    setSelectedYear('all');
  };

  const hasActiveFilters = nationalityFilter !== 'all' || (selectedMonth !== 'all' && selectedYear !== 'all');

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

  // Controlled confirm dialog for deleting a tour (avoid window.confirm)
  const [deleteTourId, setDeleteTourId] = useState<string | null>(null);

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

  const [deleteAllPinInput, setDeleteAllPinInput] = useState('');
  const [showDeleteAllPinDialog, setShowDeleteAllPinDialog] = useState(false);
  const CORRECT_PIN = '0829101188';

  const handleDeleteAll = () => {
    setShowDeleteAllPinDialog(true);
  };

  const handleDeleteAllConfirm = () => {
    if (deleteAllPinInput === CORRECT_PIN) {
      toast.warning('Bulk delete not available. Please delete tours individually.');
      setShowDeleteAllPinDialog(false);
      setDeleteAllPinInput('');
    } else {
      toast.error('Incorrect PIN. Access denied.');
      setDeleteAllPinInput('');
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
    setDeleteTourId(id);
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
          const updatedTotal = data.total + 1;
          const dedupedTours = data.tours.filter(tourItem => tourItem.id !== newTour.id);
          const orderedTours = [...dedupedTours, newTour].sort((a, b) =>
            (b.startDate ?? '').localeCompare(a.startDate ?? '')
          );

          queryClient.setQueryData(queryKey, {
            tours: orderedTours,
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

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      toast.info('Generating SQL backup...');
      const sql = await generateFullSQLBackup();
      downloadSQLBackup(sql);
      toast.success('Backup downloaded successfully!');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Failed to generate backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownloadAllImages = async () => {
    setIsDownloadingImages(true);
    try {
      toast.info('Fetching all tour images...');
      
      // Fetch all tour images from database
      const { data: allImages, error } = await supabase
        .from('tour_images')
        .select('*, tours!tour_images_tour_id_fkey(tour_code)')
        .order('tour_id');

      if (error) throw error;

      if (!allImages || allImages.length === 0) {
        toast.error('No images found in database');
        return;
      }

      toast.info(`Downloading ${allImages.length} images...`);

      const zip = new JSZip();

      // Group images by tour code
      const imagesByTour: Record<string, typeof allImages> = {};
      allImages.forEach((img) => {
        const tourCode = (img.tours as any)?.tour_code || 'unknown';
        if (!imagesByTour[tourCode]) {
          imagesByTour[tourCode] = [];
        }
        imagesByTour[tourCode].push(img);
      });

      // Add images to zip organized by tour folders
      for (const [tourCode, images] of Object.entries(imagesByTour)) {
        for (const image of images) {
          try {
            const { data: publicUrlData } = supabase.storage
              .from('tour-images')
              .getPublicUrl(image.storage_path);
            
            const response = await fetch(publicUrlData.publicUrl);
            const blob = await response.blob();
            zip.file(`${tourCode}/${image.file_name}`, blob);
          } catch (err) {
            console.error(`Failed to download ${image.file_name}:`, err);
          }
        }
      }

      // Generate and download zip
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `all-tour-images.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${allImages.length} images from ${Object.keys(imagesByTour).length} tours`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download images');
    } finally {
      setIsDownloadingImages(false);
    }
  };

  const { classes: headerClasses } = useHeaderMode('tours.headerMode');

  return (
    <Layout>
      <div className="animate-fade-in">
        {/* Sticky Header - Always pinned to top */}
        <div className={`${headerClasses} border-b pb-4 pt-4 bg-gray-100 dark:bg-gray-900 z-40 space-y-4`}>
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex-shrink-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Tour</h1>
            </div>
            <div className="flex gap-1 items-center flex-shrink-0 flex-wrap">
              <Button
                onClick={handleBackup}
                variant="outline"
                size="sm"
                disabled={isBackingUp}
                className="hidden lg:flex hover-scale lg:h-10 lg:px-3 text-xs"
                title="Tải bản sao SQL đầy đủ (schema + data)"
              >
                <Database className="h-4 w-4 lg:mr-1.5" />
                <span className="hidden lg:inline">{isBackingUp ? 'Đang sao lưu...' : 'Sao lưu SQL'}</span>
              </Button>
              <Button
                onClick={handleDownloadAllImages}
                variant="outline"
                size="sm"
                disabled={isDownloadingImages}
                className="hidden lg:flex hover-scale lg:h-10 lg:px-3 text-xs"
                title="Tải tất cả ảnh từ tất cả tour"
              >
                <ImageIcon className="h-4 w-4 lg:mr-1.5" />
                <span className="hidden lg:inline">{isDownloadingImages ? 'Đang tải...' : 'Tải tất cả ảnh'}</span>
              </Button>
              <ImportTourDialogEnhanced
                onImport={handleImport}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover-scale h-auto py-2 px-3 flex flex-col items-center gap-1 lg:flex-row lg:h-10 lg:px-3 text-xs text-green-600 hover:text-green-700 border-green-600 hover:border-green-700"
                  >
                    <Upload className="h-5 w-5 lg:mr-1.5" />
                    <span className="text-[10px] lg:text-xs">Nhập</span>
                  </Button>
                }
              />
              <Button
                onClick={handleExportAll}
                variant="outline"
                size="sm"
                className="hover-scale h-auto py-2 px-3 flex flex-col items-center gap-1 lg:flex-row lg:h-10 lg:px-3 text-xs text-blue-600 hover:text-blue-700 border-blue-600 hover:border-blue-700"
                title="Xuất tất cả tour vào thư mục theo tháng (ZIP)"
              >
                <FolderArchive className="h-5 w-5 lg:mr-1.5" />
                <span className="text-[10px] lg:text-xs hidden sm:inline">Xuất tất cả → Thư mục</span>
                <span className="text-[10px] lg:text-xs sm:hidden">Thư mục</span>
              </Button>
              <Button
                onClick={handleExportAllSingle}
                variant="outline"
                size="sm"
                className="hover-scale h-auto py-2 px-3 flex flex-col items-center gap-1 lg:flex-row lg:h-10 lg:px-3 text-xs text-purple-600 hover:text-purple-700 border-purple-600 hover:border-purple-700"
                title="Xuất tất cả tour vào 1 file Excel (1 trang với tổng lớn)"
              >
                <FileSpreadsheet className="h-5 w-5 lg:mr-1.5" />
                <span className="text-[10px] lg:text-xs hidden sm:inline">Xuất tất cả → 1 trang</span>
                <span className="text-[10px] lg:text-xs sm:hidden">1 trang</span>
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
              <AlertDialog open={showDeleteAllPinDialog} onOpenChange={setShowDeleteAllPinDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover-scale text-destructive hover:text-destructive h-auto py-2 px-2 flex flex-col items-center gap-1 lg:flex-row lg:h-10 lg:px-3 text-xs"
                  >
                    <Trash className="h-5 w-5 lg:mr-1.5" />
                    <span className="text-[9px] lg:text-xs">Xóa tất cả</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xóa tất cả Tour - Yêu cầu mã PIN</AlertDialogTitle>
                    <AlertDialogDescription>
                      Hành động này không thể hoàn tác. Hành động này sẽ xóa vĩnh viễn tất cả tour khỏi cơ sở dữ liệu.
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="delete-all-pin">Nhập mã PIN để xác nhận:</Label>
                        <Input
                          id="delete-all-pin"
                          type="password"
                          placeholder="Nhập mã PIN"
                          value={deleteAllPinInput}
                          onChange={(e) => setDeleteAllPinInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleDeleteAllConfirm();
                            }
                          }}
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {
                      setDeleteAllPinInput('');
                      setShowDeleteAllPinDialog(false);
                    }}>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAllConfirm}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Xóa tất cả Tour
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                onClick={() => navigate('/tours/new')}
                size="sm"
                className="hover-scale h-auto py-2 px-2 flex flex-col items-center gap-1 lg:flex-row lg:h-10 lg:px-3 text-xs"
              >
                <Plus className="h-5 w-5 lg:mr-1.5" />
                <span className="text-[9px] lg:text-xs">Thêm Tour</span>
              </Button>
            </div>
          </div>

          {/* Search Area Header - Mobile Only */}
          <div className="flex items-center gap-2 sm:hidden mb-2">
            <h2 className="text-xs font-semibold flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Tìm kiếm & Lọc
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchExpanded(!searchExpanded)}
              className="ml-auto h-7 w-7 p-0"
            >
              {searchExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>

          <div className={`space-y-2 sm:space-y-3 transition-all duration-200 overflow-hidden ${searchExpanded ? 'sm:block' : 'hidden sm:block'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <SearchInput
                value={searchCode}
                onChange={setSearchCode}
                placeholder="Tìm kiếm mã tour..."
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal h-10 ${
                      !dateRange?.from && !dateRange?.to ? 'text-muted-foreground' : ''
                    }`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                        </>
                      ) : (
                        format(dateRange.from, 'dd/MM/yyyy')
                      )
                    ) : (
                      <span>Chọn khoảng thời gian</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    initialFocus
                  />
                  {(dateRange?.from || dateRange?.to) && (
                    <div className="border-t p-3">
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setDateRange(undefined)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Xóa ngày
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <SearchInput
                value={searchCompany}
                onChange={setSearchCompany}
                placeholder="Tìm kiếm công ty..."
              />
            </div>

            {/* Filters */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2 sm:hidden">
                <h2 className="text-xs font-semibold flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  Bộ lọc nâng cao
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  className="ml-auto h-7 w-7 p-0"
                >
                  {filtersExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>

              <div className={`transition-all duration-200 overflow-hidden ${filtersExpanded ? 'block' : 'hidden sm:block'}`}>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      Quốc tịch
                    </label>
                    <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
                      <SelectTrigger className="h-8 sm:h-10">
                        <SelectValue placeholder="Tất cả quốc tịch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả quốc tịch</SelectItem>
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
                      <CalendarIcon className="h-3 w-3" />
                      Tháng
                    </label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="h-8 sm:h-10">
                        <SelectValue placeholder="Tất cả" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        {months.map(month => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      Năm
                    </label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="h-8 sm:h-10">
                        <SelectValue placeholder="Tất cả" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <ArrowUpDown className="h-3 w-3" />
                      Sắp xếp
                    </label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-8 sm:h-10">
                        <SelectValue placeholder="Sắp xếp theo..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="startDate-desc">Ngày bắt đầu (Mới nhất)</SelectItem>
                        <SelectItem value="startDate-asc">Ngày bắt đầu (Cũ nhất)</SelectItem>
                        <SelectItem value="endDate-desc">Ngày kết thúc (Mới nhất)</SelectItem>
                        <SelectItem value="endDate-asc">Ngày kết thúc (Cũ nhất)</SelectItem>
                        <SelectItem value="tourCode-asc">Mã tour (A-Z)</SelectItem>
                        <SelectItem value="tourCode-desc">Mã tour (Z-A)</SelectItem>
                        <SelectItem value="clientName-asc">Tên khách (A-Z)</SelectItem>
                        <SelectItem value="clientName-desc">Tên khách (Z-A)</SelectItem>
                        <SelectItem value="createdAt-desc">Ngày tạo (Mới nhất)</SelectItem>
                        <SelectItem value="createdAt-asc">Ngày tạo (Cũ nhất)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="h-8 sm:h-10 sm:self-end">
                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Xóa bộ lọc
                  </Button>
                )}
              </div>

              {/* Filter Results Info */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 mt-3">
              <span className="text-base sm:text-lg font-semibold">
                    Hiển thị {tours.length} tour
                  </span>
                  {nationalityFilter !== 'all' && (
                    <Badge variant="secondary" className="text-sm font-medium">
                      {nationalities.find(n => n.id === nationalityFilter)?.name}
                    </Badge>
                  )}
                  {selectedMonth !== 'all' && selectedYear !== 'all' && (
                    <Badge variant="default" className="text-sm sm:text-base font-semibold px-3 py-1">
                      {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                    </Badge>
                  )}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Totals - Always Visible (Outside Filters Section) */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm sm:text-base border-y py-3 bg-muted/30">
          {filteredToursTotal !== 0 && (
            <div>
              <span className="text-muted-foreground">Tổng cuối ({tours.length} tour): </span>
              <span className="font-bold text-primary">{formatCurrency(filteredToursTotal)}</span>
            </div>
          )}
          {allToursData && allToursData.grandTotal !== 0 && (
            <div>
              <span className="text-muted-foreground">Tổng lớn (Tất cả {allToursData.count} tour): </span>
              <span className="font-bold text-green-600">{formatCurrency(allToursData.grandTotal)}</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : totalTours === 0 ? (
          <div className="text-center py-12 text-muted-foreground mt-6">
            {!hasActiveFilters && !(searchCode.trim() || dateRange?.from || dateRange?.to || searchCompany.trim())
              ? 'Không tìm thấy tour nào. Tạo tour đầu tiên để bắt đầu.'
              : 'Không có tour nào phù hợp với bộ lọc.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {tours.map((tour, index) => {
              // Compute card-level warnings: zero price or duplicate destination names
              // Only consider Destinations, Expenses, Meals, Allowances (exclude Shoppings)
              const hasZeroPrice = !!(
                (tour.destinations || []).some(d => (d.price ?? 0) === 0) ||
                (tour.expenses || []).some(e => (e.price ?? 0) === 0) ||
                (tour.meals || []).some(m => (m.price ?? 0) === 0) ||
                (tour.allowances || []).some(a => (a.price ?? 0) === 0)
              );

              const destNames = (tour.destinations || []).map(d => (d.name || '').trim().toLowerCase()).filter(Boolean);
              const nameCount = new Map<string, number>();
              for (const n of destNames) nameCount.set(n, (nameCount.get(n) || 0) + 1);
              const hasDuplicateDestNames = Array.from(nameCount.values()).some(c => c > 1);

              // Check if water expense exists
              const waterExpenseNames = [
                'nước uống cho khách 10k/1 khách / 1 ngày',
                'nước uống cho khách 15k/1 khách / 1 ngày',
              ];
              const hasWaterExpense = (tour.expenses || []).some(exp =>
                waterExpenseNames.includes((exp.name || '').trim().toLowerCase())
              );
              const missingWaterExpense = !hasWaterExpense;

              const showRedFlag = hasZeroPrice || hasDuplicateDestNames || missingWaterExpense;
              const hasChildren = (tour.children || 0) > 0;
              return (
                <div
                  key={tour.id}
                  className={`rounded-lg border bg-card p-4 sm:p-6 transition-all hover-scale animate-fade-in relative ${showRedFlag ? 'border-red-500 dark:border-red-600' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {hasChildren && (
                    <div className="absolute top-2 right-2 bg-blue-500 dark:bg-blue-600 text-white rounded-full p-1.5 shadow-lg" title={`${tour.children} child${tour.children > 1 ? 'ren' : ''}`}>
                      <Baby className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  )}
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
                          {showRedFlag && (
                            <span
                              className="inline-flex items-center gap-1 text-destructive text-xs sm:text-sm"
                              title={
                                [
                                  hasDuplicateDestNames && 'Tên điểm đến trùng lặp',
                                  hasZeroPrice && 'Có mục giá 0',
                                  missingWaterExpense && 'Thiếu chi phí nước uống'
                                ].filter(Boolean).join(' • ') || 'Cần kiểm tra'
                              }
                            >
                              <Flag className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Kiểm tra</span>
                            </span>
                          )}
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

        {/* Pagination Controls (hidden when date range search is active) */}
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteTourId} onOpenChange={(open) => !open && setDeleteTourId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa tour này?</AlertDialogTitle>
              <AlertDialogDescription>
                Hành động này không thể hoàn tác. Tour sẽ bị xóa vĩnh viễn.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteTourId(null)}>Hủy</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteTourId) {
                    deleteMutation.mutate(deleteTourId);
                    setDeleteTourId(null);
                  }
                }}
              >
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Pagination removed */}
      </div>
    </Layout>
  );
};

export default Tours;
