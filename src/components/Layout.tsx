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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LayoutProps {
  children: React.ReactNode;
}

const masterDataItems = [
  { to: '/guides', icon: Users, label: 'Guides' },
  { to: '/companies', icon: Building2, label: 'Companies' },
  { to: '/nationalities', icon: Globe, label: 'Nationalities' },
  { to: '/provinces', icon: MapPin, label: 'Provinces' },
  { to: '/destinations', icon: Map, label: 'Destinations' },
  { to: '/shopping', icon: ShoppingBag, label: 'Shopping' },
  { to: '/expense-categories', icon: Tag, label: 'Categories' },
  { to: '/detailed-expenses', icon: Receipt, label: 'Expenses' },
];

const mainNavItems = [
  { to: '/tours', icon: Plane, label: 'Tours' },
  { to: '/statistics', icon: BarChart3, label: 'Statistics' },
];

const NavLinks = ({ isMobile = false }: { isMobile?: boolean }) => {
  const location = useLocation();
  const [masterDataOpen, setMasterDataOpen] = useState(false);

  const isMasterDataActive = masterDataItems.some(item => location.pathname.startsWith(item.to));

  const navLinkClass = (isActive: boolean) => cn(
    'flex flex-col items-center py-2 rounded-lg font-medium transition-colors',
    isMobile ? 'flex-1 px-1 min-w-0 gap-0.5 text-xs' : 'flex-shrink-0 w-20 px-2 gap-1 text-sm',
    isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
  );

  if (isMobile) {
    // Mobile: Show condensed navigation with Settings dropdown
    return (
      <>
        <NavLink
          to="/tours"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          <Home className="h-5 w-5" />
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
          <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
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
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    );
  }

  // Desktop: Show all navigation items directly
  return (
    <>
      <NavLink
        to="/tours"
        className={({ isActive }) => navLinkClass(isActive)}
      >
        <Home className="h-5 w-5" />
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

      {/* Master Data Items - Desktop only (show all) */}
      {masterDataItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => navLinkClass(isActive)}
        >
          <item.icon className="h-5 w-5" />
          <span className="text-center truncate w-full">{item.label}</span>
        </NavLink>
      ))}
    </>
  );
};

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation - both mobile and desktop */}
      <nav className="border-b bg-card sticky top-0 z-50">
        <div className="mx-auto flex items-center gap-1 md:gap-3 overflow-x-auto px-2 py-2 md:px-6 md:py-3 max-w-7xl">
          <NavLinks isMobile={false} />
        </div>
      </nav>

      {/* Bottom Navigation - mobile only */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card z-50 shadow-lg md:hidden">
        <div className="flex items-stretch justify-evenly px-1 py-1.5">
          <NavLinks isMobile={true} />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-28 md:pb-12">
          {children}
        </div>
      </main>
    </div>
  );
}
