import { ChevronDown, ChevronUp, Database, FileSpreadsheet, FolderArchive, Image as ImageIcon, Plus, Trash, Upload } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImportTourDialogEnhanced } from '@/components/tours/ImportTourDialogEnhanced';
import { cn } from '@/lib/utils';
import type { Tour } from '@/types/tour';

type ToursHeaderControlsProps = {
  topControlsExpanded: boolean;
  onToggleTopControls: () => void;
  canBackupData: boolean;
  canDownloadAllTourImages: boolean;
  canImportTours: boolean;
  canExportTours: boolean;
  canDeleteTours: boolean;
  canCreateTours: boolean;
  isBackingUp: boolean;
  isDownloadingImages: boolean;
  deleteAllPinInput: string;
  showDeleteAllPinDialog: boolean;
  onDeleteAllPinInputChange: (value: string) => void;
  onDeleteAllPinDialogChange: (open: boolean) => void;
  onDeleteAllConfirm: () => void;
  onBackup: () => void;
  onDownloadAllImages: () => void;
  onImport: (tours: Partial<Tour>[]) => void;
  onExportAll: () => void;
  onExportAllSingle: () => void;
  onCreateTour: () => void;
};

const topActionButtonClass =
  'hover-scale flex h-10 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[9px] leading-tight sm:h-10 sm:flex-initial sm:basis-auto sm:px-3 sm:text-xs lg:flex-row lg:gap-1.5';
const topActionIconClass = 'h-4 w-4 shrink-0 lg:mr-1.5';

export const ToursHeaderControls = ({
  topControlsExpanded,
  onToggleTopControls,
  canBackupData,
  canDownloadAllTourImages,
  canImportTours,
  canExportTours,
  canDeleteTours,
  canCreateTours,
  isBackingUp,
  isDownloadingImages,
  deleteAllPinInput,
  showDeleteAllPinDialog,
  onDeleteAllPinInputChange,
  onDeleteAllPinDialogChange,
  onDeleteAllConfirm,
  onBackup,
  onDownloadAllImages,
  onImport,
  onExportAll,
  onExportAllSingle,
  onCreateTour,
}: ToursHeaderControlsProps) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
    <div className="min-w-0 flex-shrink-0">
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Tour</h1>
    </div>
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-1 overflow-hidden sm:w-auto sm:flex-shrink-0 sm:flex-wrap sm:justify-end sm:gap-1.5">
      <Button variant="outline" size="sm" onClick={onToggleTopControls} className={topActionButtonClass}>
        {topControlsExpanded ? <ChevronUp className={topActionIconClass} /> : <ChevronDown className={topActionIconClass} />}
        <span className="max-w-full truncate sm:hidden">{topControlsExpanded ? 'Ẩn' : 'Hiện'}</span>
        <span className="hidden max-w-full truncate sm:inline">{topControlsExpanded ? 'Ẩn công cụ' : 'Hiện công cụ'}</span>
      </Button>
      {topControlsExpanded && (
        <>
          {canBackupData && (
            <Button onClick={onBackup} variant="outline" size="sm" disabled={isBackingUp} className={cn(topActionButtonClass, 'hidden lg:flex')} title="Tải bản sao SQL đầy đủ (schema + data)">
              <Database className={topActionIconClass} />
              <span className="hidden max-w-full truncate lg:inline">{isBackingUp ? 'Đang sao lưu...' : 'Sao lưu SQL'}</span>
            </Button>
          )}
          {canDownloadAllTourImages && (
            <Button onClick={onDownloadAllImages} variant="outline" size="sm" disabled={isDownloadingImages} className={cn(topActionButtonClass, 'hidden lg:flex')} title="Tải tất cả ảnh từ tất cả tour">
              <ImageIcon className={topActionIconClass} />
              <span className="hidden max-w-full truncate lg:inline">{isDownloadingImages ? 'Đang tải...' : 'Tải tất cả ảnh'}</span>
            </Button>
          )}
          {canImportTours && (
            <ImportTourDialogEnhanced
              onImport={onImport}
              trigger={
                <Button variant="outline" size="sm" className={cn(topActionButtonClass, 'text-green-600 hover:text-green-700 border-green-600 hover:border-green-700')}>
                  <Upload className={topActionIconClass} />
                  <span className="max-w-full truncate">Nhập</span>
                </Button>
              }
            />
          )}
          {canExportTours && (
            <>
              <Button onClick={onExportAll} variant="outline" size="sm" className={cn(topActionButtonClass, 'text-blue-600 hover:text-blue-700 border-blue-600 hover:border-blue-700')} title="Xuất tất cả tour vào thư mục theo tháng (ZIP)">
                <FolderArchive className={topActionIconClass} />
                <span className="hidden max-w-full truncate sm:inline">Xuất tất cả → Thư mục</span>
                <span className="max-w-full truncate sm:hidden">ZIP</span>
              </Button>
              <Button onClick={onExportAllSingle} variant="outline" size="sm" className={cn(topActionButtonClass, 'text-purple-600 hover:text-purple-700 border-purple-600 hover:border-purple-700')} title="Xuất tất cả tour vào 1 file Excel (1 trang với tổng lớn)">
                <FileSpreadsheet className={topActionIconClass} />
                <span className="hidden max-w-full truncate sm:inline">Xuất tất cả → 1 trang</span>
                <span className="max-w-full truncate sm:hidden">Excel</span>
              </Button>
            </>
          )}
          {canDeleteTours && (
            <AlertDialog open={showDeleteAllPinDialog} onOpenChange={onDeleteAllPinDialogChange}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className={cn(topActionButtonClass, 'text-destructive hover:text-destructive')}>
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
                        onChange={(event) => onDeleteAllPinInputChange(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') onDeleteAllConfirm();
                        }}
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      onDeleteAllPinInputChange('');
                      onDeleteAllPinDialogChange(false);
                    }}
                  >
                    Hủy
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteAllConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Xóa tất cả Tour
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canCreateTours && (
            <Button onClick={onCreateTour} size="sm" className={topActionButtonClass}>
              <Plus className={topActionIconClass} />
              <span className="max-w-full truncate sm:hidden">Thêm</span>
              <span className="hidden max-w-full truncate sm:inline">Thêm Tour</span>
            </Button>
          )}
        </>
      )}
    </div>
  </div>
);
