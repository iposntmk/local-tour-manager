import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TextareaWithSave } from '@/components/ui/textarea-with-save';
import { Label } from '@/components/ui/label';
import { Upload, FileJson, Download } from 'lucide-react';
import { toast } from 'sonner';
import Fuse from 'fuse.js';
import { store } from '@/lib/datastore';
import type { Tour } from '@/types/tour';
import type { EntityRef } from '@/types/tour';
import { EnhancedImportReview } from '@/components/tours/EnhancedImportReview';
import type { Company, Guide, Nationality } from '@/types/master';

interface ImportTourDialogEnhancedProps {
  onImport: (tours: Partial<Tour>[]) => void;
  trigger?: React.ReactNode;
}

type EntityLookups = {
  companiesByName: Map<string, Company>;
  guidesByName: Map<string, Guide>;
  nationalitiesByName: Map<string, Nationality>;
  nationalitiesByIso: Map<string, Nationality>;
};

type EntityCaches = {
  companies: Company[];
  guides: Guide[];
  nationalities: Nationality[];
  lookups: EntityLookups;
};

const normalizeEntityName = (value?: string | null) => {
  if (!value) return '';
  // Normalize unicode characters (e.g., "Việt" -> "Viet")
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalized.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
};

const buildEntityCaches = (companies: Company[], guides: Guide[], nationalities: Nationality[]): EntityCaches => {
  const companiesByName = new Map<string, Company>();
  companies.forEach(company => {
    const normalized = normalizeEntityName(company.name);
    if (normalized && !companiesByName.has(normalized)) {
      companiesByName.set(normalized, company);
    }
  });

  const guidesByName = new Map<string, Guide>();
  guides.forEach(guide => {
    const normalized = normalizeEntityName(guide.name);
    if (normalized && !guidesByName.has(normalized)) {
      guidesByName.set(normalized, guide);
    }
  });

  const nationalitiesByName = new Map<string, Nationality>();
  const nationalitiesByIso = new Map<string, Nationality>();
  nationalities.forEach(nationality => {
    const normalizedName = normalizeEntityName(nationality.name);
    if (normalizedName && !nationalitiesByName.has(normalizedName)) {
      nationalitiesByName.set(normalizedName, nationality);
    }

    const normalizedIso = normalizeEntityName(nationality.iso2);
    if (normalizedIso && !nationalitiesByIso.has(normalizedIso)) {
      nationalitiesByIso.set(normalizedIso, nationality);
    }
  });

  return {
    companies,
    guides,
    nationalities,
    lookups: {
      companiesByName,
      guidesByName,
      nationalitiesByName,
      nationalitiesByIso,
    },
  };
};

