import { useAuth } from '@/contexts/AuthContext';
import { Clock } from 'lucide-react';
import { AccountBlockedCard } from './AccountBlockedCard';

export function InactiveUserBanner() {
  const { user, userProfile } = useAuth();

  if (!userProfile || userProfile.status !== 'inactive') return null;

  return (
    <AccountBlockedCard
      icon={<Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />}
      title="Tài khoản chưa được duyệt"
      description="Quản trị viên cần duyệt tài khoản trước khi bạn có thể sử dụng app."
      email={user?.email || userProfile.email}
      body={
        <p className="text-sm text-muted-foreground">
          Vui lòng liên hệ quản trị viên để được kích hoạt tài khoản, hoặc đăng xuất và đăng nhập bằng tài khoản khác.
        </p>
      }
    />
  );
}
