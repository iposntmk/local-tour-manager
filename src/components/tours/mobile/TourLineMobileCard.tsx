import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MOBILE_CARD_FLAGGED, MOBILE_CARD_NAME_FLAGGED,
} from '@/lib/tab-styles';
import { cn } from '@/lib/utils';
import { TourRowIcon } from '@/components/tours/TourRowIcon';

export interface TourLineMobileAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

interface Props {
  kind: 'destination' | 'expense' | 'meal' | 'allowance' | 'shopping';
  name: ReactNode;
  flagged?: boolean;
  amount: ReactNode;
  meta: ReactNode;
  actions?: TourLineMobileAction[];
}

export function TourLineMobileCard({ kind, name, flagged, amount, meta, actions }: Props) {
  return (
    <div className={cn('rounded-md border bg-card px-1.5 py-1 sm:px-2.5 sm:py-1.5', flagged && MOBILE_CARD_FLAGGED)}>
      <div className="flex items-center gap-1 min-w-0 sm:gap-1.5">
        <TourRowIcon kind={kind} label={typeof name === 'string' ? name : ''} className="shrink-0 h-3 w-3 sm:h-3.5 sm:w-3.5" />
        <span className={cn('flex-1 min-w-0 truncate text-xs font-medium leading-snug sm:text-sm', flagged && MOBILE_CARD_NAME_FLAGGED)}>
          {name}
        </span>
        {flagged && <span className="shrink-0 text-destructive text-xs sm:text-sm">⚑</span>}
        <span className="shrink-0 text-sm font-bold tabular-nums sm:text-base">{amount}</span>
        {actions && actions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 shrink-0 sm:h-5 sm:w-5">
                <MoreHorizontal className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  onClick={action.onClick}
                  className={action.destructive ? 'text-destructive' : undefined}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="mt-px flex items-center gap-0.5 text-xs text-muted-foreground whitespace-nowrap overflow-hidden sm:mt-0.5 sm:gap-1 sm:text-sm">
        {meta}
      </div>
    </div>
  );
}
