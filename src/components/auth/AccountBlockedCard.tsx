import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AccountBlockedCardProps {
  icon: ReactNode;
  iconClassName?: string;
  title: string;
  description: string;
  email?: string | null;
  body?: ReactNode;
}

/**
 * Overlay toàn màn hình hiển thị khi tài khoản đăng nhập được nhưng bị chặn
 * sử dụng app (chưa duyệt, hoặc hồ sơ đã bị xóa). Dùng chung cho mọi trạng thái
 * chặn để tránh lặp markup.
 */
export function AccountBlockedCard({
  icon,
  iconClassName = 'bg-orange-100 dark:bg-orange-900',
  title,
  description,
  email,
  body,
}: AccountBlockedCardProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className={`mx-auto rounded-full p-3 w-fit mb-2 ${iconClassName}`}>{icon}</div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {email && (
            <div className="rounded-md border bg-muted/50 p-3 text-sm">
              <div className="text-muted-foreground mb-1">Đã đăng nhập với</div>
              <div className="font-medium break-all">{email}</div>
            </div>
          )}
          {body}
          <Button onClick={handleLogout} variant="outline" className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Đăng xuất
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
