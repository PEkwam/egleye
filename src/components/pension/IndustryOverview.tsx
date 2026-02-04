import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, Users, TrendingUp, Building2, 
  Wallet, PieChart, BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Cell
} from 'recharts';
import { PieChart as RechartsPie, Pie } from 'recharts';
import { PensionFundMetric } from '@/hooks/usePensionMetrics';
import { SSNIT_2024, PRIVATE_PENSION_2024, INDUSTRY_GROWTH } from './data';
import { CHART_COLORS } from './types';

interface IndustryOverviewProps {
  metrics: PensionFundMetric[];
  selectedYear: number | null;
}

const formatCurrency = (value: number) => {
  if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
  return `GH₵${value.toLocaleString()}`;
};

export function IndustryOverview({ metrics, selectedYear }: IndustryOverviewProps) {
  // Calculate industry totals combining database + static data
  const industryTotals = useMemo(() => {
    // Use static NPRA 2024 data as base
    const ssnitAUM = SSNIT_2024.totalAssets;
    const privateAUM = PRIVATE_PENSION_2024.totalAssets;
    
    // If we have database metrics, use those for private pension
    const dbPrivateAUM = metrics
      .filter(m => m.fund_type !== 'Tier 1')
      .reduce((sum, m) => sum + (m.aum || 0), 0);
    
    const effectivePrivateAUM = dbPrivateAUM > 0 ? dbPrivateAUM : privateAUM;
    
    return {
      totalAUM: ssnitAUM + effectivePrivateAUM,
      ssnitAUM,
      privateAUM: effectivePrivateAUM,
      totalContributors: SSNIT_2024.activeContributors + metrics.reduce((sum, m) => sum + (m.total_contributors || 0), 0),
      totalBenefits: SSNIT_2024.benefitsPaid + PRIVATE_PENSION_2024.benefitsPaid,
      fundsCount: PRIVATE_PENSION_2024.registeredSchemes,
      corporateTrustees: PRIVATE_PENSION_2024.corporateTrustees,
      fundCustodians: PRIVATE_PENSION_2024.fundCustodians,
      aumGrowth: INDUSTRY_GROWTH.aumGrowth,
    };
  }, [metrics]);

  // Top funds by AUM from database
  const topFundsByAUM = useMemo(() => 
    [...metrics]
      .filter(m => m.aum && m.fund_type !== 'Tier 1')
      .sort((a, b) => (b.aum || 0) - (a.aum || 0))
      .slice(0, 8)
      .map((m, index) => ({
        name: m.fund_name.length > 18 ? m.fund_name.slice(0, 18) + '...' : m.fund_name,
        fullName: m.fund_name,
        aum: (m.aum || 0) / 1e9,
        marketShare: m.market_share || 0,
        type: m.fund_type,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      })),
    [metrics]
  );

  // Market share for pie chart
  const marketShareData = useMemo(() => {
    const data = topFundsByAUM.slice(0, 6).map(m => ({
      name: m.name,
      value: m.marketShare,
      fill: m.fill,
    }));
    
    // Add "Others" if there are more funds
    const othersShare = topFundsByAUM.slice(6).reduce((sum, m) => sum + m.marketShare, 0);
    if (othersShare > 0) {
      data.push({ name: 'Others', value: othersShare, fill: CHART_COLORS[7] });
    }
    
    return data;
  }, [topFundsByAUM]);

  return (
    <div className="space-y-6">
      {/* Key Industry Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-orange-600/5 border-2 border-amber-500/30 hover:border-amber-500/50 transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Total AUM</span>
            </div>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(industryTotals.totalAUM)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              +{industryTotals.aumGrowth}% YoY
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/15 via-blue-400/10 to-indigo-600/5 border-2 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">SSNIT AUM</span>
            </div>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(industryTotals.ssnitAUM)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Tier 1</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/15 via-emerald-400/10 to-green-600/5 border-2 border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Private AUM</span>
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(industryTotals.privateAUM)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Tier 2 & 3</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/15 via-purple-400/10 to-violet-600/5 border-2 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
                <Users className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">Contributors</span>
            </div>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {(industryTotals.totalContributors / 1e6).toFixed(2)}M
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-rose-500/15 via-rose-400/10 to-pink-600/5 border-2 border-rose-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Trustees</span>
            </div>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
              {industryTotals.corporateTrustees}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Corporate</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-500/15 via-cyan-400/10 to-teal-600/5 border-2 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">Benefits Paid</span>
            </div>
            <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
              {formatCurrency(industryTotals.totalBenefits)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {topFundsByAUM.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Funds by AUM */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-amber-500" />
                Top Private Pension Funds
              </CardTitle>
              <CardDescription>Assets Under Management (GH₵ Billions)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topFundsByAUM} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => `${v.toFixed(1)}B`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: number) => [`GH₵${value.toFixed(2)}B`, 'AUM']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="aum" radius={[0, 4, 4, 0]}>
                    {topFundsByAUM.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Market Share Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChart className="h-5 w-5 text-blue-500" />
                Market Share Distribution
              </CardTitle>
              <CardDescription>Private pension funds market share</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={marketShareData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${value.toFixed(1)}%`}
                    labelLine={false}
                  >
                    {marketShareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
