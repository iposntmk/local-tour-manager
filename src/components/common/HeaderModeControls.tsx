import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dock, Pin, Snowflake } from 'lucide-react';
import type { HeaderMode } from '@/hooks/useHeaderMode';

interface HeaderModeControlsProps {
  mode: HeaderMode;
  onChange: (mode: HeaderMode) => void;
  className?: string;
}

export function HeaderModeControls({ mode, onChange, className }: HeaderModeControlsProps) {
  return (
    <div className={cn('flex items-center gap-1 rounded-md border bg-card p-1', className)}>
      <Button
        variant="ghost"
        size="icon"
        title="Pin header to top"
        aria-pressed={mode === 'pin'}
        className={cn('h-8 w-8 p-0', mode === 'pin' && 'text-primary')}
        onClick={() => onChange('pin')}
      >
        <Pin className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Dock header near bottom"
        aria-pressed={mode === 'dock'}
        className={cn('h-8 w-8 p-0', mode === 'dock' && 'text-primary')}
        onClick={() => onChange('dock')}
      >
        <Dock className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Freeze header with blur"
        aria-pressed={mode === 'freeze'}
        className={cn('h-8 w-8 p-0', mode === 'freeze' && 'text-primary')}
        onClick={() => onChange('freeze')}
      >
        <Snowflake className="h-4 w-4" />
      </Button>
    </div>
  );
}

