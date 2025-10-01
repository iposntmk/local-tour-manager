import { Badge } from '@/components/ui/badge';
import type { EntityStatus } from '@/types/master';

interface StatusBadgeProps {
  status: EntityStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant={status === 'active' ? 'default' : 'secondary'}>
      {status === 'active' ? 'Active' : 'Inactive'}
    </Badge>
  );
}
