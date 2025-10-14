import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Upload, Image as ImageIcon, X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import JSZip from 'jszip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TourImage {
  id: string;
  tour_id: string;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

interface TourImagesTabProps {
  tourId: string;
  tourCode: string;
}

export function TourImagesTab({ tourId, tourCode }: TourImagesTabProps) {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<TourImage | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const queryClient = useQueryClient();

  // Fetch images for this tour
  const { data: images = [], isLoading } = useQuery({
    queryKey: ['tourImages', tourId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tour_images')
        .select('*')
        .eq('tour_id', tourId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TourImage[];
    },
    enabled: !!tourId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tourCode}_${Date.now()}.${fileExt}`;
      const filePath = `${tourCode}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('tour-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Save record to database
      const { error: dbError } = await supabase
        .from('tour_images')
        .insert({
          tour_id: tourId,
          storage_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        });

      if (dbError) throw dbError;
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
    mutationFn: async (image: TourImage) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('tour-images')
        .remove([image.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('tour_images')
        .delete()
        .eq('id', image.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tourImages', tourId] });
      toast.success('Image deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete image: ${error.message}`);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const { data } = supabase.storage
      .from('tour-images')
      .getPublicUrl(storagePath);
    return data.publicUrl;
  };

  // Reset zoom and position when image changes
  const handleImageSelect = (image: TourImage) => {
    setSelectedImage(image);
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleImageClose = () => {
    setSelectedImage(null);
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  // Handle zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setImageScale(prev => Math.max(0.5, Math.min(5, prev + delta)));
  };

  // Handle mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (imageScale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageScale > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle touch drag
  const handleTouchStart = (e: React.TouchEvent) => {
    if (imageScale > 1 && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - imagePosition.x,
        y: e.touches[0].clientY - imagePosition.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && imageScale > 1 && e.touches.length === 1) {
      setImagePosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomIn = () => {
    setImageScale(prev => Math.min(5, prev + 0.25));
  };

  const handleZoomOut = () => {
    setImageScale(prev => Math.max(0.5, prev - 0.25));
  };

  const handleResetZoom = () => {
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
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
        const imageUrl = getImageUrl(image.storage_path);
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Tour Images</h3>
          <div className="flex gap-2">
            {images.length > 0 && (
              <Button
                variant="outline"
                onClick={handleDownloadAll}
                disabled={downloading}
                className="hover-scale"
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
              className="hover-scale"
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

      {/* Image Viewer Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={handleImageClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl h-[95vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="p-4 sm:p-6 pb-2 shrink-0">
            <DialogTitle className="text-sm sm:text-base truncate pr-8">
              {selectedImage?.file_name}
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <>
              {/* Zoom controls */}
              <div className="absolute top-16 right-4 z-50 flex flex-col gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleZoomIn}
                  className="h-10 w-10 rounded-full shadow-lg"
                  title="Zoom in"
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleZoomOut}
                  className="h-10 w-10 rounded-full shadow-lg"
                  title="Zoom out"
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleResetZoom}
                  className="h-10 w-10 rounded-full shadow-lg"
                  title="Reset zoom"
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
                <div className="text-xs text-center bg-secondary rounded-full px-2 py-1 shadow-lg">
                  {Math.round(imageScale * 100)}%
                </div>
              </div>

              {/* Image container - scrollable and pannable */}
              <div
                className="flex-1 overflow-hidden relative cursor-move select-none"
                style={{ minHeight: 0 }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 pt-2">
                  <img
                    src={getImageUrl(selectedImage.storage_path)}
                    alt={selectedImage.file_name}
                    className="rounded-lg max-w-full max-h-full object-contain"
                    style={{
                      transform: `scale(${imageScale}) translate(${imagePosition.x / imageScale}px, ${imagePosition.y / imageScale}px)`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                      userSelect: 'none',
                      pointerEvents: 'none'
                    }}
                    draggable={false}
                  />
                </div>
              </div>

              {/* Info and actions - sticky footer */}
              <div className="border-t bg-background p-4 sm:p-6 space-y-3 shrink-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <span>
                    {selectedImage.file_size
                      ? `${(selectedImage.file_size / 1024).toFixed(0)} KB`
                      : 'Unknown size'}
                  </span>
                  <span className="text-xs">
                    {new Date(selectedImage.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getImageUrl(selectedImage.storage_path), '_blank')}
                    className="w-full sm:w-auto"
                  >
                    Open in New Tab
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      deleteMutation.mutate(selectedImage);
                      handleImageClose();
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}