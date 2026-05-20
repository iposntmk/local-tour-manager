import { toast } from 'sonner';

export interface OwnedEntity {
  createdBy?: string;
}

export interface OwnershipCheck {
  allowed: boolean;
  reason?: string;
}

export function canModifyOwnedEntity(
  entity: OwnedEntity,
  currentUserId: string | undefined,
  isAdmin: boolean
): OwnershipCheck {
  if (isAdmin) return { allowed: true };
  if (!currentUserId) {
    return { allowed: false, reason: 'Bạn cần đăng nhập để thao tác.' };
  }
  if (!entity.createdBy || entity.createdBy !== currentUserId) {
    return {
      allowed: false,
      reason: 'Mục này không phải do bạn tạo. Chỉ quản trị viên hoặc người tạo mới có thể sửa/xoá.',
    };
  }
  return { allowed: true };
}

// Convenience wrapper: returns true if allowed, otherwise shows a toast and returns false.
export function ensureCanModifyOwnedEntity(
  entity: OwnedEntity,
  currentUserId: string | undefined,
  isAdmin: boolean
): boolean {
  const result = canModifyOwnedEntity(entity, currentUserId, isAdmin);
  if (!result.allowed) {
    toast.error(result.reason ?? 'Không có quyền thao tác.');
  }
  return result.allowed;
}
