import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendingIndicatorProps {
  currentValue: number;
  previousValue: number;
  format?: 'percentage' | 'currency' | 'number';
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TrendingIndicator = ({
  currentValue,
  previousValue,
  format = 'percentage',
  showValue = true,
  size = 'md',
  className,
}: TrendingIndicatorProps) => {
  const change = previousValue !== 0 
    ? ((currentValue - previousValue) / previousValue) * 100 
    : currentValue > 0 ? 100 : 0;
  
  const absoluteChange = currentValue - previousValue;
  const isPositive = change > 0;
  const isNeutral = change === 0;

  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        if (Math.abs(value) >= 1e9) return `GH₵${(value / 1e9).toFixed(1)}B`;
        if (Math.abs(value) >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
        if (Math.abs(value) >= 1e3) return `GH₵${(value / 1e3).toFixed(1)}K`;
        return `GH₵${value.toFixed(0)}`;
      case 'number':
        return absoluteChange > 0 ? `+${absoluteChange.toLocaleString()}` : absoluteChange.toLocaleString();
      case 'percentage':
      default:
        return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
    }
  };

  const sizeClasses = {
    sm: 'text-xs gap-0.5',
    md: 'text-sm gap-1',
    lg: 'text-base gap-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (isNeutral) {
    return (
      <span className={cn(
        'inline-flex items-center text-muted-foreground',
        sizeClasses[size],
        className
      )}>
        <Minus className={iconSizes[size]} />
        {showValue && <span>0%</span>}
      </span>
    );
  }

  return (
    <span className={cn(
      'inline-flex items-center font-medium',
      isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      sizeClasses[size],
      className
    )}>
      {isPositive ? (
        <TrendingUp className={cn(iconSizes[size], 'shrink-0')} />
      ) : (
        <TrendingDown className={cn(iconSizes[size], 'shrink-0')} />
      )}
      {showValue && <span>{formatValue(change)}</span>}
    </span>
  );
};

// Compact arrow-only version for tables
interface TrendArrowProps {
  direction: 'up' | 'down' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const TrendArrow = ({ direction, size = 'sm', className }: TrendArrowProps) => {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  
  if (direction === 'neutral') {
    return <Minus className={cn(iconSize, 'text-muted-foreground', className)} />;
  }
  
  return direction === 'up' ? (
    <ArrowUp className={cn(iconSize, 'text-green-600 dark:text-green-400', className)} />
  ) : (
    <ArrowDown className={cn(iconSize, 'text-red-600 dark:text-red-400', className)} />
  );
};

// Badge version for cards
interface TrendBadgeProps {
  currentValue: number;
  previousValue: number;
  label?: string;
  className?: string;
}

export const TrendBadge = ({ currentValue, previousValue, label, className }: TrendBadgeProps) => {
  const change = previousValue !== 0 
    ? ((currentValue - previousValue) / previousValue) * 100 
    : 0;
  
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      isNeutral 
        ? 'bg-muted text-muted-foreground' 
        : isPositive 
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      className
    )}>
      {!isNeutral && (
        isPositive 
          ? <TrendingUp className="h-3 w-3" /> 
          : <TrendingDown className="h-3 w-3" />
      )}
      <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
      {label && <span className="text-muted-foreground">vs {label}</span>}
    </div>
  );
};
