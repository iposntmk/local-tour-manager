import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Clock } from 'lucide-react';

export function InactiveUserBanner() {
  const { user, userProfile } = useAuth();

  if (!userProfile || userProfile.status !== 'inactive') return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-orange-100 dark:bg-orange-900 rounded-full p-3 w-fit mb-2">
            <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle>Tài khoản chưa được duyệt</CardTitle>
          <CardDescription>
            Quản trị viên cần duyệt tài khoản trước khi bạn có thể sử dụng app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/50 p-3 text-sm">
            <div className="text-muted-foreground mb-1">Đã đăng nhập với</div>
            <div className="font-medium break-all">{user?.email || userProfile.email}</div>
          </div>
          <p className="text-sm text-muted-foreground">
            Vui lòng liên hệ quản trị viên để được kích hoạt tài khoản, hoặc đăng xuất và đăng nhập bằng tài khoản khác.
          </p>
          <Button onClick={handleLogout} variant="outline" className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Đăng xuất
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
