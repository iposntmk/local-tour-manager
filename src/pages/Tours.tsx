import { useState, useMemo, useEffect, useRef } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  ChevronLeft,
  ChevronRight,
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
  Columns3,
  FilterX,
  Check,
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
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { exportTourToExcel, exportAllToursToMonthlyZip, exportAllToursToExcel } from '@/lib/excel-utils';
import { ImportTourDialogEnhanced } from '@/components/tours/ImportTourDialogEnhanced';
import {
  truncateText,
  WATER_EXPENSE_NAMES,
  getTourDays,
  getTourGuests,
  getTourNationalityIds,
  formatTourNationalities,
  getAllowanceTotal,
  getTourWarningInfo,
  TourTableColumnKey,
  TourTableFilterKey,
  TourTableFilters,
  TourTableColumn,
  TOUR_TABLE_COLUMNS,
  TOUR_TABLE_COLUMN_KEYS,
  createDefaultTourTableColumnVisibility,
  createDefaultTourTableFilters,
  loadTourTableColumnVisibility,
  loadTourTableFilters,
  includesTableFilter,
  parseTableDateFilter,
  serializeTableDateFilter,
  formatTableDateFilterLabel,
  tourMatchesTableDateFilter,
} from '@/pages/tours/tour-table-config';
import { useTourImport } from '@/hooks/useTourImport';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn, formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { formatDateDMY, formatDateRangeDisplay } from '@/lib/date-utils';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import type { Tour, TourListResult, TourQuery } from '@/types/tour';
import { generateFullSQLBackup, downloadSQLBackup } from '@/lib/sql-backup';
import {
  invalidateTourAggregateCaches,
  TOUR_GRAND_TOTAL_GC_TIME,
  TOUR_GRAND_TOTAL_QUERY_KEY,
  TOUR_GRAND_TOTAL_STALE_TIME,
  TOUR_LIST_GC_TIME,
  TOUR_LIST_STALE_TIME,
  TOUR_REFERENCE_GC_TIME,
  TOUR_REFERENCE_STALE_TIME,
} from '@/lib/query-cache';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentStatusBadge } from '@/components/tours/PaymentStatusBadge';
import { SettlementStatusBadge } from '@/components/tours/SettlementStatusBadge';
import { isTourPaymentEligible } from '@/lib/payment-utils';


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
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<string>(() => {
    const saved = localStorage.getItem('tours.settlementStatusFilter');
    return saved || 'all';
  });
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>(() => {
    const saved = localStorage.getItem('tours.paymentStatusFilter');
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
  const [tableColumnVisibility, setTableColumnVisibility] = useState<Record<TourTableColumnKey, boolean>>(loadTourTableColumnVisibility);
  const [tableFilters, setTableFilters] = useState<TourTableFilters>(loadTourTableFilters);
  const [tableDateFilterOpen, setTableDateFilterOpen] = useState(false);
  const [tableCompanyFilterOpen, setTableCompanyFilterOpen] = useState(false);
  const [tableLandOperatorFilterOpen, setTableLandOperatorFilterOpen] = useState(false);
  const tourTableTopScrollRef = useRef<HTMLDivElement>(null);
  const tourTableBottomScrollRef = useRef<HTMLDivElement>(null);
  const syncingTourTableScrollRef = useRef(false);
  const [topCompanyFilterOpen, setTopCompanyFilterOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    const saved = localStorage.getItem('tours.filtersExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [searchExpanded, setSearchExpanded] = useState(() => {
    const saved = localStorage.getItem('tours.searchExpanded');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [topControlsExpanded, setTopControlsExpanded] = useState(() => {
    const saved = localStorage.getItem('tours.topControlsExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  // Pagination disabled; show all results
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canCreateTours = hasPermission('create_tours');
  const canDeleteTours = hasPermission('delete_tours');
  const canDuplicateTours = hasPermission('duplicate_tours');
  const canExportTours = hasPermission('export_tours');
  const canImportTours = hasPermission('import_tours');
  const canBackupData = hasPermission('backup_data');
  const canDownloadAllTourImages = hasPermission('download_all_tour_images');

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
    localStorage.setItem('tours.table.columnVisibility', JSON.stringify(tableColumnVisibility));
  }, [tableColumnVisibility]);

  useEffect(() => {
    localStorage.setItem('tours.table.filters', JSON.stringify(tableFilters));
  }, [tableFilters]);

  useEffect(() => {
    localStorage.setItem('tours.filtersExpanded', JSON.stringify(filtersExpanded));
  }, [filtersExpanded]);

  useEffect(() => {
    localStorage.setItem('tours.searchExpanded', JSON.stringify(searchExpanded));
  }, [searchExpanded]);

  useEffect(() => {
    localStorage.setItem('tours.topControlsExpanded', JSON.stringify(topControlsExpanded));
  }, [topControlsExpanded]);

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

    if (settlementStatusFilter !== 'all') {
      query.settlementStatus = settlementStatusFilter as TourQuery['settlementStatus'];
    }

    if (paymentStatusFilter !== 'all') {
      query.paymentStatus = paymentStatusFilter as TourQuery['paymentStatus'];
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
  }, [searchCode, dateRange, searchCompany, nationalityFilter, settlementStatusFilter, paymentStatusFilter, selectedMonth, selectedYear, sortBy]);

  // Disable pagination entirely: always fetch ALL matching tours

  const {
    data: toursResult,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['tours', baseTourQuery],
    queryFn: () => store.listTours({ ...baseTourQuery }, { includeDetails: true }),
    placeholderData: keepPreviousData,
    staleTime: TOUR_LIST_STALE_TIME,
    gcTime: TOUR_LIST_GC_TIME,
  });

  // No need for client-side sorting anymore - database handles it
  const tours = useMemo(() => (toursResult as TourListResult | undefined)?.tours ?? [], [toursResult]);

  const totalTours = (toursResult as TourListResult | undefined)?.total ?? 0;

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => store.listCompanies({}),
    staleTime: TOUR_REFERENCE_STALE_TIME,
    gcTime: TOUR_REFERENCE_GC_TIME,
  });

  const visibleTourTableColumns = useMemo(
    () => TOUR_TABLE_COLUMNS.filter(column => tableColumnVisibility[column.key]),
    [tableColumnVisibility]
  );
  const tourTableWidth = useMemo(
    () => visibleTourTableColumns.reduce((sum, column) => sum + column.width, 0),
    [visibleTourTableColumns]
  );

  const tableCompanyOptions = useMemo(() => {
    const companies = new Set<string>();
    tours.forEach((tour) => {
      const companyName = tour.companyRef?.nameAtBooking?.trim();
      if (companyName) companies.add(companyName);
    });
    const companyFilter = tableFilters.company?.trim();
    if (companyFilter) {
      companies.add(companyFilter);
    }
    return Array.from(companies).sort((a, b) => a.localeCompare(b));
  }, [tableFilters.company, tours]);

  const tableLandOperatorOptions = useMemo(() => {
    const landOperators = new Set<string>();
    tours.forEach((tour) => {
      const name = tour.landOperatorRef?.nameAtBooking?.trim();
      if (name) landOperators.add(name);
    });
    const landOperatorFilter = tableFilters.landOperator?.trim();
    if (landOperatorFilter) {
      landOperators.add(landOperatorFilter);
    }
    return Array.from(landOperators).sort((a, b) => a.localeCompare(b));
  }, [tableFilters.landOperator, tours]);

  const topCompanyOptions = useMemo(() => {
    const companyNames = new Set<string>();
    companies.forEach((company) => {
      const companyName = company.name?.trim();
      if (companyName) companyNames.add(companyName);
    });
    if (searchCompany.trim()) {
      companyNames.add(searchCompany.trim());
    }
    return Array.from(companyNames).sort((a, b) => a.localeCompare(b));
  }, [companies, searchCompany]);

  const tableColumnFilterCount = useMemo(() => {
    return Object.entries(tableFilters).reduce((count, [key, value]) => {
      if (key === 'warning') return count + (value !== 'all' ? 1 : 0);
      return count + (String(value).trim() ? 1 : 0);
    }, 0);
  }, [tableFilters]);

  const tableFilteredTours = useMemo(() => {
    return tours.filter((tour) => {
      const warningInfo = getTourWarningInfo(tour);
      const totalDays = getTourDays(tour);
      const totalGuests = getTourGuests(tour);
      const allowanceTotal = getAllowanceTotal(tour);
      const finalTotal = tour.summary?.finalTotal ?? 0;

      if (tableFilters.warning === 'warning' && !warningInfo.showRedFlag) return false;
      if (tableFilters.warning === 'ok' && warningInfo.showRedFlag) return false;

      return (
        includesTableFilter(tour.tourCode, tableFilters.tourCode) &&
        tourMatchesTableDateFilter(tour, tableFilters.date) &&
        includesTableFilter(`${totalDays} ${totalDays} ngày ${totalDays}d`, tableFilters.days) &&
        includesTableFilter(`${totalGuests} ${totalGuests}p ${tour.adults || 0} ${tour.children || 0}`, tableFilters.guests) &&
        includesTableFilter(tour.companyRef?.nameAtBooking, tableFilters.company) &&
        includesTableFilter(tour.landOperatorRef?.nameAtBooking, tableFilters.landOperator) &&
        includesTableFilter(tour.guideRef?.nameAtBooking, tableFilters.guide) &&
        includesTableFilter(formatTourNationalities(tour), tableFilters.nationality) &&
        includesTableFilter(tour.clientName, tableFilters.clientName) &&
        includesTableFilter(tour.clientPhone, tableFilters.clientPhone) &&
        includesTableFilter(tour.driverName, tableFilters.driverName) &&
        includesTableFilter(`${allowanceTotal} ${formatCurrency(allowanceTotal)}`, tableFilters.ctp) &&
        includesTableFilter(`${finalTotal} ${formatCurrency(finalTotal)}`, tableFilters.total)
      );
    });
  }, [tableFilters, tours]);

  const updateTableFilter = (key: keyof TourTableFilters, value: string) => {
    setTableFilters(prev => ({ ...prev, [key]: value } as TourTableFilters));
  };

  const clearTableFilters = () => {
    setTableFilters(createDefaultTourTableFilters());
  };

  const setAllTourTableColumnsVisible = (visible: boolean) => {
    setTableColumnVisibility(
      TOUR_TABLE_COLUMN_KEYS.reduce((visibility, key) => {
        visibility[key] = visible;
        return visibility;
      }, {} as Record<TourTableColumnKey, boolean>)
    );
  };

  const toggleTourTableColumn = (key: TourTableColumnKey, visible: boolean) => {
    setTableColumnVisibility(prev => ({ ...prev, [key]: visible }));
  };

  const syncTourTableScroll = (source: 'top' | 'bottom') => {
    if (syncingTourTableScrollRef.current) {
      return;
    }

    const sourceElement = source === 'top' ? tourTableTopScrollRef.current : tourTableBottomScrollRef.current;
    const targetElement = source === 'top' ? tourTableBottomScrollRef.current : tourTableTopScrollRef.current;

    if (!sourceElement || !targetElement || targetElement.scrollLeft === sourceElement.scrollLeft) {
      return;
    }

    syncingTourTableScrollRef.current = true;
    targetElement.scrollLeft = sourceElement.scrollLeft;
    requestAnimationFrame(() => {
      syncingTourTableScrollRef.current = false;
    });
  };

  const scrollTourTableHorizontally = (delta: number) => {
    const topElement = tourTableTopScrollRef.current;
    const bottomElement = tourTableBottomScrollRef.current;
    const sourceElement = topElement || bottomElement;
    if (!sourceElement) return;

    const nextScrollLeft = Math.max(0, sourceElement.scrollLeft + delta);
    if (topElement) topElement.scrollLeft = nextScrollLeft;
    if (bottomElement) bottomElement.scrollLeft = nextScrollLeft;
  };

  // Calculate total final amount for filtered tours (current page)
  const filteredToursTotal = useMemo(() => {
    return tours.reduce((sum, tour) => {
      const finalTotal = tour.summary?.finalTotal ?? 0;
      return sum + finalTotal;
    }, 0);
  }, [tours]);

  const showInitialToursSkeleton = isLoading && !toursResult;
  const showToursBackgroundRefresh = isFetching && !showInitialToursSkeleton;

  // Fetch grand total of ALL tours in database without loading nested tour details
  const { data: allToursData } = useQuery({
    queryKey: TOUR_GRAND_TOTAL_QUERY_KEY,
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('tours')
        .select('final_total', { count: 'exact' });

      if (error) throw error;

      const rows = data || [];
      const grandTotal = rows.reduce((sum, tour) => {
        return sum + (Number(tour.final_total) || 0);
      }, 0);
      return { count: typeof count === 'number' ? count : rows.length, grandTotal };
    },
    staleTime: TOUR_GRAND_TOTAL_STALE_TIME,
    gcTime: TOUR_GRAND_TOTAL_GC_TIME,
  });

  const { data: nationalities = [] } = useQuery({
    queryKey: ['nationalities'],
    queryFn: () => store.listNationalities({}),
    staleTime: TOUR_REFERENCE_STALE_TIME,
    gcTime: TOUR_REFERENCE_GC_TIME,
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
      void invalidateTourAggregateCaches(queryClient);
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
      void invalidateTourAggregateCaches(queryClient);
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
    if (!canDeleteTours) {
      toast.error('Bạn không có quyền xóa tour.');
      return;
    }
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
    if (!canExportTours) {
      toast.error('Bạn không có quyền xuất tour.');
      return;
    }

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
    if (!canExportTours) {
      toast.error('Bạn không có quyền xuất tour.');
      return;
    }

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
    if (!canExportTours) {
      toast.error('Bạn không có quyền xuất tour.');
      return;
    }

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
    if (!canDuplicateTours) {
      toast.error('Bạn không có quyền nhân bản tour.');
      return;
    }
    duplicateMutation.mutate(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canDeleteTours) {
      toast.error('Bạn không có quyền xóa tour.');
      return;
    }
    setDeleteTourId(id);
  };

  const { handleImport: handleImportFromHook } = useTourImport(queryClient, baseTourQuery);

  const handleImport = (tours: Partial<Tour>[]) => {
    if (!canImportTours) {
      toast.error('Bạn không có quyền nhập tour.');
      return;
    }
    handleImportFromHook(tours);
  };

  const handleBackup = async () => {
    if (!canBackupData) {
      toast.error('Bạn không có quyền sao lưu dữ liệu.');
      return;
    }

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
    if (!canDownloadAllTourImages) {
      toast.error('Bạn không có quyền tải toàn bộ ảnh tour.');
      return;
    }

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
  const topActionButtonClass =
    'hover-scale flex h-10 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[9px] leading-tight sm:h-10 sm:flex-initial sm:basis-auto sm:px-3 sm:text-xs lg:flex-row lg:gap-1.5';
  const topActionIconClass = 'h-4 w-4 shrink-0 lg:mr-1.5';

  const renderTourTableHeader = (column: TourTableColumn) => {
    const alignRight = column.headerClassName?.includes('text-right');

    return (
      <div className={`space-y-1.5 ${alignRight ? 'text-right' : ''}`}>
        <div className="text-xs font-semibold">{column.label}</div>
        {column.filterType === 'text' && (
          <Input
            value={tableFilters[column.key as TourTableFilterKey] || ''}
            onChange={(event) => updateTableFilter(column.key as TourTableFilterKey, event.target.value)}
            onClick={(event) => event.stopPropagation()}
            placeholder={column.filterPlaceholder || 'Lọc'}
            className={`h-7 px-2 text-xs font-normal ${alignRight ? 'text-right' : ''}`}
          />
        )}
        {column.filterType === 'date' && (
          <Popover open={tableDateFilterOpen} onOpenChange={setTableDateFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-7 w-full justify-start px-2 text-left text-xs font-normal"
                title={formatTableDateFilterLabel(tableFilters.date)}
              >
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                <span className="truncate">{formatTableDateFilterLabel(tableFilters.date)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={parseTableDateFilter(tableFilters.date)}
                onSelect={(range) => updateTableFilter('date', serializeTableDateFilter(range))}
                numberOfMonths={2}
                initialFocus
              />
              {tableFilters.date && (
                <div className="border-t p-3">
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      updateTableFilter('date', '');
                      setTableDateFilterOpen(false);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Xóa ngày
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}
        {column.filterType === 'company' && (
          <Popover open={tableCompanyFilterOpen} onOpenChange={setTableCompanyFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-7 w-full justify-start px-2 text-left text-xs font-normal"
                title={tableFilters.company || 'Tất cả công ty'}
              >
                <span className="truncate">{tableFilters.company || 'Tất cả công ty'}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Tìm công ty..." />
                <CommandList>
                  <CommandEmpty>Không tìm thấy công ty.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="__all_companies__"
                      onSelect={() => {
                        updateTableFilter('company', '');
                        setTableCompanyFilterOpen(false);
                      }}
                    >
                      <Check className={`mr-2 h-4 w-4 ${tableFilters.company ? 'opacity-0' : 'opacity-100'}`} />
                      Tất cả công ty
                    </CommandItem>
                    {tableCompanyOptions.map((company) => (
                      <CommandItem
                        key={company}
                        value={company}
                        onSelect={() => {
                          updateTableFilter('company', company);
                          setTableCompanyFilterOpen(false);
                        }}
                      >
                        <Check className={`mr-2 h-4 w-4 ${tableFilters.company === company ? 'opacity-100' : 'opacity-0'}`} />
                        <span className="truncate">{company}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
        {column.filterType === 'landOperator' && (
          <Popover open={tableLandOperatorFilterOpen} onOpenChange={setTableLandOperatorFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-7 w-full justify-start px-2 text-left text-xs font-normal"
                title={tableFilters.landOperator || 'Tất cả land tour'}
              >
                <span className="truncate">{tableFilters.landOperator || 'Tất cả land tour'}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Tìm land tour..." />
                <CommandList>
                  <CommandEmpty>Không tìm thấy công ty land tour.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="__all_land_operators__"
                      onSelect={() => {
                        updateTableFilter('landOperator', '');
                        setTableLandOperatorFilterOpen(false);
                      }}
                    >
                      <Check className={`mr-2 h-4 w-4 ${tableFilters.landOperator ? 'opacity-0' : 'opacity-100'}`} />
                      Tất cả land tour
                    </CommandItem>
                    {tableLandOperatorOptions.map((name) => (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={() => {
                          updateTableFilter('landOperator', name);
                          setTableLandOperatorFilterOpen(false);
                        }}
                      >
                        <Check className={`mr-2 h-4 w-4 ${tableFilters.landOperator === name ? 'opacity-100' : 'opacity-0'}`} />
                        <span className="truncate">{name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
        {column.filterType === 'warning' && (
          <Select value={tableFilters.warning} onValueChange={(value) => updateTableFilter('warning', value)}>
            <SelectTrigger className="h-7 px-2 text-xs font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="warning">Cần kiểm tra</SelectItem>
              <SelectItem value="ok">Bình thường</SelectItem>
            </SelectContent>
          </Select>
        )}
        {column.filterType === 'none' && <div className="h-7" />}
      </div>
    );
  };

  const renderTourTableCellContent = (
    column: TourTableColumn,
    tour: Tour,
    row: {
      warningInfo: ReturnType<typeof getTourWarningInfo>;
      totalDays: number;
      totalGuests: number;
      allowanceTotal: number;
      finalTotal: number;
      hasChildren: boolean;
      index: number;
    }
  ) => {
    switch (column.key) {
      case 'stt':
        return row.index + 1;
      case 'tourCode':
        return <span className="block truncate" title={tour.tourCode}>{tour.tourCode}</span>;
      case 'date':
        return formatDateRangeDisplay(tour.startDate, tour.endDate);
      case 'days':
        return `${row.totalDays} ngày`;
      case 'guests':
        return (
          <div className="flex items-center gap-2">
            <span>{row.totalGuests}p</span>
            {row.hasChildren && (
              <span className="inline-flex items-center text-blue-600 dark:text-blue-400" title={`${tour.children} trẻ em`}>
                <Baby className="h-4 w-4" />
              </span>
            )}
          </div>
        );
      case 'company':
        return (
          <span className="block truncate" title={tour.companyRef?.nameAtBooking || ''}>
            {tour.companyRef?.nameAtBooking || '-'}
          </span>
        );
      case 'landOperator':
        return (
          <span className="block truncate text-muted-foreground" title={tour.landOperatorRef?.nameAtBooking || ''}>
            {tour.landOperatorRef?.nameAtBooking || '-'}
          </span>
        );
      case 'guide':
        return (
          <span className="block truncate" title={tour.guideRef?.nameAtBooking || ''}>
            {tour.guideRef?.nameAtBooking || '-'}
          </span>
        );
      case 'nationality': {
        const nationalities = formatTourNationalities(tour);
        return (
          <span className="block truncate" title={nationalities}>
            {nationalities || '-'}
          </span>
        );
      }
      case 'clientName':
        return (
          <span className="block truncate" title={tour.clientName || ''}>
            {tour.clientName || '-'}
          </span>
        );
      case 'clientPhone':
        return (
          <span className="block truncate" title={tour.clientPhone || ''}>
            {tour.clientPhone || '-'}
          </span>
        );
      case 'driverName':
        return (
          <span className="block truncate" title={tour.driverName || ''}>
            {tour.driverName || '-'}
          </span>
        );
      case 'ctp':
        return formatCurrency(row.allowanceTotal);
      case 'total':
        return formatCurrency(row.finalTotal);
      case 'settlement':
        return <SettlementStatusBadge status={tour.settlementStatus} />;
      case 'payment':
        return isTourPaymentEligible(tour) ? (
          <PaymentStatusBadge
            status={tour.paymentStatus}
            method={tour.lastPaymentMethod}
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case 'warning':
        return row.warningInfo.showRedFlag ? (
          <Badge variant="destructive" className="gap-1" title={row.warningInfo.warningTitle}>
            <Flag className="h-3 w-3" />
            Kiểm tra
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case 'actions':
        return (
          <div className="flex justify-end gap-1">
            {canExportTours && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={(event) => handleExportSingle(tour, event)}
                title="Export to Excel"
              >
                <FileDown className="h-4 w-4" />
              </Button>
            )}
            {canDuplicateTours && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={(event) => handleDuplicate(tour.id, event)}
                title="Duplicate tour"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            {canDeleteTours && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={(event) => handleDelete(tour.id, event)}
                disabled={deleteMutation.isPending}
                title="Delete tour"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const renderTourTableToolbar = () => (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-2">
      <div className="text-sm text-muted-foreground">
        Hiển thị <span className="font-semibold text-foreground">{tableFilteredTours.length}</span> / {tours.length} tour trong bảng
      </div>
      <div className="flex items-center gap-2">
        {tableColumnFilterCount > 0 && (
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={clearTableFilters}>
            <FilterX className="mr-1.5 h-4 w-4" />
            Xóa lọc cột
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
              <Columns3 className="mr-1.5 h-4 w-4" />
              Cột
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[70vh] w-56 overflow-y-auto">
            <DropdownMenuLabel>Cột hiển thị</DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setAllTourTableColumnsVisible(true);
              }}
            >
              Hiện tất cả
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setAllTourTableColumnsVisible(false);
              }}
            >
              Ẩn tất cả
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {TOUR_TABLE_COLUMNS.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={tableColumnVisibility[column.key]}
                onCheckedChange={(checked) => toggleTourTableColumn(column.key, checked === true)}
                onSelect={(event) => event.preventDefault()}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      <div className="animate-fade-in">
        {/* Sticky Header - Always pinned to top */}
        <div className={`${headerClasses} border-b pb-4 pt-4 bg-gray-100 dark:bg-gray-900 z-40 space-y-4`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-shrink-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Tour</h1>
            </div>
            <div className="flex w-full min-w-0 flex-nowrap items-center gap-1 overflow-hidden sm:w-auto sm:flex-shrink-0 sm:flex-wrap sm:justify-end sm:gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTopControlsExpanded(!topControlsExpanded)}
                className={topActionButtonClass}
              >
                {topControlsExpanded ? <ChevronUp className={topActionIconClass} /> : <ChevronDown className={topActionIconClass} />}
                <span className="max-w-full truncate sm:hidden">{topControlsExpanded ? 'Ẩn' : 'Hiện'}</span>
                <span className="hidden max-w-full truncate sm:inline">{topControlsExpanded ? 'Ẩn công cụ' : 'Hiện công cụ'}</span>
              </Button>
              {topControlsExpanded && (
                <>
              {canBackupData && (
                <Button
                  onClick={handleBackup}
                  variant="outline"
                  size="sm"
                  disabled={isBackingUp}
                  className={cn(topActionButtonClass, 'hidden lg:flex')}
                  title="Tải bản sao SQL đầy đủ (schema + data)"
                >
                  <Database className={topActionIconClass} />
                      <span className="hidden max-w-full truncate lg:inline">{isBackingUp ? 'Đang sao lưu...' : 'Sao lưu SQL'}</span>
                </Button>
              )}
              {canDownloadAllTourImages && (
                <Button
                  onClick={handleDownloadAllImages}
                  variant="outline"
                  size="sm"
                  disabled={isDownloadingImages}
                  className={cn(topActionButtonClass, 'hidden lg:flex')}
                  title="Tải tất cả ảnh từ tất cả tour"
                >
                  <ImageIcon className={topActionIconClass} />
                  <span className="hidden max-w-full truncate lg:inline">{isDownloadingImages ? 'Đang tải...' : 'Tải tất cả ảnh'}</span>
                </Button>
              )}
              {canImportTours && (
                <ImportTourDialogEnhanced
                  onImport={handleImport}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(topActionButtonClass, 'text-green-600 hover:text-green-700 border-green-600 hover:border-green-700')}
                    >
                      <Upload className={topActionIconClass} />
                      <span className="max-w-full truncate">Nhập</span>
                    </Button>
                  }
                />
              )}
              {canExportTours && (
                <>
                  <Button
                    onClick={handleExportAll}
                    variant="outline"
                    size="sm"
                    className={cn(topActionButtonClass, 'text-blue-600 hover:text-blue-700 border-blue-600 hover:border-blue-700')}
                    title="Xuất tất cả tour vào thư mục theo tháng (ZIP)"
                  >
                    <FolderArchive className={topActionIconClass} />
                    <span className="hidden max-w-full truncate sm:inline">Xuất tất cả → Thư mục</span>
                    <span className="max-w-full truncate sm:hidden">ZIP</span>
                  </Button>
                  <Button
                    onClick={handleExportAllSingle}
                    variant="outline"
                    size="sm"
                    className={cn(topActionButtonClass, 'text-purple-600 hover:text-purple-700 border-purple-600 hover:border-purple-700')}
                    title="Xuất tất cả tour vào 1 file Excel (1 trang với tổng lớn)"
                  >
                    <FileSpreadsheet className={topActionIconClass} />
                    <span className="hidden max-w-full truncate sm:inline">Xuất tất cả → 1 trang</span>
                    <span className="max-w-full truncate sm:hidden">Excel</span>
                  </Button>
                </>
              )}
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
              {canDeleteTours && (
                <AlertDialog open={showDeleteAllPinDialog} onOpenChange={setShowDeleteAllPinDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(topActionButtonClass, 'text-destructive hover:text-destructive')}
                    >
                      <Trash className={topActionIconClass} />
                      <span className="max-w-full truncate sm:hidden">Xóa</span>
                      <span className="hidden max-w-full truncate sm:inline">Xóa tất cả</span>
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
              )}
              {canCreateTours && (
                <Button
                  onClick={() => navigate('/tours/new')}
                  size="sm"
                  className={topActionButtonClass}
                >
                  <Plus className={topActionIconClass} />
                  <span className="max-w-full truncate sm:hidden">Thêm</span>
                  <span className="hidden max-w-full truncate sm:inline">Thêm Tour</span>
                </Button>
              )}
                </>
              )}
            </div>
          </div>

          {topControlsExpanded ? (
            <>
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
              <Popover open={topCompanyFilterOpen} onOpenChange={setTopCompanyFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal h-10 ${!searchCompany ? 'text-muted-foreground' : ''}`}
                    title={searchCompany || 'Tìm kiếm công ty...'}
                  >
                    <span className="truncate">{searchCompany || 'Tìm kiếm công ty...'}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Tìm công ty..." />
                    <CommandList>
                      <CommandEmpty>Không tìm thấy công ty.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__all_companies__"
                          onSelect={() => {
                            setSearchCompany('');
                            setTopCompanyFilterOpen(false);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${searchCompany ? 'opacity-0' : 'opacity-100'}`} />
                          Tất cả công ty
                        </CommandItem>
                        {topCompanyOptions.map((company) => (
                          <CommandItem
                            key={company}
                            value={company}
                            onSelect={() => {
                              setSearchCompany(company);
                              setTopCompanyFilterOpen(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${searchCompany === company ? 'opacity-100' : 'opacity-0'}`} />
                            <span className="truncate">{company}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
                      Trạng thái QT
                    </label>
                    <Select
                      value={settlementStatusFilter}
                      onValueChange={(v) => {
                        setSettlementStatusFilter(v);
                        localStorage.setItem('tours.settlementStatusFilter', v);
                      }}
                    >
                      <SelectTrigger className="h-8 sm:h-10">
                        <SelectValue placeholder="Tất cả trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        <SelectItem value="draft">Đang soạn</SelectItem>
                        <SelectItem value="submitted">Đã gửi kế toán</SelectItem>
                        <SelectItem value="need_changes">Cần bổ sung</SelectItem>
                        <SelectItem value="approved">Đã duyệt</SelectItem>
                        <SelectItem value="closed">Đã đóng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      Thanh toán
                    </label>
                    <Select
                      value={paymentStatusFilter}
                      onValueChange={(v) => {
                        setPaymentStatusFilter(v);
                        localStorage.setItem('tours.paymentStatusFilter', v);
                      }}
                    >
                      <SelectTrigger className="h-8 sm:h-10">
                        <SelectValue placeholder="Tất cả thanh toán" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả thanh toán</SelectItem>
                        <SelectItem value="pending">Chờ thanh toán</SelectItem>
                        <SelectItem value="partial">Thanh toán một phần</SelectItem>
                        <SelectItem value="paid">Đã thanh toán</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-md border bg-background/70 px-3 py-2 text-xs sm:text-sm">
              <span className="font-medium">Đang ẩn khu vực tìm kiếm, lọc và thao tác.</span>
              <span className="text-muted-foreground">
                {tours.length} tour đang hiển thị
              </span>
              {hasActiveFilters && (
                <Badge variant="secondary">Có bộ lọc đang áp dụng</Badge>
              )}
              {showToursBackgroundRefresh && (
                <span className="ml-auto flex items-center gap-1.5 text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Đang cập nhật...
                </span>
              )}
            </div>
          )}
        </div>

        {/* Totals - Always Visible (Outside Filters Section) */}
        {topControlsExpanded && (
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
          {showToursBackgroundRefresh && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Đang cập nhật...</span>
            </div>
          )}
        </div>
        )}

        {showInitialToursSkeleton ? (
          <>
            <div className="grid grid-cols-1 gap-4 mt-6 md:hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
            <div className="hidden md:block mt-6 rounded-lg border bg-card overflow-hidden">
              <Table className="min-w-[1350px]">
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Mã tour</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Ngày đi</TableHead>
                    <TableHead>Khách</TableHead>
                    <TableHead>Công ty</TableHead>
                    <TableHead className="text-right">CTP</TableHead>
                    <TableHead className="text-right">Tổng</TableHead>
                    <TableHead>Cờ cảnh báo</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((cell) => (
                        <TableCell key={cell}>
                          <div className="h-4 rounded bg-muted animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : totalTours === 0 ? (
          <div className="text-center py-12 text-muted-foreground mt-6">
            {!hasActiveFilters && !(searchCode.trim() || dateRange?.from || dateRange?.to || searchCompany.trim())
              ? 'Không tìm thấy tour nào. Tạo tour đầu tiên để bắt đầu.'
              : 'Không có tour nào phù hợp với bộ lọc.'}
          </div>
        ) : (
          <>
            <div className="hidden md:block mt-6 rounded-lg border bg-card overflow-hidden">
              {renderTourTableToolbar()}
              {visibleTourTableColumns.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Tất cả cột đang ẩn. Dùng nút Cột để hiện lại.
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1 border-b bg-muted/10 px-1 py-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 shrink-0 p-0"
                      onClick={() => scrollTourTableHorizontally(-360)}
                      aria-label="Cuộn bảng sang trái"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div
                      ref={tourTableTopScrollRef}
                      className="h-5 min-w-0 flex-1 overflow-x-scroll overflow-y-hidden"
                      onScroll={() => syncTourTableScroll('top')}
                      onWheel={(event) => {
                        event.preventDefault();
                        scrollTourTableHorizontally(event.deltaX + event.deltaY);
                      }}
                    >
                      <div className="h-1" style={{ width: `${tourTableWidth}px`, minWidth: `${tourTableWidth}px` }} />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 shrink-0 p-0"
                      onClick={() => scrollTourTableHorizontally(360)}
                      aria-label="Cuộn bảng sang phải"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div
                    ref={tourTableBottomScrollRef}
                    className="w-full max-w-full overflow-x-scroll"
                    onScroll={() => syncTourTableScroll('bottom')}
                  >
                    <Table
                      className="table-fixed text-xs"
                      style={{ width: tourTableWidth, minWidth: tourTableWidth }}
                    >
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                          {visibleTourTableColumns.map((column) => (
                            <TableHead
                              key={column.key}
                              className={cn('px-2 py-2 align-top', column.headerClassName)}
                              style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
                            >
                              {renderTourTableHeader(column)}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableFilteredTours.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={visibleTourTableColumns.length} className="h-24 text-center text-muted-foreground">
                              Không có tour nào phù hợp với bộ lọc cột.
                            </TableCell>
                          </TableRow>
                        ) : (
                          tableFilteredTours.map((tour, index) => {
                            const row = {
                              warningInfo: getTourWarningInfo(tour),
                              totalDays: getTourDays(tour),
                              totalGuests: getTourGuests(tour),
                              allowanceTotal: getAllowanceTotal(tour),
                              finalTotal: tour.summary?.finalTotal ?? 0,
                              hasChildren: (tour.children || 0) > 0,
                              index,
                            };

                            return (
                              <TableRow
                                key={tour.id}
                                className={`cursor-pointer ${row.warningInfo.showRedFlag ? 'bg-destructive/5 hover:bg-destructive/10' : ''}`}
                                onClick={() => navigate(`/tours/${tour.id}`)}
                              >
                                {visibleTourTableColumns.map((column) => (
                                  <TableCell
                                    key={column.key}
                                    className={cn('px-2 py-2 text-xs', column.cellClassName)}
                                    style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
                                  >
                                    {renderTourTableCellContent(column, tour, row)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>

          <div className="grid grid-cols-1 gap-4 mt-6 md:hidden">
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
              const hasWaterExpense = (tour.expenses || []).some(exp =>
                WATER_EXPENSE_NAMES.includes((exp.name || '').trim().toLowerCase())
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
                          <p className="truncate" title={formatTourNationalities(tour)}>
                            <span className="text-muted-foreground">Nationality: </span>
                            <span className="font-medium">
                              {truncateText(formatTourNationalities(tour), 24)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                  <div className="flex gap-2 pt-2 border-t justify-end">
                      {canExportTours && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={(e) => handleExportSingle(tour, e)}
                          title="Export to Excel"
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                      )}
                      {canDuplicateTours && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={(e) => handleDuplicate(tour.id, e)}
                          title="Duplicate tour"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {canDeleteTours && (
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
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>
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
    </>
  );
};

export default Tours;
