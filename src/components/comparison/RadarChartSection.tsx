import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from 'recharts';
import { type GhanaInsurer } from '@/types/insurers';

interface RadarChartSectionProps {
  radarData: Array<Record<string, string | number>>;
  selectedInsurers: GhanaInsurer[];
  chartColors: string[];
}

export function RadarChartSection({ radarData, selectedInsurers, chartColors }: RadarChartSectionProps) {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-border/40">
      <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary" />
        Performance Comparison
      </h4>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
            {selectedInsurers.map((insurer, idx) => (
              <Radar
                key={insurer.id}
                name={insurer.shortName}
                dataKey={insurer.id}
                stroke={chartColors[idx]}
                fill={chartColors[idx]}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            ))}
            <Legend 
              formatter={(value) => selectedInsurers.find(i => i.id === value)?.shortName || value}
              wrapperStyle={{ paddingTop: '10px' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
