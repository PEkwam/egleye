import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Car, Building2, Landmark, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface DashboardNav {
  path: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconColor: string;
  hoverBg: string;
}

const dashboards: DashboardNav[] = [
  {
    path: '/executive-dashboard',
    label: 'Life Insurance',
    shortLabel: 'Life',
    icon: Heart,
    gradient: 'from-blue-600 to-indigo-600',
    iconColor: 'text-blue-500',
    hoverBg: 'hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400',
  },
  {
    path: '/nonlife-dashboard',
    label: 'Non-Life Insurance',
    shortLabel: 'Non-Life',
    icon: Car,
    gradient: 'from-green-600 to-teal-600',
    iconColor: 'text-green-500',
    hoverBg: 'hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400',
  },
  {
    path: '/brokers-dashboard',
    label: 'Brokers',
    shortLabel: 'Brokers',
    icon: Building2,
    gradient: 'from-purple-600 to-violet-600',
    iconColor: 'text-purple-500',
    hoverBg: 'hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400',
  },
  {
    path: '/pension-dashboard',
    label: 'Pensions',
    shortLabel: 'Pensions',
    icon: Landmark,
    gradient: 'from-amber-500 to-orange-600',
    iconColor: 'text-amber-500',
    hoverBg: 'hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400',
  },
];

export function DashboardNavigation() {
  const location = useLocation();
  const currentIndex = dashboards.findIndex(d => d.path === location.pathname);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const currentDashboard = dashboards[currentIndex];

  return (
    <>
      {/* Desktop/Tablet Navigation Bar */}
      <div className="hidden md:flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/50">
        {dashboards.map((dashboard) => {
          const isActive = location.pathname === dashboard.path;
          const Icon = dashboard.icon;
          
          return (
            <Link key={dashboard.path} to={dashboard.path}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2 h-8 px-3 text-xs font-medium transition-all',
                    isActive && `bg-gradient-to-r ${dashboard.gradient} text-white shadow-sm`,
                    !isActive && dashboard.hoverBg
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', !isActive && dashboard.iconColor)} />
                <span className="hidden lg:inline">{dashboard.label}</span>
                <span className="lg:hidden">{dashboard.shortLabel}</span>
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Mobile Navigation - Modern Horizontal Scroll */}
      <div className="md:hidden w-full">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {dashboards.map((dashboard) => {
            const isActive = location.pathname === dashboard.path;
            const Icon = dashboard.icon;
            
            return (
              <Link key={dashboard.path} to={dashboard.path} className="flex-shrink-0">
                <Button
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'gap-1.5 h-9 px-3 text-xs font-medium transition-all whitespace-nowrap',
                    isActive && `bg-gradient-to-r ${dashboard.gradient} text-white shadow-sm border-0`,
                    !isActive && 'border-border/50'
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', !isActive && dashboard.iconColor)} />
                  {dashboard.shortLabel}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
