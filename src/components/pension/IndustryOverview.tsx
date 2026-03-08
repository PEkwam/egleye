import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, Users, TrendingUp, Building2,
  Landmark, PieChart, BarChart3, Wallet, Shield, Briefcase
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, Legend
} from 'recharts';
import { PieChart as RechartsPie, Pie } from 'recharts';
import { PensionFundMetric } from '@/hooks/usePensionMetrics';
import {
  SSNIT_2024,
  SSNIT_HISTORICAL,
  ASSET_ALLOCATION_2024,
  FUND_CUSTODIANS_2024,
  INDUSTRY_STRUCTURE_2024,
  CHART_COLORS,
} from './types';

interface IndustryOverviewProps {
  metrics: PensionFundMetric[];
  selectedYear: number | null;
}

const fmt = (value: number) => {
  if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
  return `GH₵${value.toLocaleString()}`;
};

export function IndustryOverview({ metrics, selectedYear }: IndustryOverviewProps) {
  const ssnitFund = metrics.find(m => m.fund_type === 'Tier 1');
  const privateFunds = metrics.filter(m => m.fund_type !== 'Tier 1');

  const totals = useMemo(() => {
    const ssnitAUM = ssnitFund?.aum || SSNIT_2024.totalAssets;
    const privateAUM = privateFunds.reduce((sum, m) => sum + (m.aum || 0), 0);
    const totalAUM = privateAUM > 0 ? ssnitAUM + privateAUM : INDUSTRY_STRUCTURE_2024.totalIndustryAUM;

    const tier2AUM = metrics.filter(m => m.fund_type === 'Tier 2').reduce((sum, m) => sum + (m.aum || 0), 0);
    const tier3AUM = metrics.filter(m => m.fund_type === 'Tier 3').reduce((sum, m) => sum + (m.aum || 0), 0);

    return {
      totalAUM,
      ssnitAUM,
      privateAUM: privateAUM || INDUSTRY_STRUCTURE_2024.totalIndustryAUM - SSNIT_2024.totalAssets,
      tier2AUM,
      tier3AUM,
      contributors: ssnitFund?.total_contributors || SSNIT_2024.activeContributors,
      pensioners: SSNIT_2024.activePensioners,
      roi: ssnitFund?.investment_return || SSNIT_2024.returnOnInvestment,
      corporateTrustees: INDUSTRY_STRUCTURE_2024.corporateTrustees,
      custodians: INDUSTRY_STRUCTURE_2024.fundCustodians,
      managers: INDUSTRY_STRUCTURE_2024.pensionFundManagers,
    };
  }, [metrics, ssnitFund, privateFunds]);

  // Top trustees from DB
  const topTrustees = useMemo(() => {
    const funds = [...privateFunds]
      .filter(m => m.aum)
      .sort((a, b) => (b.aum || 0) - (a.aum || 0))
      .slice(0, 10);
    const total = funds.reduce((sum, m) => sum + (m.aum || 0), 0);
    return funds.map((f, i) => ({
      name: (f.trustee_name || f.fund_name).length > 18
        ? (f.trustee_name || f.fund_name).slice(0, 18) + '…'
        : (f.trustee_name || f.fund_name),
      fullName: f.trustee_name || f.fund_name,
      aum: (f.aum || 0) / 1e9,
      share: total > 0 ? ((f.aum || 0) / total) * 100 : (f.market_share || 0),
      type: f.fund_type,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [privateFunds]);

  // AUM Growth over years
  const aumGrowthData = SSNIT_HISTORICAL.totalAssets;

  // Tier split pie
  const tierSplit = useMemo(() => {
    const t2 = totals.tier2AUM;
    const t3 = totals.tier3AUM;
    const total = t2 + t3;
    return [
      { name: 'Tier 2 (Occupational)', value: total > 0 ? Math.round((t2 / total) * 100) : INDUSTRY_STRUCTURE_2024.tier2Share, fill: CHART_COLORS[1] },
      { name: 'Tier 3 (Voluntary)', value: total > 0 ? Math.round((t3 / total) * 100) : INDUSTRY_STRUCTURE_2024.tier3Share, fill: CHART_COLORS[2] },
    ];
  }, [totals]);

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: DollarSign, label: 'Total Industry AUM', value: fmt(totals.totalAUM), sub: `${selectedYear || ''}`, color: 'from-amber-500 to-orange-600', text: 'text-amber-600 dark:text-amber-400' },
          { icon: Shield, label: 'SSNIT (Tier 1)', value: fmt(totals.ssnitAUM), sub: 'BNSSS', color: 'from-blue-500 to-indigo-600', text: 'text-blue-600 dark:text-blue-400' },
          { icon: Wallet, label: 'Private Pensions', value: fmt(totals.privateAUM), sub: 'Tier 2 & 3', color: 'from-emerald-500 to-green-600', text: 'text-emerald-600 dark:text-emerald-400' },
          { icon: Users, label: 'SSNIT Contributors', value: `${(totals.contributors / 1e6).toFixed(2)}M`, sub: `${totals.pensioners.toLocaleString()} pensioners`, color: 'from-purple-500 to-violet-600', text: 'text-purple-600 dark:text-purple-400' },
        ].map((s, i) => (
          <Card key={i} className="relative overflow-hidden border-border/50 hover:border-border transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${s.color}`}>
                  <s.icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">{s.label}</span>
              </div>
              <p className={`text-lg sm:text-xl font-bold ${s.text}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Industry structure badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
          <Building2 className="h-3 w-3" />{totals.corporateTrustees} Corporate Trustees
        </Badge>
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
          <Landmark className="h-3 w-3" />{totals.custodians} Fund Custodians
        </Badge>
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
          <Briefcase className="h-3 w-3" />{totals.managers} Fund Managers
        </Badge>
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
          <TrendingUp className="h-3 w-3" />{totals.roi.toFixed(1)}% SSNIT ROI
        </Badge>
      </div>

      {/* Charts row 1: AUM Growth + Tier Split */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              Industry AUM Growth
            </CardTitle>
            <CardDescription>Total pension assets (GH₵ Billions) • 2020-2024</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={aumGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${v}B`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [`GH₵${v}B`, 'Total AUM']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {aumGrowthData.map((_, i) => (
                    <Cell key={i} fill={i === aumGrowthData.length - 1 ? CHART_COLORS[0] : 'hsl(var(--muted-foreground) / 0.3)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4 text-blue-500" />
              Private Pension Tier Split
            </CardTitle>
            <CardDescription>Tier 2 vs Tier 3 distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={220}>
                <RechartsPie>
                  <Pie data={tierSplit} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                    {tierSplit.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="flex-1 space-y-4">
                {tierSplit.map((t) => (
                  <div key={t.name}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.fill }} />
                      <span className="text-sm font-medium">{t.name}</span>
                    </div>
                    <p className="text-3xl font-bold">{t.value}%</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Top Trustees + Asset Allocation */}
      {topTrustees.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
                Top Corporate Trustees
              </CardTitle>
              <CardDescription>By AUM (GH₵ Billions)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(240, topTrustees.length * 32)}>
                <BarChart data={topTrustees} layout="vertical" margin={{ left: 5, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => `${v.toFixed(1)}B`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9 }} />
                  <Tooltip
                    formatter={(v: number) => [`GH₵${v.toFixed(2)}B`, 'AUM']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="aum" radius={[0, 4, 4, 0]}>
                    {topTrustees.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChart className="h-4 w-4 text-purple-500" />
                Asset Allocation
              </CardTitle>
              <CardDescription>Investment distribution • Figure 16</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RechartsPie>
                  <Pie
                    data={ASSET_ALLOCATION_2024}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ value }) => value >= 3 ? `${value}%` : ''}
                    labelLine={false}
                  >
                    {ASSET_ALLOCATION_2024.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '10px' }} />
                </RechartsPie>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fund Custodians */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4 text-cyan-500" />
            Fund Custodians Market Share
          </CardTitle>
          <CardDescription>13 active custodians out of 18 registered • Table 1</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {FUND_CUSTODIANS_2024.filter(c => c.marketShare > 0).map((c, i) => (
              <div key={c.name} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/30">
                <div className="w-2 h-8 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{c.name}</p>
                  <p className="text-sm font-bold">{c.marketShare}%</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
