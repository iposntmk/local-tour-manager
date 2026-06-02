import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { store } from '@/lib/datastore';
import { SETTLEMENT_ROLE_LABELS, UserProfile, type SettlementRole } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserDialog } from '@/components/users/UserDialog';
import { UserListViews } from '@/components/users/UserListViews';
import { Plus, Search, Users as UsersIcon, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type StatusTab = 'all' | 'active' | 'inactive';
type SettlementRoleTab = 'all' | SettlementRole;

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [settlementRoleTab, setSettlementRoleTab] = useState<SettlementRoleTab>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { userProfile: currentUserProfile, hasPermission } = useAuth();
  const canCreateUsers = hasPermission('create_users');
  const canEditUsers = hasPermission('edit_users');
  const canDeleteUsers = hasPermission('delete_users');
  const { classes: headerClasses } = useHeaderMode('users.headerMode');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['user-profiles', searchTerm, statusTab, settlementRoleTab],
    queryFn: () =>
      store.listUserProfiles({
        search: searchTerm || undefined,
        status: statusTab === 'all' ? 'all' : statusTab,
        settlementRole: settlementRoleTab,
      }),
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['user-profiles-pending-count'],
    queryFn: async () => {
      const list = await store.listUserProfiles({ status: 'inactive' });
      return list.length;
    },
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteUserProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profiles'] });
      toast({
        title: 'Thành công',
        description: 'Đã xóa người dùng',
      });
      setDeleteDialogOpen(false);
      setUserToDelete(undefined);
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: `Không thể xóa người dùng: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDelete = (user: UserProfile) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  const handleCreate = () => {
    setSelectedUser(undefined);
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className={headerClasses}>
      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay về trang chủ
        </Button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Quản lý người dùng</h1>
          </div>
          {canCreateUsers && (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm người dùng
            </Button>
          )}
        </div>

        {/* Search + status tabs */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 max-w-md flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo email hoặc tên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
            <TabsList>
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="active">Đang hoạt động</TabsTrigger>
              <TabsTrigger value="inactive" className="relative">
                Chờ duyệt
                {pendingCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Tabs value={settlementRoleTab} onValueChange={(v) => setSettlementRoleTab(v as SettlementRoleTab)}>
          <TabsList>
            <TabsTrigger value="all">Tất cả vai trò</TabsTrigger>
            <TabsTrigger value="guide">{SETTLEMENT_ROLE_LABELS.guide}</TabsTrigger>
            <TabsTrigger value="accountant">{SETTLEMENT_ROLE_LABELS.accountant}</TabsTrigger>
            <TabsTrigger value="none">{SETTLEMENT_ROLE_LABELS.none}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      </div>

      <UserListViews
        users={users}
        isLoading={isLoading}
        canEditUsers={canEditUsers}
        canDeleteUsers={canDeleteUsers}
        currentUserId={currentUserProfile?.id}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Dialogs */}
      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa người dùng{' '}
              <strong>{userToDelete?.email}</strong>? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
