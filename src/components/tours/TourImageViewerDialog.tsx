import { useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TourImage } from '@/types/tour';

interface TourImageViewerDialogProps {
  image: TourImage | null;
  canDelete: boolean;
  getImageUrl: (storagePath: string) => string;
  onClose: () => void;
  onDelete: (image: TourImage) => void;
}

export function TourImageViewerDialog({
  image,
  canDelete,
  getImageUrl,
  onClose,
  onDelete,
}: TourImageViewerDialogProps) {
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, [image?.id]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setImageScale((prev) => Math.max(0.5, Math.min(5, prev + delta)));
  };

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
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (imageScale > 1 && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - imagePosition.x,
        y: e.touches[0].clientY - imagePosition.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && imageScale > 1 && e.touches.length === 1) {
      setImagePosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleResetZoom = () => {
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const stopDragging = () => setIsDragging(false);

  return (
    <Dialog open={!!image} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl h-[95vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-2 shrink-0">
          <DialogTitle className="text-sm sm:text-base truncate pr-8">
            {image?.file_name}
          </DialogTitle>
        </DialogHeader>
        {image && (
          <>
            <div className="absolute top-16 right-4 z-50 flex flex-col gap-2">
              <Button variant="secondary" size="icon" onClick={() => setImageScale((prev) => Math.min(5, prev + 0.25))} className="h-10 w-10 rounded-full shadow-lg" title="Zoom in">
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button variant="secondary" size="icon" onClick={() => setImageScale((prev) => Math.max(0.5, prev - 0.25))} className="h-10 w-10 rounded-full shadow-lg" title="Zoom out">
                <ZoomOut className="h-5 w-5" />
              </Button>
              <Button variant="secondary" size="icon" onClick={handleResetZoom} className="h-10 w-10 rounded-full shadow-lg" title="Reset zoom">
                <RotateCcw className="h-5 w-5" />
              </Button>
              <div className="text-xs text-center bg-secondary rounded-full px-2 py-1 shadow-lg">
                {Math.round(imageScale * 100)}%
              </div>
            </div>

            <div
              className="flex-1 overflow-hidden relative cursor-move select-none"
              style={{ minHeight: 0 }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={stopDragging}
              onMouseLeave={stopDragging}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={stopDragging}
            >
              <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 pt-2">
                <img
                  src={getImageUrl(image.storage_path)}
                  alt={image.file_name}
                  className="rounded-lg max-w-full max-h-full object-contain"
                  style={{
                    transform: `scale(${imageScale}) translate(${imagePosition.x / imageScale}px, ${imagePosition.y / imageScale}px)`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                  draggable={false}
                />
              </div>
            </div>

            <div className="border-t bg-background p-4 sm:p-6 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <span>{image.file_size ? `${(image.file_size / 1024).toFixed(0)} KB` : 'Unknown size'}</span>
                <span className="text-xs">{new Date(image.created_at).toLocaleString()}</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button variant="outline" size="sm" onClick={() => window.open(getImageUrl(image.storage_path), '_blank')} className="w-full sm:w-auto">
                  Open in New Tab
                </Button>
                {canDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onDelete(image);
                      onClose();
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
