import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { TourInfoForm } from '@/components/tours/TourInfoForm';
import { DestinationsTab } from '@/components/tours/DestinationsTab';
import { ExpensesTab } from '@/components/tours/ExpensesTab';
import { MealsTab } from '@/components/tours/MealsTab';
import { ShoppingsTab } from '@/components/tours/ShoppingsTab';
import { AllowancesTab } from '@/components/tours/AllowancesTab';
import { SummaryTab } from '@/components/tours/SummaryTab';
import { TourImagesTab } from '@/components/tours/TourImagesTab';
import { CombinedTab } from '@/components/tours/CombinedTab';
import { SettlementHistoryPanel } from '@/components/tours/SettlementHistoryPanel';
import { TourDetailHeader } from '@/components/tours/TourDetailHeader';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { useTourDetail } from '@/hooks/useTourDetail';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import type { Tour } from '@/types/tour';
import type { SummaryLineType } from '@/components/tours/SummaryLineReviewTable';
import { TOUR_TAB_ORDER, TOUR_TAB_TO_ROUTE, canEditAnyTourLineField, type TourTabKey } from '@/lib/tour-detail-permissions';

const TourDetail = () => {
  const navigate = useNavigate();
  const [editTarget, setEditTarget] = useState<{ lineType: SummaryLineType; index: number; key: number } | null>(null);
  const { classes: headerClasses } = useHeaderMode('tourdetail.headerMode');
  const {
    id, tour, tourImages, displayTour, isNewTour, isLoading,
    newTourData, setNewTourData,
    deleteDialogOpen, setDeleteDialogOpen,
    activeTab, setActiveTab,
    historyOpen, setHistoryOpen,
    waterDismissedLocal, isWaterDismissed, showWaterWarning,
    isSettlementLocked, settlementStatus,
    totalGuests, hasUnpaidShoppings, tabAccess, infoFieldAccess, lineFieldAccess,
    canCreateTour, canEditTourInfo, canEditDestinations, canEditExpenses,
    canEditMeals, canEditAllowances, canViewShoppings, canEditShoppings, canEditSummary,
    canExportTour, canDeleteTour, canUploadTourImages, canDeleteTourImages,
    handleInfoSave, handleSummaryUpdate, handleDelete,
    handleHeaderSave, handleExportExcel, handleDismissWater,
  } = useTourDetail();

  const lockedStatusNote = settlementStatus === 'submitted'
    ? 'Hồ sơ đã gửi kế toán và đang chờ kiểm tra.'
    : settlementStatus === 'approved'
      ? 'Hồ sơ đã được duyệt và khóa.'
      : settlementStatus === 'closed'
        ? 'Hồ sơ đã đóng.'
        : 'Hồ sơ đang bị khóa chỉnh sửa.';

  const lockBanner = isSettlementLocked ? (
    <div className="mb-4 rounded-lg border border-amber-500 bg-amber-50 p-4 dark:bg-amber-950">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1">
          <h4 className="font-semibold text-amber-800 dark:text-amber-200">Không thể chỉnh sửa</h4>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {lockedStatusNote} Bạn không thể chỉnh sửa thông tin tour, các dòng chi phí hay tổng kết.
            Cần kế toán trả hồ sơ hoặc mở khóa để chỉnh sửa lại.
          </p>
        </div>
      </div>
    </div>
  ) : null;

  const waterBanner = showWaterWarning ? (
    <div className="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950 p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Thiếu chi phí nước uống</h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            Tour này chưa có dòng "Nước uống cho khách 10k/1 khách / 1 ngày". Vui lòng thêm chi phí này trong tab Chi phí.
          </p>
          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <Checkbox checked={isWaterDismissed || waterDismissedLocal} onCheckedChange={handleDismissWater} disabled={!canEditExpenses} />
            <span className="text-sm text-yellow-700 dark:text-yellow-300">Tour này không bao gồm chi phí nước uống (bỏ qua cảnh báo)</span>
          </label>
        </div>
      </div>
    </div>
  ) : null;

  useEffect(() => {
    if (!tabAccess) return;
    const activeKey = activeTab as TourTabKey;
    if (tabAccess[activeKey]?.view) return;
    const fallback = TOUR_TAB_ORDER.find((tab) => tabAccess[tab]?.view);
    if (fallback) setActiveTab(TOUR_TAB_TO_ROUTE[fallback]);
  }, [activeTab, setActiveTab, tabAccess]);

  const handleEditLineFromSummary = (lineType: SummaryLineType, index: number) => {
    const tabByType: Record<SummaryLineType, string> = {
      destination: 'destinations',
      meal: 'meals',
      expense: 'expenses',
      allowance: 'allowances',
    };
    setEditTarget({ lineType, index, key: Date.now() });
    setActiveTab(tabByType[lineType]);
  };

  const canEditLineFromSummary = (lineType: SummaryLineType) => {
    // Dùng các cờ đã tính sẵn (đã bao gồm khóa settlement) thay vì tabAccess thô,
    // để khi hồ sơ đã gửi/duyệt thì nút "Sửa" trong tab tổng hợp cũng bị khóa.
    const editableByType: Record<SummaryLineType, boolean> = {
      destination: canEditDestinations,
      meal: canEditMeals,
      expense: canEditExpenses,
      allowance: canEditAllowances,
    };
    return editableByType[lineType] && canEditAnyTourLineField(lineFieldAccess);
  };

  if (isLoading && !isNewTour) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-[400px] bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (isNewTour && !canCreateTour) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Không có quyền tạo tour</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tài khoản của bạn chưa được cấp quyền tạo tour mới.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in">
        {(isNewTour || tour) ? (
          <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TourDetailHeader
              tour={tour}
              displayTour={displayTour as Tour | undefined}
              isNewTour={isNewTour}
              activeTab={activeTab}
              canCreateTour={canCreateTour}
              canEditTourInfo={canEditTourInfo}
              canExportTour={canExportTour}
              canDeleteTour={canDeleteTour}
              canViewShoppings={canViewShoppings}
              tabAccess={tabAccess}
              hasUnpaidShoppings={hasUnpaidShoppings}
              tourImagesCount={tourImages.length}
              totalGuests={totalGuests}
              headerClasses={headerClasses}
              onNavigateBack={() => navigate('/tours')}
              onSave={handleHeaderSave}
              onExport={handleExportExcel}
              onDeleteOpen={() => setDeleteDialogOpen(true)}
              onShowHistory={() => setHistoryOpen(true)}
            />

            {lockBanner}

            {tabAccess.info.view && <TabsContent value="info" className="animate-fade-in data-[state=inactive]:hidden" forceMount>
              {waterBanner}
              <div className="rounded-lg border bg-card p-6">
                <TourInfoForm
                  initialData={isNewTour ? undefined : tour}
                  onSubmit={handleInfoSave}
                  showSubmitButton={false}
                  readOnly={!canEditTourInfo}
                  fieldAccess={infoFieldAccess}
                />
              </div>
            </TabsContent>}

            {tabAccess.destinations.view && <TabsContent value="destinations" className="animate-fade-in">
              {waterBanner}
              <DestinationsTab tourId={isNewTour ? undefined : id!} destinations={displayTour?.destinations || []} tour={displayTour} readOnly={!canEditDestinations}
                lineFieldAccess={lineFieldAccess}
                editRequest={editTarget?.lineType === 'destination' ? { index: editTarget.index, key: editTarget.key } : undefined}
                onChange={(dests) => { if (isNewTour) setNewTourData({ ...newTourData, destinations: dests }); }} />
            </TabsContent>}

            {tabAccess.expenses.view && <TabsContent value="expenses" className="animate-fade-in">
              <ExpensesTab tourId={isNewTour ? undefined : id!} expenses={displayTour?.expenses || []} tour={displayTour} readOnly={!canEditExpenses}
                lineFieldAccess={lineFieldAccess}
                editRequest={editTarget?.lineType === 'expense' ? { index: editTarget.index, key: editTarget.key } : undefined}
                onChange={(exps) => { if (isNewTour) setNewTourData({ ...newTourData, expenses: exps }); }} />
            </TabsContent>}

            {tabAccess.meals.view && <TabsContent value="meals" className="animate-fade-in">
              {waterBanner}
              <MealsTab tourId={isNewTour ? undefined : id!} meals={displayTour?.meals || []} tour={displayTour} readOnly={!canEditMeals}
                lineFieldAccess={lineFieldAccess}
                editRequest={editTarget?.lineType === 'meal' ? { index: editTarget.index, key: editTarget.key } : undefined}
                onChange={(mls) => { if (isNewTour) setNewTourData({ ...newTourData, meals: mls }); }} />
            </TabsContent>}

            {tabAccess.combined.view && <TabsContent value="combined" className="animate-fade-in">
              {waterBanner}
              <CombinedTab tour={displayTour} />
            </TabsContent>}

            {tabAccess.allowances.view && <TabsContent value="allowances" className="animate-fade-in">
              {waterBanner}
              <AllowancesTab tourId={isNewTour ? undefined : id!} allowances={displayTour?.allowances || []} tour={displayTour} readOnly={!canEditAllowances}
                lineFieldAccess={lineFieldAccess}
                editRequest={editTarget?.lineType === 'allowance' ? { index: editTarget.index, key: editTarget.key } : undefined}
                onChange={(allows) => { if (isNewTour) setNewTourData({ ...newTourData, allowances: allows }); }} />
            </TabsContent>}

            {tabAccess.shoppings.view && canViewShoppings && (
              <TabsContent value="shoppings" className="animate-fade-in">
                {waterBanner}
                <ShoppingsTab tourId={isNewTour ? undefined : id!} shoppings={displayTour?.shoppings || []} tour={displayTour} readOnly={!canEditShoppings}
                  onChange={(shops) => { if (isNewTour) setNewTourData({ ...newTourData, shoppings: shops }); }} />
              </TabsContent>
            )}

            {tabAccess.images.view && <TabsContent value="images" className="animate-fade-in">
              {isNewTour ? (
                <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">Lưu tour trước để có thể upload hình ảnh.</div>
              ) : (
                tour && <TourImagesTab tourId={id!} tourCode={tour.tourCode} canUpload={canUploadTourImages} canDelete={canDeleteTourImages} />
              )}
            </TabsContent>}

            {tabAccess.summary.view && <TabsContent value="summary" className="animate-fade-in">
              {waterBanner}
              <SummaryTab tour={displayTour as Tour} readOnly={!canEditSummary}
                canExport={canExportTour}
                onExport={handleExportExcel}
                onEditLine={handleEditLineFromSummary}
                canEditLine={canEditLineFromSummary}
                lineFieldAccess={lineFieldAccess}
                onSummaryUpdate={(summary) => {
                  if (isNewTour) setNewTourData({ ...newTourData, summary });
                  else handleSummaryUpdate(summary);
                }} />
            </TabsContent>}
          </Tabs>
        ) : null}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tour</AlertDialogTitle>
            <AlertDialogDescription>Bạn có chắc chắn muốn xóa tour này không? Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isNewTour && id && <SettlementHistoryPanel tourId={id} open={historyOpen} onOpenChange={setHistoryOpen} />}
    </>
  );
};

export default TourDetail;
