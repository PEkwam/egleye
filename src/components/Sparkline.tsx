import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
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
 * Minimal area sparkline. Pass an array of numeric values (e.g. last 7 days,
 * oldest first). When `showTooltip` is true, hovering reveals the date and
 * count for each day so a flat line at high totals (older items) makes sense.
 */
export function Sparkline({
  data,
  color = 'hsl(var(--primary))',
  height = 32,
  showTooltip = false,
  itemLabel = 'article',
}: SparklineProps) {
  if (!data || data.length === 0) return <div style={{ height }} />;

  const today = new Date();
  const series = data.map((v, i) => {
    const daysAgo = data.length - 1 - i;
    const d = subDays(today, daysAgo);
    return { i, v, date: d, dateLabel: format(d, 'MMM d') };
  });
  const id = `spark-${color.replace(/[^a-z]/gi, '')}`;

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showTooltip && (
            <Tooltip
              cursor={{ stroke: color, strokeOpacity: 0.6, strokeWidth: 1.5 }}
              wrapperStyle={{ outline: 'none', zIndex: 50 }}
              position={{ y: -45 }}
              contentStyle={{
                background: 'hsl(var(--foreground))',
                color: 'hsl(var(--background))',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 10px',
                boxShadow: '0 8px 24px hsl(var(--foreground) / 0.25)',
              }}
              labelStyle={{
                color: 'hsl(var(--background))',
                opacity: 0.7,
                fontWeight: 500,
                fontSize: 10,
                marginBottom: 2,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
              itemStyle={{ color: 'hsl(var(--background))', padding: 0, fontWeight: 700 }}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as { dateLabel?: string } | undefined;
                return p?.dateLabel ?? '';
              }}
              formatter={(value: number) => [
                `${value} ${itemLabel}${value === 1 ? '' : 's'}`,
                '',
              ]}
              separator=""
            />
          )}
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
