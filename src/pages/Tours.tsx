import { useState, useMemo } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import JSZip from 'jszip';
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
} from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { exportTourToExcel, exportAllToursToMonthlyZip, exportAllToursToExcel } from '@/lib/excel-utils';
import { useTourImport } from '@/hooks/useTourImport';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import type { Tour, TourListResult } from '@/types/tour';
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
import { ToursDesktopTable } from '@/pages/tours/ToursDesktopTable';
import { ToursFilterBar } from '@/pages/tours/ToursFilterBar';
import { ToursHeaderControls } from '@/pages/tours/ToursHeaderControls';
import { ToursLoadingSkeleton } from '@/pages/tours/ToursLoadingSkeleton';
import { ToursMobileCards } from '@/pages/tours/ToursMobileCards';
import { ToursTotalsBar } from '@/pages/tours/ToursTotalsBar';
import { useTourFilters } from '@/pages/tours/useTourFilters';


const Tours = () => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isDownloadingImages, setIsDownloadingImages] = useState(false);
  
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

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => store.listCompanies({}),
    staleTime: TOUR_REFERENCE_STALE_TIME,
    gcTime: TOUR_REFERENCE_GC_TIME,
  });

  const {
    searchCode,
    setSearchCode,
    dateRange,
    setDateRange,
    searchCompany,
    setSearchCompany,
    nationalityFilter,
    setNationalityFilter,
    settlementStatusFilter,
    setSettlementStatusFilter,
    paymentStatusFilter,
    setPaymentStatusFilter,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    sortBy,
    setSortBy,
    filtersExpanded,
    setFiltersExpanded,
    searchExpanded,
    setSearchExpanded,
    topControlsExpanded,
    setTopControlsExpanded,
    topCompanyFilterOpen,
    setTopCompanyFilterOpen,
    baseTourQuery,
    topCompanyOptions,
    months,
    clearFilters,
    hasActiveFilters,
  } = useTourFilters([], companies);

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

  return (
    <>
      <div className="animate-fade-in">
        {/* Sticky Header - Always pinned to top */}
        <div className={`${headerClasses} border-b pb-4 pt-4 bg-gray-100 dark:bg-gray-900 z-40 space-y-4`}>
          <ToursHeaderControls
            topControlsExpanded={topControlsExpanded}
            onToggleTopControls={() => setTopControlsExpanded(!topControlsExpanded)}
            canBackupData={canBackupData}
            canDownloadAllTourImages={canDownloadAllTourImages}
            canImportTours={canImportTours}
            canExportTours={canExportTours}
            canDeleteTours={canDeleteTours}
            canCreateTours={canCreateTours}
            isBackingUp={isBackingUp}
            isDownloadingImages={isDownloadingImages}
            deleteAllPinInput={deleteAllPinInput}
            showDeleteAllPinDialog={showDeleteAllPinDialog}
            onDeleteAllPinInputChange={setDeleteAllPinInput}
            onDeleteAllPinDialogChange={setShowDeleteAllPinDialog}
            onDeleteAllConfirm={handleDeleteAllConfirm}
            onBackup={handleBackup}
            onDownloadAllImages={handleDownloadAllImages}
            onImport={handleImport}
            onExportAll={handleExportAll}
            onExportAllSingle={handleExportAllSingle}
            onCreateTour={() => navigate('/tours/new')}
          />
          <ToursFilterBar
            topControlsExpanded={topControlsExpanded}
            searchExpanded={searchExpanded}
            filtersExpanded={filtersExpanded}
            topCompanyFilterOpen={topCompanyFilterOpen}
            searchCode={searchCode}
            dateRange={dateRange}
            searchCompany={searchCompany}
            settlementStatusFilter={settlementStatusFilter}
            paymentStatusFilter={paymentStatusFilter}
            nationalityFilter={nationalityFilter}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            sortBy={sortBy}
            topCompanyOptions={topCompanyOptions}
            nationalities={nationalities}
            months={months}
            availableYears={availableYears}
            toursCount={tours.length}
            hasActiveFilters={hasActiveFilters}
            showToursBackgroundRefresh={showToursBackgroundRefresh}
            setSearchExpanded={setSearchExpanded}
            setFiltersExpanded={setFiltersExpanded}
            setTopCompanyFilterOpen={setTopCompanyFilterOpen}
            setSearchCode={setSearchCode}
            setDateRange={setDateRange}
            setSearchCompany={setSearchCompany}
            setSettlementStatusFilter={setSettlementStatusFilter}
            setPaymentStatusFilter={setPaymentStatusFilter}
            setNationalityFilter={setNationalityFilter}
            setSelectedMonth={setSelectedMonth}
            setSelectedYear={setSelectedYear}
            setSortBy={setSortBy}
            clearFilters={clearFilters}
          />
        </div>

        {/* Totals - Always Visible (Outside Filters Section) */}
        {topControlsExpanded && (
          <ToursTotalsBar
            toursCount={tours.length}
            filteredToursTotal={filteredToursTotal}
            allToursData={allToursData}
            showToursBackgroundRefresh={showToursBackgroundRefresh}
          />
        )}

        {showInitialToursSkeleton ? (
          <ToursLoadingSkeleton />
        ) : totalTours === 0 ? (
          <div className="text-center py-12 text-muted-foreground mt-6">
            {!hasActiveFilters && !(searchCode.trim() || dateRange?.from || dateRange?.to || searchCompany.trim())
              ? 'Không tìm thấy tour nào. Tạo tour đầu tiên để bắt đầu.'
              : 'Không có tour nào phù hợp với bộ lọc.'}
          </div>
        ) : (
          <>
            <ToursDesktopTable
              tours={tours}
              canExportTours={canExportTours}
              canDuplicateTours={canDuplicateTours}
              canDeleteTours={canDeleteTours}
              deletePending={deleteMutation.isPending}
              onOpenTour={(tourId) => navigate(`/tours/${tourId}`)}
              onExportSingle={handleExportSingle}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
            <ToursMobileCards
              tours={tours}
              canExportTours={canExportTours}
              canDuplicateTours={canDuplicateTours}
              canDeleteTours={canDeleteTours}
              deletePending={deleteMutation.isPending}
              onOpenTour={(tourId) => navigate(`/tours/${tourId}`)}
              onExportSingle={handleExportSingle}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
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
