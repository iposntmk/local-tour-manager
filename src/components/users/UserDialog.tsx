import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { supabase } from '@/integrations/supabase/client';
import {
  UserProfile,
  UserProfileInput,
  UserRole,
  UserStatus,
  SettlementRole,
  Permission,
  getDefaultPermissionsForProfile,
  normalizePermissions,
  ALL_PERMISSIONS,
} from '@/types/user';
import { UserPermissionSection } from '@/components/users/UserPermissionSection';
import { UserGuideFields } from '@/components/users/UserGuideFields';
import { UserRoleFields } from '@/components/users/UserRoleFields';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { UserAccountFields } from '@/components/users/UserAccountFields';

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserProfile;
}

interface FormData {
  email: string;
  password?: string;
  fullName: string;
  phone: string;
  note: string;
  isDefaultGuide: boolean;
  languageIds: string[];
  role: UserRole;
  status: UserStatus;
  settlementRole: SettlementRole;
  permissions: Permission[];
}

const getFormPermissions = (data: Pick<FormData, 'role' | 'permissions'>) =>
  data.role === 'admin' ? ALL_PERMISSIONS : normalizePermissions(data.permissions);

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userProfile: currentUserProfile } = useAuth();
  const isEdit = !!user;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      phone: '',
      note: '',
      isDefaultGuide: false,
      languageIds: [],
      role: 'viewer',
      status: 'active',
      settlementRole: 'none',
      permissions: getDefaultPermissionsForProfile({ role: 'viewer', settlementRole: 'none' }),
    },
  });

  const role = watch('role');
  const status = watch('status');
  const settlementRole = watch('settlementRole');
  const permissions = watch('permissions') || [];
  const isDefaultGuide = watch('isDefaultGuide');
  const languageIds = watch('languageIds') || [];
  const isEditingSelf = !!user && user.id === currentUserProfile?.id;
  const protectedPermissions: Permission[] = isEditingSelf ? ['manage_users'] : [];

  const { data: languages = [] } = useQuery({
    queryKey: ['languages', 'active'],
    queryFn: () => store.listLanguages({ status: 'active' }),
  });

  const applyRolePreset = (nextRole = role, nextSettlementRole = settlementRole) => {
    setValue(
      'permissions',
      getDefaultPermissionsForProfile({ role: nextRole, settlementRole: nextSettlementRole }),
      { shouldDirty: true }
    );
  };

  useEffect(() => {
    if (user) {
      reset({
        email: user.email,
        password: undefined,
        fullName: user.fullName || '',
        phone: user.phone || '',
        note: user.note || '',
        isDefaultGuide: user.isDefaultGuide || false,
        languageIds: user.languageIds || [],
        role: user.role,
        status: user.status,
        settlementRole: user.settlementRole ?? 'none',
        permissions: user.permissions ?? getDefaultPermissionsForProfile({
          role: user.role,
          settlementRole: user.settlementRole ?? 'none',
        }),
      });
    } else {
      reset({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        note: '',
        isDefaultGuide: false,
        languageIds: [],
        role: 'viewer',
        status: 'active',
        settlementRole: 'none',
        permissions: getDefaultPermissionsForProfile({ role: 'viewer', settlementRole: 'none' }),
      });
    }
  }, [user, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Tạo tài khoản đăng nhập qua Edge Function (Admin API): không làm mất
      // session admin và không cần xác nhận email.
      const userId = await store.createAuthUser({
        email: data.email,
        password: data.password!,
        fullName: data.fullName,
      });

      // Hồ sơ được trigger tạo sẵn khi insert auth.users; cập nhật chi tiết.
      const profileInput: UserProfileInput = {
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        note: data.note,
        isDefaultGuide: data.settlementRole === 'guide' && data.isDefaultGuide,
        languageIds: data.settlementRole === 'guide' ? data.languageIds : [],
        role: data.role,
        status: data.status,
        settlementRole: data.settlementRole,
        permissions: getFormPermissions(data),
      };

      await store.updateUserProfile(userId, profileInput);

      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['guide-users'] });
      toast({
        title: 'Thành công',
        description: 'Đã tạo người dùng mới',
      });
      onOpenChange(false);
      reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Lỗi',
        description: `Không thể tạo người dùng: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!user) return;

      const profileInput: Partial<UserProfileInput> = {
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        note: data.note,
        isDefaultGuide: data.settlementRole === 'guide' && data.isDefaultGuide,
        languageIds: data.settlementRole === 'guide' ? data.languageIds : [],
        role: data.role,
        status: data.status,
        settlementRole: data.settlementRole,
        permissions: getFormPermissions(data),
      };

      await store.updateUserProfile(user.id, profileInput);

      // Update email in auth if changed
      if (data.email !== user.email) {
        const { error } = await supabase.auth.updateUser({
          email: data.email,
        });
        if (error) throw error;
      }

      // Update password if provided
      // Note: Password updates can only be done by the user themselves
      // or through Supabase Admin API (which requires service_role key)
      // For now, we skip password updates in edit mode
      if (data.password && data.password.trim()) {
        toast({
          title: 'Lưu ý',
          description: 'Cập nhật mật khẩu chỉ có thể thực hiện thông qua email reset. Thông tin khác đã được cập nhật.',
          variant: 'default',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['guide-users'] });
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật thông tin người dùng',
      });
      onOpenChange(false);
      reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Lỗi',
        description: `Không thể cập nhật người dùng: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    if (isEditingSelf && !getFormPermissions(data).includes('manage_users')) {
      toast({
        title: 'Không thể lưu',
        description: 'Bạn không thể tự gỡ quyền quản lý người dùng khỏi tài khoản đang đăng nhập.',
        variant: 'destructive',
      });
      return;
    }

    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      if (!data.password || data.password.length < 6) {
        toast({
          title: 'Lỗi',
          description: 'Mật khẩu phải có ít nhất 6 ký tự',
          variant: 'destructive',
        });
        return;
      }
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Cập nhật thông tin người dùng'
              : 'Điền thông tin để tạo tài khoản người dùng mới'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <UserAccountFields isEdit={isEdit} register={register} errors={errors} />

          <UserRoleFields
            role={role}
            status={status}
            settlementRole={settlementRole}
            onRoleChange={(value) => {
              setValue('role', value);
              applyRolePreset(value, settlementRole);
            }}
            onStatusChange={(value) => setValue('status', value)}
            onSettlementRoleChange={(value) => {
              setValue('settlementRole', value);
              if (value !== 'guide') {
                setValue('isDefaultGuide', false);
                setValue('languageIds', []);
              }
              applyRolePreset(role, value);
            }}
          />

          <UserGuideFields
            settlementRole={settlementRole}
            register={register}
            isDefaultGuide={isDefaultGuide}
            languageIds={languageIds}
            languages={languages}
            onDefaultGuideChange={(value) => setValue('isDefaultGuide', value, { shouldDirty: true })}
            onLanguageIdsChange={(value) => setValue('languageIds', value, { shouldDirty: true })}
          />

          <UserPermissionSection
            role={role}
            permissions={permissions}
            protectedPermissions={protectedPermissions}
            onApplyRolePreset={() => applyRolePreset()}
            onChange={(nextPermissions) => setValue('permissions', nextPermissions, { shouldDirty: true })}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
