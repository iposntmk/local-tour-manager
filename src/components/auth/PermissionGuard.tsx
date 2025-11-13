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
