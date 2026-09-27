import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { TourImage } from '@/types/tour';
import type { TourImageDownloadItem } from '@/types/datastore';
import type { AnalyzeResult } from '@/lib/ocr/ocr-text-utils';

const TOUR_IMAGES_BUCKET = 'tour-images';

const OCR_FALLBACK_ERROR =
  'Không thể phân tích ảnh. Hãy chắc chắn Edge Function "analyze-tour-image" đã được deploy ' +
  'và đã set secret Azure (AZURE_FORM_RECOGNIZER_ENDPOINT / AZURE_FORM_RECOGNIZER_KEY).';

/** Lỗi non-2xx của Edge Function nằm trong `error.context` (Response), không nằm ở `data`. */
const readFunctionError = async (error: unknown): Promise<string> => {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === 'function') {
    const body = await context.json().catch(() => null) as { error?: string } | null;
    if (body?.error) return body.error;
  }
  return OCR_FALLBACK_ERROR;
};

export class TourImagesModule {
  declare protected supabase: SupabaseClient<Database>;

  /**
   * Gửi ảnh/PDF chương trình tour tới Edge Function `analyze-tour-image` (Azure OCR).
   * Gửi nhị phân thô thay vì base64-trong-JSON: payload nhỏ hơn ~33% và function không
   * phải decode base64.
   */
  async analyzeTourImage(file: File): Promise<AnalyzeResult> {
    const { data, error } = await this.supabase.functions.invoke<{ analyzeResult?: AnalyzeResult; error?: string }>(
      'analyze-tour-image',
      {
        body: file,
        // Không tự đặt Content-Type: functions-js chỉ gắn body File khi header này trống
        // (nó tự đặt application/octet-stream). Kiểu file thật đi qua `x-content-type`.
        headers: {
          'x-content-type': file.type,
          'x-file-name': encodeURIComponent(file.name),
        },
      },
    );

    if (error) throw new Error(await readFunctionError(error));
    if (data?.error) throw new Error(data.error);
    if (!data?.analyzeResult) throw new Error('Edge Function "analyze-tour-image" không trả về kết quả OCR.');
    return data.analyzeResult;
  }

  async listTourImages(tourId: string): Promise<TourImage[]> {
    const { data, error } = await this.supabase
      .from('tour_images')
      .select('*')
      .eq('tour_id', tourId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async listAllTourImagesForDownload(): Promise<TourImageDownloadItem[]> {
    const { data, error } = await this.supabase
      .from('tour_images')
      .select('*, tours!tour_images_tour_id_fkey(tour_code)')
      .order('tour_id');

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      tour_id: row.tour_id,
      storage_path: row.storage_path,
      file_name: row.file_name,
      file_size: row.file_size,
      mime_type: row.mime_type,
      created_at: row.created_at,
      tourCode: (row.tours as any)?.tour_code || 'khong-ro',
    }));
  }

  async uploadTourImage(tourId: string, file: File, storagePath: string): Promise<TourImage> {
    const { error: uploadError } = await this.supabase.storage
      .from(TOUR_IMAGES_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      if (uploadError.message?.toLowerCase().includes('resource already exists')) {
        throw new Error('An image with the same name already exists. Please try uploading again.');
      }
      throw uploadError;
    }

    const { data, error: dbError } = await this.supabase
      .from('tour_images')
      .insert({
        tour_id: tourId,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      })
      .select('*')
      .single();

    if (dbError) throw dbError;
    return data;
  }

  async deleteTourImage(image: TourImage): Promise<void> {
    const { error: storageError } = await this.supabase.storage
      .from(TOUR_IMAGES_BUCKET)
      .remove([image.storage_path]);

    if (storageError) throw storageError;

    const { error: dbError } = await this.supabase
      .from('tour_images')
      .delete()
      .eq('id', image.id);

    if (dbError) throw dbError;
  }

  async getTourImageUrl(storagePath: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(TOUR_IMAGES_BUCKET)
      .createSignedUrl(storagePath, 60 * 60);

    if (error) throw error;
    return data.signedUrl;
  }

  /** Ký nhiều URL trong một request thay vì mỗi ảnh một request. */
  async getTourImageUrls(storagePaths: string[]): Promise<Record<string, string>> {
    if (storagePaths.length === 0) return {};
    const { data, error } = await this.supabase.storage
      .from(TOUR_IMAGES_BUCKET)
      .createSignedUrls(storagePaths, 60 * 60);

    if (error) throw error;
    return Object.fromEntries(
      (data || [])
        .filter((item) => item.path && item.signedUrl)
        .map((item) => [item.path as string, item.signedUrl]),
    );
  }
}
