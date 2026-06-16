import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PermissionTree } from '@/components/users/PermissionTree';
import { ALL_PERMISSIONS, Permission, UserRole } from '@/types/user';

interface UserPermissionSectionProps {
  role: UserRole;
  permissions: Permission[];
  protectedPermissions: Permission[];
  onApplyRolePreset: () => void;
  onChange: (permissions: Permission[]) => void;
}

export function UserPermissionSection({
  role,
  permissions,
  protectedPermissions,
  onApplyRolePreset,
  onChange,
}: UserPermissionSectionProps) {
  const isAdminRole = role === 'admin';
  const displayedPermissions = isAdminRole ? ALL_PERMISSIONS : permissions;
  const disabledPermissions = isAdminRole ? ALL_PERMISSIONS : protectedPermissions;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label>Phân quyền tính năng</Label>
          <p className="text-xs text-muted-foreground">
            {isAdminRole
              ? 'Admin mặc định có toàn bộ quyền; hệ thống không lưu cấu hình quyền thủ công cho vai trò này.'
              : 'Tick theo từng nhóm chức năng; nhóm cha sẽ chọn hoặc bỏ chọn toàn bộ quyền con.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onApplyRolePreset} disabled={isAdminRole} className="text-xs h-8 px-2 sm:text-sm sm:h-9 sm:px-3">
            Theo vai trò
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(ALL_PERMISSIONS)}
            disabled={isAdminRole}
            className="text-xs h-8 px-2 sm:text-sm sm:h-9 sm:px-3"
          >
            Chọn tất cả
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(protectedPermissions)}
            disabled={isAdminRole}
            className="text-xs h-8 px-2 sm:text-sm sm:h-9 sm:px-3"
          >
            Bỏ chọn
          </Button>
        </div>
      </div>
      <PermissionTree
        value={displayedPermissions}
        onChange={onChange}
        disabledPermissions={disabledPermissions}
      />
    </div>
  );
}
