import type { QueryClient } from '@tanstack/react-query';
import { enrichTourWithSummary } from '@/lib/tour-utils';
import type { LineStatus, LineType, Tour } from '@/types/tour';

export type TourCollectionKey = 'destinations' | 'expenses' | 'meals' | 'allowances' | 'shoppings';

const tourQueryKey = (tourId: string) => ['tour', tourId] as const;

export const getTourCacheSnapshot = (queryClient: QueryClient, tourId: string) =>
  queryClient.getQueryData<Tour>(tourQueryKey(tourId));

export const restoreTourCacheSnapshot = (
  queryClient: QueryClient,
  tourId: string,
  snapshot: Tour | undefined,
) => {
  if (snapshot) queryClient.setQueryData(tourQueryKey(tourId), snapshot);
};

export const replaceTourCacheLine = (
  queryClient: QueryClient,
  tourId: string,
  collection: TourCollectionKey,
  index: number,
  line: unknown,
) => {
  queryClient.setQueryData<Tour>(tourQueryKey(tourId), (current) => {
    if (!current) return current;
    const rows = [...((current[collection] as unknown[]) || [])];
    const previous = rows[index] as { id?: string } | undefined;
    rows[index] = { ...(line as object), id: (line as { id?: string }).id ?? previous?.id };
    return enrichTourWithSummary({ ...current, [collection]: rows });
  });
};

export const patchTourLineReviewInCache = (
  queryClient: QueryClient,
  tourId: string,
  targets: Array<{ lineType: LineType; lineId: string }>,
  value: { lineStatus: LineStatus; lineComment?: string },
) => {
  queryClient.setQueryData<Tour>(tourQueryKey(tourId), (current) => {
    if (!current) return current;
    const byType = new Map<LineType, Set<string>>();
    targets.forEach((target) => {
      const ids = byType.get(target.lineType) || new Set<string>();
      ids.add(target.lineId);
      byType.set(target.lineType, ids);
    });

    const patchCollection = (collection: TourCollectionKey, lineType: LineType) => {
      const ids = byType.get(lineType);
      if (!ids?.size) return current[collection];
      return (current[collection] as Array<{ id?: string }>).map((line) =>
        line.id && ids.has(line.id)
          ? { ...line, lineStatus: value.lineStatus, lineComment: value.lineComment }
          : line
      );
    };

    return {
      ...current,
      destinations: patchCollection('destinations', 'destination') as Tour['destinations'],
      expenses: patchCollection('expenses', 'expense') as Tour['expenses'],
      meals: patchCollection('meals', 'meal') as Tour['meals'],
      allowances: patchCollection('allowances', 'allowance') as Tour['allowances'],
      shoppings: patchCollection('shoppings', 'shopping') as Tour['shoppings'],
    };
  });
};
