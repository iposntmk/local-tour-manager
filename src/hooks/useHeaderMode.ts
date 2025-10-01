import { useEffect, useMemo, useState } from 'react';

export type HeaderMode = 'pin' | 'dock' | 'freeze';

export function useHeaderMode(storageKey: string, defaultMode: HeaderMode = 'pin') {
  const [mode, setMode] = useState<HeaderMode>(() => {
    try {
      const saved = localStorage.getItem(storageKey) as HeaderMode | null;
      if (saved === 'pin' || saved === 'dock' || saved === 'freeze') return saved;
    } catch {}
    return defaultMode;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, mode);
    } catch {}
  }, [mode, storageKey]);

  const classes = useMemo(() => {
    const base = 'z-10';
    if (mode === 'pin') {
      return `sticky top-0 ${base} bg-background pb-4 space-y-4`;
    }
    if (mode === 'dock') {
      // Keep above bottom nav; bottom-16 (~64px) to clear fixed bottom nav
      return `sticky bottom-16 ${base} bg-background pt-2 pb-2 space-y-3`;
    }
    // freeze
    return `sticky top-0 ${base} bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 space-y-4`;
  }, [mode]);

  return { mode, setMode, classes } as const;
}

