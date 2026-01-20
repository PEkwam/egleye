import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';
import { InsuranceType } from './types';

interface BarChartSectionProps {
  barChartData: Array<Record<string, string | number>>;
  insuranceType: InsuranceType;
  chartColors: string[];
}

export function BarChartSection({ barChartData, insuranceType, chartColors }: BarChartSectionProps) {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-border/40">
      <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary" />
        Key Metrics Comparison
      </h4>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barChartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {insuranceType === 'nonlife' ? (
              <>
                <Bar dataKey="Premium Revenue (₵M)" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Total Assets (₵M)" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Profit (₵M)" fill={chartColors[2] || 'hsl(262, 83%, 58%)'} radius={[4, 4, 0, 0]} />
              </>
            ) : insuranceType === 'pension' ? (
              <>
                <Bar dataKey="AUM (₵M)" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Contributions (₵M)" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Return (%)" fill={chartColors[2] || 'hsl(262, 83%, 58%)'} radius={[4, 4, 0, 0]} />
              </>
            ) : (
              <>
                <Bar dataKey="Gross Premium (₵M)" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Total Assets (₵M)" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Profit (₵M)" fill={chartColors[2] || 'hsl(262, 83%, 58%)'} radius={[4, 4, 0, 0]} />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
