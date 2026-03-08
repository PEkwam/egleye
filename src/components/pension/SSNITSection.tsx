import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, Users, TrendingUp, Activity, Building2,
  Wallet, Target, Calendar, Shield
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { PensionFundMetric } from '@/hooks/usePensionMetrics';
import { SSNIT_2024, SSNIT_HISTORICAL, CHART_COLORS } from './types';

interface SSNITSectionProps {
  metrics?: PensionFundMetric[];
}

const fmt = (value: number) => {
  if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
  return `GH₵${value.toLocaleString()}`;
};

export function SSNITSection({ metrics = [] }: SSNITSectionProps) {
  const data = useMemo(() => {
    const fund = metrics.find(m => m.fund_type === 'Tier 1' || m.fund_name?.includes('SSNIT'));
    return {
      totalAssets: fund?.aum || SSNIT_2024.totalAssets,
      contributors: fund?.total_contributors || SSNIT_2024.activeContributors,
      pensioners: SSNIT_2024.activePensioners,
      dependencyRatio: SSNIT_2024.dependencyRatio,
      roi: fund?.investment_return || SSNIT_2024.returnOnInvestment,
      employers: SSNIT_2024.employers,
      contributions: SSNIT_2024.contributionsReceived,
      benefits: fund?.total_benefits_paid || SSNIT_2024.benefitsPaid,
      minPension: SSNIT_2024.minimumPension,
    };
  }, [metrics]);

  const statsGrid = [
    { icon: DollarSign, label: 'Total Assets', value: fmt(data.totalAssets), color: 'from-amber-500 to-orange-600', text: 'text-amber-600 dark:text-amber-400' },
    { icon: Users, label: 'Contributors', value: `${(data.contributors / 1e6).toFixed(2)}M`, color: 'from-blue-500 to-indigo-600', text: 'text-blue-600 dark:text-blue-400' },
    { icon: TrendingUp, label: 'ROI', value: `${data.roi.toFixed(1)}%`, color: 'from-emerald-500 to-green-600', text: 'text-emerald-600 dark:text-emerald-400' },
    { icon: Activity, label: 'Dependency Ratio', value: `1:${data.dependencyRatio}`, color: 'from-purple-500 to-violet-600', text: 'text-purple-600 dark:text-purple-400' },
    { icon: Building2, label: 'Employers', value: `${(data.employers / 1000).toFixed(1)}K`, color: 'from-cyan-500 to-teal-600', text: 'text-cyan-600 dark:text-cyan-400' },
  ];

  // Combine historical for dual-axis chart
  const employerDependencyData = SSNIT_HISTORICAL.employers.map((e, i) => ({
    year: e.year,
    employers: e.value,
    ratio: SSNIT_HISTORICAL.dependencyRatio[i]?.value || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            SSNIT (BNSSS) — Tier 1
          </h2>
          <p className="text-sm text-muted-foreground">Basic National Social Security Scheme • NPRA Annual Report</p>
        </div>
        <Badge variant="outline" className="gap-1 text-xs">
          <Calendar className="h-3 w-3" /> Annual Report
        </Badge>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {statsGrid.map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${s.color}`}>
                  <s.icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">{s.label}</span>
              </div>
              <p className={`text-lg sm:text-xl font-bold ${s.text}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Asset Growth */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-amber-500" /> Total Assets Growth
            </CardTitle>
            <CardDescription>GH₵ Billions • 2020–2024</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={SSNIT_HISTORICAL.totalAssets}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${v}B`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: number) => [`GH₵${v}B`, 'Assets']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={3} dot={{ fill: CHART_COLORS[0], strokeWidth: 2, r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Employers & Dependency */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-blue-500" /> Employers & Dependency
            </CardTitle>
            <CardDescription>Registered employers & dependency ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={employerDependencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 1e3).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" domain={[6, 9]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    name === 'employers' ? v.toLocaleString() : v.toFixed(2),
                    name === 'employers' ? 'Employers' : 'Dependency Ratio'
                  ]}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="employers" name="Employers" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="ratio" name="Dep. Ratio" stroke={CHART_COLORS[4]} strokeWidth={2} dot={{ r: 4 }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Key Financial Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-purple-500" /> Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Wallet, label: 'Contributions Received', value: fmt(data.contributions), color: 'text-emerald-600' },
              { icon: DollarSign, label: 'Benefits Paid', value: fmt(data.benefits), color: 'text-rose-600' },
              { icon: Users, label: 'Active Pensioners', value: `${(data.pensioners / 1000).toFixed(0)}K`, color: 'text-blue-600' },
              { icon: Calendar, label: 'Minimum Pension', value: `GH₵${data.minPension}`, color: 'text-amber-600' },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/40 border border-border/30">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</p>
                </div>
                <p className={`text-base sm:text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
