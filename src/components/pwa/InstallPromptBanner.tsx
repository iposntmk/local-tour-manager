import { Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { t } from '@/lib/i18n';

const APP_ICON_URL = `${import.meta.env.BASE_URL}icons/icon.svg`;

export function InstallPromptBanner() {
  const { mode, promptInstall, dismiss } = useInstallPrompt();

  if (!mode) return null;

  return (
    <div
      role="dialog"
      aria-label={t('pwa.installTitle')}
      className="fixed inset-x-2 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-card p-3 shadow-lg md:inset-x-auto md:bottom-4 md:right-4"
    >
      <img src={APP_ICON_URL} alt="" className="h-11 w-11 flex-shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{t('pwa.installTitle')}</div>
        {mode === 'ios' ? (
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <span>{t('pwa.iosStepShare')}</span>
            <Share className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('pwa.iosStepAdd')}</span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">{t('pwa.installDescription')}</div>
        )}
      </div>
      {mode === 'native' && (
        <Button size="sm" className="h-10 flex-shrink-0" onClick={promptInstall}>
          {t('pwa.install')}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 flex-shrink-0"
        onClick={dismiss}
        aria-label={t('pwa.later')}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
