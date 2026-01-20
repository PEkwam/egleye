import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Landmark, TrendingUp, Users, 
  DollarSign, PieChart, BarChart3, Building2, 
  ChevronRight, ExternalLink, Wallet, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Footer } from '@/components/Footer';
import { usePensionMetrics } from '@/hooks/usePensionMetrics';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell,
  LineChart, Line
} from 'recharts';
import { DashboardNavigation } from '@/components/DashboardNavigation';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';

const CHART_COLORS = [
  'hsl(45, 93%, 47%)',
  'hsl(221, 83%, 53%)',
  'hsl(142, 76%, 36%)',
  'hsl(262, 83%, 58%)',
  'hsl(0, 84%, 60%)',
  'hsl(173, 80%, 40%)',
  'hsl(291, 64%, 42%)',
  'hsl(24, 95%, 53%)',
];

const FUND_TYPE_LABELS: Record<string, string> = {
  tier1_ssnit: 'Tier 1 (SSNIT)',
  tier2: 'Tier 2 (Occupational)',
  tier3_provident: 'Tier 3 (Provident)',
  tier3_personal: 'Tier 3 (Personal)',
  all: 'All Fund Types',
};

export default function PensionDashboard() {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<number | 'all'>('all');
  const [selectedFundType, setSelectedFundType] = useState<string>('all');
  const [topCount, setTopCount] = useState<5 | 10>(5);
  
  const { metrics, availableYears, availableQuarters, isLoading } = usePensionMetrics(
    selectedFundType !== 'all' ? selectedFundType : undefined,
    selectedYear || undefined,
    selectedQuarter === 'all' ? 'all' : selectedQuarter
  );

  // Set default year to highest available
  useEffect(() => {
    if (availableYears.length > 0 && selectedYear === null) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
    return `GH₵${value.toLocaleString()}`;
  };

  // Industry totals
  const industryTotals = useMemo(() => {
    const withYears = metrics.filter(m => m.years_in_ghana && m.years_in_ghana > 0);
    const avgYearsInGhana = withYears.length > 0
      ? withYears.reduce((sum, m) => sum + (m.years_in_ghana || 0), 0) / withYears.length
      : 0;
    
    return {
      totalAUM: metrics.reduce((sum, m) => sum + (m.aum || 0), 0),
      totalContributors: metrics.reduce((sum, m) => sum + (m.total_contributors || 0), 0),
      totalContributions: metrics.reduce((sum, m) => sum + (m.total_contributions || 0), 0),
      totalBenefits: metrics.reduce((sum, m) => sum + (m.total_benefits_paid || 0), 0),
      avgReturn: metrics.filter(m => m.investment_return).length > 0
        ? metrics.reduce((sum, m) => sum + (m.investment_return || 0), 0) / metrics.filter(m => m.investment_return).length
        : 0,
      avgExpenseRatio: metrics.filter(m => m.expense_ratio).length > 0
        ? metrics.reduce((sum, m) => sum + (m.expense_ratio || 0), 0) / metrics.filter(m => m.expense_ratio).length
        : 0,
      avgYearsInGhana,
      fundsCount: metrics.length,
    };
  }, [metrics]);

  // Top funds by AUM
  const topFundsByAUM = useMemo(() => 
    [...metrics]
      .filter(m => m.aum)
      .sort((a, b) => (b.aum || 0) - (a.aum || 0))
      .slice(0, topCount)
      .map((m, index) => ({
        name: m.fund_name.length > 20 ? m.fund_name.slice(0, 20) + '...' : m.fund_name,
        fullName: m.fund_name,
        aum: m.aum || 0,
        aumFormatted: formatCurrency(m.aum || 0),
        marketShare: m.market_share || 0, // Already stored as percentage (e.g., 22 = 22%)
        fill: CHART_COLORS[index % CHART_COLORS.length],
      })),
    [metrics, topCount]
  );

  // Market share data for pie chart
  const marketShareData = useMemo(() => 
    topFundsByAUM.map(m => ({
      name: m.name,
      value: m.marketShare,
      fill: m.fill,
    })),
    [topFundsByAUM]
  );

  // Investment returns comparison
  const returnsData = useMemo(() => 
    [...metrics]
      .filter(m => m.investment_return !== null)
      .sort((a, b) => (b.investment_return || 0) - (a.investment_return || 0))
      .slice(0, topCount)
      .map((m, index) => ({
        name: m.fund_name.length > 15 ? m.fund_name.slice(0, 15) + '...' : m.fund_name,
        return: m.investment_return || 0,
        benchmark: m.benchmark_return || 0,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      })),
    [metrics, topCount]
  );

  // Allocation breakdown
  const avgAllocation = useMemo(() => {
    const withAllocation = metrics.filter(m => 
      m.equity_allocation || m.fixed_income_allocation || m.money_market_allocation
    );
    if (withAllocation.length === 0) return [];

    return [
      { name: 'Equity', value: withAllocation.reduce((sum, m) => sum + (m.equity_allocation || 0), 0) / withAllocation.length, fill: CHART_COLORS[0] },
      { name: 'Fixed Income', value: withAllocation.reduce((sum, m) => sum + (m.fixed_income_allocation || 0), 0) / withAllocation.length, fill: CHART_COLORS[1] },
      { name: 'Money Market', value: withAllocation.reduce((sum, m) => sum + (m.money_market_allocation || 0), 0) / withAllocation.length, fill: CHART_COLORS[2] },
      { name: 'Alternative', value: withAllocation.reduce((sum, m) => sum + (m.alternative_investments || 0), 0) / withAllocation.length, fill: CHART_COLORS[3] },
    ].filter(d => d.value > 0);
  }, [metrics]);

  if (isLoading) {
    return <DashboardSkeleton variant="pension" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Link to="/" className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Back</span>
              </Link>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shrink-0">
                  <Landmark className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-sm sm:text-lg font-bold truncate">Pension Dashboard</h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
              <DashboardNavigation />
              
              <Select value={selectedFundType} onValueChange={setSelectedFundType}>
                <SelectTrigger className="w-[100px] sm:w-[140px] h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Fund Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="tier1_ssnit">Tier 1</SelectItem>
                  <SelectItem value="tier2">Tier 2</SelectItem>
                  <SelectItem value="tier3_provident">Tier 3 Prov</SelectItem>
                  <SelectItem value="tier3_personal">Tier 3 Pers</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedYear?.toString() || ''} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[70px] sm:w-[90px] h-8 sm:h-9 text-xs sm:text-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.length > 0 ? (
                    availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))
                  ) : (
                    [2025, 2024, 2023].map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select 
                value={selectedQuarter?.toString() || 'all'} 
                onValueChange={(v) => setSelectedQuarter(v === 'all' ? 'all' : Number(v))}
              >
                <SelectTrigger className="w-[60px] sm:w-[80px] h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Qtr" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {availableQuarters.length > 0 ? (
                    availableQuarters.map(q => (
                      <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>
                    ))
                  ) : (
                    [1, 2, 3, 4].map(q => (
                      <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="sm"
                className="gap-1.5 hidden sm:flex h-9"
                asChild
              >
                <a href="https://www.npra.gov.gh/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  NPRA
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Key Metrics */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-amber-500" />
                Industry Overview
              </h2>
              <p className="text-sm text-muted-foreground">
                Ghana Pension Industry • {selectedYear || 'All Years'} {selectedQuarter ? `Q${selectedQuarter}` : ''} NPRA Report
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              <Building2 className="h-3 w-3" />
              {metrics.length} Funds
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {/* Total AUM */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-orange-600/5 border-2 border-amber-500/30 hover:border-amber-500/50 transition-all hover:scale-[1.02]">
              <CardContent className="p-4 relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Total AUM</span>
                </div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(industryTotals.totalAUM)}
                </p>
              </CardContent>
            </Card>

            {/* Total Contributors */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/15 via-blue-400/10 to-indigo-600/5 border-2 border-blue-500/30 hover:border-blue-500/50 transition-all hover:scale-[1.02]">
              <CardContent className="p-4 relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Contributors</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {industryTotals.totalContributors.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            {/* Total Contributions */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/15 via-emerald-400/10 to-green-600/5 border-2 border-emerald-500/30 hover:border-emerald-500/50 transition-all hover:scale-[1.02]">
              <CardContent className="p-4 relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                    <Wallet className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Contributions</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(industryTotals.totalContributions)}
                </p>
              </CardContent>
            </Card>

            {/* Benefits Paid */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/15 via-purple-400/10 to-violet-600/5 border-2 border-purple-500/30 hover:border-purple-500/50 transition-all hover:scale-[1.02]">
              <CardContent className="p-4 relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">Benefits Paid</span>
                </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(industryTotals.totalBenefits)}
                </p>
              </CardContent>
            </Card>

            {/* Avg Return */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-rose-500/15 via-rose-400/10 to-pink-600/5 border-2 border-rose-500/30 hover:border-rose-500/50 transition-all hover:scale-[1.02]">
              <CardContent className="p-4 relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Avg Return</span>
                </div>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {industryTotals.avgReturn.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            {/* Expense Ratio */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-500/15 via-cyan-400/10 to-teal-600/5 border-2 border-cyan-500/30 hover:border-cyan-500/50 transition-all hover:scale-[1.02]">
              <CardContent className="p-4 relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg">
                    <PieChart className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">Avg Expense</span>
                </div>
                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                  {industryTotals.avgExpenseRatio.toFixed(2)}%
                </p>
              </CardContent>
            </Card>

            {/* Avg Years in Ghana */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-slate-500/15 via-slate-400/10 to-gray-600/5 border-2 border-slate-500/30 hover:border-slate-500/50 transition-all hover:scale-[1.02]">
              <CardContent className="p-4 relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 shadow-lg">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-400">Years in Ghana</span>
                </div>
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                  {industryTotals.avgYearsInGhana > 0 ? `${industryTotals.avgYearsInGhana.toFixed(0)} yrs` : 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Charts Section */}
        {metrics.length > 0 ? (
          <Tabs defaultValue="aum" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="aum">AUM Ranking</TabsTrigger>
                <TabsTrigger value="returns">Investment Returns</TabsTrigger>
                <TabsTrigger value="allocation">Asset Allocation</TabsTrigger>
              </TabsList>

              <div className="flex gap-1">
                <Button
                  variant={topCount === 5 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTopCount(5)}
                >
                  Top 5
                </Button>
                <Button
                  variant={topCount === 10 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTopCount(10)}
                >
                  Top 10
                </Button>
              </div>
            </div>

            <TabsContent value="aum" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-amber-500" />
                      Top Funds by AUM
                    </CardTitle>
                    <CardDescription>Assets Under Management (GH₵)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topFundsByAUM} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
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

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-amber-500" />
                      Market Share Distribution
                    </CardTitle>
                    <CardDescription>Percentage of total AUM</CardDescription>
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
                          label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
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
            </TabsContent>

            <TabsContent value="returns" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    Investment Returns vs Benchmark
                  </CardTitle>
                  <CardDescription>Fund performance comparison (%)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={returnsData} margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        formatter={(value: number) => `${value.toFixed(2)}%`}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="return" name="Fund Return" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="benchmark" name="Benchmark" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="allocation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-purple-500" />
                    Average Asset Allocation
                  </CardTitle>
                  <CardDescription>Industry-wide investment allocation</CardDescription>
                </CardHeader>
                <CardContent>
                  {avgAllocation.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <RechartsPie>
                        <Pie
                          data={avgAllocation}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={130}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                        >
                          {avgAllocation.map((entry, index) => (
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
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                      No allocation data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <Landmark className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pension Data Available</h3>
              <p className="text-muted-foreground mb-4">
                Pension fund metrics data will appear here once it's uploaded from NPRA reports.
              </p>
              <Button variant="outline" asChild>
                <a href="https://www.npra.gov.gh/publications/" target="_blank" rel="noopener noreferrer">
                  View NPRA Publications
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Fund Details Table */}
        {metrics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Fund Details</CardTitle>
              <CardDescription>Detailed metrics for all pension funds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Fund Name</th>
                      <th className="text-left py-3 px-2 font-medium">Type</th>
                      <th className="text-right py-3 px-2 font-medium">AUM</th>
                      <th className="text-right py-3 px-2 font-medium">Contributors</th>
                      <th className="text-right py-3 px-2 font-medium">Return</th>
                      <th className="text-right py-3 px-2 font-medium">Expense Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.slice(0, 20).map((fund) => (
                      <tr key={fund.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{fund.fund_name}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className="text-xs">
                            {FUND_TYPE_LABELS[fund.fund_type] || fund.fund_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right">{fund.aum ? formatCurrency(fund.aum) : '-'}</td>
                        <td className="py-3 px-2 text-right">{fund.total_contributors?.toLocaleString() || '-'}</td>
                        <td className="py-3 px-2 text-right">
                          {fund.investment_return !== null ? (
                            <span className={fund.investment_return >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {fund.investment_return.toFixed(2)}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {fund.expense_ratio !== null ? `${fund.expense_ratio.toFixed(2)}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}