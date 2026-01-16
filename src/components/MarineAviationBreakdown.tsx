import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Ship, Plane, Anchor } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORS = {
  cargo: 'hsl(221, 83%, 53%)',
  hull: 'hsl(145, 75%, 40%)',
  aviation: 'hsl(262, 83%, 58%)',
};

interface MarineAviationBreakdownProps {
  year: number;
  quarter: number;
}

export function MarineAviationBreakdown({ year, quarter }: MarineAviationBreakdownProps) {
  const [filter, setFilter] = useState<'top5' | 'top10'>('top5');
  
  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['nonlife-marine-breakdown', year, quarter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nonlife_insurer_metrics')
        .select('insurer_name, marine_cargo, marine_hull, aviation, market_share')
        .eq('report_year', year)
        .eq('report_quarter', quarter)
        .order('market_share', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filterCount = filter === 'top5' ? 5 : 10;

  // Industry-wide marine/aviation split
  const industrySplit = useMemo(() => {
    const totals = {
      cargo: 0,
      hull: 0,
      aviation: 0,
    };
    
    metrics.forEach(m => {
      totals.cargo += m.marine_cargo || 0;
      totals.hull += m.marine_hull || 0;
      totals.aviation += m.aviation || 0;
    });

    const total = Object.values(totals).reduce((sum, v) => sum + v, 0);

    return [
      { name: 'Marine Cargo', value: totals.cargo / 1e6, percentage: total > 0 ? (totals.cargo / total * 100) : 0, fill: COLORS.cargo, icon: Ship },
      { name: 'Marine Hull', value: totals.hull / 1e6, percentage: total > 0 ? (totals.hull / total * 100) : 0, fill: COLORS.hull, icon: Anchor },
      { name: 'Aviation', value: totals.aviation / 1e6, percentage: total > 0 ? (totals.aviation / total * 100) : 0, fill: COLORS.aviation, icon: Plane },
    ];
  }, [metrics]);

  // Per-insurer breakdown
  const insurerBreakdown = useMemo(() => {
    return metrics
      .filter(m => {
        const total = (m.marine_cargo || 0) + (m.marine_hull || 0) + (m.aviation || 0);
        return total > 0;
      })
      .slice(0, filterCount)
      .map(m => ({
        name: m.insurer_name.split(' ').slice(0, 2).join(' '),
        'Marine Cargo': (m.marine_cargo || 0) / 1e6,
        'Marine Hull': (m.marine_hull || 0) / 1e6,
        'Aviation': (m.aviation || 0) / 1e6,
      }));
  }, [metrics, filterCount]);

  // Custom label for pie chart
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    if (percentage < 5) return null;
    
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${percentage.toFixed(1)}%`}
      </text>
    );
  };

  // Summary stats
  const totalPremium = useMemo(() => {
    return industrySplit.reduce((sum, s) => sum + s.value, 0);
  }, [industrySplit]);

  const topCategory = useMemo(() => {
    return [...industrySplit].sort((a, b) => b.value - a.value)[0];
  }, [industrySplit]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show:</span>
        <div className="flex rounded-lg border overflow-hidden">
          <Button
            variant={filter === 'top5' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('top5')}
            className="rounded-none"
          >
            Top 5
          </Button>
          <Button
            variant={filter === 'top10' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('top10')}
            className="rounded-none"
          >
            Top 10
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {industrySplit.map((item, idx) => {
          const IconComponent = item.icon;
          const colorClasses = [
            { bg: 'from-blue-500/10 to-indigo-500/10', border: 'border-blue-500/20', text: 'text-blue-600', textBold: 'text-blue-700' },
            { bg: 'from-green-500/10 to-emerald-500/10', border: 'border-green-500/20', text: 'text-green-600', textBold: 'text-green-700' },
            { bg: 'from-purple-500/10 to-violet-500/10', border: 'border-purple-500/20', text: 'text-purple-600', textBold: 'text-purple-700' },
          ][idx];
          
          return (
            <Card key={item.name} className={`bg-gradient-to-br ${colorClasses.bg} ${colorClasses.border}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <IconComponent className={`h-5 w-5 ${colorClasses.text}`} />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
                <p className={`text-2xl font-bold ${colorClasses.textBold}`}>₵{item.value.toFixed(1)}M</p>
                <p className={`text-sm ${colorClasses.text}`}>{item.percentage.toFixed(1)}% of marine & aviation</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industry-wide Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-blue-500" />
              Marine & Aviation Split - Industry Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={industrySplit.filter(s => s.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={55}
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {industrySplit.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₵${value.toFixed(1)}M`} />
                <Legend 
                  formatter={(value, entry: any) => `${value}: ${entry.payload.percentage?.toFixed(1)}%`}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 p-3 rounded-lg bg-secondary/30 text-center">
              <p className="text-sm text-muted-foreground">
                Total Marine & Aviation Premium: <strong className="text-foreground">₵{totalPremium.toFixed(1)}M</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Per-Insurer Stacked Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-purple-500" />
              Breakdown by Insurer - Top {filterCount} (₵M)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insurerBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={insurerBreakdown} layout="vertical">
                  <XAxis type="number" tickFormatter={v => `₵${v}M`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `₵${v.toFixed(2)}M`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Marine Cargo" stackId="marine" fill={COLORS.cargo} />
                  <Bar dataKey="Marine Hull" stackId="marine" fill={COLORS.hull} />
                  <Bar dataKey="Aviation" stackId="marine" fill={COLORS.aviation} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                No marine & aviation data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Insight */}
      {topCategory && topCategory.value > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Insights - Marine & Aviation Segment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-xl border bg-gradient-to-br from-card to-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: topCategory.fill }}
                />
                <span className="font-medium">🥇 Dominant Category: {topCategory.name}</span>
              </div>
              <p className="text-2xl font-bold">₵{topCategory.value.toFixed(1)}M</p>
              <p className="text-sm text-muted-foreground">
                {topCategory.percentage.toFixed(1)}% of total marine & aviation premium
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {topCategory.name === 'Marine Cargo' && 'Marine Cargo insurance leads the segment, covering goods in transit via sea, air, or land transport.'}
                {topCategory.name === 'Marine Hull' && 'Marine Hull insurance leads the segment, protecting vessels and ships against physical damage.'}
                {topCategory.name === 'Aviation' && 'Aviation insurance leads the segment, covering aircraft and related aviation risks.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
