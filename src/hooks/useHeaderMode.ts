import { useEffect, useMemo, useState } from 'react';

export type HeaderMode = 'pin' | 'dock' | 'freeze';

export function useHeaderMode(storageKey: string, defaultMode: HeaderMode = 'pin', alwaysPin: boolean = true) {
  const [mode, setMode] = useState<HeaderMode>(() => {
    // If alwaysPin is true, always use 'pin' mode
    if (alwaysPin) return 'pin';
    
    try {
      const saved = localStorage.getItem(storageKey) as HeaderMode | null;
      if (saved === 'pin' || saved === 'dock' || saved === 'freeze') return saved;
    } catch {}
    return defaultMode;
  });

  useEffect(() => {
    // Don't save to localStorage if alwaysPin is true
    if (alwaysPin) return;
    
    try {
      localStorage.setItem(storageKey, mode);
    } catch {}
  }, [mode, storageKey, alwaysPin]);

  const classes = useMemo(() => {
    const base = 'z-10';
    const currentMode = alwaysPin ? 'pin' : mode;

    // On mobile there is no top nav, so use top-0.
    // On md+ screens, offset below the sticky top nav (~64px).
    if (currentMode === 'pin') {
      return `sticky top-0 md:top-16 ${base} bg-background pb-4 space-y-4`;
    }
    if (currentMode === 'dock') {
      // Keep above bottom nav on mobile; remove offset on md+ where no bottom nav exists
      return `sticky bottom-16 md:bottom-auto ${base} bg-background pt-2 pb-2 space-y-3`;
    }
    // freeze below top nav with translucency
    return `sticky top-0 md:top-16 ${base} bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 space-y-4`;
  }, [mode, alwaysPin]);

  return { mode: alwaysPin ? 'pin' : mode, setMode, classes } as const;
}
