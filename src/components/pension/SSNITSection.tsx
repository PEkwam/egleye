 import { useMemo } from 'react';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { 
   DollarSign, Users, TrendingUp, Activity, Building2, 
   Wallet, Target, Calendar
 } from 'lucide-react';
 import {
   ResponsiveContainer, AreaChart, Area, LineChart, Line, 
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
 } from 'recharts';
 import { PieChart as RechartsPie, Pie, Cell } from 'recharts';
 import { PensionFundMetric } from '@/hooks/usePensionMetrics';
 import { SSNIT_HISTORICAL, SSNIT_ASSET_ALLOCATION } from './data';

interface SSNITSectionProps {
  metrics?: PensionFundMetric[];
}

const formatCurrency = (value: number) => {
  if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
  return `GH₵${value.toLocaleString()}`;
};

export function SSNITSection({ metrics = [] }: SSNITSectionProps) {
  // Get SSNIT data from database or use fallback
  const ssnitData = useMemo(() => {
    const ssnitFund = metrics.find(m => m.fund_type === 'Tier 1' || m.fund_name?.includes('SSNIT'));
    
    if (ssnitFund) {
      return {
        totalAssets: ssnitFund.aum || 22500000000,
        activeContributors: ssnitFund.total_contributors || 2007411,
        activePensioners: 254056,
        dependencyRatio: 8.06,
        returnOnInvestment: ssnitFund.investment_return || 17.07,
        employers: 89899,
        contributionsReceived: 8800000000,
        benefitsPaid: ssnitFund.total_benefits_paid || 6500000000,
        minimumPension: 300,
      };
    }
    
    // Fallback to NPRA 2024 Report figures
    return {
      totalAssets: 22500000000,
      activeContributors: 2007411,
      activePensioners: 254056,
      dependencyRatio: 8.06,
      returnOnInvestment: 17.07,
      employers: 89899,
      contributionsReceived: 8800000000,
      benefitsPaid: 6500000000,
      minimumPension: 300,
    };
  }, [metrics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            SSNIT (BNSSS) - Tier 1
          </h2>
          <p className="text-sm text-muted-foreground">
            Basic National Social Security Scheme • 2024 NPRA Report
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Building2 className="h-3 w-3" />
          National Pension Scheme
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-amber-500/15 to-orange-500/5 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Assets</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(ssnitData.totalAssets)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Contributors</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
              {(ssnitData.activeContributors / 1e6).toFixed(2)}M
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">ROI</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {ssnitData.returnOnInvestment.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/5 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Dependency</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
              1:{ssnitData.dependencyRatio}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-teal-500/5 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-cyan-500" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Employers</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-cyan-600 dark:text-cyan-400">
              {(ssnitData.employers / 1000).toFixed(1)}K
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {/* Assets Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              SSNIT Assets Growth
            </CardTitle>
            <CardDescription>Total assets trend (GH₵ Billions) • 2020-2024</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={SSNIT_HISTORICAL.assets}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${v}B`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`GH₵${value}B`, 'Assets']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(45, 93%, 47%)" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(45, 93%, 47%)', strokeWidth: 2, r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Contributors Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-blue-500" />
              Contributors Growth
            </CardTitle>
            <CardDescription>Active contributors trend • 2020-2024</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={SSNIT_HISTORICAL.contributors}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [value.toLocaleString(), 'Contributors']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(221, 83%, 53%)" 
                  fill="hsl(221, 83%, 53%)" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pensioners & Employers Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-emerald-500" />
              Pensioners & Employers
            </CardTitle>
            <CardDescription>Growth comparison • 2020-2024</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={SSNIT_HISTORICAL.pensioners.map((p, i) => ({
                year: p.year,
                pensioners: p.value,
                employers: SSNIT_HISTORICAL.employers[i]?.value || 0
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v / 1e3).toFixed(0)}K`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [value.toLocaleString(), name === 'pensioners' ? 'Pensioners' : 'Employers']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="pensioners" name="Pensioners" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="employers" name="Employers" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* SSNIT Key Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-purple-500" />
              Key Statistics
            </CardTitle>
            <CardDescription>2024 NPRA Annual Report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="h-3 w-3 text-emerald-500" />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Contributions</p>
                </div>
                <p className="text-base sm:text-lg font-bold">{formatCurrency(ssnitData.contributionsReceived)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-3 w-3 text-rose-500" />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Benefits Paid</p>
                </div>
                <p className="text-base sm:text-lg font-bold">{formatCurrency(ssnitData.benefitsPaid)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-3 w-3 text-blue-500" />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Pensioners</p>
                </div>
                <p className="text-base sm:text-lg font-bold">{(ssnitData.activePensioners / 1000).toFixed(0)}K</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-3 w-3 text-amber-500" />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Min. Pension</p>
                </div>
                <p className="text-base sm:text-lg font-bold">GH₵{ssnitData.minimumPension}</p>
              </div>
            </div>

            {/* Asset Allocation Mini Chart */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Asset Allocation</p>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="100%" height={100}>
                  <RechartsPie>
                    <Pie
                      data={SSNIT_ASSET_ALLOCATION}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {SSNIT_ASSET_ALLOCATION.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value}%`} />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                  {SSNIT_ASSET_ALLOCATION.slice(0, 4).map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
