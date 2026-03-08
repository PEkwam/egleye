import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, Building2, Users, TrendingUp, Landmark,
  PieChart, BarChart3, Wallet
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, Legend
} from 'recharts';
import { PieChart as RechartsPie, Pie } from 'recharts';
import { PensionFundMetric } from '@/hooks/usePensionMetrics';
import {
  FUND_CUSTODIANS_2024,
  ASSET_ALLOCATION_2024,
  INDUSTRY_STRUCTURE_2024,
  CHART_COLORS,
} from './types';

interface PrivatePensionSectionProps {
  metrics?: PensionFundMetric[];
}

const fmt = (value: number) => {
  if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
  return `GH₵${value.toLocaleString()}`;
};

export function PrivatePensionSection({ metrics = [] }: PrivatePensionSectionProps) {
  const tier2Funds = metrics.filter(m => m.fund_type === 'Tier 2');
  const tier3Funds = metrics.filter(m => m.fund_type === 'Tier 3');

  const totals = useMemo(() => {
    const t2 = tier2Funds.reduce((sum, m) => sum + (m.aum || 0), 0);
    const t3 = tier3Funds.reduce((sum, m) => sum + (m.aum || 0), 0);
    const total = t2 + t3;
    return {
      totalAUM: total || INDUSTRY_STRUCTURE_2024.totalIndustryAUM - 22_500_000_000,
      tier2AUM: t2,
      tier3AUM: t3,
      tier2Share: total > 0 ? Math.round((t2 / total) * 100) : INDUSTRY_STRUCTURE_2024.tier2Share,
      tier3Share: total > 0 ? Math.round((t3 / total) * 100) : INDUSTRY_STRUCTURE_2024.tier3Share,
      tier2Count: tier2Funds.length,
      tier3Count: tier3Funds.length,
    };
  }, [tier2Funds, tier3Funds]);

  // Trustees from DB
  const trusteesData = useMemo(() => {
    const funds = [...tier2Funds].filter(m => m.aum).sort((a, b) => (b.aum || 0) - (a.aum || 0)).slice(0, 10);
    const total = funds.reduce((sum, m) => sum + (m.aum || 0), 0);
    return funds.map((f, i) => ({
      name: (f.trustee_name || f.fund_name).length > 16 ? (f.trustee_name || f.fund_name).slice(0, 16) + '…' : (f.trustee_name || f.fund_name),
      fullName: f.trustee_name || f.fund_name,
      aum: (f.aum || 0) / 1e9,
      share: total > 0 ? ((f.aum || 0) / total * 100) : (f.market_share || 0),
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [tier2Funds]);

  const tierSplit = [
    { name: 'Tier 2', value: totals.tier2Share, fill: CHART_COLORS[1] },
    { name: 'Tier 3', value: totals.tier3Share, fill: CHART_COLORS[2] },
  ];

  const custodianData = FUND_CUSTODIANS_2024.filter(c => c.marketShare >= 1).map((c, i) => ({
    ...c,
    name: c.name.length > 14 ? c.name.slice(0, 14) + '…' : c.name,
    fullName: c.name,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-500" />
            Private Pension Schemes
          </h2>
          <p className="text-sm text-muted-foreground">Tier 2 (Occupational) & Tier 3 (Voluntary)</p>
        </div>
        <Badge variant="outline" className="gap-1 text-xs">
          <Landmark className="h-3 w-3" /> {fmt(totals.totalAUM)} Total AUM
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: DollarSign, label: 'Total AUM', value: fmt(totals.totalAUM), color: 'from-amber-500 to-orange-600', text: 'text-amber-600 dark:text-amber-400' },
          { icon: Building2, label: 'Trustees', value: `${INDUSTRY_STRUCTURE_2024.corporateTrustees}`, color: 'from-blue-500 to-indigo-600', text: 'text-blue-600 dark:text-blue-400' },
          { icon: DollarSign, label: 'Tier 2 AUM', value: totals.tier2AUM > 0 ? fmt(totals.tier2AUM) : `${totals.tier2Share}%`, color: 'from-emerald-500 to-green-600', text: 'text-emerald-600 dark:text-emerald-400' },
          { icon: DollarSign, label: 'Tier 3 AUM', value: totals.tier3AUM > 0 ? fmt(totals.tier3AUM) : `${totals.tier3Share}%`, color: 'from-purple-500 to-violet-600', text: 'text-purple-600 dark:text-purple-400' },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${s.color}`}>
                  <s.icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">{s.label}</span>
              </div>
              <p className={`text-lg font-bold ${s.text}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tier Split + Asset Allocation */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4 text-blue-500" /> Tier Distribution
            </CardTitle>
            <CardDescription>Occupational vs Voluntary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="45%" height={180}>
                <RechartsPie>
                  <Pie data={tierSplit} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={4} dataKey="value">
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4 text-purple-500" /> Asset Allocation
            </CardTitle>
            <CardDescription>Investment distribution (Figure 16)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPie>
                <Pie
                  data={ASSET_ALLOCATION_2024}
                  cx="50%" cy="50%"
                  innerRadius={45} outerRadius={80}
                  paddingAngle={2} dataKey="value"
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

      {/* Corporate Trustees + Fund Custodians */}
      <div className="grid md:grid-cols-2 gap-4">
        {trusteesData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-amber-500" /> Corporate Trustees (Tier 2)
              </CardTitle>
              <CardDescription>Master Trust Schemes by AUM</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(240, trusteesData.length * 30)}>
                <BarChart data={trusteesData} layout="vertical" margin={{ left: 5, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => `${v.toFixed(1)}B`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 9 }} />
                  <Tooltip
                    formatter={(v: number) => [`GH₵${v.toFixed(2)}B`, 'AUM']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="aum" radius={[0, 4, 4, 0]}>
                    {trusteesData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4 text-cyan-500" /> Fund Custodians
            </CardTitle>
            <CardDescription>Market share of custodian banks (Table 1)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(240, custodianData.length * 30)}>
              <BarChart data={custodianData} layout="vertical" margin={{ left: 5, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 9 }} />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, 'Market Share']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="marketShare" radius={[0, 4, 4, 0]}>
                  {custodianData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
