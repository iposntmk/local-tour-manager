import { useEffect, useRef } from 'react';

interface SwipeOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  /** Minimum horizontal distance (px) to register a swipe. Default 50. */
  threshold?: number;
  /** Disable when true (e.g. when a sub-scroll container is active). */
  disabled?: boolean;
  /**
   * Stop touch events from bubbling to an outer swipe handler. Use on a
   * nested swipe region so its gestures don't also trigger a parent's
   * swipe navigation (e.g. card sub-tabs vs. top-level tabs).
   */
  stopPropagation?: boolean;
}

/**
 * Detect horizontal swipe gestures on a referenced element.
 *
 * Strategy: only fires when the touch path is clearly horizontal
 * (|dx| > |dy|) and crosses the threshold. Diagonal and vertical
 * swipes are passed through so the inner scroll container still
 * scrolls naturally. Safe to attach to a stable parent because
 * `touchstart` is what matters, not the final target.
 */
export function useSwipeNavigation<T extends HTMLElement>({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  disabled = false,
  stopPropagation = false,
}: SwipeOptions) {
  const ref = useRef<T>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (stopPropagation) e.stopPropagation();
      const t = e.touches[0];
      startX.current = t.clientX;
      startY.current = t.clientY;
      isHorizontal.current = null;
      cancelled.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (stopPropagation) e.stopPropagation();
      if (cancelled.current) return;
      const t = e.touches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;
      if (isHorizontal.current === null) {
        // Decide direction on first significant movement.
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          isHorizontal.current = Math.abs(dx) > Math.abs(dy);
        }
      }
      // If the gesture turned vertical, mark as cancelled so we
      // never fire a swipe after a scroll has started.
      if (isHorizontal.current === false) cancelled.current = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (stopPropagation) e.stopPropagation();
      if (cancelled.current) return;
      if (!isHorizontal.current) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      if (Math.abs(dx) >= threshold) {
        if (dx < 0) onSwipeLeft();
        else onSwipeRight();
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, threshold, disabled, stopPropagation]);

  return ref;
}
