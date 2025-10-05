import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Upload, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
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
  const [selectedImage, setSelectedImage] = useState<TourImage | null>(null);
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
          <div>
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
                    onClick={() => setSelectedImage(image)}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(image);
                      }}
                      className="hover-scale pointer-events-auto"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
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
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedImage?.file_name}</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={getImageUrl(selectedImage.storage_path)}
                  alt={selectedImage.file_name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>
                  {selectedImage.file_size
                    ? `${(selectedImage.file_size / 1024).toFixed(0)} KB`
                    : 'Unknown size'}
                </span>
                <span>{new Date(selectedImage.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(getImageUrl(selectedImage.storage_path), '_blank')}
                >
                  Open in New Tab
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteMutation.mutate(selectedImage);
                    setSelectedImage(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}