import { Home, LayoutDashboard, Brain, Lightbulb, BarChart3, Landmark, Building2, Newspaper, Heart, Car, MoreHorizontal, Settings, Sparkles, TrendingUp, Shield, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { InsurerComparison } from './InsurerComparison';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const primaryNavItems = [
  { label: 'Home', icon: Home, href: '/' },
  { label: 'Life', icon: Heart, href: '/executive-dashboard' },
  { label: 'Non-Life', icon: Car, href: '/nonlife-dashboard' },
  { label: 'Pensions', icon: Landmark, href: '/pension-dashboard' },
];

const moreNavItems = [
  { label: 'Brokers', icon: Building2, href: '/brokers-dashboard', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { label: 'AI Tracker', icon: Sparkles, href: '/insurance-ai', color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  { label: 'NPRA Reports', icon: Shield, href: '/npra-pensions', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  { label: 'Data Admin', icon: Settings, href: '/data-admin', color: 'text-slate-500', bgColor: 'bg-slate-500/10' },
];

export const MobileBottomNav = () => {
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  // Check if any of the "more" items are active
  const isMoreActive = moreNavItems.some(item => isActive(item.href));

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
          
          {/* More Button */}
          <button 
            onClick={() => setShowMore(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200",
              isMoreActive 
                ? "text-primary" 
                : "text-muted-foreground active:scale-95"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-xl transition-all",
              isMoreActive && "bg-primary/15"
            )}>
              <MoreHorizontal className={cn(
                "h-5 w-5 transition-transform",
                isMoreActive && "scale-110"
              )} />
            </div>
            <span className={cn(
              "text-[10px] font-medium",
              isMoreActive && "font-semibold"
            )}>
              More
            </span>
          </button>
        </div>
        
        {/* Safe area for iOS devices */}
        <div className="h-safe-area-inset-bottom bg-card" />
      </nav>
      
      {/* More Options Sheet */}
      <Sheet open={showMore} onOpenChange={setShowMore}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe-area-inset-bottom">
          <SheetHeader className="text-left pb-4">
            <SheetTitle>More Options</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 pb-6">
            {moreNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors",
                    active 
                      ? "bg-primary/10 border-2 border-primary/30" 
                      : "bg-secondary/50 hover:bg-secondary border-2 border-transparent"
                  )}
                >
                  <div className={cn("p-2.5 rounded-xl", item.bgColor)}>
                    <item.icon className={cn("h-6 w-6", item.color)} />
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    active && "text-primary"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
          
          {/* Quick Insight */}
          <div className="border-t border-border/50 pt-4">
            <InsurerComparison 
              trigger={
                <button className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 transition-all hover:from-primary/20 hover:to-primary/10">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <span className="font-medium text-primary">Quick Market Insight</span>
                </button>
              }
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};