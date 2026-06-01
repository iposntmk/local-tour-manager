import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { AttachmentLineType, TourLineAttachment } from '@/types/tour';

const BUCKET = 'tour-line-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']);

const mapAttachment = (row: any): TourLineAttachment => ({
  id: row.id,
  tourId: row.tour_id,
  lineType: row.line_type,
  lineId: row.line_id,
  filePath: row.file_path,
  fileName: row.file_name,
  fileType: row.file_type ?? undefined,
  fileSize: row.file_size ?? undefined,
  uploadedBy: row.uploaded_by ?? undefined,
  createdAt: row.created_at,
});

const sanitizePathPart = (value: string) =>
  value.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').slice(0, 48) || 'file';

export class TourAttachmentsModule {
  declare protected supabase: SupabaseClient<Database>;

  async listTourLineAttachments(tourId: string): Promise<TourLineAttachment[]> {
    const { data, error } = await (this.supabase as any)
      .from('tour_line_attachments')
      .select('*')
      .eq('tour_id', tourId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapAttachment);
  }

  async getTourLineAttachmentUrl(filePath: string): Promise<string> {
    const { data, error } = await this.supabase.storage.from(BUCKET).createSignedUrl(filePath, 60 * 60);
    if (error) throw error;
    return data.signedUrl;
  }

  async uploadTourLineAttachment(
    tourId: string,
    lineType: AttachmentLineType,
    lineId: string,
    file: File,
  ): Promise<TourLineAttachment> {
    if (!ALLOWED_TYPES.has(file.type)) throw new Error('Chỉ hỗ trợ ảnh JPG/PNG/WebP hoặc PDF.');
    if (file.size > MAX_FILE_SIZE) throw new Error('File chứng từ tối đa 10MB.');

    const extension = file.name.includes('.') ? file.name.split('.').pop() : '';
    const rawBaseName = file.name.replace(/\.[^/.]+$/, '');
    const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filePath = `${tourId}/${lineType}/${lineId}/${sanitizePathPart(rawBaseName)}-${suffix}${extension ? `.${extension}` : ''}`;

    const { error: uploadError } = await this.supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;

    const { data: authUser } = await this.supabase.auth.getUser();
    const { data, error } = await (this.supabase as any)
      .from('tour_line_attachments')
      .insert({
        tour_id: tourId,
        line_type: lineType,
        line_id: lineId,
        file_path: filePath,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: authUser.user?.id ?? null,
      })
      .select('*')
      .single();

    if (error) {
      await this.supabase.storage.from(BUCKET).remove([filePath]);
      throw error;
    }
    return mapAttachment(data);
  }

  async deleteTourLineAttachment(attachment: TourLineAttachment): Promise<void> {
    const { error: storageError } = await this.supabase.storage.from(BUCKET).remove([attachment.filePath]);
    if (storageError) throw storageError;

    const { error } = await (this.supabase as any)
      .from('tour_line_attachments')
      .delete()
      .eq('id', attachment.id);
    if (error) throw error;
  }
}
