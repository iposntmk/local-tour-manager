import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SettlementStatus } from '@/types/tour';
import { SETTLEMENT_STATUS_LABELS } from '@/lib/settlement-utils';

interface SettlementStatusBadgeProps {
  status: SettlementStatus;
  className?: string;
}

const STATUS_STYLES: Record<SettlementStatus, string> = {
  draft: 'bg-gray-200 text-gray-800 hover:bg-gray-200',
  submitted: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  need_changes: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  approved: 'bg-green-100 text-green-800 hover:bg-green-100',
  closed: 'bg-slate-200 text-slate-800 hover:bg-slate-200',
};

export function SettlementStatusBadge({ status, className }: SettlementStatusBadgeProps) {
  return (
    <Badge className={cn(STATUS_STYLES[status], 'font-medium', className)} variant="secondary">
      {SETTLEMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
