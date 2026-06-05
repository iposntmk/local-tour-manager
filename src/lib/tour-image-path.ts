// Sinh storage path cho ảnh tour trong bucket `tour-images`.
// Dùng chung bởi TourImagesTab và luồng import-từ-ảnh để tránh lặp logic.

export const generateTourImageStoragePath = (tourId: string, tourCode: string, file: File): string => {
  const safeTourCode = tourCode.replace(/[^a-zA-Z0-9-_]/g, '_') || 'tour';
  const rawBaseName = file.name.replace(/\.[^/.]+$/, '');
  const safeBaseName = rawBaseName.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 40) || 'image';
  const extension = file.name.includes('.') ? file.name.split('.').pop() : '';
  const uniqueSuffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const fileName = `${safeBaseName}-${uniqueSuffix}${extension ? `.${extension}` : ''}`;
  return `${tourId}/${safeTourCode}/${fileName}`;
};
