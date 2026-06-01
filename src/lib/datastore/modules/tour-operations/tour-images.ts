import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { TourImage } from '@/types/tour';
import type { TourImageDownloadItem } from '@/types/datastore';

const TOUR_IMAGES_BUCKET = 'tour-images';

export class TourImagesModule {
  declare protected supabase: SupabaseClient<Database>;

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

  async uploadTourImage(tourId: string, file: File, storagePath: string): Promise<void> {
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

    const { error: dbError } = await this.supabase
      .from('tour_images')
      .insert({
        tour_id: tourId,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      });

    if (dbError) throw dbError;
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
}
