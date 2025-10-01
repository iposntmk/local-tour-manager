import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileJson } from 'lucide-react';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import type { Tour } from '@/types/tour';
import type { EntityRef } from '@/types/tour';
import { ImportTourReview } from '@/components/tours/ImportTourReview';

interface ImportTourDialogProps {
  onImport: (tours: Partial<Tour>[]) => void;
  trigger?: React.ReactNode;
}

export const ImportTourDialog = ({ onImport, trigger }: ImportTourDialogProps) => {
  const [open, setOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [saveToStorage, setSaveToStorage] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewItems, setReviewItems] = useState<{ tour: Partial<Tour>; raw: { company: string; guide: string; nationality: string } }[]>([]);

  // Load from localStorage when dialog opens
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem('tour-import-json');
      if (saved) {
        setJsonInput(saved);
        setSaveToStorage(true);
      }
    }
  }, [open]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
  };

  const findEntityRef = async (
    entityType: 'company' | 'guide' | 'nationality',
    name: string,
    required: boolean = false
  ): Promise<EntityRef | null> => {
    if (!name || name.trim() === '') {
      return required ? null : null;
    }

    try {
      let entities: { id: string; name: string }[] = [];
      switch (entityType) {
        case 'company':
          entities = await store.listCompanies({ search: name });
          break;
        case 'guide':
          entities = await store.listGuides({ search: name });
          break;
        case 'nationality':
          entities = await store.listNationalities({ search: name });
          break;
      }

      const match = entities.find(e => e.name.toLowerCase() === name.toLowerCase());
      if (match) return { id: match.id, nameAtBooking: match.name };
      return null;
    } catch (error) {
      console.error(`Error finding ${entityType}:`, error);
      return null;
    }
  };

  const transformImportedTour = async (data: any): Promise<{ tour: Partial<Tour>; raw: { company: string; guide: string; nationality: string } }> => {
    const tourData = data.tour || data;
    const subcollections = data.subcollections || {};

    const companyRef = await findEntityRef('company', tourData.company || '', true);
    const guideRef = await findEntityRef('guide', tourData.tourGuide || '', true);
    const nationalityRef = await findEntityRef('nationality', tourData.clientNationality || '', true);

    const tour: Partial<Tour> = {
      tourCode: tourData.tourCode,
      clientName: tourData.clientName || '',
      adults: tourData.adults || 0,
      children: tourData.children || 0,
      totalGuests: tourData.totalGuests || 0,
      driverName: tourData.driverName || '',
      clientPhone: tourData.clientPhone || '',
      startDate: tourData.startDate,
      endDate: tourData.endDate,
      totalDays: tourData.totalDays || 0,
      companyRef: companyRef || { id: '', nameAtBooking: '' },
      guideRef: guideRef || { id: '', nameAtBooking: '' },
      clientNationalityRef: nationalityRef || { id: '', nameAtBooking: '' },
      destinations: subcollections.destinations || [],
      expenses: subcollections.expenses || [],
      meals: subcollections.meals || [],
      allowances: subcollections.allowances || [],
      summary: {
        totalTabs: subcollections.summary?.totalTabs || 0,
        advancePayment: subcollections.summary?.advancePayment || 0,
        totalAfterAdvance: subcollections.summary?.totalAfterAdvance || 0,
        companyTip: subcollections.summary?.companyTip || 0,
        totalAfterTip: subcollections.summary?.totalAfterTip || 0,
        collectionsForCompany: subcollections.summary?.collectionsForCompany || 0,
        totalAfterCollections: subcollections.summary?.totalAfterCollections || 0,
        finalTotal: subcollections.summary?.finalTotal || 0,
      },
    };

    return { tour, raw: { company: tourData.company || '', guide: tourData.tourGuide || '', nationality: tourData.clientNationality || '' } };
  };

  const validateTourData = (data: any): boolean => {
    const tours = Array.isArray(data) ? data : [data];
    
    for (const tour of tours) {
      const tourData = tour.tour || tour;
      if (!tourData.tourCode || !tourData.startDate || !tourData.endDate) {
        return false;
      }
    }
    return true;
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast.error('Please paste JSON data or upload a file');
      return;
    }

    setIsProcessing(true);
    try {
      const parsed = JSON.parse(jsonInput);
      
      if (!validateTourData(parsed)) {
        toast.error('Invalid tour data. Required fields: tourCode, startDate, endDate');
        return;
      }

      const rawTours = Array.isArray(parsed) ? parsed : [parsed];
      const transformed = await Promise.all(
        rawTours.map(async (tour, index) => {
          try {
            return await transformImportedTour(tour);
          } catch (error) {
            const tourCode = tour.tour?.tourCode || tour.tourCode || `Tour ${index + 1}`;
            throw new Error(`${tourCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        })
      );

      setReviewItems(transformed);
      toast.message('Review required', { description: 'Resolve missing fields, then confirm import.' });
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON format';
      toast.error(`Import failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="hover-scale">
            <Upload className="h-4 w-4 mr-2" />
            Import JSON
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Tours from JSON</DialogTitle>
          <DialogDescription>Upload or paste JSON, then review and fix missing fields before importing.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {reviewItems.length === 0 ? (
            <>
              <div>
                <Label htmlFor="json-file" className="flex items-center gap-2 cursor-pointer">
                  <FileJson className="h-4 w-4" />
                  Upload JSON File
                </Label>
                <input
                  id="json-file"
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="mt-2"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or paste JSON</span>
                </div>
              </div>

              <div>
                <Label htmlFor="json-textarea">JSON Data</Label>
                <Textarea
                  id="json-textarea"
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value);
                    if (saveToStorage) {
                      localStorage.setItem('tour-import-json', e.target.value);
                    }
                  }}
                  placeholder='[{"tour": {"tourCode": "T001", "company": "ABC", "tourGuide": "John", "clientName": "Amy", "clientNationality": "USA", "adults": 2, "children": 0, "startDate": "2025-01-01", "endDate": "2025-01-10"}, "subcollections": {"destinations": [], "expenses": [], "meals": [], "allowances": [], "summary": {"totalTabs": 0}}}]'
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="save-to-storage"
                  checked={saveToStorage}
                  onCheckedChange={(checked) => {
                    setSaveToStorage(!!checked);
                    if (checked) {
                      localStorage.setItem('tour-import-json', jsonInput);
                    } else {
                      localStorage.removeItem('tour-import-json');
                    }
                  }}
                />
                <Label htmlFor="save-to-storage" className="cursor-pointer text-sm">
                  Save to browser (remember JSON data)
                </Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : 'Parse & Review'}
                </Button>
              </div>
            </>
          ) : (
            <ImportTourReview
              items={reviewItems}
              onCancel={() => setReviewItems([])}
              onConfirm={async (tours) => {
                try {
                  await onImport(tours);
                  setReviewItems([]);
                  setJsonInput('');
                  if (saveToStorage) {
                    localStorage.removeItem('tour-import-json');
                  }
                  setOpen(false);
                } catch (e) {
                  // onImport handles toasts
                }
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
