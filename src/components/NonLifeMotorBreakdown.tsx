import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Car, Shield, Flame } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORS = {
  comprehensive: 'hsl(145, 75%, 40%)',
  thirdParty: 'hsl(221, 83%, 53%)',
  fireTheft: 'hsl(24, 95%, 53%)',
  others: 'hsl(262, 83%, 58%)',
};

interface NonLifeMotorBreakdownProps {
  year: number;
  quarter: number;
}

export function NonLifeMotorBreakdown({ year, quarter }: NonLifeMotorBreakdownProps) {
  const [filter, setFilter] = useState<'top5' | 'top10'>('top5');
  
  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['nonlife-motor-breakdown', year, quarter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nonlife_insurer_metrics')
        .select('insurer_name, motor_comprehensive, motor_third_party, motor_third_party_fire_theft, motor_others, market_share')
        .eq('report_year', year)
        .eq('report_quarter', quarter)
        .order('market_share', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filterCount = filter === 'top5' ? 5 : 10;

  // Industry-wide motor product split
  const industrySplit = useMemo(() => {
    const totals = {
      comprehensive: 0,
      thirdParty: 0,
      fireTheft: 0,
      others: 0,
    };
    
    metrics.forEach(m => {
      totals.comprehensive += m.motor_comprehensive || 0;
      totals.thirdParty += m.motor_third_party || 0;
      totals.fireTheft += m.motor_third_party_fire_theft || 0;
      totals.others += m.motor_others || 0;
    });

    const total = totals.comprehensive + totals.thirdParty + totals.fireTheft + totals.others;

    return [
      { name: 'Comprehensive', value: totals.comprehensive / 1e6, percentage: total > 0 ? (totals.comprehensive / total * 100) : 0, fill: COLORS.comprehensive },
      { name: 'Third Party', value: totals.thirdParty / 1e6, percentage: total > 0 ? (totals.thirdParty / total * 100) : 0, fill: COLORS.thirdParty },
      { name: 'Fire & Theft', value: totals.fireTheft / 1e6, percentage: total > 0 ? (totals.fireTheft / total * 100) : 0, fill: COLORS.fireTheft },
      { name: 'Others', value: totals.others / 1e6, percentage: total > 0 ? (totals.others / total * 100) : 0, fill: COLORS.others },
    ];
  }, [metrics]);

  // Per-insurer breakdown filtered
  const insurerBreakdown = useMemo(() => {
    return metrics.slice(0, filterCount).map(m => ({
      name: m.insurer_name.split(' ').slice(0, 2).join(' '),
      Comprehensive: (m.motor_comprehensive || 0) / 1e6,
      'Third Party': (m.motor_third_party || 0) / 1e6,
      'Fire & Theft': (m.motor_third_party_fire_theft || 0) / 1e6,
      Others: (m.motor_others || 0) / 1e6,
    }));
  }, [metrics, filterCount]);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Comprehensive</span>
            </div>
            <p className="text-xl font-bold text-green-700">₵{industrySplit[0]?.value.toFixed(0)}M</p>
            <p className="text-xs text-green-600">{industrySplit[0]?.percentage.toFixed(1)}% of motor</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Car className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Third Party</span>
            </div>
            <p className="text-xl font-bold text-blue-700">₵{industrySplit[1]?.value.toFixed(0)}M</p>
            <p className="text-xs text-blue-600">{industrySplit[1]?.percentage.toFixed(1)}% of motor</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-muted-foreground">Fire & Theft</span>
            </div>
            <p className="text-xl font-bold text-orange-700">₵{industrySplit[2]?.value.toFixed(0)}M</p>
            <p className="text-xs text-orange-600">{industrySplit[2]?.percentage.toFixed(1)}% of motor</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Car className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Other Motor</span>
            </div>
            <p className="text-xl font-bold text-purple-700">₵{industrySplit[3]?.value.toFixed(0)}M</p>
            <p className="text-xs text-purple-600">{industrySplit[3]?.percentage.toFixed(1)}% of motor</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industry-wide Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-green-500" />
              Motor Product Mix - Industry Total
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
                  outerRadius={100}
                  innerRadius={50}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                >
                  {industrySplit.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₵${value.toFixed(1)}M`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 rounded-lg bg-secondary/30 text-center">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{summaryStats.largest?.name}</strong> dominates with{' '}
                <strong className="text-foreground">{summaryStats.largest?.percentage.toFixed(1)}%</strong> of total motor premium
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Per-Insurer Stacked Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Motor Breakdown by Insurer - Top {filterCount} (₵M)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={insurerBreakdown} layout="vertical">
                <XAxis type="number" tickFormatter={v => `₵${v}M`} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `₵${v.toFixed(1)}M`} />
                <Legend />
                <Bar dataKey="Comprehensive" stackId="motor" fill={COLORS.comprehensive} />
                <Bar dataKey="Third Party" stackId="motor" fill={COLORS.thirdParty} />
                <Bar dataKey="Fire & Theft" stackId="motor" fill={COLORS.fireTheft} />
                <Bar dataKey="Others" stackId="motor" fill={COLORS.others} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
