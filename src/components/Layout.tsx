import { NavLink, useLocation } from 'react-router-dom';
import {
  Users,
  Building2,
  Globe,
  MapPin,
  Map,
  ShoppingBag,
  Tag,
  Receipt,
  Plane,
  Home,
  BarChart3,
  Settings,
  ChevronDown,
  LogOut,
  BookOpen,
  FileText,
  UtensilsCrossed,
  Store,
  Hotel,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SupabaseStatusBanner } from '@/components/SupabaseStatusBanner';
import { SupabaseHealthBanner } from '@/components/SupabaseHealthBanner';
import { useState, useEffect } from 'react';
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

interface LayoutProps {
  children: React.ReactNode;
}

const masterDataItems = [
  { to: '/diary-types', icon: BookOpen, label: 'Diary Types' },
  { to: '/tour-diaries', icon: FileText, label: 'Tour Diaries' },
  { to: '/guides', icon: Users, label: 'Guides' },
  { to: '/companies', icon: Building2, label: 'Companies' },
  { to: '/nationalities', icon: Globe, label: 'Nationalities' },
  { to: '/provinces', icon: MapPin, label: 'Provinces' },
  { to: '/destinations', icon: Map, label: 'Destinations' },
  { to: '/restaurants', icon: UtensilsCrossed, label: 'Restaurants' },
  { to: '/shop-places', icon: Store, label: 'Shop Places' },
  { to: '/hotels', icon: Hotel, label: 'Hotels' },
  { to: '/shopping', icon: ShoppingBag, label: 'Shopping' },
  { to: '/expense-categories', icon: Tag, label: 'Categories' },
  { to: '/detailed-expenses', icon: Receipt, label: 'Expenses' },
];

const mainNavItems = [
  { to: '/tours', icon: Plane, label: 'Tours' },
  { to: '/statistics', icon: BarChart3, label: 'Statistics' },
];

const NavLinks = ({ isMobile = false, user, onLogout }: { isMobile?: boolean; user: User | null; onLogout: () => void }) => {
  const location = useLocation();
  const [masterDataOpen, setMasterDataOpen] = useState(false);

  const isMasterDataActive = masterDataItems.some(item => location.pathname.startsWith(item.to));

  const navLinkClass = (isActive: boolean) => cn(
    'flex flex-col items-center py-1 rounded-lg font-medium transition-colors',
    isMobile ? 'flex-1 px-1 min-w-0 gap-0.5 text-xs' : 'flex-shrink-0 w-16 px-1 gap-0.5 text-xs',
    isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
  );

  if (isMobile) {
    // Mobile: Show condensed navigation with Settings dropdown
    return (
      <>
        <NavLink
          to="/"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          <Home className="h-4 w-4" />
          <span className="text-center truncate w-full">Home</span>
        </NavLink>

        {mainNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-center truncate w-full">{item.label}</span>
          </NavLink>
        ))}

        {/* Master Data Dropdown - Mobile only */}
        <DropdownMenu open={masterDataOpen} onOpenChange={setMasterDataOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs font-medium transition-colors flex-1 px-1 min-w-0',
                isMasterDataActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Settings className="h-5 w-5" />
              <span className="text-center truncate w-full">Settings</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
            {user && (
              <>
                <div className="px-2 py-2 text-sm">
                  <div className="font-medium">Signed in as</div>
                  <div className="text-muted-foreground truncate">{user.email}</div>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            {masterDataItems.map((item) => (
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
                  <span>Logout</span>
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
        to="/"
        className={({ isActive }) => navLinkClass(isActive)}
      >
        <Home className="h-4 w-4" />
        <span className="text-center truncate w-full">Home</span>
      </NavLink>

      {mainNavItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => navLinkClass(isActive)}
        >
          <item.icon className="h-4 w-4" />
          <span className="text-center truncate w-full">{item.label}</span>
        </NavLink>
      ))}

      {/* Master Data Items - Desktop only (show all) */}
      {masterDataItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => navLinkClass(isActive)}
        >
          <item.icon className="h-4 w-4" />
          <span className="text-center truncate w-full">{item.label}</span>
        </NavLink>
      ))}
    </>
  );
};

export function Layout({ children }: LayoutProps) {
  const [user, setUser] = useState<User | null>(null);

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
              <span className="text-xs text-muted-foreground">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="h-7 text-xs">
                <LogOut className="h-3 w-3 mr-1" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Navigation - mobile only */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card z-50 shadow-lg md:hidden">
        <div className="flex items-stretch justify-evenly px-1 py-1.5">
          <NavLinks isMobile={true} user={user} onLogout={handleLogout} />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-24 pt-4 md:pb-12 md:pt-0">
          <SupabaseStatusBanner />
          <SupabaseHealthBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
