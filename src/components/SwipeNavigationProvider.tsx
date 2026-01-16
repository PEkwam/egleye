import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/executive-dashboard': 'Life',
  '/nonlife-dashboard': 'Non-Life',
  '/pension-dashboard': 'Pensions',
  '/brokers-dashboard': 'Brokers',
  '/insurance-ai': 'AI Tracker',
};

export const SwipeNavigationProvider = () => {
  const { currentIndex, totalRoutes, routes } = useSwipeNavigation({
    threshold: 60,
    timeout: 400,
  });
  const location = useLocation();
  const [showIndicator, setShowIndicator] = useState(false);
  const [lastPath, setLastPath] = useState(location.pathname);

  // Show indicator briefly when route changes
  useEffect(() => {
    if (location.pathname !== lastPath) {
      setShowIndicator(true);
      setLastPath(location.pathname);
      const timer = setTimeout(() => setShowIndicator(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, lastPath]);

  // Don't render on desktop or non-swipeable routes
  if (typeof window !== 'undefined' && window.innerWidth > 768) return null;
  if (currentIndex === -1) return null;

  const prevRoute = currentIndex > 0 ? routes[currentIndex - 1] : null;
  const nextRoute = currentIndex < totalRoutes - 1 ? routes[currentIndex + 1] : null;

  return (
    <>
      {/* Swipe Indicator Dots */}
      <div 
        className={cn(
          "fixed top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full bg-card/90 backdrop-blur-sm border border-border/50 shadow-lg transition-all duration-300 md:hidden",
          showIndicator ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        )}
      >
        {routes.map((route, index) => (
          <div
            key={route}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-200",
              index === currentIndex 
                ? "bg-primary w-4" 
                : "bg-muted-foreground/30"
            )}
            title={ROUTE_LABELS[route]}
          />
        ))}
      </div>

      {/* Edge Swipe Hints - shown on edges */}
      {prevRoute && (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-30 flex items-center opacity-30 pointer-events-none md:hidden">
          <div className="bg-gradient-to-r from-primary/20 to-transparent p-2 rounded-r-xl">
            <ChevronLeft className="h-5 w-5 text-primary" />
          </div>
        </div>
      )}
      
      {nextRoute && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex items-center opacity-30 pointer-events-none md:hidden">
          <div className="bg-gradient-to-l from-primary/20 to-transparent p-2 rounded-l-xl">
            <ChevronRight className="h-5 w-5 text-primary" />
          </div>
        </div>
      )}

      {/* Navigation Label Toast */}
      <div 
        className={cn(
          "fixed bottom-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg transition-all duration-300 md:hidden",
          showIndicator ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {ROUTE_LABELS[location.pathname] || 'Dashboard'}
      </div>
    </>
  );
};
