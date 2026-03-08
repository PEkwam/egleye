import { AlertCircle } from 'lucide-react';

interface NoDataBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function NoDataBadge({ size = 'sm', className = '' }: NoDataBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground font-medium ${
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    } ${className}`}>
      <AlertCircle className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      No data
    </span>
  );
}
