import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  SETTLEMENT_ROLE_LABELS,
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  type UserProfile,
} from '@/types/user';

interface UserListViewsProps {
  users: UserProfile[];
  isLoading: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  currentUserId?: string;
  onEdit: (user: UserProfile) => void;
  onDelete: (user: UserProfile) => void;
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'editor':
      return 'default';
    default:
      return 'secondary';
  }
};

const getStatusBadgeVariant = (status: string) => status === 'active' ? 'default' : 'secondary';

function UserActions({
  user,
  currentUserId,
  canEditUsers,
  canDeleteUsers,
  onEdit,
  onDelete,
}: UserListViewsProps & { user: UserProfile }) {
  if (!canEditUsers && !canDeleteUsers) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEditUsers && (
          <DropdownMenuItem onClick={() => onEdit(user)}>
            <Pencil className="h-4 w-4 mr-2" />
            Chỉnh sửa
          </DropdownMenuItem>
        )}
        {canDeleteUsers && user.id !== currentUserId && (
          <DropdownMenuItem onClick={() => onDelete(user)} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Xóa
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserListViews(props: UserListViewsProps) {
  const { users, isLoading, canEditUsers, canDeleteUsers, currentUserId } = props;
  const canManageUserActions = canEditUsers || canDeleteUsers;
  const columnCount = canManageUserActions ? 7 : 6;

  return (
    <>
      <div className="hidden md:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Họ và tên</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Vai trò quyết toán</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              {canManageUserActions && <TableHead className="w-[70px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center py-8">Đang tải...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center py-8 text-muted-foreground">
                  Không tìm thấy người dùng
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.fullName || '—'}</TableCell>
                  <TableCell><Badge variant={getRoleBadgeVariant(user.role)}>{USER_ROLE_LABELS[user.role]}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{SETTLEMENT_ROLE_LABELS[user.settlementRole]}</Badge></TableCell>
                  <TableCell><Badge variant={getStatusBadgeVariant(user.status)}>{USER_STATUS_LABELS[user.status]}</Badge></TableCell>
                  <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}</TableCell>
                  {canManageUserActions && (
                    <TableCell>
                      <UserActions {...props} user={user} currentUserId={currentUserId} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Không tìm thấy người dùng</div>
        ) : (
          users.map((user) => (
            <Card key={user.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{user.email}</h3>
                  {user.fullName && <p className="text-sm text-muted-foreground">{user.fullName}</p>}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">{USER_ROLE_LABELS[user.role]}</Badge>
                    <Badge variant="outline" className="text-xs">{SETTLEMENT_ROLE_LABELS[user.settlementRole]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </p>
                </div>
                <UserActions {...props} user={user} currentUserId={currentUserId} />
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
