import { useState } from 'react';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import type { EntityCaches } from '@/lib/import-tour-transform';
import { loadEntityCachesFromStore, transformImportedTour } from '@/lib/import-tour-transform';
import { buildTourImportJson, type TourImportOptions } from '@/lib/ocr/tour-image-parser';
import type { ReviewItemRaw } from '@/hooks/useImportTourDialogBase';

/**
 * Luồng OCR ảnh chương trình tour: ảnh -> Edge Function (Azure) -> parser ->
 * reviewItems dùng chung với luồng import JSON. Giữ lại File gốc để đính vào
 * tab ảnh của tour sau khi lưu.
 *
 * Phạm vi: chỉ lấy thông tin tab "Thông tin tour". Công ty / HDV / quốc tịch
 * được so khớp với master data qua `loadEntityCachesFromStore` +
 * `transformImportedTour`; các dòng chi tiết không được trích xuất.
 */
export function useTourImageOcr() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItemRaw[]>([]);
  const [entityCaches, setEntityCaches] = useState<EntityCaches | null>(null);
  const [rawOcr, setRawOcr] = useState<unknown>(null);

  const analyze = async (
    input: File,
    options: TourImportOptions & { provider?: 'azure' | 'google' } = {},
  ): Promise<boolean> => {
    setIsAnalyzing(true);
    try {
      const [analyzeResult, caches] = await Promise.all([
        store.analyzeTourImage(input, options.provider),
        loadEntityCachesFromStore(),
      ]);
      setEntityCaches(caches);
      setRawOcr(analyzeResult);

      const importJson = buildTourImportJson(analyzeResult, options);
      // Đính JSON parser sinh ra (sourceJson) vào từng item để tab JSON đối chiếu.
      const transformed = importJson.map((t) => ({ ...transformImportedTour(t, caches), sourceJson: t }));
      setReviewItems(transformed);
      setFile(input);
      toast.message('Review required', { description: 'Kiểm tra dữ liệu OCR rồi xác nhận import.' });
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Không thể phân tích ảnh';
      toast.error(`OCR thất bại: ${msg}`, { duration: 6000 });
      return false;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setReviewItems([]);
    setFile(null);
    setRawOcr(null);
  };

  return { file, isAnalyzing, reviewItems, entityCaches, rawOcr, analyze, reset };
}
