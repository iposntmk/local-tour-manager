import { useCallback, useEffect, useState } from 'react';
import {
  isInstallDismissed,
  isIosSafari,
  isStandalone,
  rememberInstallDismissed,
  type BeforeInstallPromptEvent,
} from '@/lib/pwa-install';

// 'native': the browser can show its install dialog. 'ios': manual steps only.
export type InstallPromptMode = 'native' | 'ios' | null;

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => isStandalone() || isInstallDismissed());

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      // Keep the event so the install dialog opens from our own button.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setHidden(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // The event is single-use; a declined dialog counts as "later".
    if (outcome === 'dismissed') rememberInstallDismissed();
    setDeferredPrompt(null);
    setHidden(true);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    rememberInstallDismissed();
    setHidden(true);
  }, []);

  let mode: InstallPromptMode = null;
  if (!hidden) {
    if (deferredPrompt) mode = 'native';
    else if (isIosSafari()) mode = 'ios';
  }

  return { mode, promptInstall, dismiss };
}
