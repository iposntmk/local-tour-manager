import { useEffect, useState } from 'react';
import { store } from '@/lib/datastore';
import type { TourDiary } from '@/types/master';
import type { Tour } from '@/types/tour';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TourDiaryViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourDiary?: TourDiary;
}

export function TourDiaryViewDialog({ open, onOpenChange, tourDiary }: TourDiaryViewDialogProps) {
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && tourDiary) {
      loadTourDetails();
    }
  }, [open, tourDiary]);

  const loadTourDetails = async () => {
    if (!tourDiary) return;
    
    setLoading(true);
    try {
      const tourData = await store.getTour(tourDiary.tourRef.id);
      setTour(tourData || null);
    } catch (error) {
      console.error('Failed to load tour details', error);
    } finally {
      setLoading(false);
    }
  };

  if (!tourDiary) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tour Diary Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Diary Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Tour Code</Label>
                  <p className="font-medium">{tourDiary.tourRef.tourCodeAtBooking}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Diary Type</Label>
                  <p className="font-medium">{tourDiary.diaryTypeRef.nameAtBooking}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Content Type</Label>
                  <Badge>{tourDiary.contentType}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <p className="font-medium">
                    {format(new Date(tourDiary.createdAt), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              </div>

              {tourDiary.contentType === 'text' && tourDiary.contentText && (
                <div>
                  <Label className="text-muted-foreground">Text Content</Label>
                  <div className="mt-2 p-4 bg-muted rounded-md whitespace-pre-wrap">
                    {tourDiary.contentText}
                  </div>
                </div>
              )}

              {(tourDiary.contentType === 'image' || tourDiary.contentType === 'video') && tourDiary.contentUrls.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">URLs</Label>
                  <div className="mt-2 space-y-2">
                    {tourDiary.contentUrls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 bg-muted hover:bg-muted/80 rounded-md text-sm text-primary hover:underline"
                      >
                        {url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {loading ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                Loading tour details...
              </CardContent>
            </Card>
          ) : tour ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tour Information (Read Only)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Tour Code</Label>
                    <p className="font-medium">{tour.tourCode}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Company</Label>
                    <p className="font-medium">{tour.companyRef.nameAtBooking || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Guide</Label>
                    <p className="font-medium">{tour.guideRef.nameAtBooking || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Client Name</Label>
                    <p className="font-medium">{tour.clientName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Nationality</Label>
                    <p className="font-medium">{tour.clientNationalityRef.nameAtBooking || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Guests</Label>
                    <p className="font-medium">
                      {tour.totalGuests} ({tour.adults} adults, {tour.children} children)
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Start Date</Label>
                    <p className="font-medium">{format(new Date(tour.startDate), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">End Date</Label>
                    <p className="font-medium">{format(new Date(tour.endDate), 'dd/MM/yyyy')}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="font-medium">{tour.notes || 'No notes'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                Tour details not available
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
