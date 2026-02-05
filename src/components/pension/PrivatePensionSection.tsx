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
 import { FUND_CUSTODIANS, ASSET_ALLOCATION } from './data';
 import { CHART_COLORS } from './types';

interface PrivatePensionSectionProps {
  metrics?: PensionFundMetric[];
}

const formatCurrency = (value: number) => {
  if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
  return `GH₵${value.toLocaleString()}`;
};

export function PrivatePensionSection({ metrics = [] }: PrivatePensionSectionProps) {
  // Calculate totals from database
  const totals = useMemo(() => {
    const tier2Funds = metrics.filter(m => m.fund_type === 'Tier 2');
    const tier3Funds = metrics.filter(m => m.fund_type === 'Tier 3');
    
    const tier2AUM = tier2Funds.reduce((sum, m) => sum + (m.aum || 0), 0);
    const tier3AUM = tier3Funds.reduce((sum, m) => sum + (m.aum || 0), 0);
    const totalAUM = tier2AUM + tier3AUM;
    
    return {
      totalAssets: totalAUM || 63880000000, // Fallback to NPRA 2024
      tier2AUM,
      tier3AUM,
      tier2Share: totalAUM > 0 ? (tier2AUM / totalAUM) * 100 : 28,
      tier3Share: totalAUM > 0 ? (tier3AUM / totalAUM) * 100 : 72,
      tier2Count: tier2Funds.length || 12,
      tier3Count: tier3Funds.length || 6,
      corporateTrustees: 23,
      fundCustodians: 18,
      pensionFundManagers: 37,
      registeredSchemes: 218,
      benefitsPaid: 1300000000,
    };
  }, [metrics]);

  // Get trustees from database
  const trusteesChartData = useMemo(() => {
    const tier2Funds = metrics
      .filter(m => m.fund_type === 'Tier 2' && m.aum)
      .sort((a, b) => (b.aum || 0) - (a.aum || 0))
      .slice(0, 8);
    
    const tier2Total = tier2Funds.reduce((sum, m) => sum + (m.aum || 0), 0);
    
    if (tier2Funds.length === 0) {
      // Fallback static data
      return [
        { name: 'Enterprise Trustees', fullName: 'Enterprise Trustees', aum: 3.98, marketShare: 22.23, fill: CHART_COLORS[0] },
        { name: 'GLICO Pensions', fullName: 'GLICO Pensions', aum: 3.22, marketShare: 18.01, fill: CHART_COLORS[1] },
        { name: 'Pensions Alliance', fullName: 'Pensions Alliance Trust', aum: 2.69, marketShare: 15.01, fill: CHART_COLORS[2] },
        { name: 'Petra Trust', fullName: 'Petra Trust Company', aum: 2.15, marketShare: 12.01, fill: CHART_COLORS[3] },
        { name: 'Axis Pension', fullName: 'Axis Pension Trust', aum: 1.79, marketShare: 10.01, fill: CHART_COLORS[4] },
        { name: 'Metropolitan', fullName: 'Metropolitan Pensions Trust', aum: 1.43, marketShare: 8.01, fill: CHART_COLORS[5] },
      ];
    }
    
    return tier2Funds.map((t, i) => {
      // Calculate tier-specific market share
      const tierMarketShare = tier2Total > 0 ? ((t.aum || 0) / tier2Total) * 100 : 0;
      
      return {
        name: (t.trustee_name || t.fund_name).length > 15 
          ? (t.trustee_name || t.fund_name).slice(0, 15) + '...' 
          : (t.trustee_name || t.fund_name),
        fullName: t.trustee_name || t.fund_name,
        aum: (t.aum || 0) / 1e9,
        marketShare: Math.round(tierMarketShare * 10) / 10, // Calculated tier-specific share
        fill: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
  }, [metrics]);

  // Tier split data from database
  const tierSplitData = useMemo(() => [
    { name: 'Tier 2 (Occupational)', value: Math.round(totals.tier2Share), fill: CHART_COLORS[1] },
    { name: 'Tier 3 (Voluntary)', value: Math.round(totals.tier3Share), fill: CHART_COLORS[2] },
  ], [totals]);

  const custodiansChartData = FUND_CUSTODIANS.map((c, i) => ({
    ...c,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            Private Pension Funds - Tier 2 & 3
          </h2>
          <p className="text-sm text-muted-foreground">
            Occupational & Voluntary Pension Schemes • 2024 NPRA Report
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Landmark className="h-3 w-3" />
          {formatCurrency(totals.totalAssets)} Total AUM
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-amber-500/15 to-orange-500/5 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Assets</span>
            </div>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(totals.totalAssets)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Trustees</span>
            </div>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {totals.corporateTrustees}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="h-4 w-4 text-emerald-500" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Custodians</span>
            </div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {totals.fundCustodians}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/5 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Managers</span>
            </div>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {totals.pensionFundManagers}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-pink-500/5 border-rose-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-rose-500" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Benefits</span>
            </div>
            <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(totals.benefitsPaid)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-teal-500/5 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-cyan-500" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Schemes</span>
            </div>
            <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
              {totals.registeredSchemes}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Split & Asset Allocation */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {/* Tier 2 vs Tier 3 Split */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-5 w-5 text-blue-500" />
              Private Pension by Tier
            </CardTitle>
            <CardDescription>Tier 2 (Occupational) vs Tier 3 (Voluntary)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={180} className="sm:max-w-[200px]">
                <RechartsPie>
                  <Pie
                    data={tierSplitData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {tierSplitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value}%`} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3 w-full sm:w-auto">
                {tierSplitData.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full shrink-0" 
                      style={{ backgroundColor: item.fill }} 
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-2xl font-bold">{item.value}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Asset Allocation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-5 w-5 text-purple-500" />
              Asset Allocation
            </CardTitle>
            <CardDescription>Investment distribution of private pension funds</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPie>
                <Pie
                  data={ASSET_ALLOCATION}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${value}%`}
                  labelLine={false}
                >
                  {ASSET_ALLOCATION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Corporate Trustees & Fund Custodians */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {/* Corporate Trustees by AUM */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              Corporate Trustees by AUM
            </CardTitle>
            <CardDescription>Master Trust Schemes (GH₵ Billions)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trusteesChartData} layout="vertical" margin={{ left: 5, right: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(v) => `${v}B`} tick={{ fontSize: 11 }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={80} 
                  tick={{ fontSize: 9 }} 
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'aum') return [`GH₵${value}B`, 'AUM'];
                    return [`${value}%`, 'Market Share'];
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="aum" name="AUM" radius={[0, 4, 4, 0]}>
                  {trusteesChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fund Custodians Market Share */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-blue-500" />
              Fund Custodians Market Share
            </CardTitle>
            <CardDescription>Market share of custodian banks</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RechartsPie>
                <Pie
                  data={custodiansChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="marketShare"
                  label={({ name, marketShare }) => `${name}: ${marketShare}%`}
                  labelLine={false}
                >
                  {custodiansChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value}%`}
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
    </div>
  );
}
