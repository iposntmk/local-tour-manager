import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { generateTourImageStoragePath } from '@/lib/tour-image-path';
import { useTourImageOcr } from '@/hooks/useTourImageOcr';
import { EnhancedImportReview } from '@/components/tours/EnhancedImportReview';
import type { Tour } from '@/types/tour';

interface ImportTourFromImageDialogProps {
  /** Tạo tour và trả về danh sách tour đã tạo + danh sách bị bỏ qua. */
  onImportAsync: (tours: Partial<Tour>[]) => Promise<{ imported: Tour[]; skipped: string[] }>;
  trigger?: React.ReactNode;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ImportTourFromImageDialog = ({ onImportAsync, trigger }: ImportTourFromImageDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [company, setCompany] = useState('');
  const [nationality, setNationality] = useState('');
  const { file, isAnalyzing, reviewItems, entityCaches, rawOcr, analyze, reset } = useTourImageOcr();

  const closeAndReset = () => {
    reset();
    setSelectedFile(null);
    setCompany('');
    setNationality('');
    setOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && !f.type.startsWith('image/') && f.type !== 'application/pdf') {
      toast.error('Vui lòng chọn ảnh hoặc PDF chương trình tour');
      e.target.value = '';
      return;
    }
    if (f && f.size > MAX_IMAGE_BYTES) {
      toast.error(`${f.name} quá lớn (tối đa 5MB)`);
      e.target.value = '';
      return;
    }
    setSelectedFile(f);
  };

  const handleAnalyze = () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn ảnh chương trình tour');
      return;
    }
    analyze(selectedFile, {
      year: year.trim() || undefined,
      company: company.trim() || undefined,
      nationality: nationality.trim() || undefined,
    });
  };

  const handleConfirm = async (tours: Partial<Tour>[]) => {
    let result: { imported: Tour[]; skipped: string[] };
    try {
      result = await onImportAsync(tours);
    } catch {
      // useTourImport đã hiển thị lỗi; giữ dialog mở để người dùng sửa.
      return;
    }

    const createdTour = result.imported[0];
    if (createdTour && file) {
      try {
        const path = generateTourImageStoragePath(createdTour.id, createdTour.tourCode, file);
        await store.uploadTourImage(createdTour.id, file, path);
        toast.success('Đã đính ảnh chương trình vào tab Ảnh của tour');
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Lỗi không xác định';
        toast.error(`Tour đã lưu nhưng đính ảnh thất bại: ${msg}`, { duration: 8000 });
      }
    }
    closeAndReset();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAndReset())}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="hover-scale">
            <ScanLine className="h-4 w-4 mr-2" />Import từ ảnh
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg">Import tour từ ảnh chương trình (OCR)</DialogTitle>
          <DialogDescription className="text-sm">
            Tải ảnh/PDF chương trình tour, hệ thống OCR và trích xuất dữ liệu để bạn xem lại trước khi lưu.
            Ảnh gốc sẽ được đính vào tab Ảnh của tour sau khi lưu.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {reviewItems.length === 0 ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="ocr-image-file" className="flex items-center gap-2 cursor-pointer">
                  <ImageIcon className="h-4 w-4" />Ảnh hoặc PDF chương trình (tối đa 5MB)
                </Label>
                <input
                  id="ocr-image-file"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="ocr-year">Năm (cho ngày dạng 15/5)</Label>
                  <Input id="ocr-year" inputMode="numeric" value={year}
                    onChange={(e) => setYear(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="ocr-company">Công ty (nếu OCR không tìm thấy)</Label>
                  <Input id="ocr-company" value={company}
                    onChange={(e) => setCompany(e.target.value)} placeholder="Việt Á" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="ocr-nationality">Quốc tịch (nếu OCR không tìm thấy)</Label>
                  <Input id="ocr-nationality" value={nationality}
                    onChange={(e) => setNationality(e.target.value)} className="mt-1" />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeAndReset}>Hủy</Button>
                <Button onClick={handleAnalyze} disabled={isAnalyzing || !selectedFile}>
                  {isAnalyzing ? 'Đang phân tích...' : 'Phân tích & Xem lại'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-hidden">
              <EnhancedImportReview
                items={reviewItems}
                onCancel={reset}
                onConfirm={handleConfirm}
                preloadedEntities={entityCaches ?? undefined}
                imageFile={file}
                rawOcr={rawOcr}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
