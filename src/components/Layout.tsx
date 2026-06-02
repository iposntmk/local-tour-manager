import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Building2,
  Globe,
  MapPin,
  Map,
  ShoppingBag,
  Tag,
  Receipt,
  Plane,
  LayoutDashboard,
  BarChart3,
  Settings,
  LogOut,
  UserCog,
  UserCircle,
  Languages,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { SupabaseStatusBanner } from '@/components/SupabaseStatusBanner';
import { SupabaseHealthBanner } from '@/components/SupabaseHealthBanner';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import type { SettlementStatus } from '@/types/tour';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import type { Permission } from '@/types/user';

interface LayoutProps {
  children?: React.ReactNode;
}

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  permission?: Permission;
}

const masterDataItems: NavItem[] = [
  { to: '/languages', icon: Languages, label: 'Ngôn ngữ', permission: 'view_languages' },
  { to: '/companies', icon: Building2, label: 'Công ty', permission: 'view_companies' },
  { to: '/nationalities', icon: Globe, label: 'Quốc tịch', permission: 'view_nationalities' },
  { to: '/provinces', icon: MapPin, label: 'Tỉnh thành', permission: 'view_provinces' },
  { to: '/destinations', icon: Map, label: 'Điểm đến', permission: 'view_tourist_destinations' },
  { to: '/shopping', icon: ShoppingBag, label: 'Mua sắm', permission: 'view_shopping' },
  { to: '/expense-categories', icon: Tag, label: 'Danh mục', permission: 'view_expense_categories' },
  { to: '/detailed-expenses', icon: Receipt, label: 'Chi phí', permission: 'view_detailed_expenses' },
];

const mainNavItems: NavItem[] = [
  { to: '/tours', icon: Plane, label: t('nav.tours'), permission: 'view_tours' },
  { to: '/statistics', icon: BarChart3, label: t('nav.statistics'), permission: 'view_statistics' },
];

const userManagementItem: NavItem = { to: '/users', icon: UserCog, label: 'Người dùng', permission: 'manage_users' };
const profileItem: NavItem = { to: '/profile', icon: UserCircle, label: t('nav.profile') };

function usePendingSettlementCount(): { count: number; enabled: boolean } {
  const { hasPermission } = useAuth();
  let statuses: SettlementStatus[] = [];
  if (hasPermission('approve_settlement')) statuses = ['submitted'];
  else if (hasPermission('submit_settlement')) statuses = ['need_changes'];

  const enabled = statuses.length > 0;

  const { data } = useQuery({
    queryKey: ['settlement-pending-count', statuses],
    queryFn: () => store.countToursBySettlementStatus(statuses),
    enabled,
    refetchInterval: enabled ? 60_000 : false,
    refetchOnWindowFocus: enabled,
    staleTime: 30_000,
  });

  return { count: data ?? 0, enabled };
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}