export const ImportTourDialogEnhanced = ({ onImport, trigger }: ImportTourDialogEnhancedProps) => {
  const [open, setOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewItems, setReviewItems] = useState<{ tour: Partial<Tour>; raw: { company: string; guide: string; nationality: string } }[]>([]);
  const [entityCaches, setEntityCaches] = useState<EntityCaches | null>(null);
  const entityLoadPromiseRef = useRef<Promise<EntityCaches> | null>(null);

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

  const loadEntityCaches = useCallback(async (): Promise<EntityCaches> => {
    if (entityCaches) {
      return entityCaches;
    }

    if (entityLoadPromiseRef.current) {
      return entityLoadPromiseRef.current;
    }

    const loadPromise = Promise.all([
      store.listCompanies({}),
      store.listGuides({}),
      store.listNationalities({}),
    ]).then(([companies, guides, nationalities]) => {
      const caches = buildEntityCaches(companies, guides, nationalities);
      setEntityCaches(caches);
      return caches;
    }).finally(() => {
      entityLoadPromiseRef.current = null;
    });

    entityLoadPromiseRef.current = loadPromise;
    return loadPromise;
  }, [entityCaches]);

  useEffect(() => {
    if (open) {
      loadEntityCaches().catch(error => {
        console.error('Failed to preload entities for import dialog', error);
      });
    }
  }, [open, loadEntityCaches]);

  const findEntityRef = (
    caches: EntityCaches,
    entityType: 'company' | 'guide' | 'nationality',
    name: string,
    required: boolean = false
  ): EntityRef | null => {
    const normalized = normalizeEntityName(name);
    if (!normalized) {
      return required ? null : null;
    }

    let match: Company | Guide | Nationality | undefined;

    // Try exact match first
    if (entityType === 'company') {
      match = caches.lookups.companiesByName.get(normalized);
    } else if (entityType === 'guide') {
      match = caches.lookups.guidesByName.get(normalized);
    } else {
      match =
        caches.lookups.nationalitiesByName.get(normalized) ||
        caches.lookups.nationalitiesByIso.get(normalized);
    }

    if (match) {
      return { id: match.id, nameAtBooking: match.name };
    }

    // Fallback to fuzzy matching with Fuse.js
    let entities: (Company | Guide | Nationality)[] = [];
    let searchKeys: string[] = ['name'];

    if (entityType === 'company') {
      entities = caches.companies;
    } else if (entityType === 'guide') {
      entities = caches.guides;
    } else {
      entities = caches.nationalities;
      searchKeys = ['name', 'iso2'];
    }

    const fuse = new Fuse(entities, {
      keys: searchKeys,
      threshold: 0.3,
      ignoreLocation: true,
    });

    const fuzzyResults = fuse.search(name);
    if (fuzzyResults.length > 0) {
      const fuzzyMatch = fuzzyResults[0].item;
      return { id: fuzzyMatch.id, nameAtBooking: fuzzyMatch.name };
    }

    return required ? null : null;
  };

  const transformImportedTour = (data: any, caches: EntityCaches): { tour: Partial<Tour>; raw: { company: string; guide: string; nationality: string } } => {
    const tourData = data.tour || data;
    const subcollections = data.subcollections || {};

    // Apply defaults if fields are empty
    const companyName = tourData.company || 'Việt Á';
    const guideName = tourData.tourGuide || 'Cao Hữu Tu';
    const clientNameValue = tourData.clientName || 'Client Tú';

    // Handle nationality - treat empty as Vietnam
    const nationalityName = tourData.clientNationality?.trim() || 'Việt Nam';

    // Try to find entities but don't require them - let user review and edit
    const companyRef = findEntityRef(caches, 'company', companyName, false);
    const guideRef = findEntityRef(caches, 'guide', guideName, false);
    const nationalityRef = findEntityRef(caches, 'nationality', nationalityName, false);

    const tour: Partial<Tour> = {
      tourCode: tourData.tourCode || '',
      clientName: clientNameValue,
      adults: tourData.adults || 0,
      children: tourData.children || 0,
      totalGuests: tourData.totalGuests || 0,
      driverName: tourData.driverName || '',
      clientPhone: tourData.clientPhone || '',
      startDate: tourData.startDate || '',
      endDate: tourData.endDate || '',
      totalDays: tourData.totalDays || 0,
      companyRef: companyRef || { id: '', nameAtBooking: companyName },
      guideRef: guideRef || { id: '', nameAtBooking: guideName },
      clientNationalityRef: nationalityRef || { id: '', nameAtBooking: nationalityName },
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

    return { tour, raw: { company: companyName, guide: guideName, nationality: nationalityName } };
  };

  const validateTourData = (data: any): { valid: boolean; errors: string[] } => {
    const tours = Array.isArray(data) ? data : [data];
    const errors: string[] = [];
    
    for (let i = 0; i < tours.length; i++) {
      const tour = tours[i];
      const tourData = tour.tour || tour;
      const tourIndex = i + 1;
      
      // Only validate basic JSON structure, not business logic
      if (!tourData || typeof tourData !== 'object') {
        errors.push(`Tour ${tourIndex}: Invalid tour data structure`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  };

  const downloadSampleJson = () => {
    const sampleData = [{
      tour: {
        tourCode: "SAMPLE001",
        company: "Việt Á",
        tourGuide: "Cao Hữu Tu",
        clientName: "Sample Client",
        clientNationality: "Việt Nam",
        adults: 2,
        children: 1,
        totalGuests: 3,
        driverName: "Sample Driver",
        clientPhone: "+84123456789",
        startDate: "2025-01-15",
        endDate: "2025-01-20",
        totalDays: 5
      },
      subcollections: {
        destinations: [
          {
            name: "Hà Nội",
            date: "2025-01-15",
            orderIndex: 0
          }
        ],
        expenses: [
          {
            category: "Accommodation",
            description: "Hotel booking",
            amount: 1000000,
            date: "2025-01-15",
            orderIndex: 0
          }
        ],
        meals: [
          {
            mealType: "Lunch",
            location: "Restaurant A",
            pricePerPerson: 150000,
            numberOfGuests: 3,
            totalPrice: 450000,
            date: "2025-01-15",
            orderIndex: 0
          }
        ],
        allowances: [
          {
            description: "Daily allowance",
            amount: 200000,
            date: "2025-01-15",
            orderIndex: 0
          }
        ],
        summary: {
          totalTabs: 0,
          advancePayment: 0,
          totalAfterAdvance: 0,
          companyTip: 0,
          totalAfterTip: 0,
          collectionsForCompany: 0,
          totalAfterCollections: 0,
          finalTotal: 0
        }
      }
    }];

    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tour-import-sample.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Sample JSON file downloaded');
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast.error('Please paste JSON data or upload a file');
      return;
    }

    setIsProcessing(true);
    try {
      const parsed = JSON.parse(jsonInput);
      
      const validation = validateTourData(parsed);
      if (!validation.valid) {
        toast.error(`Invalid tour data:\n${validation.errors.join('\n')}`, { duration: 8000 });
        return;
      }

      const rawTours = Array.isArray(parsed) ? parsed : [parsed];
      
      try {
        const caches = await loadEntityCaches();
        
        const transformed = rawTours.map((tour, index) => {
          try {
            return transformImportedTour(tour, caches);
          } catch (error) {
            const tourCode = tour.tour?.tourCode || tour.tourCode || `Tour ${index + 1}`;
            throw new Error(`${tourCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        setReviewItems(transformed);
        toast.message('Review required', { description: 'Review and edit tour data before importing.' });
      } catch (error) {
        if (error instanceof Error && error.message.includes('Failed to preload entities')) {
          toast.error('Failed to load master data. Please try again.');
        } else {
          throw error;
        }
      }
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
      <DialogContent className="w-[95vw] sm:max-w-6xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Import Tours from JSON</DialogTitle>
          <DialogDescription>Upload or paste JSON, then review and edit tour data before importing.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {reviewItems.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadSampleJson}
                  className="ml-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample
                </Button>
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
                <TextareaWithSave
                  id="json-textarea"
                  storageKey="tour-import-json"
                  value={jsonInput}
                  onValueChange={setJsonInput}
                  placeholder='[{"tour": {"tourCode": "T001", "company": "ABC", "tourGuide": "John", "clientName": "Amy", "clientNationality": "USA", "adults": 2, "children": 0, "startDate": "2025-01-01", "endDate": "2025-01-10"}, "subcollections": {"destinations": [], "expenses": [], "meals": [], "allowances": [], "summary": {"totalTabs": 0}}}]'
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : 'Parse & Review'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-hidden">
              <EnhancedImportReview
                items={reviewItems}
                onCancel={() => setReviewItems([])}
                onConfirm={async (tours) => {
                  try {
                    await onImport(tours);
                    setReviewItems([]);
                    setJsonInput('');
                    setOpen(false);
                  } catch (e) {
                    // onImport handles toasts
                  }
                }}
                preloadedEntities={entityCaches ?? undefined}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};