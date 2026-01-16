import { Home, LayoutDashboard, Brain, Lightbulb, BarChart3, Landmark, Building2, Newspaper, Heart, Car } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { InsurerComparison } from './InsurerComparison';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const primaryNavItems = [
  { label: 'Home', icon: Home, href: '/' },
  { label: 'Life', icon: Heart, href: '/executive-dashboard' },
  { label: 'Non-Life', icon: Car, href: '/nonlife-dashboard' },
  { label: 'Pensions', icon: Landmark, href: '/pension-dashboard' },
];

const moreNavItems = [
  { label: 'Brokers', icon: Building2, href: '/brokers-dashboard' },
  { label: 'AI Tracker', icon: Brain, href: '/insurance-ai' },
  { label: 'NPRA', icon: Landmark, href: '/npra-pensions' },
];

export const MobileBottomNav = () => {
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-xl border-t border-border/50 shadow-lg md:hidden">
        <div className="flex items-center justify-around h-16 px-1">
          {primaryNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200",
                  active 
                    ? "text-primary" 
                    : "text-muted-foreground active:scale-95"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-all",
                  active && "bg-primary/15"
                )}>
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform",
                    active && "scale-110"
                  )} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  active && "font-semibold"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          
          {/* Quick Insight Button */}
          <InsurerComparison 
            trigger={
              <button className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 text-muted-foreground active:scale-95">
                <div className="p-1.5 rounded-xl bg-primary/10">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <span className="text-[10px] font-medium">Insight</span>
              </button>
            }
          />
        </div>
        
        {/* Safe area for iOS devices */}
        <div className="h-safe-area-inset-bottom bg-card" />
      </nav>
      
      {/* Floating More Actions Sheet */}
      <Sheet open={showMore} onOpenChange={setShowMore}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe-area-inset-bottom">
          <SheetHeader className="text-left">
            <SheetTitle>More Options</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-4 py-6">
            {moreNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setShowMore(false)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <item.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};