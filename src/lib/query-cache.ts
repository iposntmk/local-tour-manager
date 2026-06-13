import type { QueryClient } from '@tanstack/react-query';

export const TOUR_LIST_STALE_TIME = 5 * 60 * 1000;
export const TOUR_LIST_GC_TIME = 30 * 60 * 1000;
export const TOUR_DETAIL_STALE_TIME = 5 * 60 * 1000;
export const TOUR_DETAIL_GC_TIME = 30 * 60 * 1000;
export const TOUR_IMAGE_STALE_TIME = 10 * 60 * 1000;
export const TOUR_IMAGE_GC_TIME = 30 * 60 * 1000;
export const TOUR_REFERENCE_STALE_TIME = 30 * 60 * 1000;
export const TOUR_REFERENCE_GC_TIME = 60 * 60 * 1000;
export const TOUR_GRAND_TOTAL_STALE_TIME = 5 * 60 * 1000;
export const TOUR_GRAND_TOTAL_GC_TIME = 60 * 60 * 1000;
export const TOUR_GRAND_TOTAL_QUERY_KEY = ['tours-grand-total'] as const;

type QueryRefetchType = 'active' | 'inactive' | 'all' | 'none';

export const invalidateTourAggregateCaches = (
  queryClient: QueryClient,
  refetchType: QueryRefetchType = 'active'
) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ['tours'], refetchType }),
    queryClient.invalidateQueries({ queryKey: TOUR_GRAND_TOTAL_QUERY_KEY, refetchType }),
    queryClient.invalidateQueries({ queryKey: ['statistics', 'tours'], refetchType }),
  ]);

export const upsertById = <T extends { id: string }>(items: T[] | undefined, nextItem: T): T[] => {
  if (!items) return [nextItem];
  const exists = items.some((item) => item.id === nextItem.id);
  return exists
    ? items.map((item) => (item.id === nextItem.id ? nextItem : item))
    : [...items, nextItem];
};
