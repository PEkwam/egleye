import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { TrendArrow } from './TrendingIndicator';

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => React.ReactNode;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  maxHeight?: number;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
  emptyMessage?: string;
  showRank?: boolean;
  trendField?: keyof T; // Field to show trend indicator
  previousData?: T[]; // Previous period data for trends
  keyField: keyof T; // Unique identifier field
}

export function VirtualizedTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 52,
  maxHeight = 500,
  className,
  onRowClick,
  emptyMessage = 'No data available',
  showRank = false,
  trendField,
  previousData,
  keyField,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Create a map of previous values for trend comparison
  const previousValueMap = useMemo(() => {
    if (!previousData || !trendField) return new Map();
    return new Map(previousData.map(item => [item[keyField], item[trendField]]));
  }, [previousData, trendField, keyField]);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12 text-muted-foreground', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden', className)}>
      {/* Header */}
      <div className="flex bg-muted/50 border-b border-border sticky top-0 z-10">
        {showRank && (
          <div className="w-12 px-3 py-3 text-xs font-semibold text-muted-foreground text-center shrink-0">
            #
          </div>
        )}
        {trendField && (
          <div className="w-10 px-2 py-3 text-xs font-semibold text-muted-foreground text-center shrink-0">
            Δ
          </div>
        )}
        {columns.map((column) => (
          <div
            key={String(column.key)}
            className={cn(
              'px-3 py-3 text-xs font-semibold text-muted-foreground',
              column.align === 'right' && 'text-right',
              column.align === 'center' && 'text-center'
            )}
            style={{ width: column.width, flex: column.width ? undefined : 1 }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = data[virtualRow.index];
            const currentValue = trendField ? item[trendField] : 0;
            const previousValue = previousValueMap.get(item[keyField]) ?? currentValue;
            
            let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
            if (currentValue > previousValue) trendDirection = 'up';
            else if (currentValue < previousValue) trendDirection = 'down';

            return (
              <div
                key={virtualRow.key}
                className={cn(
                  'flex absolute top-0 left-0 w-full items-center border-b border-border/50 hover:bg-muted/30 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick?.(item, virtualRow.index)}
              >
                {showRank && (
                  <div className="w-12 px-3 text-sm font-medium text-muted-foreground text-center shrink-0">
                    {virtualRow.index + 1}
                  </div>
                )}
                {trendField && (
                  <div className="w-10 px-2 flex items-center justify-center shrink-0">
                    <TrendArrow direction={trendDirection} />
                  </div>
                )}
                {columns.map((column) => (
                  <div
                    key={String(column.key)}
                    className={cn(
                      'px-3 text-sm truncate',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center'
                    )}
                    style={{ width: column.width, flex: column.width ? undefined : 1 }}
                  >
                    {column.render 
                      ? column.render(item, virtualRow.index)
                      : String(item[column.key as keyof T] ?? '-')}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with count */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t border-border text-xs text-muted-foreground">
        <span>Showing {data.length} items</span>
        <span className="text-[10px]">Scroll for more</span>
      </div>
    </div>
  );
}
