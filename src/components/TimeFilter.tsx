import { Clock, Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimeRange = 'today' | 'week' | 'month' | 'all';

interface TimeFilterProps {
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
}

const timeRanges: { id: TimeRange; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: 'today', label: 'Today', shortLabel: 'Today', icon: Clock },
  { id: 'week', label: 'This Week', shortLabel: 'Week', icon: Calendar },
  { id: 'month', label: 'This Month', shortLabel: 'Month', icon: CalendarDays },
  { id: 'all', label: 'All Time', shortLabel: 'All', icon: CalendarRange },
];

export function TimeFilter({ selected, onChange }: TimeFilterProps) {
  return (
    <div className="flex items-center gap-1.5 md:gap-2">
      <span className="hidden sm:inline text-xs md:text-sm font-medium text-muted-foreground mr-1 md:mr-2">Filter by:</span>
      {timeRanges.map(({ id, label, shortLabel, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            'inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-[11px] md:text-sm font-medium rounded-full transition-all duration-200',
            selected === id
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <Icon className="h-3 w-3 md:h-3.5 md:w-3.5" />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{shortLabel}</span>
        </button>
      ))}
    </div>
  );
}
