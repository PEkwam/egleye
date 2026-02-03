import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Landmark, TrendingUp, Users, 
  DollarSign, PieChart, BarChart3, Building2, 
  ChevronRight, ExternalLink, Wallet, Clock, Activity, Shield
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
  LineChart, Line, AreaChart, Area
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
  'Tier 1': 'Tier 1 (SSNIT)',
  'Tier 2': 'Tier 2 (Occupational)',
  'Tier 3': 'Tier 3 (Voluntary)',
  'all': 'All Fund Types',
};

// BNSSS (SSNIT) Data from 2024 NPRA Annual Report
const BNSSS_2024_DATA = {
  total_assets: 22500000000,
  active_contributors: 2007411,
  active_pensioners: 254056,
  dependency_ratio: 8.06,
  contributions_received: 8800000000,
  benefits_paid: 6500000000,
  minimum_pension: 300,
  return_on_investment: 17.07,
  employers: 89899,
  historical: {
    contributors: [
      { year: 2020, value: 1633505 },
      { year: 2021, value: 1734168 },
      { year: 2022, value: 1843833 },
      { year: 2023, value: 1951494 },
      { year: 2024, value: 2007411 },
    ],
    assets: [
      { year: 2020, value: 22.02 },
      { year: 2021, value: 28.02 },
      { year: 2022, value: 35.3 },
      { year: 2023, value: 46.5 },
      { year: 2024, value: 63.88 },
    ],
    pensioners: [
      { year: 2020, value: 227407 },
      { year: 2021, value: 225768 },
      { year: 2022, value: 235762 },
      { year: 2023, value: 244830 },
      { year: 2024, value: 254056 },
    ],
  }
};

// Fund Custodians Market Share
const FUND_CUSTODIANS_2024 = [
  { name: 'Stanbic Bank', market_share: 28.5, fill: CHART_COLORS[0] },
  { name: 'Standard Chartered', market_share: 22.3, fill: CHART_COLORS[1] },
  { name: 'Ecobank Ghana', market_share: 18.7, fill: CHART_COLORS[2] },
  { name: 'GCB Bank', market_share: 12.4, fill: CHART_COLORS[3] },
  { name: 'Fidelity Bank', market_share: 8.9, fill: CHART_COLORS[4] },
  { name: 'Others', market_share: 9.2, fill: CHART_COLORS[5] },
];

// Corporate Trustees AUM Distribution
const CORPORATE_TRUSTEES_2024 = [
  { name: 'Enterprise Trustees', aum: 14.2, market_share: 22.23, fill: CHART_COLORS[0] },
  { name: 'GLICO Pensions', aum: 11.5, market_share: 18.01, fill: CHART_COLORS[1] },
  { name: 'Pensions Alliance', aum: 9.6, market_share: 15.01, fill: CHART_COLORS[2] },
  { name: 'Petra Trust', aum: 7.7, market_share: 12.01, fill: CHART_COLORS[3] },
  { name: 'Axis Pension', aum: 6.4, market_share: 10.01, fill: CHART_COLORS[4] },
  { name: 'Metropolitan', aum: 5.1, market_share: 8.01, fill: CHART_COLORS[5] },
  { name: 'Old Mutual', aum: 3.8, market_share: 6.00, fill: CHART_COLORS[6] },
  { name: 'Others', aum: 5.6, market_share: 8.72, fill: CHART_COLORS[7] },
];

// Asset Allocation
const ASSET_ALLOCATION_2024 = [
  { name: 'Fixed Income', value: 52, fill: 'hsl(221, 83%, 53%)' },
  { name: 'Equity', value: 28, fill: 'hsl(142, 76%, 36%)' },
  { name: 'Money Market', value: 12, fill: 'hsl(45, 93%, 47%)' },
  { name: 'Alternative', value: 5, fill: 'hsl(262, 83%, 58%)' },
  { name: 'Others', value: 3, fill: 'hsl(220, 9%, 46%)' },
];

