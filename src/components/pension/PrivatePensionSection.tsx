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
import { 
  PRIVATE_PENSION_2024, 
  CORPORATE_TRUSTEES, 
  FUND_CUSTODIANS, 
  ASSET_ALLOCATION,
  TIER_SPLIT 
} from './data';
import { CHART_COLORS } from './types';

const formatCurrency = (value: number) => {
  if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
  return `GH₵${value.toLocaleString()}`;
};

export function PrivatePensionSection() {
  // Prepare chart data
  const trusteesChartData = CORPORATE_TRUSTEES.map((t, i) => ({
    name: t.name.length > 15 ? t.name.slice(0, 15) + '...' : t.name,
    fullName: t.name,
    aum: t.aum,
    marketShare: t.marketShare,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const custodiansChartData = FUND_CUSTODIANS.map((c, i) => ({
    ...c,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
          GH₵63.88B Total AUM
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/15 to-orange-500/5 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Total Assets</span>
            </div>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(PRIVATE_PENSION_2024.totalAssets)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Corporate Trustees</span>
            </div>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {PRIVATE_PENSION_2024.corporateTrustees}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">Fund Custodians</span>
            </div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {PRIVATE_PENSION_2024.fundCustodians}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/5 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground">Fund Managers</span>
            </div>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {PRIVATE_PENSION_2024.pensionFundManagers}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-pink-500/5 border-rose-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-medium text-muted-foreground">Benefits Paid</span>
            </div>
            <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(PRIVATE_PENSION_2024.benefitsPaid)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-teal-500/5 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-cyan-500" />
              <span className="text-xs font-medium text-muted-foreground">Registered Schemes</span>
            </div>
            <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
              {PRIVATE_PENSION_2024.registeredSchemes}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Split & Asset Allocation */}
      <div className="grid lg:grid-cols-2 gap-6">
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
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={220}>
                <RechartsPie>
                  <Pie
                    data={TIER_SPLIT}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {TIER_SPLIT.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value}%`} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="flex-1 space-y-4">
                {TIER_SPLIT.map((item) => (
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
            <ResponsiveContainer width="100%" height={220}>
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
      <div className="grid lg:grid-cols-2 gap-6">
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
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={trusteesChartData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(v) => `${v}B`} tick={{ fontSize: 11 }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100} 
                  tick={{ fontSize: 10 }} 
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
            <ResponsiveContainer width="100%" height={320}>
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
