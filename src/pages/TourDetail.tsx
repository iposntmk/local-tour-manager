import { useNavigate } from 'react-router-dom';
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

const TourDetail = () => {
  const navigate = useNavigate();
  const { classes: headerClasses } = useHeaderMode('tourdetail.headerMode');
  const {
    id, tour, tourImages, displayTour, isNewTour, isLoading,
    newTourData, setNewTourData,
    deleteDialogOpen, setDeleteDialogOpen,
    activeTab, setActiveTab,
    historyOpen, setHistoryOpen,
    waterDismissedLocal, isWaterDismissed, showWaterWarning,
    totalGuests, hasUnpaidShoppings,
    canCreateTour, canEditTourInfo, canEditDestinations, canEditExpenses,
    canEditMeals, canEditAllowances, canEditShoppings, canEditSummary,
    canExportTour, canDeleteTour, canUploadTourImages, canDeleteTourImages,
    handleInfoSave, handleSummaryUpdate, handleDelete,
    handleHeaderSave, handleExportExcel, handleDismissWater,
  } = useTourDetail();

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
            <Checkbox checked={isWaterDismissed || waterDismissedLocal} onCheckedChange={handleDismissWater} />
            <span className="text-sm text-yellow-700 dark:text-yellow-300">Tour này không bao gồm chi phí nước uống (bỏ qua cảnh báo)</span>
          </label>
        </div>
      </div>
    </div>
  ) : null;

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

            <TabsContent value="info" className="animate-fade-in data-[state=inactive]:hidden" forceMount>
              {waterBanner}
              <div className="rounded-lg border bg-card p-6">
                <TourInfoForm initialData={isNewTour ? undefined : tour} onSubmit={handleInfoSave} showSubmitButton={false} />
              </div>
            </TabsContent>

            <TabsContent value="destinations" className="animate-fade-in">
              {waterBanner}
              <DestinationsTab tourId={isNewTour ? undefined : id!} destinations={displayTour?.destinations || []} tour={displayTour} readOnly={!canEditDestinations}
                onChange={(dests) => { if (isNewTour) setNewTourData({ ...newTourData, destinations: dests }); }} />
            </TabsContent>

            <TabsContent value="expenses" className="animate-fade-in">
              <ExpensesTab tourId={isNewTour ? undefined : id!} expenses={displayTour?.expenses || []} tour={displayTour} readOnly={!canEditExpenses}
                onChange={(exps) => { if (isNewTour) setNewTourData({ ...newTourData, expenses: exps }); }} />
            </TabsContent>

            <TabsContent value="meals" className="animate-fade-in">
              {waterBanner}
              <MealsTab tourId={isNewTour ? undefined : id!} meals={displayTour?.meals || []} tour={displayTour} readOnly={!canEditMeals}
                onChange={(mls) => { if (isNewTour) setNewTourData({ ...newTourData, meals: mls }); }} />
            </TabsContent>

            <TabsContent value="combined" className="animate-fade-in">
              {waterBanner}
              <CombinedTab tour={displayTour} />
            </TabsContent>

            <TabsContent value="allowances" className="animate-fade-in">
              {waterBanner}
              <AllowancesTab tourId={isNewTour ? undefined : id!} allowances={displayTour?.allowances || []} tour={displayTour} readOnly={!canEditAllowances}
                onChange={(allows) => { if (isNewTour) setNewTourData({ ...newTourData, allowances: allows }); }} />
            </TabsContent>

            <TabsContent value="summary" className="animate-fade-in">
              {waterBanner}
              <SummaryTab tour={displayTour as Tour} readOnly={!canEditSummary}
                onSummaryUpdate={(summary) => {
                  if (isNewTour) setNewTourData({ ...newTourData, summary });
                  else handleSummaryUpdate(summary);
                }} />
            </TabsContent>

            <TabsContent value="shoppings" className="animate-fade-in">
              {waterBanner}
              <ShoppingsTab tourId={isNewTour ? undefined : id!} shoppings={displayTour?.shoppings || []} tour={displayTour} readOnly={!canEditShoppings}
                onChange={(shops) => { if (isNewTour) setNewTourData({ ...newTourData, shoppings: shops }); }} />
            </TabsContent>

            <TabsContent value="images" className="animate-fade-in">
              {isNewTour ? (
                <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">Lưu tour trước để có thể upload hình ảnh.</div>
              ) : (
                tour && <TourImagesTab tourId={id!} tourCode={tour.tourCode} canUpload={canUploadTourImages} canDelete={canDeleteTourImages} />
              )}
            </TabsContent>
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
