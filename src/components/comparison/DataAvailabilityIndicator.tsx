import { Check, AlertCircle } from 'lucide-react';
import { DataAvailabilityItem } from './types';

interface DataAvailabilityIndicatorProps {
  dataAvailability: DataAvailabilityItem[];
  selectedQuarter: number;
  selectedYear: number | null;
}

export function DataAvailabilityIndicator({ 
  dataAvailability, 
  selectedQuarter, 
  selectedYear 
}: DataAvailabilityIndicatorProps) {
  if (dataAvailability.length === 0) return null;

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs font-medium text-muted-foreground">
          Data Availability for Q{selectedQuarter} {selectedYear}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {dataAvailability.map(({ insurer, hasData, latestQuarter }) => (
          <div 
            key={insurer.id}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
              hasData 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
            }`}
          >
            {hasData ? (
              <Check className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            <span className="font-medium">{insurer.shortName}</span>
            {!hasData && latestQuarter && (
              <span className="opacity-70">• Latest: {latestQuarter}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
