import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/types/user';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: Permission | Permission[];
  requireAdmin?: boolean;
  requireAny?: boolean; // If true, only one of the permissions is required
  fallback?: ReactNode;
}

export function PermissionGuard({
  children,
  permission,
  requireAdmin,
  requireAny = false,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } = useAuth();

  // Admin check
  if (requireAdmin && !isAdmin) {
    return <>{fallback}</>;
  }

  // Permission check
  if (permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];

    const allowed = requireAny
      ? hasAnyPermission(permissions)
      : hasAllPermissions(permissions);

    if (!allowed) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

// Convenient variants
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard requireAdmin fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function CanEdit({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard
      permission={['edit_tours', 'edit_master_data']}
      requireAny
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

export function CanCreate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard
      permission="create_tours"
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

export function CanDelete({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard
      permission={['delete_tours', 'delete_master_data']}
      requireAny
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

export function CanSubmitSettlement({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="submit_settlement" fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function CanReviewSettlement({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="review_settlement_line" fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function CanApproveSettlement({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="approve_settlement" fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function CanReopenSettlement({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="reopen_settlement" fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function CanMarkPayment({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="mark_tour_paid" fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}
