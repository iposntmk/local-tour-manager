// Chrome/Android fires this before offering "Add to Home screen"; not in lib.dom.
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const INSTALL_DISMISS_KEY = 'pwa-install-dismissed-until';
export const INSTALL_DISMISS_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isStandalone(): boolean {
  const displayModeStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayModeStandalone || iosStandalone;
}

// iOS never fires beforeinstallprompt, and only Safari can add to the home screen.
export function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isOtherBrowser = /crios|fxios|edgios|opios/i.test(ua);
  return isIos && !isOtherBrowser;
}

export function isInstallDismissed(now = Date.now()): boolean {
  try {
    return Number(localStorage.getItem(INSTALL_DISMISS_KEY) ?? 0) > now;
  } catch {
    return false;
  }
}

export function rememberInstallDismissed(now = Date.now()): void {
  try {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(now + INSTALL_DISMISS_DAYS * DAY_MS));
  } catch {
    // Storage unavailable (private mode): the banner simply reappears next visit.
  }
}
