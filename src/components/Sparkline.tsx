import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

/**
 * Minimal area sparkline. Pass an array of numeric values (e.g. last 7 days).
 * Color accepts an HSL var name like "hsl(var(--primary))".
 */
export function Sparkline({ data, color = 'hsl(var(--primary))', height = 32 }: SparklineProps) {
  if (!data || data.length === 0) return <div style={{ height }} />;
  const series = data.map((v, i) => ({ i, v }));
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
