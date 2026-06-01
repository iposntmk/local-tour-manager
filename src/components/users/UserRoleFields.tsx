import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SETTLEMENT_ROLE_LABELS,
  SettlementRole,
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  UserRole,
  UserStatus,
} from '@/types/user';

interface UserRoleFieldsProps {
  role: UserRole;
  status: UserStatus;
  settlementRole: SettlementRole;
  onRoleChange: (role: UserRole) => void;
  onStatusChange: (status: UserStatus) => void;
  onSettlementRoleChange: (role: SettlementRole) => void;
}

export function UserRoleFields({
  role,
  status,
  settlementRole,
  onRoleChange,
  onStatusChange,
  onSettlementRoleChange,
}: UserRoleFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="role">
          Vai trò <span className="text-destructive">*</span>
        </Label>
        <Select value={role} onValueChange={(value: UserRole) => onRoleChange(value)}>
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">{USER_ROLE_LABELS.admin}</SelectItem>
            <SelectItem value="editor">{USER_ROLE_LABELS.editor}</SelectItem>
            <SelectItem value="viewer">{USER_ROLE_LABELS.viewer}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {role === 'admin' && 'Toàn quyền quản trị hệ thống'}
          {role === 'editor' && 'Có thể tạo và chỉnh sửa tours và dữ liệu'}
          {role === 'viewer' && 'Chỉ xem, không thể chỉnh sửa'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">
          Trạng thái <span className="text-destructive">*</span>
        </Label>
        <Select value={status} onValueChange={(value: UserStatus) => onStatusChange(value)}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{USER_STATUS_LABELS.active}</SelectItem>
            <SelectItem value="inactive">{USER_STATUS_LABELS.inactive}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="settlementRole">Vai trò quyết toán</Label>
        <Select
          value={settlementRole}
          onValueChange={(value: SettlementRole) => onSettlementRoleChange(value)}
        >
          <SelectTrigger id="settlementRole">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{SETTLEMENT_ROLE_LABELS.none}</SelectItem>
            <SelectItem value="guide">{SETTLEMENT_ROLE_LABELS.guide}</SelectItem>
            <SelectItem value="accountant">{SETTLEMENT_ROLE_LABELS.accountant}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {settlementRole === 'none' && 'Không tham gia luồng quyết toán tour.'}
          {settlementRole === 'guide' && 'HDV: nhập và gửi quyết toán cho kế toán kiểm tra.'}
          {settlementRole === 'accountant' && 'Kế toán: review từng dòng chi phí và duyệt quyết toán.'}
        </p>
      </div>
    </>
  );
}
