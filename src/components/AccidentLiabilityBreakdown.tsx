import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Plane, User, Briefcase, Users, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORS = {
  publicLiability: 'hsl(221, 83%, 53%)',
  professionalIndemnity: 'hsl(262, 83%, 58%)',
  travel: 'hsl(145, 75%, 40%)',
  workman: 'hsl(24, 95%, 53%)',
  personal: 'hsl(340, 75%, 55%)',
  others: 'hsl(180, 70%, 45%)',
};

interface AccidentLiabilityBreakdownProps {
  year: number;
  quarter: number;
}

export function AccidentLiabilityBreakdown({ year, quarter }: AccidentLiabilityBreakdownProps) {
  const [filter, setFilter] = useState<'top5' | 'top10'>('top5');
  
  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['nonlife-accident-breakdown', year, quarter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nonlife_insurer_metrics')
        .select('insurer_name, accident_public_liability, accident_professional_indemnity, accident_travel, workman_compensation, accident_personal, accident_others, market_share')
        .eq('report_year', year)
        .eq('report_quarter', quarter)
        .order('market_share', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filterCount = filter === 'top5' ? 5 : 10;

  // Industry-wide accident/liability split
  const industrySplit = useMemo(() => {
    const totals = {
      publicLiability: 0,
      professionalIndemnity: 0,
      travel: 0,
      workman: 0,
      personal: 0,
      others: 0,
    };
    
    metrics.forEach(m => {
      totals.publicLiability += m.accident_public_liability || 0;
      totals.professionalIndemnity += m.accident_professional_indemnity || 0;
      totals.travel += m.accident_travel || 0;
      totals.workman += m.workman_compensation || 0;
      totals.personal += m.accident_personal || 0;
      totals.others += m.accident_others || 0;
    });

    const total = Object.values(totals).reduce((sum, v) => sum + v, 0);

    return [
      { name: 'Public Liability', value: totals.publicLiability / 1e6, percentage: total > 0 ? (totals.publicLiability / total * 100) : 0, fill: COLORS.publicLiability, icon: Users },
      { name: 'Professional Indemnity', value: totals.professionalIndemnity / 1e6, percentage: total > 0 ? (totals.professionalIndemnity / total * 100) : 0, fill: COLORS.professionalIndemnity, icon: Briefcase },
      { name: 'Travel', value: totals.travel / 1e6, percentage: total > 0 ? (totals.travel / total * 100) : 0, fill: COLORS.travel, icon: Plane },
      { name: "Workman's Comp", value: totals.workman / 1e6, percentage: total > 0 ? (totals.workman / total * 100) : 0, fill: COLORS.workman, icon: AlertTriangle },
      { name: 'Personal Accident', value: totals.personal / 1e6, percentage: total > 0 ? (totals.personal / total * 100) : 0, fill: COLORS.personal, icon: User },
      { name: 'Others', value: totals.others / 1e6, percentage: total > 0 ? (totals.others / total * 100) : 0, fill: COLORS.others, icon: Shield },
    ];
  }, [metrics]);

  // Per-insurer breakdown
  const insurerBreakdown = useMemo(() => {
    return metrics
      .filter(m => {
        const total = (m.accident_public_liability || 0) + (m.accident_professional_indemnity || 0) + 
                      (m.accident_travel || 0) + (m.workman_compensation || 0) + 
                      (m.accident_personal || 0) + (m.accident_others || 0);
        return total > 0;
      })
      .slice(0, filterCount)
      .map(m => ({
        name: m.insurer_name.split(' ').slice(0, 2).join(' '),
        'Public Liability': (m.accident_public_liability || 0) / 1e6,
        'Prof. Indemnity': (m.accident_professional_indemnity || 0) / 1e6,
        'Travel': (m.accident_travel || 0) / 1e6,
        "Workman's Comp": (m.workman_compensation || 0) / 1e6,
        'Personal': (m.accident_personal || 0) / 1e6,
        'Others': (m.accident_others || 0) / 1e6,
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
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
        {`${percentage.toFixed(1)}%`}
      </text>
    );
  };

  // Summary stats
  const totalPremium = useMemo(() => {
    return industrySplit.reduce((sum, s) => sum + s.value, 0);
  }, [industrySplit]);

  const topCategories = useMemo(() => {
    return [...industrySplit].sort((a, b) => b.value - a.value).slice(0, 3);
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {industrySplit.map((item, idx) => {
          const IconComponent = item.icon;
          const colorClasses = [
            { bg: 'from-blue-500/10 to-indigo-500/10', border: 'border-blue-500/20', text: 'text-blue-600', textBold: 'text-blue-700' },
            { bg: 'from-purple-500/10 to-violet-500/10', border: 'border-purple-500/20', text: 'text-purple-600', textBold: 'text-purple-700' },
            { bg: 'from-green-500/10 to-emerald-500/10', border: 'border-green-500/20', text: 'text-green-600', textBold: 'text-green-700' },
            { bg: 'from-orange-500/10 to-amber-500/10', border: 'border-orange-500/20', text: 'text-orange-600', textBold: 'text-orange-700' },
            { bg: 'from-pink-500/10 to-rose-500/10', border: 'border-pink-500/20', text: 'text-pink-600', textBold: 'text-pink-700' },
            { bg: 'from-cyan-500/10 to-teal-500/10', border: 'border-cyan-500/20', text: 'text-cyan-600', textBold: 'text-cyan-700' },
          ][idx];
          
          return (
            <Card key={item.name} className={`bg-gradient-to-br ${colorClasses.bg} ${colorClasses.border}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <IconComponent className={`h-3.5 w-3.5 ${colorClasses.text}`} />
                  <span className="text-[10px] text-muted-foreground truncate">{item.name}</span>
                </div>
                <p className={`text-lg font-bold ${colorClasses.textBold}`}>₵{item.value.toFixed(0)}M</p>
                <p className={`text-[10px] ${colorClasses.text}`}>{item.percentage.toFixed(1)}%</p>
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
              <Shield className="h-5 w-5 text-blue-500" />
              Accident & Liability Split - Industry Total
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
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 p-3 rounded-lg bg-secondary/30 text-center">
              <p className="text-sm text-muted-foreground">
                Total Accident & Liability Premium: <strong className="text-foreground">₵{totalPremium.toFixed(1)}M</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Per-Insurer Stacked Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
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
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="Public Liability" stackId="accident" fill={COLORS.publicLiability} />
                  <Bar dataKey="Prof. Indemnity" stackId="accident" fill={COLORS.professionalIndemnity} />
                  <Bar dataKey="Travel" stackId="accident" fill={COLORS.travel} />
                  <Bar dataKey="Workman's Comp" stackId="accident" fill={COLORS.workman} />
                  <Bar dataKey="Personal" stackId="accident" fill={COLORS.personal} />
                  <Bar dataKey="Others" stackId="accident" fill={COLORS.others} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                No accident & liability data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Categories Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights - Accident & Liability Segment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topCategories.map((category, idx) => (
              <div key={category.name} className="p-4 rounded-xl border bg-gradient-to-br from-card to-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: category.fill }}
                  />
                  <span className="font-medium">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {category.name}</span>
                </div>
                <p className="text-2xl font-bold">₵{category.value.toFixed(1)}M</p>
                <p className="text-sm text-muted-foreground">
                  {category.percentage.toFixed(1)}% of total accident & liability premium
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}