import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Upload, Image as ImageIcon, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import JSZip from 'jszip';
import type { TourImage } from '@/types/tour';
import { generateTourImageStoragePath } from '@/lib/tour-image-path';
import { TourImageViewerDialog } from './TourImageViewerDialog';

interface TourImagesTabProps {
  tourId: string;
  tourCode: string;
  canUpload?: boolean;
  canDelete?: boolean;
}

export function TourImagesTab({ tourId, tourCode, canUpload = true, canDelete = true }: TourImagesTabProps) {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<TourImage | null>(null);
  const queryClient = useQueryClient();

  // Fetch images for this tour
  const { data: images = [], isLoading } = useQuery({
    queryKey: ['tourImages', tourId],
    queryFn: () => store.listTourImages(tourId),
    enabled: !!tourId,
  });
  const imagePathKey = images.map((image) => `${image.id}:${image.storage_path}`).join('|');
  const { data: imageUrls = {} } = useQuery({
    queryKey: ['tourImageUrls', tourId, imagePathKey],
    queryFn: async () => Object.fromEntries(
      await Promise.all(images.map(async (image) => [image.storage_path, await store.getTourImageUrl(image.storage_path)]))
    ),
    enabled: images.length > 0,
    staleTime: 30 * 60 * 1000,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const filePath = generateTourImageStoragePath(tourId, tourCode, file);
      await store.uploadTourImage(tourId, file, filePath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tourImages', tourId] });
      toast.success('Image uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload image: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (image: TourImage) => store.deleteTourImage(image),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tourImages', tourId] });
      toast.success('Image deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete image: ${error.message}`);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUpload) {
      toast.error('Bạn không có quyền upload ảnh tour.');
      e.target.value = '';
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }

        await uploadMutation.mutateAsync(file);
      }
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const getImageUrl = (storagePath: string) => {
    return imageUrls[storagePath] ?? '';
  };

  // Reset zoom and position when image changes
  const handleImageSelect = (image: TourImage) => {
    setSelectedImage(image);
  };

  const handleImageClose = () => {
    setSelectedImage(null);
  };

  // Download all images as zip
  const handleDownloadAll = async () => {
    if (images.length === 0) {
      toast.error('No images to download');
      return;
    }

    setDownloading(true);
    try {
      const zip = new JSZip();
      
      // Fetch and add each image to zip
      for (const image of images) {
        const imageUrl = getImageUrl(image.storage_path) || await store.getTourImageUrl(image.storage_path);
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        zip.file(image.file_name, blob);
      }

      // Generate and download zip file
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tourCode}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${images.length} images`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download images');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="text-lg font-semibold">Tour Images</h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {images.length > 0 && (
              <Button
                variant="outline"
                onClick={handleDownloadAll}
                disabled={downloading}
                size="sm"
                className="hover-scale w-full sm:w-auto"
              >
                {downloading ? (
                  <>
                    <Download className="h-4 w-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </>
                )}
              </Button>
            )}
            {canUpload && (
              <>
                <input
                  type="file"
                  id="tour-image-upload"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                <Button
                  onClick={() => document.getElementById('tour-image-upload')?.click()}
                  disabled={uploading}
                  size="sm"
                  className="hover-scale w-full sm:w-auto"
                >
                  {uploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Upload Images
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {images.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed rounded-lg">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No images uploaded yet</p>
            <p className="text-sm text-muted-foreground">
              Click the "Upload Images" button to add tour images
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <Card key={image.id} className="overflow-hidden group">
                <CardContent className="p-0 relative">
                  <img
                    src={getImageUrl(image.storage_path)}
                    alt={image.file_name}
                    className="w-full aspect-square object-cover cursor-pointer"
                    loading="lazy"
                    onClick={() => handleImageSelect(image)}
                  />
                  {/* Delete button - always visible on mobile, hover on desktop */}
                  {canDelete && (
                  <div className="absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(image);
                      }}
                      className="hover-scale h-8 w-8 shadow-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                    <p className="text-white text-xs truncate">{image.file_name}</p>
                    <p className="text-white/60 text-xs">
                      {image.file_size ? `${(image.file_size / 1024).toFixed(0)} KB` : 'Unknown size'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TourImageViewerDialog
        image={selectedImage}
        canDelete={canDelete}
        getImageUrl={getImageUrl}
        onClose={handleImageClose}
        onDelete={(image) => deleteMutation.mutate(image)}
      />
    </div>
  );
}
