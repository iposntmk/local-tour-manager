import { useState, type MouseEvent } from 'react';
import { useMutation, type QueryClient } from '@tanstack/react-query';
import JSZip from 'jszip';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { exportAllToursToExcel, exportAllToursToMonthlyZip, exportTourToExcel } from '@/lib/excel-utils';
import { downloadSQLBackup, generateFullSQLBackup } from '@/lib/sql-backup';
import { invalidateTourAggregateCaches } from '@/lib/query-cache';
import type { Tour, TourQuery } from '@/types/tour';

const DELETE_ALL_PIN = '0829101188';

interface UseTourPageActionsArgs {
  queryClient: QueryClient;
  exportTourQuery: TourQuery;
  exportTourFilter?: (tour: Tour) => boolean;
  totalTours: number;
  canExportTours: boolean;
  canDuplicateTours: boolean;
  canDeleteTours: boolean;
  canBackupData: boolean;
  canDownloadAllTourImages: boolean;
  isAdmin: boolean;
}

export function useTourPageActions({
  queryClient,
  exportTourQuery,
  exportTourFilter,
  totalTours,
  canExportTours,
  canDuplicateTours,
  canDeleteTours,
  canBackupData,
  canDownloadAllTourImages,
  isAdmin,
}: UseTourPageActionsArgs) {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isDownloadingImages, setIsDownloadingImages] = useState(false);
  const [showAdminCreateConfirm, setShowAdminCreateConfirm] = useState(false);
  const [pendingDuplicateId, setPendingDuplicateId] = useState<string | null>(null);
  const [deleteTourId, setDeleteTourId] = useState<string | null>(null);
  const [deleteAllPinInput, setDeleteAllPinInput] = useState('');
  const [showDeleteAllPinDialog, setShowDeleteAllPinDialog] = useState(false);

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateTour(id),
    onSuccess: () => {
      void invalidateTourAggregateCaches(queryClient);
      toast.success('Nhân bản tour thành công');
    },
    onError: (error: Error) => toast.error(error.message || 'Nhân bản tour thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteTour(id),
    onSuccess: () => {
      void invalidateTourAggregateCaches(queryClient);
      toast.success('Xóa tour thành công');
    },
    onError: (error: Error) => toast.error(error.message || 'Xóa tour thất bại'),
  });

  const handleDeleteAllConfirm = () => {
    if (deleteAllPinInput === DELETE_ALL_PIN) {
      toast.warning('Không hỗ trợ xóa hàng loạt. Vui lòng xóa từng tour.');
      setShowDeleteAllPinDialog(false);
      setDeleteAllPinInput('');
    } else {
      toast.error('Sai mã PIN. Từ chối truy cập.');
      setDeleteAllPinInput('');
    }
  };

  const fetchDetailedTour = async (tour: Tour): Promise<Tour> => {
    const detailedTour = await store.getTour(tour.id);
    if (!detailedTour) {
      throw new Error(`Không thể tải chi tiết tour ${tour.tourCode} từ cơ sở dữ liệu.`);
    }
    return detailedTour;
  };

  const handleExportAll = async () => {
    if (!canExportTours) {
      toast.error('Bạn không có quyền xuất tour.');
      return;
    }
    if (totalTours === 0) {
      toast.error('Không có tour nào để xuất');
      return;
    }

    try {
      const { tours: detailedTours } = await store.listTours({ ...exportTourQuery }, { includeDetails: true });
      const toursWithDetails = exportTourFilter ? detailedTours.filter(exportTourFilter) : detailedTours;
      if (toursWithDetails.length === 0) {
        toast.error('Không có tour nào để xuất');
        return;
      }
      await exportAllToursToMonthlyZip(toursWithDetails);
      toast.success('Đã xuất tất cả tour theo tháng (ZIP)');
    } catch (error) {
      console.error('Failed to export tours to Excel', error);
      toast.error('Xuất tour ZIP thất bại. Vui lòng thử lại.');
    }
  };

  const handleExportAllSingle = async () => {
    if (!canExportTours) {
      toast.error('Bạn không có quyền xuất tour.');
      return;
    }
    if (totalTours === 0) {
      toast.error('Không có tour nào để xuất');
      return;
    }

    try {
      const { tours: detailedTours } = await store.listTours({ ...exportTourQuery }, { includeDetails: true });
      const toursWithDetails = exportTourFilter ? detailedTours.filter(exportTourFilter) : detailedTours;
      if (toursWithDetails.length === 0) {
        toast.error('Không có tour nào để xuất');
        return;
      }
      await exportAllToursToExcel(toursWithDetails);
      toast.success('Đã xuất tất cả tour vào một trang Excel');
    } catch (error) {
      console.error('Failed to export all tours to single Excel', error);
      toast.error('Xuất Excel thất bại. Vui lòng thử lại.');
    }
  };

  const handleExportSingle = async (tour: Tour, event: MouseEvent) => {
    event.stopPropagation();
    if (!canExportTours) {
      toast.error('Bạn không có quyền xuất tour.');
      return;
    }

    try {
      const detailedTour = await fetchDetailedTour(tour);
      await exportTourToExcel(detailedTour);
      toast.success(`Đã xuất tour ${tour.tourCode} ra Excel`);
    } catch (error) {
      console.error(`Failed to export tour ${tour.tourCode} to Excel`, error);
      const message = error instanceof Error && error.message.includes('Unable to load details')
        ? error.message
        : 'Xuất tour ra Excel thất bại. Vui lòng thử lại.';
      toast.error(message);
    }
  };

  const handleDuplicate = (id: string, event: MouseEvent) => {
    event.stopPropagation();
    if (!canDuplicateTours) {
      toast.error('Bạn không có quyền nhân bản tour.');
      return;
    }
    if (isAdmin) {
      setPendingDuplicateId(id);
      return;
    }
    duplicateMutation.mutate(id);
  };

  const handleDelete = (id: string, event: MouseEvent) => {
    event.stopPropagation();
    if (!canDeleteTours) {
      toast.error('Bạn không có quyền xóa tour.');
      return;
    }
    setDeleteTourId(id);
  };

  const handleBackup = async () => {
    if (!canBackupData) {
      toast.error('Bạn không có quyền sao lưu dữ liệu.');
      return;
    }

    setIsBackingUp(true);
    try {
      toast.info('Đang tạo bản sao lưu SQL...');
      const sql = await generateFullSQLBackup();
      downloadSQLBackup(sql);
      toast.success('Tải bản sao lưu thành công!');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Tạo bản sao lưu thất bại');
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
      toast.info('Đang lấy tất cả ảnh tour...');
      const allImages = await store.listAllTourImagesForDownload();
      if (allImages.length === 0) {
        toast.error('Không tìm thấy ảnh nào trong cơ sở dữ liệu');
        return;
      }

      toast.info(`Đang tải ${allImages.length} ảnh...`);
      const zip = new JSZip();
      const tourCodes = new Set<string>();

      for (const image of allImages) {
        try {
          const imageUrl = await store.getTourImageUrl(image.storage_path);
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          tourCodes.add(image.tourCode);
          zip.file(`${image.tourCode}/${image.file_name}`, blob);
        } catch (error) {
          console.error(`Failed to download ${image.file_name}:`, error);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tat-ca-anh-tour.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Đã tải ${allImages.length} ảnh từ ${tourCodes.size} tour`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Tải ảnh thất bại');
    } finally {
      setIsDownloadingImages(false);
    }
  };

  const confirmDuplicate = () => {
    if (pendingDuplicateId) duplicateMutation.mutate(pendingDuplicateId);
    setPendingDuplicateId(null);
  };

  const confirmDelete = () => {
    if (deleteTourId) {
      deleteMutation.mutate(deleteTourId);
      setDeleteTourId(null);
    }
  };

  return {
    deleteAllPinInput,
    deleteMutation,
    isBackingUp,
    isDownloadingImages,
    pendingDuplicateId,
    setDeleteAllPinInput,
    setDeleteTourId,
    setPendingDuplicateId,
    setShowAdminCreateConfirm,
    setShowDeleteAllPinDialog,
    showAdminCreateConfirm,
    showDeleteAllPinDialog,
    deleteTourId,
    confirmDelete,
    confirmDuplicate,
    handleBackup,
    handleDelete,
    handleDeleteAllConfirm,
    handleDownloadAllImages,
    handleDuplicate,
    handleExportAll,
    handleExportAllSingle,
    handleExportSingle,
  };
}
