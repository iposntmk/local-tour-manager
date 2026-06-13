import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SettlementStatus } from '@/types/tour';
import { SETTLEMENT_STATUS_LABELS } from '@/lib/settlement-utils';

interface SettlementStatusBadgeProps {
  status: SettlementStatus;
  className?: string;
}

const STATUS_STYLES: Record<SettlementStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 hover:bg-gray-100 border border-gray-400',
  submitted: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-400',
  need_changes: 'bg-orange-100 text-orange-800 hover:bg-orange-100 border border-orange-500',
  approved: 'bg-green-100 text-green-800 hover:bg-green-100 border border-green-500',
  closed: 'bg-slate-200 text-slate-800 hover:bg-slate-200 border border-slate-500',
};

export function SettlementStatusBadge({ status, className }: SettlementStatusBadgeProps) {
  return (
    <Badge className={cn(STATUS_STYLES[status], 'font-medium', className)} variant="secondary">
      {SETTLEMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
