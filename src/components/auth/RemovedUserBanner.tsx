import { useAuth } from '@/contexts/AuthContext';
import { ShieldX } from 'lucide-react';
import { MASTER_ADMIN_EMAIL } from '@/lib/auth-constants';
import { AccountBlockedCard } from './AccountBlockedCard';

/**
 * Chặn truy cập khi tài khoản còn đăng nhập được (session hợp lệ trong auth.users)
 * nhưng hồ sơ trong user_profiles đã bị xóa. Tránh trường hợp admin "xóa" user
 * nhưng người đó vẫn vào được app.
 *
 * Master admin được miễn trừ — không bao giờ bị khóa kể cả khi thiếu hồ sơ.
 */
export function RemovedUserBanner() {
  const { user, userProfile, loading, profileLoading } = useAuth();

  // Chưa tải xong: đừng kết luận vội (tránh nháy banner sai khi vừa đăng nhập).
  if (loading || profileLoading) return null;
  // Không có session, hoặc đã có hồ sơ → không chặn.
  if (!user || userProfile) return null;
  // Master admin luôn được phép vào.
  if (user.email === MASTER_ADMIN_EMAIL) return null;

  return (
    <AccountBlockedCard
      icon={<ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />}
      iconClassName="bg-red-100 dark:bg-red-900"
      title="Tài khoản không còn quyền truy cập"
      description="Hồ sơ của bạn đã bị quản trị viên xóa hoặc chưa được khởi tạo."
      email={user.email}
      body={
        <p className="text-sm text-muted-foreground">
          Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ quản trị viên. Hãy đăng xuất để đăng nhập bằng tài khoản khác.
        </p>
      }
    />
  );
}