const NavLinks = ({ isMobile = false, user, onLogout }: { isMobile?: boolean; user: User | null; onLogout: () => void }) => {
  const location = useLocation();
  const [masterDataOpen, setMasterDataOpen] = useState(false);
  const { hasPermission } = useAuth();
  const { count: pendingCount } = usePendingSettlementCount();

  const canShowItem = (item: NavItem) => !item.permission || hasPermission(item.permission);
  const visibleMainNavItems = mainNavItems.filter(canShowItem);
  const visibleUserManagementItem = canShowItem(userManagementItem) ? userManagementItem : null;
  const visibleMasterDataItems = masterDataItems.filter(canShowItem);

  const settingsItems = [
    profileItem,
    ...(visibleUserManagementItem ? [visibleUserManagementItem] : []),
    ...visibleMasterDataItems,
  ];

  const isSettingsActive = settingsItems.some(item => location.pathname.startsWith(item.to));

  const navLinkClass = (isActive: boolean) => cn(
    'flex flex-col items-center rounded-lg font-medium transition-colors',
    isMobile ? 'h-12 flex-1 justify-center px-1 min-w-0 gap-0.5 text-[11px]' : 'flex-shrink-0 px-2 py-1 gap-0.5 text-xs whitespace-nowrap',
    isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
  );

  if (isMobile) {
    // Mobile: Show condensed navigation with Settings dropdown
    return (
      <>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-center truncate w-full">{t('nav.dashboard')}</span>
        </NavLink>

        {visibleMainNavItems
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <span className="relative">
                <item.icon className="h-5 w-5" />
                {item.to === '/tours' && <NavBadge count={pendingCount} />}
              </span>
              <span className="text-center truncate w-full">{item.label}</span>
            </NavLink>
          ))}

        {/* Master Data Dropdown - Mobile only */}
        <DropdownMenu open={masterDataOpen} onOpenChange={setMasterDataOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex h-12 flex-1 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium transition-colors',
                isSettingsActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label="Mở cài đặt"
            >
              <Settings className="h-5 w-5" />
              <span className="text-center truncate w-full">Cài đặt</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            collisionPadding={8}
            className="mb-3 max-h-[70vh] w-[calc(100vw-1rem)] max-w-sm overflow-y-auto"
          >
            {user && (
              <>
                <div className="px-2 py-2 text-sm">
                  <div className="font-medium">Đã đăng nhập với</div>
                  <div className="text-muted-foreground truncate">{user.email}</div>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            {settingsItems.map((item) => (
              <DropdownMenuItem key={item.to} asChild>
                <NavLink
                  to={item.to}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setMasterDataOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              </DropdownMenuItem>
            ))}
            {user && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    );
  }

  // Desktop: Show all navigation items directly
  return (
    <>
      <NavLink
        to="/dashboard"
        className={({ isActive }) => navLinkClass(isActive)}
      >
        <LayoutDashboard className="h-4 w-4" />
        <span className="text-center">{t('nav.dashboard')}</span>
      </NavLink>

      {visibleMainNavItems
        .map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <span className="relative">
              <item.icon className="h-4 w-4" />
              {item.to === '/tours' && <NavBadge count={pendingCount} />}
            </span>
            <span className="text-center">{item.label}</span>
        </NavLink>
      ))}

      {visibleUserManagementItem && (
        <NavLink
          to={visibleUserManagementItem.to}
          className={({ isActive }) => navLinkClass(isActive)}
        >
          <visibleUserManagementItem.icon className="h-4 w-4" />
          <span className="text-center">{visibleUserManagementItem.label}</span>
        </NavLink>
      )}

      {/* Master Data Items - Desktop only (show all) */}
      {visibleMasterDataItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => navLinkClass(isActive)}
        >
          <item.icon className="h-4 w-4" />
          <span className="text-center">{item.label}</span>
        </NavLink>
      ))}
    </>
  );
};

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const isTourListRoute = location.pathname === '/tours';

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation - desktop only */}
      <nav className="hidden md:block border-b bg-card sticky top-0 z-50">
        <div className="mx-auto flex items-center justify-between gap-1 px-2 py-1.5 max-w-7xl">
          <div className="flex items-center gap-0.5 overflow-x-auto">
            <NavLinks isMobile={false} user={user} onLogout={handleLogout} />
          </div>
          {user && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <NavLink
                to="/profile"
                className="flex max-w-[14rem] items-center gap-1 truncate rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <UserCircle className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </NavLink>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="h-7 text-xs">
                <LogOut className="h-3 w-3 mr-1" />
                Đăng xuất
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Navigation - mobile only */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex min-h-16 max-w-md items-stretch justify-evenly px-1 py-2">
          <NavLinks isMobile={true} user={user} onLogout={handleLogout} />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full">
        <div
          className={cn(
            'mx-auto w-full px-4 sm:px-6 lg:px-8 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:pb-12 md:pt-0',
            isTourListRoute ? 'max-w-[100rem]' : 'max-w-7xl',
          )}
        >
          <SupabaseStatusBanner />
          <SupabaseHealthBanner />
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
}