// Private Pension Scheme Share
const PRIVATE_PENSION_SHARE = [
  { name: 'Tier 2 (Occupational)', value: 28, fill: 'hsl(221, 83%, 53%)' },
  { name: 'Tier 3 (Voluntary)', value: 72, fill: 'hsl(142, 76%, 36%)' },
];

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
        marketShare: m.market_share || 0,
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

  // Allocation breakdown from database
  const avgAllocation = useMemo(() => {
    const withAllocation = metrics.filter(m => 
      m.equity_allocation || m.fixed_income_allocation || m.money_market_allocation
    );
    if (withAllocation.length === 0) return ASSET_ALLOCATION_2024;

    return [
      { name: 'Fixed Income', value: withAllocation.reduce((sum, m) => sum + (m.fixed_income_allocation || 0), 0) / withAllocation.length, fill: 'hsl(221, 83%, 53%)' },
      { name: 'Equity', value: withAllocation.reduce((sum, m) => sum + (m.equity_allocation || 0), 0) / withAllocation.length, fill: 'hsl(142, 76%, 36%)' },
      { name: 'Money Market', value: withAllocation.reduce((sum, m) => sum + (m.money_market_allocation || 0), 0) / withAllocation.length, fill: 'hsl(45, 93%, 47%)' },
      { name: 'Alternative', value: withAllocation.reduce((sum, m) => sum + (m.alternative_investments || 0), 0) / withAllocation.length, fill: 'hsl(262, 83%, 58%)' },
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
                  <SelectItem value="Tier 1">Tier 1</SelectItem>
                  <SelectItem value="Tier 2">Tier 2</SelectItem>
                  <SelectItem value="Tier 3">Tier 3</SelectItem>
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
                    [2024, 2023].map(year => (
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
                Ghana Pension Industry • {selectedYear || 'All Years'} {selectedQuarter !== 'all' ? `Q${selectedQuarter}` : ''} NPRA Report
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

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="bnsss" className="gap-1.5">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">SSNIT</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-1.5">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Details</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
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
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Fund Custodians Market Share */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    Fund Custodians Market Share
                  </CardTitle>
                  <CardDescription>2024 NPRA Report Data</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={FUND_CUSTODIANS_2024}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="market_share"
                        label={({ name, market_share }) => `${name}: ${market_share}%`}
                        labelLine={false}
                      >
                        {FUND_CUSTODIANS_2024.map((entry, index) => (
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

              {/* Corporate Trustees AUM */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-amber-500" />
                    Corporate Trustees AUM Distribution
                  </CardTitle>
                  <CardDescription>AUM in GH₵ Billions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={CORPORATE_TRUSTEES_2024} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => `${v}B`} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number) => `GH₵${value}B`}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="aum" radius={[0, 4, 4, 0]}>
                        {CORPORATE_TRUSTEES_2024.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Private Pension Scheme Share */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-emerald-500" />
                    Private Pension Scheme by Share of AUM
                  </CardTitle>
                  <CardDescription>Tier 2 vs Tier 3 Distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={PRIVATE_PENSION_SHARE}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {PRIVATE_PENSION_SHARE.map((entry, index) => (
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
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Asset Allocation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-purple-500" />
                    Asset Allocation of Private Pension Funds
                  </CardTitle>
                  <CardDescription>Investment Distribution by Asset Class</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={ASSET_ALLOCATION_2024}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {ASSET_ALLOCATION_2024.map((entry, index) => (
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
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* BNSSS (SSNIT) Tab */}
          <TabsContent value="bnsss" className="space-y-6">
            {/* SSNIT Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-medium text-muted-foreground">Total Assets</span>
                  </div>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    GH₵22.5B
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
                    {BNSSS_2024_DATA.active_contributors.toLocaleString()}
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
                    {BNSSS_2024_DATA.return_on_investment}%
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
                    1:{BNSSS_2024_DATA.dependency_ratio}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* SSNIT Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Contributors Growth */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    SSNIT Contributors Growth
                  </CardTitle>
                  <CardDescription>Active contributors trend (2020-2024)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={BNSSS_2024_DATA.historical.contributors}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                      <Tooltip
                        formatter={(value: number) => value.toLocaleString()}
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
                        name="Contributors"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Assets Growth */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                    SSNIT Assets Growth
                  </CardTitle>
                  <CardDescription>Total assets trend (GH₵ Billions)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={BNSSS_2024_DATA.historical.assets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(v) => `${v}B`} />
                      <Tooltip
                        formatter={(value: number) => `GH₵${value}B`}
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
                        dot={{ fill: 'hsl(45, 93%, 47%)', strokeWidth: 2 }}
                        name="Assets"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Pensioners Growth */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-500" />
                    SSNIT Pensioners Growth
                  </CardTitle>
                  <CardDescription>Active pensioners trend (2020-2024)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={BNSSS_2024_DATA.historical.pensioners}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(v) => `${(v / 1e3).toFixed(0)}K`} />
                      <Tooltip
                        formatter={(value: number) => value.toLocaleString()}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="hsl(142, 76%, 36%)" 
                        radius={[4, 4, 0, 0]}
                        name="Pensioners"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* SSNIT Key Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-500" />
                    SSNIT Key Statistics
                  </CardTitle>
                  <CardDescription>2024 NPRA Report Data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Contributions Received</p>
                      <p className="text-lg font-bold">GH₵8.8B</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Benefits Paid</p>
                      <p className="text-lg font-bold">GH₵6.5B</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Active Pensioners</p>
                      <p className="text-lg font-bold">{BNSSS_2024_DATA.active_pensioners.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Registered Employers</p>
                      <p className="text-lg font-bold">{BNSSS_2024_DATA.employers.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Minimum Pension</p>
                      <p className="text-lg font-bold">GH₵{BNSSS_2024_DATA.minimum_pension}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Dependency Ratio</p>
                      <p className="text-lg font-bold">1:{BNSSS_2024_DATA.dependency_ratio}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
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
                          <th className="text-right py-3 px-2 font-medium">Market Share</th>
                          <th className="text-right py-3 px-2 font-medium">Return</th>
                          <th className="text-right py-3 px-2 font-medium">Contributors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.map((fund) => (
                          <tr key={fund.id} className="border-b border-border/50 hover:bg-muted/50">
                            <td className="py-3 px-2 font-medium">{fund.fund_name}</td>
                            <td className="py-3 px-2">
                              <Badge variant="outline" className="text-xs">
                                {FUND_TYPE_LABELS[fund.fund_type] || fund.fund_type}
                              </Badge>
                            </td>
                            <td className="py-3 px-2 text-right">{fund.aum ? formatCurrency(fund.aum) : '-'}</td>
                            <td className="py-3 px-2 text-right">
                              {fund.market_share !== null ? `${fund.market_share.toFixed(2)}%` : '-'}
                            </td>
                            <td className="py-3 px-2 text-right">
                              {fund.investment_return !== null ? (
                                <span className={fund.investment_return >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {fund.investment_return.toFixed(2)}%
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-3 px-2 text-right">{fund.total_contributors?.toLocaleString() || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
