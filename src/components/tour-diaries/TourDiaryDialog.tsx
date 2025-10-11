import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { store } from '@/lib/datastore';
import type { TourDiary, TourDiaryInput, DiaryType } from '@/types/master';
import type { Tour } from '@/types/tour';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

interface TourDiaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourDiary?: TourDiary;
  onSuccess: () => void;
}

interface FormData {
  tourId: string;
  diaryTypeId: string;
  contentText?: string;
  contentUrls: string[];
}

export function TourDiaryDialog({ open, onOpenChange, tourDiary, onSuccess }: TourDiaryDialogProps) {
  const { toast } = useToast();
  const [tours, setTours] = useState<Tour[]>([]);
  const [diaryTypes, setDiaryTypes] = useState<DiaryType[]>([]);
  const [selectedTourId, setSelectedTourId] = useState('');
  const [selectedDiaryTypeId, setSelectedDiaryTypeId] = useState('');
  const [contentType, setContentType] = useState<'text' | 'image' | 'video'>('text');
  const [contentText, setContentText] = useState('');
  const [contentUrls, setContentUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (tourDiary) {
      setSelectedTourId(tourDiary.tourRef.id);
      setSelectedDiaryTypeId(tourDiary.diaryTypeRef.id);
      setContentType(tourDiary.contentType);
      setContentText(tourDiary.contentText || '');
      setContentUrls(tourDiary.contentUrls || []);
    } else {
      setSelectedTourId('');
      setSelectedDiaryTypeId('');
      setContentType('text');
      setContentText('');
      setContentUrls([]);
    }
  }, [tourDiary, open]);

  const loadData = async () => {
    try {
      const [toursData, diaryTypesData] = await Promise.all([
        store.listTours({}, { includeDetails: false }),
        store.listDiaryTypes({ status: 'active' }),
      ]);
      setTours(toursData.tours);
      setDiaryTypes(diaryTypesData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const selected = diaryTypes.find(dt => dt.id === selectedDiaryTypeId);
    if (selected) {
      const typeName = selected.name.toLowerCase();
      if (typeName.includes('text')) {
        setContentType('text');
      } else if (typeName.includes('image')) {
        setContentType('image');
      } else if (typeName.includes('video')) {
        setContentType('video');
      }
    }
  }, [selectedDiaryTypeId, diaryTypes]);

  const handleAddUrl = () => {
    setContentUrls([...contentUrls, '']);
  };

  const handleRemoveUrl = (index: number) => {
    setContentUrls(contentUrls.filter((_, i) => i !== index));
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...contentUrls];
    newUrls[index] = value;
    setContentUrls(newUrls);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTourId || !selectedDiaryTypeId) {
      toast({
        title: 'Error',
        description: 'Please select tour and diary type',
        variant: 'destructive',
      });
      return;
    }

    if (contentType === 'text' && !contentText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter text content',
        variant: 'destructive',
      });
      return;
    }

    if ((contentType === 'image' || contentType === 'video') && contentUrls.filter(u => u.trim()).length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one URL',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedTour = tours.find(t => t.id === selectedTourId);
      const selectedDiaryType = diaryTypes.find(dt => dt.id === selectedDiaryTypeId);

      if (!selectedTour || !selectedDiaryType) {
        throw new Error('Selected tour or diary type not found');
      }

      const input: TourDiaryInput = {
        tourRef: {
          id: selectedTour.id,
          tourCodeAtBooking: selectedTour.tourCode,
        },
        diaryTypeRef: {
          id: selectedDiaryType.id,
          nameAtBooking: selectedDiaryType.name,
        },
        contentType,
        contentText: contentType === 'text' ? contentText : undefined,
        contentUrls: contentType !== 'text' ? contentUrls.filter(u => u.trim()) : [],
      };

      if (tourDiary) {
        await store.updateTourDiary(tourDiary.id, input as Partial<TourDiary>);
        toast({ title: 'Tour diary updated successfully' });
      } else {
        await store.createTourDiary(input);
        toast({ title: 'Tour diary created successfully' });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tourDiary ? 'Edit Tour Diary' : 'Add Tour Diary'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tour">Tour Code *</Label>
            <Select value={selectedTourId} onValueChange={setSelectedTourId}>
              <SelectTrigger>
                <SelectValue placeholder="Select tour" />
              </SelectTrigger>
              <SelectContent>
                {tours.map((tour) => (
                  <SelectItem key={tour.id} value={tour.id}>
                    {tour.tourCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="diaryType">Diary Type *</Label>
            <Select value={selectedDiaryTypeId} onValueChange={setSelectedDiaryTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select diary type" />
              </SelectTrigger>
              <SelectContent>
                {diaryTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {contentType === 'text' && (
            <div>
              <Label htmlFor="contentText">Text Content *</Label>
              <Textarea
                id="contentText"
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder="Enter text content"
                rows={8}
              />
            </div>
          )}

          {(contentType === 'image' || contentType === 'video') && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>URLs *</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddUrl}>
                  <Upload className="mr-2 h-4 w-4" />
                  Add URL
                </Button>
              </div>
              {contentUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    placeholder={`Enter ${contentType} URL`}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveUrl(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {contentUrls.length === 0 && (
                <p className="text-sm text-muted-foreground">No URLs added yet. Click "Add URL" to add.</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : tourDiary ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
