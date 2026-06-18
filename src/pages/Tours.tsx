import { useMemo } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { useNavigate } from 'react-router-dom';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Tour, TourListResult } from '@/types/tour';
import {
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
import { ToursPagination } from '@/pages/tours/ToursPagination';
import { ToursTotalsBar } from '@/pages/tours/ToursTotalsBar';
import { useTourFilters } from '@/pages/tours/useTourFilters';
import { useTourPagination } from '@/pages/tours/useTourPagination';
import { ToursConfirmDialogs } from '@/pages/tours/ToursConfirmDialogs';
import { useTourPageActions } from '@/pages/tours/useTourPageActions';
import { filterToursForList, isTourInListFilters } from '@/pages/tours/tour-list-filters';
import { useStableTourYears } from '@/pages/tours/useStableTourYears';
import { useTourImportActions } from '@/pages/tours/useTourImportActions';


const Tours = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
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
    guideFilter,
    setGuideFilter,
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
    exportTourQuery,
    clearFilters,
    hasActiveFilters,
  } = useTourFilters(companies);

  const { data: guideUsers = [] } = useQuery({
    queryKey: ['guideUsers'],
    queryFn: () => store.listGuideUsers(),
    enabled: isAdmin,
    staleTime: TOUR_REFERENCE_STALE_TIME,
    gcTime: TOUR_REFERENCE_GC_TIME,
  });

  const {
    data: toursResult,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['tours', exportTourQuery],
    queryFn: () => store.listTours({ ...exportTourQuery }, { includeDetails: false }),
    placeholderData: keepPreviousData,
    staleTime: TOUR_LIST_STALE_TIME,
    gcTime: TOUR_LIST_GC_TIME,
  });

  const { data: grandTotal } = useQuery({
    queryKey: ['tours', 'grandTotal'],
    queryFn: () => store.getToursGrandTotal(),
    staleTime: TOUR_LIST_STALE_TIME,
    gcTime: TOUR_LIST_GC_TIME,
  });

  const tours = useMemo(() => (toursResult as TourListResult | undefined)?.tours ?? [], [toursResult]);
  const hasDateRangeFilter = !!(dateRange?.from || dateRange?.to);
  const listFilters = useMemo(() => ({
    settlementStatusFilter,
    paymentStatusFilter,
    nationalityFilter,
    shoppingCommissionFilter,
    selectedMonth,
    selectedYear,
    hasDateRangeFilter,
  }), [
    hasDateRangeFilter,
    nationalityFilter,
    paymentStatusFilter,
    selectedMonth,
    selectedYear,
    settlementStatusFilter,
    shoppingCommissionFilter,
  ]);

  const displayedTours = useMemo(() => filterToursForList(tours, listFilters), [tours, listFilters]);

  const filteredToursTotal = useMemo(() => {
    return displayedTours.reduce((sum, tour) => {
      const finalTotal = tour.summary?.finalTotal ?? 0;
      return sum + finalTotal;
    }, 0);
  }, [displayedTours]);

  const pagination = useTourPagination(displayedTours);
  const showInitialToursSkeleton = isLoading && !toursResult;
  const showToursBackgroundRefresh = isFetching && !showInitialToursSkeleton;
  const showPagination = displayedTours.length > pagination.pageSize;

  const { data: nationalities = [] } = useQuery({
    queryKey: ['nationalities'],
    queryFn: () => store.listNationalities({}),
    staleTime: TOUR_REFERENCE_STALE_TIME,
    gcTime: TOUR_REFERENCE_GC_TIME,
  });

  const availableYears = useStableTourYears(tours, selectedYear);
  const exportTourFilter = useMemo(() => {
    return (tour: Tour) => isTourInListFilters(tour, listFilters);
  }, [listFilters]);

  const tourActions = useTourPageActions({
    queryClient,
    exportTourQuery,
    exportTourFilter,
    totalTours: displayedTours.length,
    canExportTours,
    canDuplicateTours,
    canDeleteTours,
    canBackupData,
    canDownloadAllTourImages,
    isAdmin,
  });

  const { handleImport, handleImportAsync } = useTourImportActions({
    queryClient,
    baseTourQuery,
    canImportTours,
  });

  const { classes: headerClasses } = useHeaderMode('tours.headerMode');

  return (
    <>
      <div className="animate-fade-in">
        <div className={`${headerClasses} border-b pb-2 pt-2 sm:pb-4 sm:pt-4 bg-gray-100 dark:bg-gray-900 z-40 space-y-2 sm:space-y-4`}>
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
            topCompanyFilterOpen={topCompanyFilterOpen}
            topLandOperatorFilterOpen={topLandOperatorFilterOpen}
            searchCode={searchCode}
            dateRange={dateRange}
            searchCompany={searchCompany}
            searchLandOperator={searchLandOperator}
            guideFilter={guideFilter}
            setGuideFilter={setGuideFilter}
            guides={guideUsers}
            isAdmin={isAdmin}
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
          <ToursTotalsBar
            grandTotalCount={grandTotal?.count ?? displayedTours.length}
            grandTotalAmount={grandTotal?.grandTotal ?? 0}
            filteredCount={displayedTours.length}
            filteredTotal={filteredToursTotal}
            showToursBackgroundRefresh={showToursBackgroundRefresh}
          />
        </div>

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
            {!hasActiveFilters
              ? 'Không tìm thấy tour nào. Tạo tour đầu tiên để bắt đầu.'
              : 'Không có tour nào phù hợp với bộ lọc.'}
          </div>
        ) : isMobile ? (
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
        ) : (
          <ToursDesktopTable
            tours={pagination.pagedItems}
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
        )}

        {!isMobile && showPagination && (
          <ToursPagination
            currentCount={pagination.pagedItems.length}
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            totalItems={displayedTours.length}
            onPageChange={pagination.setPageIndex}
            onPageSizeChange={pagination.setPageSize}
          />
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
      </div>
    </>
  );
};

export default Tours;
