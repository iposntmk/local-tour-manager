import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { Tour } from '@/types/tour';
import type { EntityCaches } from '@/lib/import-tour-transform';
import {
  buildEntityCaches, transformImportedTour, validateTourData, downloadTourImportSample,
  loadEntityCachesFromStore,
} from '@/lib/import-tour-transform';

export type ReviewItemRaw = { tour: Partial<Tour>; raw: { company: string; guide: string; nationality: string }; sourceJson?: unknown };

export function useImportTourDialogBase(open: boolean) {
  const [jsonInput, setJsonInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItemRaw[]>([]);
  const [entityCaches, setEntityCaches] = useState<EntityCaches | null>(null);
  const loadPromiseRef = useRef<Promise<EntityCaches> | null>(null);

  const loadEntityCaches = useCallback(async (): Promise<EntityCaches> => {
    if (entityCaches) return entityCaches;
    if (loadPromiseRef.current) return loadPromiseRef.current;

    const promise = loadEntityCachesFromStore()
      .then(caches => { setEntityCaches(caches); return caches; })
      .finally(() => { loadPromiseRef.current = null; });

    loadPromiseRef.current = promise;
    return promise;
  }, [entityCaches]);

  useEffect(() => {
    if (open) {
      loadEntityCaches().catch(err => console.error('Failed to preload entities', err));
    }
  }, [open, loadEntityCaches]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) { toast.error('Please upload a JSON file'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setJsonInput(ev.target?.result as string);
    reader.onerror = () => toast.error('Failed to read file');
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) { toast.error('Please paste JSON data or upload a file'); return; }
    setIsProcessing(true);
    try {
      const parsed = JSON.parse(jsonInput);
      const validation = validateTourData(parsed);
      if (!validation.valid) {
        toast.error(`Invalid tour data:\n${validation.errors.join('\n')}`, { duration: 8000 });
        return;
      }
      const rawTours = Array.isArray(parsed) ? parsed : [parsed];
      const caches = await loadEntityCaches();
      const transformed = rawTours.map((tour, index) => {
        try {
          return { ...transformImportedTour(tour, caches), sourceJson: tour };
        } catch (error) {
          const code = tour.tour?.tourCode || tour.tourCode || `Tour ${index + 1}`;
          throw new Error(`${code}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
      setReviewItems(transformed);
      toast.message('Review required', { description: 'Resolve missing fields, then confirm import.' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Invalid JSON format';
      toast.error(`Import failed: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async (onImport: (tours: Partial<Tour>[]) => void, tours: Partial<Tour>[]) => {
    try {
      await onImport(tours);
      setReviewItems([]);
      setJsonInput('');
      return true;
    } catch {
      return false;
    }
  };

  const clearReview = () => setReviewItems([]);

  return {
    jsonInput, setJsonInput,
    isProcessing, reviewItems, entityCaches,
    handleFileUpload, handleImport, handleConfirmImport, clearReview,
    downloadSample: downloadTourImportSample,
  };
}
