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
      const [analyzeResult, destinations, freeDestinations, caches] = await Promise.all([
        store.analyzeTourImage(input, options.provider),
        store.listTouristDestinations({}),
        store.listDestinationsFree({}),
        loadEntityCachesFromStore(),
      ]);
      setEntityCaches(caches);
      setRawOcr(analyzeResult);

      const importJson = buildTourImportJson(
        analyzeResult,
        destinations.map((d) => ({
          name: d.name, rawName: d.rawName, price: d.price, province: d.provinceRef?.nameAtBooking,
        })),
        options,
        freeDestinations.map((d) => ({ name: d.name, rawName: d.rawName, price: 0 })),
      );
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
