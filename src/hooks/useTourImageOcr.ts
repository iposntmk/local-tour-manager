import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { useAuth } from '@/contexts/AuthContext';
import type { UserProfile } from '@/types/user';
import type { EntityCaches } from '@/lib/import-tour-transform';
import { loadEntityCachesFromStore, transformImportedTour } from '@/lib/import-tour-transform';
import { buildTourImportJson, type TourImportOptions } from '@/lib/ocr/tour-image-parser';
import { normalizeImageForOcr } from '@/lib/ocr/image-normalize';
import type { AnalyzeResult } from '@/lib/ocr/ocr-text-utils';
import type { ReviewItemRaw } from '@/hooks/useImportTourDialogBase';

interface PendingOcr {
  file: File;
  result: Promise<[AnalyzeResult, EntityCaches]>;
}

/** Nén ảnh (Azure F0 giới hạn 4MB, không đọc WebP/HEIC) rồi OCR, song song với tải master data. */
const runOcr = (input: File) =>
  Promise.all([
    normalizeImageForOcr(input).then((ocrFile) => store.analyzeTourImage(ocrFile)),
    loadEntityCachesFromStore(),
  ]);

/**
 * HDV của tour import từ ảnh luôn là tài khoản đang đăng nhập (nhận diện bằng email),
 * không lấy tên HDV in trên ảnh.
 */
const withCurrentGuide = (item: ReviewItemRaw, profile: UserProfile | null): ReviewItemRaw => {
  if (!profile?.email) return item;
  return {
    ...item,
    tour: { ...item.tour, guideRef: { id: profile.id, nameAtBooking: profile.email } },
    raw: { ...item.raw, guide: profile.email },
  };
};

/**
 * Luồng OCR ảnh chương trình tour: ảnh -> Edge Function (Azure) -> parser ->
 * reviewItems dùng chung với luồng import JSON. Giữ lại File gốc để đính vào
 * tab ảnh của tour sau khi lưu.
 *
 * OCR không phụ thuộc năm/công ty/quốc tịch (chỉ parser dùng), nên `prefetch` chạy OCR ngay
 * khi chọn file — lúc người dùng còn điền form — và `analyze` chỉ chờ phần còn lại.
 */
export function useTourImageOcr() {
  const { userProfile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItemRaw[]>([]);
  const [entityCaches, setEntityCaches] = useState<EntityCaches | null>(null);
  const [rawOcr, setRawOcr] = useState<unknown>(null);
  const pendingRef = useRef<PendingOcr | null>(null);

  const prefetch = (input: File | null) => {
    if (!input) {
      pendingRef.current = null;
      return;
    }
    if (pendingRef.current?.file === input) return;
    const result = runOcr(input);
    // Lỗi được báo khi người dùng bấm phân tích; ở đây chỉ tránh "unhandled rejection".
    result.catch(() => undefined);
    pendingRef.current = { file: input, result };
  };

  const analyze = async (input: File, options: TourImportOptions = {}): Promise<boolean> => {
    setIsAnalyzing(true);
    try {
      prefetch(input);
      const [analyzeResult, caches] = await pendingRef.current!.result;
      setEntityCaches(caches);
      setRawOcr(analyzeResult);

      const importJson = buildTourImportJson(analyzeResult, options);
      // Đính JSON parser sinh ra (sourceJson) vào từng item để tab JSON đối chiếu.
      const transformed = importJson.map((t) => {
        const sourceJson = userProfile?.email ? { ...t, tour: { ...t.tour, tourGuide: userProfile.email } } : t;
        return withCurrentGuide({ ...transformImportedTour(sourceJson, caches), sourceJson }, userProfile);
      });
      setReviewItems(transformed);
      setFile(input);
      toast.message('Review required', { description: 'Kiểm tra dữ liệu OCR rồi xác nhận import.' });
      return true;
    } catch (error) {
      // Bỏ kết quả lỗi để lần bấm lại gửi OCR mới.
      pendingRef.current = null;
      const msg = error instanceof Error ? error.message : 'Không thể phân tích ảnh';
      toast.error(`OCR thất bại: ${msg}`, { duration: 6000 });
      return false;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    pendingRef.current = null;
    setReviewItems([]);
    setFile(null);
    setRawOcr(null);
  };

  return { file, isAnalyzing, reviewItems, entityCaches, rawOcr, prefetch, analyze, reset };
}
