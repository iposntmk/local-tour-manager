import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  /** Tên dòng (hàng 1, bên trái). */
  name: ReactNode;
  /** Cảnh báo: giá 0 / trùng tên → nền đỏ + cờ ⚑. */
  flagged?: boolean;
  /** Thành tiền (hàng 1, bên phải). */
  amount: ReactNode;
  /** Dòng chi tiết gọn 1 hàng (hàng 2): ngày · giá × SL … */
  meta: ReactNode;
  actions?: TourLineMobileAction[];
}

/**
 * Card 2 hàng dùng chung cho các tab tour detail trên mobile,
 * theo chuẩn tab gộp DV & CTP (CombinedTabMobile):
 *  - Hàng 1: icon + tên (truncate) + thành tiền + menu thao tác
 *  - Hàng 2: 1 dòng chi tiết gọn (ngày · giá × SL …)
 */
export function TourLineMobileCard({ kind, name, flagged, amount, meta, actions }: Props) {
  return (
    <div className={cn('rounded-md border px-2.5 py-1.5', flagged ? 'border-red-300 bg-red-50 dark:bg-red-950' : 'bg-card')}>
      {/* Hàng 1: tên + thành tiền */}
      <div className="flex items-center gap-1.5 min-w-0">
        <TourRowIcon kind={kind} label={typeof name === 'string' ? name : ''} className="shrink-0" />
        <span className={cn('flex-1 min-w-0 truncate text-xs font-medium leading-snug', flagged && 'text-red-600')}>
          {name}
        </span>
        {flagged && <span className="shrink-0 text-destructive text-xs">⚑</span>}
        <span className="shrink-0 text-xs font-bold tabular-nums">{amount}</span>
        {actions && actions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
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
      {/* Hàng 2: chi tiết gọn — 1 dòng duy nhất (cứng tối đa 2 dòng/card) */}
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground whitespace-nowrap overflow-hidden">
        {meta}
      </div>
    </div>
  );
}
