import { useMemo, useRef, useState } from 'react';
import { format, subDays } from 'date-fns';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  /** Show a hover tooltip with per-day counts. Assumes the last value is today. */
  showTooltip?: boolean;
  /** Singular label for what each datapoint represents, e.g. "article". */
  itemLabel?: string;
}

/**
 * Pure-SVG sparkline — no recharts dependency. Kept lightweight on purpose so
 * the home page doesn't pull the recharts bundle. Pass an array of numeric
 * values (oldest first). When `showTooltip` is true, hovering reveals the
 * date and count for each day.
 */
export function Sparkline({
  data,
  color = 'hsl(var(--primary))',
  height = 32,
  showTooltip = false,
  itemLabel = 'article',
}: SparklineProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{ i: number; x: number } | null>(null);

  const series = useMemo(() => {
    if (!data || data.length === 0) return [];
    const today = new Date();
    return data.map((v, i) => {
      const daysAgo = data.length - 1 - i;
      const d = subDays(today, daysAgo);
      return { i, v, dateLabel: format(d, 'MMM d') };
    });
  }, [data]);

  if (series.length === 0) return <div style={{ height }} />;

  const W = 100;
  const H = 100;
  const PAD_Y = 6;
  const max = Math.max(1, ...series.map(s => s.v));
  const min = Math.min(...series.map(s => s.v));
  const range = Math.max(1, max - min);
  const stepX = series.length > 1 ? W / (series.length - 1) : 0;
  const points = series.map((s, idx) => {
    const x = idx * stepX;
    const y = PAD_Y + (1 - (s.v - min) / range) * (H - PAD_Y * 2);
    return { x, y };
  });
  const pathD = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(' ');
  const areaD = `${pathD} L${points[points.length - 1].x},${H} L0,${H} Z`;
  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, '')}`;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showTooltip || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, relX / rect.width));
    const i = Math.round(pct * (series.length - 1));
    setHover({ i, x: (i / Math.max(1, series.length - 1)) * rect.width });
  };

  const active = hover ? series[hover.i] : null;

  return (
    <div
      ref={wrapRef}
      className="relative"
      style={{ height, width: '100%' }}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {active && showTooltip && (
          <line
            x1={hover!.i * stepX}
            x2={hover!.i * stepX}
            y1={0}
            y2={H}
            stroke={color}
            strokeOpacity={0.6}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {active && showTooltip && (
        <div
          className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-bold shadow-lg"
          style={{
            left: hover!.x,
            top: -4,
            background: 'hsl(var(--foreground))',
            color: 'hsl(var(--background))',
            boxShadow: '0 8px 24px hsl(var(--foreground) / 0.25)',
          }}
        >
          <div
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ opacity: 0.7 }}
          >
            {active.dateLabel}
          </div>
          <div>
            {active.v} {itemLabel}
            {active.v === 1 ? '' : 's'}
          </div>
        </div>
      )}
    </div>
  );
}
