import { NavLink, useNavigate } from 'react-router-dom';
import { Users, Building2, Globe, MapPin, Map, ShoppingBag, Tag, Receipt, Plane, Settings, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="border-b bg-card sticky top-0 z-50 overflow-x-auto">
        <div className="flex items-center px-2 py-2 min-w-max">
          <NavLink
            to="/tours"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors flex-shrink-0 w-[70px]',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
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
                  'flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors flex-shrink-0 w-[70px]',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-center truncate w-full">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Bottom Navigation - Always visible */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card z-50 overflow-x-auto">
        <div className="flex items-center px-2 py-2 min-w-max">
          <NavLink
            to="/tours"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors flex-shrink-0 w-[70px]',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
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
                  'flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors flex-shrink-0 w-[70px]',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-center truncate w-full">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-24">
        {children}
      </main>
    </div>
  );
}
