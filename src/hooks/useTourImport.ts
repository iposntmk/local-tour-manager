import { useMutation, type QueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { invalidateTourAggregateCaches } from '@/lib/query-cache';
import type { Tour, TourQuery, TourListResult } from '@/types/tour';
import { toast } from 'sonner';
import { handleImportError, validateTourData } from '@/lib/error-utils';
import { getTourNationalityIds } from '@/pages/tours/tour-table-config';

// Define ProcessResult type for bulk import
type ProcessResult =
  | { success: true; tour: Tour }
  | { success: false; skipped: true; tourCode?: string; error: string }
  | { success: false; skipped?: false; error: string };

// Normalize dates to YYYY-MM-DD for DB
const normalizeDate = (input?: string) => {
  if (!input) return input as any;
  const s = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes('/')) {
    const [a, b, c] = s.split('/');
    if (a && b && c) {
      if (a.length === 4) {
        // YYYY/MM/DD
        return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
      }
      if (c.length === 4) {
        // DD/MM/YYYY or MM/DD/YYYY -> infer by month > 12
        const nb = parseInt(b, 10);
        const na = parseInt(a, 10);
        const mm = nb > 12 ? a : b;
        const dd = nb > 12 ? b : a;
        return `${c}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      }
    }
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return s; // fallback
};

const matchesQueryFilters = (query: TourQuery | undefined, tour: Tour) => {
  if (!query) return true;

  if (query.tourCode && !tour.tourCode.toLowerCase().includes(query.tourCode.toLowerCase())) {
    return false;
  }

  if (query.clientName && !tour.clientName.toLowerCase().includes(query.clientName.toLowerCase())) {
    return false;
  }

  if (query.companyId && tour.companyRef?.id !== query.companyId) {
    return false;
  }

  if (query.guideId && tour.guideRef?.id !== query.guideId) {
    return false;
  }

  if (query.nationalityId && !getTourNationalityIds(tour).has(query.nationalityId)) {
    return false;
  }

  if (query.startDate && tour.startDate < query.startDate) {
    return false;
  }

  if (query.endDate && tour.endDate > query.endDate) {
    return false;
  }

  return true;
};

export function useTourImport(queryClient: QueryClient, _baseTourQuery: TourQuery) {
  const importMutation = useMutation({
    mutationFn: async (tours: Partial<Tour>[]) => {
      const results: Tour[] = [];
      const errors: string[] = [];
      const skipped: string[] = [];

      const appendTourToCache = (newTour: Tour) => {
        const queries = queryClient.getQueriesData<TourListResult>({ queryKey: ['tours'] });

        queries.forEach(([queryKey, data]) => {
          if (!data) return;
          if (!Array.isArray(queryKey)) return;

          const baseQuery = (queryKey[1] ?? undefined) as TourQuery | undefined;
          if (!matchesQueryFilters(baseQuery, newTour)) {
            return;
          }
          const updatedTotal = data.total + 1;
          const dedupedTours = data.tours.filter(tourItem => tourItem.id !== newTour.id);
          const orderedTours = [...dedupedTours, newTour].sort((a, b) =>
            (b.startDate ?? '').localeCompare(a.startDate ?? '')
          );

          queryClient.setQueryData(queryKey, {
            tours: orderedTours,
            total: updatedTotal,
          });
        });
      };

      let processedCount = 0;
      let successCount = 0;
      let skippedCount = 0;
      let progressToastId: string | number | undefined;

      const updateProgressToast = () => {
        if (tours.length <= 10) return;
        const progress = Math.round((processedCount / tours.length) * 100);
        const descriptionParts = [`${successCount}/${tours.length} imported`];
        if (skippedCount > 0) {
          descriptionParts.push(`${skippedCount} skipped`);
        }

        progressToastId = toast.message(`Importing tours... ${progress}%`, {
          id: progressToastId,
          description: descriptionParts.join(' • '),
          duration: 1000,
        });
      };

      // Load existing tours to check for duplicates
      const { tours: existingTours } = await store.listTours({});
      const existingTourCodes = new Set(existingTours.map(t => t.tourCode.toLowerCase()));

      // Load master data once for auto-matching fallback
      const [masterDestinations, masterExpenses, masterShoppings] = await Promise.all([
        store.listTouristDestinations({}),
        store.listDetailedExpenses({}),
        store.listShoppings({}),
      ]);
      // Create lookup maps for faster matching (much faster than Fuse.js for exact matches)
      const destMap = new Map(masterDestinations.map(d => [d.name.toLowerCase(), d]));
      const expMap = new Map(masterExpenses.map(e => [e.name.toLowerCase(), e]));
      const mealMap = new Map(masterShoppings.map(m => [m.name.toLowerCase(), m]));

      const autoMatch = (name: string, map: Map<string, any>) => {
        if (!name?.trim()) return null;
        return map.get(name.toLowerCase()) || null;
      };

      // Process all tours in parallel with concurrency limit
      const concurrencyLimit = 10; // Process 10 tours at a time
      const processWithConcurrency = async (toursToProcess: Partial<Tour>[], limit: number) => {
        const aggregatedResults: ProcessResult[] = [];

        const recordResult = <T extends ProcessResult>(result: T): T => {
          aggregatedResults.push(result);
          processedCount += 1;
          if (result.success) {
            successCount += 1;
          } else if ('skipped' in result && result.skipped) {
            skippedCount += 1;
          }
          updateProgressToast();
          return result;
        };

        for (let i = 0; i < toursToProcess.length; i += limit) {
          const batch = toursToProcess.slice(i, i + limit);
          await Promise.all(
            batch.map(async (tour, batchIndex) => {
              const globalIndex = i + batchIndex;

              // Check for duplicate tour code
              if (tour.tourCode && existingTourCodes.has(tour.tourCode.toLowerCase())) {
                return recordResult({
                  success: false,
                  skipped: true,
                  tourCode: tour.tourCode,
                  error: `Tour with tour code "${tour.tourCode}" already exists`,
                });
              }

              try {
                // Validate tour data before attempting to create
                const validation = validateTourData(tour);
                if (!validation.valid) {
                  throw new Error(validation.errors.join(', '));
                }

                // Clean matched properties and normalize dates + apply auto-match fallback
                const cleanDestinations = tour.destinations?.map(({ matchedId, matchedPrice, ...dest }) => {
                  const normalized = { ...dest, date: normalizeDate(dest.date) } as any;
                  if ((!normalized.price || normalized.price === 0) && normalized.name) {
                    const m = autoMatch(normalized.name, destMap);
                    if (m) {
                      normalized.name = m.name;
                      normalized.price = Number(m.price) || 0;
                    }
                  }
                  return normalized;
                });
                const cleanExpenses = tour.expenses?.map(({ matchedId, matchedPrice, ...exp }) => {
                  const normalized = { ...exp, date: normalizeDate(exp.date) } as any;
                  if ((!normalized.price || normalized.price === 0) && normalized.name) {
                    const m = autoMatch(normalized.name, expMap);
                    if (m) {
                      normalized.name = m.name;
                      normalized.price = Number(m.price) || 0;
                    }
                  }
                  return normalized;
                });
                const cleanMeals = tour.meals?.map(({ matchedId, matchedPrice, ...meal }) => {
                  const normalized = { ...meal, date: normalizeDate(meal.date) } as any;
                  if ((!normalized.price || normalized.price === 0) && normalized.name) {
                    const m = autoMatch(normalized.name, mealMap);
                    if (m) {
                      normalized.name = m.name;
                      normalized.price = Number(m.price) || 0;
                    }
                  }
                  return normalized;
                });
                const cleanAllowances = tour.allowances?.map(({ matchedId, matchedPrice, ...allow }: any) => {
                  const normalized = { ...allow, date: normalizeDate(allow.date) } as any;
                  if ((!normalized.price || normalized.price === 0) && normalized.name) {
                    const m = autoMatch(normalized.name, expMap);
                    if (m) {
                      normalized.name = m.name;
                      normalized.price = Number(m.price) || 0;
                    }
                  }
                  return normalized;
                });

                // Create the tour with all subcollections in one call
                const createdTour = await store.createTour({
                  tourCode: tour.tourCode!,
                  companyRef: tour.companyRef,
                  guideRef: tour.guideRef,
                  clientNationalityRef: tour.clientNationalityRef,
                  clientNationalities: tour.clientNationalities,
                  clientName: tour.clientName!,
                  adults: tour.adults!,
                  children: tour.children!,
                  driverName: tour.driverName,
                  clientPhone: tour.clientPhone,
                  startDate: normalizeDate(tour.startDate!)!,
                  endDate: normalizeDate(tour.endDate!)!,
                  destinations: cleanDestinations,
                  expenses: cleanExpenses,
                  meals: cleanMeals,
                  allowances: cleanAllowances,
                  summary: tour.summary,
                });

                appendTourToCache(createdTour);
                if (tour.tourCode) {
                  existingTourCodes.add(tour.tourCode.toLowerCase());
                }

                return recordResult({ success: true, tour: createdTour });
              } catch (error) {
                const tourCode = tour.tourCode || `Tour ${globalIndex + 1}`;
                const context = {
                  operation: 'importTour',
                  tourCode,
                  tourIndex: globalIndex,
                  data: tour,
                  timestamp: new Date().toISOString(),
                };

                const errorMsg = handleImportError(error, context);
                return recordResult({ success: false, error: `${tourCode}: ${errorMsg}` });
              }
            })
          );
        }

        return aggregatedResults;
      };

      const allResults = await processWithConcurrency(tours, concurrencyLimit);

      // Separate successes, errors, and skipped tours
      allResults.forEach(result => {
        if (result.success) {
          results.push(result.tour);
        } else if ('skipped' in result && result.skipped) {
          skipped.push(('tourCode' in result ? result.tourCode : undefined) || 'Unknown');
        } else if (!result.success && 'error' in result) {
          errors.push(result.error);
        }
      });

      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }

      return { imported: results, skipped };
    },
    onSuccess: async (result) => {
      const { imported, skipped } = result;

      await invalidateTourAggregateCaches(queryClient);

      // Show success message with details
      if (skipped.length > 0) {
        toast.success(
          `${imported.length} tour(s) imported successfully. ${skipped.length} tour(s) skipped (already exist): ${skipped.join(', ')}`,
          { duration: 8000 }
        );
      } else {
        toast.success(`${imported.length} tour(s) imported successfully`);
      }
    },
    onError: (error) => {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import tours';
      toast.error(errorMessage, { duration: 5000 });
    },
  });

  const handleImport = (tours: Partial<Tour>[]) => {
    importMutation.mutate(tours);
  };

  return { importMutation, handleImport };
}
