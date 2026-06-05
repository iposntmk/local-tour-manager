import { useMemo } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTourImport } from '@/hooks/useTourImport';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import type { Tour, TourListResult } from '@/types/tour';
import {
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
import { getTourWarningInfo } from '@/pages/tours/tour-table-config';
import { ToursConfirmDialogs } from '@/pages/tours/ToursConfirmDialogs';
import { useTourPageActions } from '@/pages/tours/useTourPageActions';


const Tours = () => {
  // Pagination disabled; show all results
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, isAdmin } = useAuth();
  const canCreateTours = hasPermission('create_tours');
  const canDeleteTours = hasPermission('delete_tours');
  const canDuplicateTours = hasPermission('duplicate_tours');
  const canExportTours = hasPermission('export_tours');
  const canImportTours = hasPermission('import_tours');
  const canBackupData = hasPermission('backup_data');
  const canDownloadAllTourImages = hasPermission('download_all_tour_images');

  const { data: userProfiles = [] } = useQuery({
    queryKey: ['userProfiles'],
    queryFn: () => store.listUserProfiles(),
    enabled: isAdmin,
  });
  const userProfileMap = useMemo(() => {
    const m = new Map<string, { fullName?: string; email: string }>();
    userProfiles.forEach(p => m.set(p.id, { fullName: p.fullName, email: p.email }));
    return m;
  }, [userProfiles]);

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
    searchLandOperator,
    setSearchLandOperator,
    nationalityFilter,
    setNationalityFilter,
    settlementStatusFilter,
    setSettlementStatusFilter,
    paymentStatusFilter,
    setPaymentStatusFilter,
    shoppingCommissionFilter,
    setShoppingCommissionFilter,
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
    topLandOperatorFilterOpen,
    setTopLandOperatorFilterOpen,
    baseTourQuery,
    topCompanyOptions,
    topLandOperatorOptions,
    months,
    clearFilters,
    hasActiveFilters,
  } = useTourFilters([], companies);

  // Disable pagination entirely: always fetch ALL matching tours

  const {
    data: toursResult,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['tours', baseTourQuery],
    queryFn: () => store.listTours({ ...baseTourQuery }, { includeDetails: true }),
    placeholderData: keepPreviousData,
    staleTime: TOUR_LIST_STALE_TIME,
    gcTime: TOUR_LIST_GC_TIME,
  });

  // No need for client-side sorting anymore - database handles it
  const tours = useMemo(() => (toursResult as TourListResult | undefined)?.tours ?? [], [toursResult]);

  const displayedTours = useMemo(() => {
    if (shoppingCommissionFilter === 'all') return tours;
    return tours.filter((tour) => {
      const hasUnpaidShoppingCommission = getTourWarningInfo(tour).hasUnpaidShoppingCommission;
      return shoppingCommissionFilter === 'unpaid' ? hasUnpaidShoppingCommission : !hasUnpaidShoppingCommission;
    });
  }, [shoppingCommissionFilter, tours]);

  const totalTours = (toursResult as TourListResult | undefined)?.total ?? 0;

  // Calculate total final amount for filtered tours (current page)
  const filteredToursTotal = useMemo(() => {
    return displayedTours.reduce((sum, tour) => {
      const finalTotal = tour.summary?.finalTotal ?? 0;
      return sum + finalTotal;
    }, 0);
  }, [displayedTours]);

  const showInitialToursSkeleton = isLoading && !toursResult;
  const showToursBackgroundRefresh = isFetching && !showInitialToursSkeleton;

  // Fetch grand total of ALL tours in database without loading nested tour details
  const { data: allToursData } = useQuery({
    queryKey: TOUR_GRAND_TOTAL_QUERY_KEY,
    queryFn: () => store.getToursGrandTotal(),
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

  const tourActions = useTourPageActions({
    queryClient,
    baseTourQuery,
    totalTours,
    canExportTours,
    canDuplicateTours,
    canDeleteTours,
    canBackupData,
    canDownloadAllTourImages,
    isAdmin,
  });

  const { handleImport: handleImportFromHook, importToursAsync } = useTourImport(queryClient, baseTourQuery);

  const handleImport = (tours: Partial<Tour>[]) => {
    if (!canImportTours) {
      toast.error('Bạn không có quyền nhập tour.');
      return;
    }
    handleImportFromHook(tours);
  };

  // Dùng cho luồng import-từ-ảnh: tạo tour rồi trả về để đính ảnh gốc.
  const handleImportAsync = (tours: Partial<Tour>[]) => {
    if (!canImportTours) {
      toast.error('Bạn không có quyền nhập tour.');
      return Promise.reject(new Error('Không có quyền nhập tour'));
    }
    return importToursAsync(tours);
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
            isBackingUp={tourActions.isBackingUp}
            isDownloadingImages={tourActions.isDownloadingImages}
            deleteAllPinInput={tourActions.deleteAllPinInput}
            showDeleteAllPinDialog={tourActions.showDeleteAllPinDialog}
            onDeleteAllPinInputChange={tourActions.setDeleteAllPinInput}
            onDeleteAllPinDialogChange={tourActions.setShowDeleteAllPinDialog}
            onDeleteAllConfirm={tourActions.handleDeleteAllConfirm}
            onBackup={tourActions.handleBackup}
            onDownloadAllImages={tourActions.handleDownloadAllImages}
            onImport={handleImport}
            onImportAsync={handleImportAsync}
            onExportAll={tourActions.handleExportAll}
            onExportAllSingle={tourActions.handleExportAllSingle}
            onCreateTour={() => { if (isAdmin) { tourActions.setShowAdminCreateConfirm(true); } else { navigate('/tours/new'); } }}
          />
          <ToursFilterBar
            topControlsExpanded={topControlsExpanded}
            searchExpanded={searchExpanded}
            filtersExpanded={filtersExpanded}
            topCompanyFilterOpen={topCompanyFilterOpen}
            topLandOperatorFilterOpen={topLandOperatorFilterOpen}
            searchCode={searchCode}
            dateRange={dateRange}
            searchCompany={searchCompany}
            searchLandOperator={searchLandOperator}
            settlementStatusFilter={settlementStatusFilter}
            paymentStatusFilter={paymentStatusFilter}
            shoppingCommissionFilter={shoppingCommissionFilter}
            nationalityFilter={nationalityFilter}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            sortBy={sortBy}
            topCompanyOptions={topCompanyOptions}
            topLandOperatorOptions={topLandOperatorOptions}
            nationalities={nationalities}
            months={months}
            availableYears={availableYears}
            toursCount={displayedTours.length}
            hasActiveFilters={hasActiveFilters}
            showToursBackgroundRefresh={showToursBackgroundRefresh}
            setSearchExpanded={setSearchExpanded}
            setFiltersExpanded={setFiltersExpanded}
            setTopCompanyFilterOpen={setTopCompanyFilterOpen}
            setTopLandOperatorFilterOpen={setTopLandOperatorFilterOpen}
            setSearchCode={setSearchCode}
            setDateRange={setDateRange}
            setSearchCompany={setSearchCompany}
            setSearchLandOperator={setSearchLandOperator}
            setSettlementStatusFilter={setSettlementStatusFilter}
            setPaymentStatusFilter={setPaymentStatusFilter}
            setShoppingCommissionFilter={setShoppingCommissionFilter}
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
            toursCount={displayedTours.length}
            filteredToursTotal={filteredToursTotal}
            allToursData={allToursData}
            showToursBackgroundRefresh={showToursBackgroundRefresh}
          />
        )}

        {isError && (
          <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <p className="font-semibold">Không thể tải danh sách tour</p>
            <p className="mt-0.5 text-destructive/80">
              {error instanceof Error ? error.message : 'Vui lòng thử lại sau.'}
            </p>
          </div>
        )}

        {showInitialToursSkeleton ? (
          <ToursLoadingSkeleton />
        ) : displayedTours.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground mt-6">
            {!hasActiveFilters && !(searchCode.trim() || dateRange?.from || dateRange?.to || searchCompany.trim() || searchLandOperator.trim())
              ? 'Không tìm thấy tour nào. Tạo tour đầu tiên để bắt đầu.'
              : 'Không có tour nào phù hợp với bộ lọc.'}
          </div>
        ) : (
          <>
            <ToursDesktopTable
              tours={displayedTours}
              canExportTours={canExportTours}
              canDuplicateTours={canDuplicateTours}
              canDeleteTours={canDeleteTours}
              deletePending={tourActions.deleteMutation.isPending}
              userProfileMap={isAdmin ? userProfileMap : undefined}
              onOpenTour={(tourId) => navigate(`/tours/${tourId}`)}
              onExportSingle={tourActions.handleExportSingle}
              onDuplicate={tourActions.handleDuplicate}
              onDelete={tourActions.handleDelete}
            />
            <ToursMobileCards
              tours={displayedTours}
              canExportTours={canExportTours}
              canDuplicateTours={canDuplicateTours}
              canDeleteTours={canDeleteTours}
              deletePending={tourActions.deleteMutation.isPending}
              onOpenTour={(tourId) => navigate(`/tours/${tourId}`)}
              onExportSingle={tourActions.handleExportSingle}
              onDuplicate={tourActions.handleDuplicate}
              onDelete={tourActions.handleDelete}
            />
          </>
        )}

        <ToursConfirmDialogs
          showAdminCreateConfirm={tourActions.showAdminCreateConfirm}
          pendingDuplicateId={tourActions.pendingDuplicateId}
          deleteTourId={tourActions.deleteTourId}
          onAdminCreateOpenChange={tourActions.setShowAdminCreateConfirm}
          onDuplicateOpenChange={(open) => !open && tourActions.setPendingDuplicateId(null)}
          onDeleteOpenChange={(open) => !open && tourActions.setDeleteTourId(null)}
          onAdminCreateConfirm={() => {
            tourActions.setShowAdminCreateConfirm(false);
            navigate('/tours/new');
          }}
          onDuplicateConfirm={tourActions.confirmDuplicate}
          onDeleteConfirm={tourActions.confirmDelete}
        />
        {/* Pagination removed */}
      </div>
    </>
  );
};

export default Tours;
