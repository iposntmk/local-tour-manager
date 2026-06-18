import { useEffect, useMemo, useState } from 'react';

export const TOUR_PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
export const DEFAULT_TOUR_PAGE_SIZE = 100;

/**
 * Pure client-side paginator over an already-fetched, fully-filtered tour list.
 * The whole result set is loaded once (see Tours.tsx), so totals/filters are
 * accurate across the entire DB; this only slices the desktop table for a lighter DOM.
 * Resets to page 0 whenever the underlying list identity changes.
 */
export function useTourPagination<T>(items: T[]) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSizeValue] = useState(DEFAULT_TOUR_PAGE_SIZE);

  useEffect(() => {
    setPageIndex(0);
  }, [items]);

  const pagedItems = useMemo(
    () => items.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [items, pageIndex, pageSize]
  );

  const setPageSize = (nextPageSize: number) => {
    setPageSizeValue(nextPageSize);
    setPageIndex(0);
  };

  return { pageIndex, pageSize, pagedItems, setPageIndex, setPageSize };
}
