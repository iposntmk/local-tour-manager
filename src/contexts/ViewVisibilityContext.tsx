import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface VisibilityState {
  showTopMenu: boolean;
  showHeaderInfo: boolean;
  showTabs: boolean;
}

interface VisibilityContextType extends VisibilityState {
  toggleTopMenu: () => void;
  toggleHeaderInfo: () => void;
  toggleTabs: () => void;
}

const STORAGE_KEY = 'ltm_view_visibility';
const DEFAULT_VISIBILITY: VisibilityState = { showTopMenu: true, showHeaderInfo: true, showTabs: true };

function loadState(): VisibilityState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        showTopMenu: parsed.showTopMenu !== false,
        showHeaderInfo: parsed.showHeaderInfo !== false,
        showTabs: parsed.showTabs !== false,
      };
    }
  } catch {
    return DEFAULT_VISIBILITY;
  }
  return DEFAULT_VISIBILITY;
}

const VisibilityContext = createContext<VisibilityContextType | null>(null);

export function ViewVisibilityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VisibilityState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const toggleTopMenu = useCallback(() => setState(prev => ({ ...prev, showTopMenu: !prev.showTopMenu })), []);
  const toggleHeaderInfo = useCallback(() => setState(prev => ({ ...prev, showHeaderInfo: !prev.showHeaderInfo })), []);
  const toggleTabs = useCallback(() => setState(prev => ({ ...prev, showTabs: !prev.showTabs })), []);

  return (
    <VisibilityContext.Provider value={{ ...state, toggleTopMenu, toggleHeaderInfo, toggleTabs }}>
      {children}
    </VisibilityContext.Provider>
  );
}

export function useViewVisibility() {
  const ctx = useContext(VisibilityContext);
  if (!ctx) throw new Error('useViewVisibility must be used within ViewVisibilityProvider');
  return ctx;
}
