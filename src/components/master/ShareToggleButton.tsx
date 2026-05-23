import { Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ShareToggleButtonProps {
  isShared: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

export function ShareToggleButton({ isShared, onToggle, disabled, className }: ShareToggleButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          disabled={disabled}
          className={cn('h-8 w-8 p-0', isShared ? 'text-blue-600' : 'text-muted-foreground', className)}
        >
          {isShared ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isShared ? 'Đang chia sẻ — nhấn để đặt riêng tư' : 'Riêng tư — nhấn để chia sẻ'}
      </TooltipContent>
    </Tooltip>
  );
}

interface SharedBadgeProps {
  isShared: boolean;
  className?: string;
}

export function SharedBadge({ isShared, className }: SharedBadgeProps) {
  if (!isShared) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200', className)}>
      <Globe className="h-3 w-3" />
      Đã chia sẻ
    </span>
  );
}
