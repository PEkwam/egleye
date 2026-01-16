import { useRef, useState, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  pullThreshold?: number;
}

export const PullToRefresh = ({
  onRefresh,
  children,
  className,
  disabled = false,
  pullThreshold = 80,
}: PullToRefreshProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setPullDistance(0);
      return;
    }
    
    currentY.current = e.touches[0].clientY;
    const distance = Math.max(0, currentY.current - startY.current);
    
    // Apply resistance - the further you pull, the harder it gets
    const resistance = 0.4;
    const adjustedDistance = Math.min(distance * resistance, pullThreshold * 1.5);
    
    setPullDistance(adjustedDistance);
  }, [isPulling, disabled, isRefreshing, pullThreshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= pullThreshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(pullThreshold * 0.6); // Keep indicator visible during refresh
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, pullThreshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / pullThreshold, 1);
  const shouldTrigger = pullDistance >= pullThreshold;

  return (
    <div 
      ref={containerRef} 
      className={cn('relative overflow-auto', className)}
    >
      {/* Pull indicator */}
      <div 
        className={cn(
          'absolute left-0 right-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none z-20',
          (pullDistance > 0 || isRefreshing) ? 'opacity-100' : 'opacity-0'
        )}
        style={{ 
          top: -40,
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        <div className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-colors',
          shouldTrigger || isRefreshing
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-foreground border border-border'
        )}>
          <RefreshCw 
            className={cn(
              'h-4 w-4 transition-transform',
              isRefreshing && 'animate-spin'
            )}
            style={{ 
              transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)` 
            }}
          />
          <span className="text-xs font-medium">
            {isRefreshing 
              ? 'Refreshing...' 
              : shouldTrigger 
                ? 'Release to refresh' 
                : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {/* Content with pull transform */}
      <div 
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
};

// Hook version for more control
export const usePullToRefresh = (onRefresh: () => Promise<void>, options?: {
  threshold?: number;
  disabled?: boolean;
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  const refresh = useCallback(async () => {
    if (isRefreshing || options?.disabled) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullProgress(0);
    }
  }, [isRefreshing, onRefresh, options?.disabled]);

  return {
    isRefreshing,
    pullProgress,
    refresh,
  };
};
