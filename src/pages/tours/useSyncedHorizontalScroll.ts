import { useCallback, useEffect, useRef, useState } from 'react';

type ScrollSource = 'top' | 'table';

export function useSyncedHorizontalScroll(contentMinWidth: number) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableViewportRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const syncingRef = useRef(false);
  const [scrollContentWidth, setScrollContentWidth] = useState(contentMinWidth);

  const getElements = useCallback((source: ScrollSource) => {
    const topElement = topScrollRef.current;
    const tableElement = tableViewportRef.current;

    return {
      sourceElement: source === 'top' ? topElement : tableElement,
      targetElement: source === 'top' ? tableElement : topElement,
      topElement,
      tableElement,
    };
  }, []);

  const updateScrollContentWidth = useCallback(() => {
    const measuredWidth = tableRef.current?.scrollWidth ?? tableViewportRef.current?.scrollWidth ?? contentMinWidth;
    const nextWidth = Math.max(contentMinWidth, Math.ceil(measuredWidth));

    setScrollContentWidth((current) => (current === nextWidth ? current : nextWidth));

    const topElement = topScrollRef.current;
    const tableElement = tableViewportRef.current;
    if (topElement && tableElement && Math.abs(topElement.scrollLeft - tableElement.scrollLeft) >= 1) {
      topElement.scrollLeft = tableElement.scrollLeft;
    }
  }, [contentMinWidth]);

  useEffect(() => {
    updateScrollContentWidth();

    if (typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(updateScrollContentWidth);
    if (tableRef.current) observer.observe(tableRef.current);
    if (tableViewportRef.current) observer.observe(tableViewportRef.current);

    return () => observer.disconnect();
  }, [updateScrollContentWidth]);

  const syncScroll = useCallback((source: ScrollSource) => {
    if (syncingRef.current) return;

    const { sourceElement, targetElement } = getElements(source);
    if (!sourceElement || !targetElement) return;

    const sourceScroll = sourceElement.scrollLeft;
    if (Math.abs(targetElement.scrollLeft - sourceScroll) < 1) return;

    syncingRef.current = true;
    targetElement.scrollLeft = sourceScroll;

    window.setTimeout(() => {
      syncingRef.current = false;
    }, 10);
  }, [getElements]);

  const scrollHorizontally = useCallback((delta: number) => {
    const { topElement, tableElement } = getElements('top');
    const sourceElement = tableElement ?? topElement;
    if (!sourceElement) return;

    syncingRef.current = true;
    const maxScroll = Math.max(0, sourceElement.scrollWidth - sourceElement.clientWidth);
    const nextScrollLeft = Math.max(0, Math.min(maxScroll, sourceElement.scrollLeft + delta));

    if (topElement) topElement.scrollLeft = nextScrollLeft;
    if (tableElement) tableElement.scrollLeft = nextScrollLeft;

    window.setTimeout(() => {
      syncingRef.current = false;
    }, 10);
  }, [getElements]);

  return {
    topScrollRef,
    tableViewportRef,
    tableRef,
    scrollContentWidth,
    syncScroll,
    scrollHorizontally,
  };
}
