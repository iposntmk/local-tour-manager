import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { to: '/tours', icon: Plane, label: 'Tours' },
  { to: '/guides', icon: Users, label: 'Guides' },
  { to: '/companies', icon: Building2, label: 'Companies' },
  { to: '/nationalities', icon: Globe, label: 'Nationalities' },
  { to: '/provinces', icon: MapPin, label: 'Provinces' },
  { to: '/destinations', icon: Map, label: 'Destinations' },
  { to: '/shopping', icon: ShoppingBag, label: 'Shopping' },
  { to: '/expense-categories', icon: Tag, label: 'Categories' },
  { to: '/detailed-expenses', icon: Receipt, label: 'Expenses' },
  { to: '/statistics', icon: BarChart3, label: 'Statistics' },
];

const NavLinks = () => (
  <>
    <NavLink
      to="/tours"
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-shrink-0 w-[72px]',
          isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
        )
      }
    >
      <Home className="h-5 w-5" />
      <span className="text-center truncate w-full">Home</span>
    </NavLink>
    {navItems.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-shrink-0 w-[72px]',
            isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
          )
        }
      >
        <item.icon className="h-5 w-5" />
        <span className="text-center truncate w-full">{item.label}</span>
      </NavLink>
    ))}
  </>
);

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation - desktop */}
      <nav className="border-b bg-card sticky top-0 z-50 hidden md:block">
        <div className="mx-auto flex items-center gap-2 overflow-x-auto px-4 py-3 md:px-6 max-w-7xl">
          <NavLinks />
        </div>
      </nav>

      {/* Bottom Navigation - mobile */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card z-50 shadow-lg md:hidden">
        <div className="flex items-center gap-1 overflow-x-auto px-2 py-2">
          <NavLinks />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12">
          {children}
        </div>
      </main>
    </div>
  );
}
