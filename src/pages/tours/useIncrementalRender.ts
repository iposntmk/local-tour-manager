import { useEffect, useRef, useState } from 'react';

/**
 * Render a list incrementally: show `initial` items first, then reveal `step` more
 * each time a sentinel element scrolls into view. Used for mobile tour cards so the
 * first paint only mounts 2 cards while the full (already-fetched) list stays available
 * for totals/filtering. Resets whenever the source list changes.
 */
export function useIncrementalRender<T>(items: T[], initial = 2, step = 6) {
  const [count, setCount] = useState(initial);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCount(initial);
  }, [items, initial]);

  const hasMore = count < items.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCount((current) => Math.min(current + step, items.length));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, items.length, step]);

  return { visible: items.slice(0, count), sentinelRef, hasMore };
}
