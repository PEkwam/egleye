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
import { SSNIT_2024, SSNIT_HISTORICAL, SSNIT_ASSET_ALLOCATION } from './data';
import { PieChart as RechartsPie, Pie, Cell } from 'recharts';

const formatCurrency = (value: number) => {
  if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
  return `GH₵${value.toLocaleString()}`;
};

export function SSNITSection() {
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/15 to-orange-500/5 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Total Assets</span>
            </div>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(SSNIT_2024.totalAssets)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Active Contributors</span>
            </div>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {SSNIT_2024.activeContributors.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">ROI</span>
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {SSNIT_2024.returnOnInvestment}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/5 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground">Dependency Ratio</span>
            </div>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
              1:{SSNIT_2024.dependencyRatio}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-teal-500/5 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-cyan-500" />
              <span className="text-xs font-medium text-muted-foreground">Employers</span>
            </div>
            <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
              {SSNIT_2024.employers.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
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
            <ResponsiveContainer width="100%" height={280}>
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
            <ResponsiveContainer width="100%" height={280}>
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
            <ResponsiveContainer width="100%" height={280}>
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
                  <p className="text-xs text-muted-foreground">Contributions Received</p>
                </div>
                <p className="text-lg font-bold">GH₵8.8B</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-3 w-3 text-rose-500" />
                  <p className="text-xs text-muted-foreground">Benefits Paid</p>
                </div>
                <p className="text-lg font-bold">GH₵6.5B</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-3 w-3 text-blue-500" />
                  <p className="text-xs text-muted-foreground">Active Pensioners</p>
                </div>
                <p className="text-lg font-bold">{SSNIT_2024.activePensioners.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-3 w-3 text-amber-500" />
                  <p className="text-xs text-muted-foreground">Minimum Pension</p>
                </div>
                <p className="text-lg font-bold">GH₵{SSNIT_2024.minimumPension}</p>
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
