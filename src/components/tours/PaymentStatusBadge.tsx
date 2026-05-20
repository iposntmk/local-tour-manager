import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PaymentStatus, PaymentMethod } from '@/types/tour';
import { PAYMENT_STATUS_LABELS, formatPaymentMethod } from '@/lib/payment-utils';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  method?: PaymentMethod | null;
  className?: string;
}

const STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  partial: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  paid: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
};

export function PaymentStatusBadge({ status, method, className }: PaymentStatusBadgeProps) {
  const label =
    status === 'paid' && method
      ? `${PAYMENT_STATUS_LABELS.paid} – ${formatPaymentMethod(method)}`
      : PAYMENT_STATUS_LABELS[status];
  return (
    <Badge className={cn(STATUS_STYLES[status], 'font-medium', className)} variant="secondary">
      {label}
    </Badge>
  );
}
