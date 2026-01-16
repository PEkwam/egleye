import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Home, Flame } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORS = {
  private: 'hsl(221, 83%, 53%)',
  commercial: 'hsl(24, 95%, 53%)',
};

interface PropertyBreakdownProps {
  year: number;
  quarter: number;
}

export function PropertyBreakdown({ year, quarter }: PropertyBreakdownProps) {
  const [filter, setFilter] = useState<'top5' | 'top10'>('top5');
  
  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['nonlife-property-breakdown', year, quarter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nonlife_insurer_metrics')
        .select('insurer_name, fire_property_private, fire_property_commercial, market_share')
        .eq('report_year', year)
        .eq('report_quarter', quarter)
        .order('market_share', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filterCount = filter === 'top5' ? 5 : 10;

  // Industry-wide property split
  const industrySplit = useMemo(() => {
    const totals = { private: 0, commercial: 0 };
    
    metrics.forEach(m => {
      totals.private += m.fire_property_private || 0;
      totals.commercial += m.fire_property_commercial || 0;
    });

    const total = totals.private + totals.commercial;

    return [
      { name: 'Residential/Private', value: totals.private / 1e6, percentage: total > 0 ? (totals.private / total * 100) : 0, fill: COLORS.private },
      { name: 'Commercial', value: totals.commercial / 1e6, percentage: total > 0 ? (totals.commercial / total * 100) : 0, fill: COLORS.commercial },
    ];
  }, [metrics]);

  // Per-insurer breakdown
  const insurerBreakdown = useMemo(() => {
    return metrics
      .filter(m => (m.fire_property_private || 0) + (m.fire_property_commercial || 0) > 0)
      .slice(0, filterCount)
      .map(m => ({
        name: m.insurer_name.split(' ').slice(0, 2).join(' '),
        'Residential': (m.fire_property_private || 0) / 1e6,
        'Commercial': (m.fire_property_commercial || 0) / 1e6,
      }));
  }, [metrics, filterCount]);

  // Custom label for pie chart
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, percentage }: any) => {
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
  const summaryStats = useMemo(() => {
    const total = industrySplit.reduce((sum, s) => sum + s.value, 0);
    const largest = industrySplit.reduce((max, s) => s.value > max.value ? s : max, industrySplit[0]);
    return { total, largest };
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
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Home className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Residential/Private</span>
            </div>
            <p className="text-xl font-bold text-blue-700">₵{industrySplit[0]?.value.toFixed(0)}M</p>
            <p className="text-xs text-blue-600">{industrySplit[0]?.percentage.toFixed(1)}% of property</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-muted-foreground">Commercial</span>
            </div>
            <p className="text-xl font-bold text-orange-700">₵{industrySplit[1]?.value.toFixed(0)}M</p>
            <p className="text-xs text-orange-600">{industrySplit[1]?.percentage.toFixed(1)}% of property</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industry-wide Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Property Insurance Split - Industry Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={industrySplit.filter(s => s.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={60}
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {industrySplit.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₵${value.toFixed(1)}M`} />
                <Legend formatter={(value, entry: any) => `${value}: ${entry.payload.percentage?.toFixed(1)}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 rounded-lg bg-secondary/30 text-center">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{summaryStats.largest?.name}</strong> accounts for{' '}
                <strong className="text-foreground">{summaryStats.largest?.percentage.toFixed(1)}%</strong> of total property premium
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Per-Insurer Stacked Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              Property Breakdown by Insurer - Top {filterCount} (₵M)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={insurerBreakdown} layout="vertical">
                <XAxis type="number" tickFormatter={v => `₵${v}M`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `₵${v.toFixed(1)}M`} />
                <Legend />
                <Bar dataKey="Residential" stackId="property" fill={COLORS.private} />
                <Bar dataKey="Commercial" stackId="property" fill={COLORS.commercial} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}