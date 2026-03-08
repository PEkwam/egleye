import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, Building2, DollarSign, 
  BarChart3, PieChart, ArrowLeft, Calendar, 
  Activity, Building, ChevronRight, Scale, Heart
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
import { InsurerComparison } from '@/components/InsurerComparison';
import { HistoricalTrends } from '@/components/HistoricalTrends';
import { QuarterlyComparisonTable } from '@/components/QuarterlyComparisonTable';
import { ProductBreakdownChart } from '@/components/ProductBreakdownChart';
import { InsurerMetricButtons } from '@/components/InsurerMetricButtons';
import { InsurerSelector } from '@/components/InsurerSelector';
import { MarketPerformanceSummary } from '@/components/MarketPerformanceSummary';
import { AIInsightsPanel } from '@/components/AIInsightsPanel';
import { Footer } from '@/components/Footer';
import { DashboardNavigation } from '@/components/DashboardNavigation';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { PremiumGrowthLeaderboard } from '@/components/PremiumGrowthLeaderboard';
import { ProductMixTreemap } from '@/components/ProductMixTreemap';
import { StrategicInsightsQA } from '@/components/StrategicInsightsQA';
import { ProfitabilityHeatmap } from '@/components/ProfitabilityHeatmap';
import { useInsurerMetrics } from '@/hooks/useInsurerMetrics';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart as RechartsPie, 
  Pie, Cell 
} from 'recharts';

const CHART_COLORS = [
  'hsl(142, 76%, 36%)',
  'hsl(221, 83%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(45, 93%, 47%)',
  'hsl(0, 84%, 60%)',
  'hsl(173, 80%, 40%)',
  'hsl(291, 64%, 42%)',
  'hsl(24, 95%, 53%)',
];

export default function ExecutiveDashboardPage() {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  const [marketShareTopCount, setMarketShareTopCount] = useState<5 | 10>(5);
  const [claimsTopCount, setClaimsTopCount] = useState<5 | 10>(5);
  const [selectedInsurers, setSelectedInsurers] = useState<string[]>([]);
  
  // Fixed to Life Insurance category
  const selectedCategory = 'life';
  const { metrics: allMetrics, availableYears, availableQuarters, isLoading } = useInsurerMetrics(
    'life',
    selectedYear || undefined,
    selectedQuarter || undefined
  );

  // Set default year and quarter to latest available
  useEffect(() => {
    if (availableYears.length > 0 && selectedYear === null) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  useEffect(() => {
    if (availableQuarters.length > 0 && selectedQuarter === null) {
      setSelectedQuarter(availableQuarters[0]); // availableQuarters sorted desc
    }
  }, [availableQuarters, selectedQuarter]);

  // Scroll to top when filters change
  useEffect(() => {
    if (selectedYear !== null && selectedQuarter !== null) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [selectedYear, selectedQuarter]);

  // Filter metrics based on selected insurers
  const metrics = useMemo(() => {
    if (selectedInsurers.length === 0) return allMetrics;
    return allMetrics.filter(m => selectedInsurers.includes(m.insurer_id));
  }, [allMetrics, selectedInsurers]);

  // Calculate industry totals - multiply ratios by 100 since DB stores as decimal
  const industryTotals = useMemo(() => ({
    totalPremium: metrics.reduce((sum, m) => sum + (m.gross_premium || 0), 0),
    totalAssets: metrics.reduce((sum, m) => sum + (m.total_assets || 0), 0),
    totalClaims: metrics.reduce((sum, m) => sum + (m.total_claims_paid || 0), 0),
    avgExpenseRatio: metrics.filter(m => m.expense_ratio).length > 0 
      ? (metrics.reduce((sum, m) => sum + (m.expense_ratio || 0), 0) / metrics.filter(m => m.expense_ratio).length) * 100
      : 0,
    avgClaimsRatio: metrics.filter(m => m.claims_ratio).length > 0
      ? (metrics.reduce((sum, m) => sum + (m.claims_ratio || 0), 0) / metrics.filter(m => m.claims_ratio).length) * 100
      : 0,
    totalProfit: metrics.reduce((sum, m) => sum + (m.profit_after_tax || 0), 0),
    companiesCount: metrics.length,
    totalCSM: metrics.reduce((sum, m) => sum + (m.csm || 0), 0),
    totalServiceResult: metrics.reduce((sum, m) => sum + (m.insurance_service_result || 0), 0),
    totalInvestments: metrics.reduce((sum, m) => sum + (m.total_investments || 0), 0),
    totalLiabilities: metrics.reduce((sum, m) => sum + (m.total_liabilities || 0), 0),
    totalFinanceIncome: metrics.reduce((sum, m) => sum + (m.insurance_finance_income || 0), 0),
  }), [metrics]);

  // Product type highlights
  const productHighlights = useMemo(() => {
    const getTopByField = (field: keyof typeof metrics[0], label: string) => {
      const sorted = [...metrics]
        .filter(m => (m[field] as number) && (m[field] as number) > 0)
        .sort((a, b) => ((b[field] as number) || 0) - ((a[field] as number) || 0))
        .slice(0, 3);
      return { label, data: sorted, field };
    };
    return [
      getTopByField('annuities', 'Annuities'),
      getTopByField('microinsurance', 'Microinsurance'),
      getTopByField('unit_linked', 'Unit-Linked'),
      getTopByField('investment_linked', 'Investment-Linked'),
      getTopByField('critical_illness', 'Critical Illness'),
      getTopByField('other_products', 'Other Products'),
    ].filter(h => h.data.length > 0);
  }, [metrics]);

  // AI Insights data summary - calculate marketShare dynamically from gross_premium
  const aiMetricsSummary = useMemo(() => {
    const totalPremium = industryTotals.totalPremium;
    const topInsurers = [...metrics]
      .filter(m => m.gross_premium)
      .sort((a, b) => (b.gross_premium || 0) - (a.gross_premium || 0))
      .slice(0, 5)
      .map(m => ({
        name: m.insurer_name,
        premium: m.gross_premium || 0,
        // Calculate market share: insurer premium / total premium * 100
        marketShare: totalPremium > 0 ? ((m.gross_premium || 0) / totalPremium) * 100 : 0,
      }));

    // Calculate CSM totals from metrics
    const totalClaims = metrics.reduce((sum, m) => sum + (m.total_claims_paid || 0), 0);
    const totalCSM = metrics.reduce((sum, m) => sum + (m.csm || 0), 0);
    const topCSMInsurer = [...metrics]
      .filter(m => m.csm)
      .sort((a, b) => (b.csm || 0) - (a.csm || 0))[0];

    return {
      totalPremium: industryTotals.totalPremium,
      totalAssets: industryTotals.totalAssets,
      totalProfit: industryTotals.totalProfit,
      avgExpenseRatio: industryTotals.avgExpenseRatio,
      avgClaimsRatio: industryTotals.avgClaimsRatio,
      companiesCount: industryTotals.companiesCount,
      topInsurers,
      category: selectedCategory,
      year: selectedYear,
      quarter: selectedQuarter,
      totalClaims: totalClaims || undefined,
      totalCSM: totalCSM || undefined,
      topCSMInsurer: topCSMInsurer?.insurer_name || undefined,
      topCSMValue: topCSMInsurer?.csm || undefined,
    };
  }, [metrics, industryTotals, selectedCategory, selectedYear, selectedQuarter]);

  // Format for display
  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
    return `GH₵${value.toLocaleString()}`;
  };

  // Top insurers by premium for market share chart
  const topByPremium = [...metrics]
    .filter(m => m.gross_premium)
    .sort((a, b) => (b.gross_premium || 0) - (a.gross_premium || 0))
    .slice(0, marketShareTopCount);

  // Market share data for pie chart - calculate dynamically from gross_premium / total
  const marketShareData = topByPremium.map((m, index) => ({
    name: m.insurer_name.length > 15 ? m.insurer_name.slice(0, 15) + '...' : m.insurer_name,
    // Calculate market share: insurer premium / total premium * 100
    value: industryTotals.totalPremium > 0 ? ((m.gross_premium || 0) / industryTotals.totalPremium) * 100 : 0,
    premium: m.gross_premium || 0,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  // Claims & expense data - show incurred claims and investment income
  const claimsData = [...metrics]
    .filter(m => m.total_claims_paid || m.investment_income)
    .sort((a, b) => (b.gross_premium || 0) - (a.gross_premium || 0))
    .slice(0, claimsTopCount)
    .map((m, index) => ({
      name: m.insurer_name.length > 12 ? m.insurer_name.slice(0, 12) + '...' : m.insurer_name,
      incurredClaims: m.total_claims_paid ? m.total_claims_paid / 1e6 : 0,
      investmentIncome: m.investment_income ? m.investment_income / 1e6 : 0,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));

  // Solvency comparison
  const solvencyData = [...metrics]
    .filter(m => m.solvency_ratio)
    .sort((a, b) => (b.solvency_ratio || 0) - (a.solvency_ratio || 0))
    .slice(0, 10)
    .map((m) => ({
      name: m.insurer_name.length > 12 ? m.insurer_name.slice(0, 12) + '...' : m.insurer_name,
      solvency: m.solvency_ratio,
      fill: (m.solvency_ratio || 0) >= 150 ? 'hsl(142, 76%, 36%)' : 
            (m.solvency_ratio || 0) >= 100 ? 'hsl(45, 93%, 47%)' : 'hsl(0, 84%, 60%)',
    }));

  // Category label is fixed to Life Insurance
  const getCategoryLabel = () => 'Life Insurance';

  if (isLoading) {
    return <DashboardSkeleton variant="life" />;
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
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0">
                  <Heart className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-sm sm:text-lg font-bold truncate">Life Dashboard</h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto flex-wrap justify-end">
              <DashboardNavigation />

              <Select value={selectedYear?.toString() || ''} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[70px] sm:w-[90px] h-8 sm:h-9 text-xs sm:text-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={selectedQuarter?.toString() || ''} 
                onValueChange={(v) => setSelectedQuarter(Number(v))}
              >
                <SelectTrigger className="w-[60px] sm:w-[80px] h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Qtr" />
                </SelectTrigger>
                <SelectContent>
                  {(availableQuarters.length > 0 ? availableQuarters : [1, 2, 3, 4]).map(q => (
                    <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="hidden sm:flex items-center gap-2">
                <InsurerSelector
                  category={selectedCategory}
                  selectedYear={selectedYear}
                  selectedQuarter={selectedQuarter}
                  selectedInsurers={selectedInsurers}
                  onSelectionChange={setSelectedInsurers}
                  maxSelection={10}
                />
                <InsurerComparison />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Key Metrics Cards */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-primary" />
                Industry Overview
              </h2>
              <p className="text-sm text-muted-foreground">
                Ghana {getCategoryLabel()} • {selectedYear} Q{selectedQuarter || ''} NIC Report
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              <Building className="h-3 w-3" />
              {metrics.length} Companies
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Total Premium Card */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/15 via-emerald-400/10 to-green-600/5 border-2 border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 hover:scale-[1.02] group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-400/20 to-transparent rounded-bl-[80px] group-hover:scale-110 transition-transform" />
              <CardContent className="p-4 relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-shadow">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Total Premium</span>
                </div>
                <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent">
                  {formatCurrency(industryTotals.totalPremium)}
                </p>
                <div className="mt-2 h-1 w-full bg-emerald-500/20 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full animate-pulse" />
                </div>
              </CardContent>
            </Card>

            {/* Total Assets Card */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/15 via-blue-400/10 to-indigo-600/5 border-2 border-blue-500/30 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 hover:scale-[1.02] group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-transparent rounded-bl-[80px] group-hover:scale-110 transition-transform" />
              <CardContent className="p-4 relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Total Assets</span>
                </div>
                <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  {formatCurrency(industryTotals.totalAssets)}
                </p>
                <div className="mt-2 h-1 w-full bg-blue-500/20 rounded-full overflow-hidden">
                  <div className="h-full w-4/5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse" />
                </div>
              </CardContent>
            </Card>

            {/* Total Profit Card */}
            <Card className={`relative overflow-hidden bg-gradient-to-br ${industryTotals.totalProfit >= 0 ? 'from-amber-500/15 via-amber-400/10 to-orange-600/5 border-2 border-amber-500/30 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10' : 'from-red-500/15 via-red-400/10 to-rose-600/5 border-2 border-red-500/30 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10'} transition-all duration-300 hover:scale-[1.02] group`}>
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${industryTotals.totalProfit >= 0 ? 'from-amber-400/20' : 'from-red-400/20'} to-transparent rounded-bl-[80px] group-hover:scale-110 transition-transform`} />
              <CardContent className="p-4 relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${industryTotals.totalProfit >= 0 ? 'from-amber-500 to-orange-600 shadow-amber-500/30 group-hover:shadow-amber-500/50' : 'from-red-500 to-rose-600 shadow-red-500/30 group-hover:shadow-red-500/50'} shadow-lg transition-shadow`}>
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <span className={`text-xs font-semibold ${industryTotals.totalProfit >= 0 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'}`}>Total Profit</span>
                </div>
                <p className={`text-2xl font-bold bg-gradient-to-r ${industryTotals.totalProfit >= 0 ? 'from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400' : 'from-red-600 to-rose-600 dark:from-red-400 dark:to-rose-400'} bg-clip-text text-transparent`}>
                  {formatCurrency(industryTotals.totalProfit)}
                </p>
                <div className={`mt-2 h-1 w-full ${industryTotals.totalProfit >= 0 ? 'bg-amber-500/20' : 'bg-red-500/20'} rounded-full overflow-hidden`}>
                  <div className={`h-full w-2/3 bg-gradient-to-r ${industryTotals.totalProfit >= 0 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-500'} rounded-full animate-pulse`} />
                </div>
              </CardContent>
            </Card>

            {/* Avg Expense Ratio Card */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/15 via-purple-400/10 to-violet-600/5 border-2 border-purple-500/30 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 hover:scale-[1.02] group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400/20 to-transparent rounded-bl-[80px] group-hover:scale-110 transition-transform" />
              <CardContent className="p-4 relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-shadow">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">Avg Expense Ratio</span>
                </div>
                <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 dark:from-purple-400 dark:to-violet-400 bg-clip-text text-transparent">
                  {industryTotals.avgExpenseRatio ? `${industryTotals.avgExpenseRatio.toFixed(1)}%` : 'N/A'}
                </p>
                <div className="mt-2 h-1 w-full bg-purple-500/20 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full animate-pulse" />
                </div>
              </CardContent>
            </Card>

            {/* Industry CSM Card */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-rose-500/15 via-rose-400/10 to-pink-600/5 border-2 border-rose-500/30 hover:border-rose-500/50 hover:shadow-lg hover:shadow-rose-500/10 transition-all duration-300 hover:scale-[1.02] group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-rose-400/20 to-transparent rounded-bl-[80px] group-hover:scale-110 transition-transform" />
              <CardContent className="p-4 relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/30 group-hover:shadow-rose-500/50 transition-shadow">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Industry CSM</span>
                </div>
                <p className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 dark:from-rose-400 dark:to-pink-400 bg-clip-text text-transparent">
                  {industryTotals.totalCSM ? formatCurrency(industryTotals.totalCSM) : 'N/A'}
                </p>
                <div className="mt-2 h-1 w-full bg-rose-500/20 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full" />
                </div>
              </CardContent>
            </Card>

            {/* Companies Card */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-500/15 via-cyan-400/10 to-teal-600/5 border-2 border-cyan-500/30 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 hover:scale-[1.02] group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-400/20 to-transparent rounded-bl-[80px] group-hover:scale-110 transition-transform" />
              <CardContent className="p-4 relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/30 group-hover:shadow-cyan-500/50 transition-shadow">
                    <Building className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">Companies</span>
                </div>
                <p className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 dark:from-cyan-400 dark:to-teal-400 bg-clip-text text-transparent">
                  {industryTotals.companiesCount}
                </p>
                <div className="mt-2 h-1 w-full bg-cyan-500/20 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full animate-pulse" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Financial Metrics Cards */}
          {(industryTotals.totalServiceResult !== 0 || industryTotals.totalInvestments > 0 || industryTotals.totalLiabilities > 0 || industryTotals.totalFinanceIncome !== 0) && (
            <div className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {industryTotals.totalServiceResult !== 0 && (
                  <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-500/15 via-indigo-400/10 to-blue-600/5 border-2 border-indigo-500/30 hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group">
                    <CardContent className="p-4 relative">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/30">
                          <Activity className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">Service Result</span>
                      </div>
                      <p className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400 bg-clip-text text-transparent">
                        {formatCurrency(industryTotals.totalServiceResult)}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {industryTotals.totalInvestments > 0 && (
                  <Card className="relative overflow-hidden bg-gradient-to-br from-teal-500/15 via-teal-400/10 to-emerald-600/5 border-2 border-teal-500/30 hover:border-teal-500/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group">
                    <CardContent className="p-4 relative">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/30">
                          <Building2 className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">Total Investments</span>
                      </div>
                      <p className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
                        {formatCurrency(industryTotals.totalInvestments)}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {industryTotals.totalLiabilities > 0 && (
                  <Card className="relative overflow-hidden bg-gradient-to-br from-rose-500/15 via-rose-400/10 to-red-600/5 border-2 border-rose-500/30 hover:border-rose-500/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group">
                    <CardContent className="p-4 relative">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/30">
                          <BarChart3 className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Total Liabilities</span>
                      </div>
                      <p className="text-xl font-bold bg-gradient-to-r from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400 bg-clip-text text-transparent">
                        {formatCurrency(industryTotals.totalLiabilities)}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {industryTotals.totalFinanceIncome !== 0 && (
                  <Card className="relative overflow-hidden bg-gradient-to-br from-green-500/15 via-green-400/10 to-emerald-600/5 border-2 border-green-500/30 hover:border-green-500/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group">
                    <CardContent className="p-4 relative">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30">
                          <DollarSign className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400">Finance Income</span>
                      </div>
                      <p className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                        {formatCurrency(industryTotals.totalFinanceIncome)}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Product Type Highlights */}
          {productHighlights.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Product Type Leaders</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {productHighlights.map((highlight) => (
                  <Card key={highlight.label} className="border-border/50 hover:shadow-md transition-all">
                    <CardContent className="p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">{highlight.label}</p>
                      <div className="space-y-1.5">
                        {highlight.data.map((m, idx) => (
                          <div key={m.insurer_id} className="flex items-center justify-between gap-1">
                            <span className="text-xs truncate flex-1" title={m.insurer_name}>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {m.insurer_name.length > 12 ? m.insurer_name.slice(0, 12) + '…' : m.insurer_name}
                            </span>
                            <span className="text-xs font-bold text-primary whitespace-nowrap">
                              {formatCurrency(m[highlight.field as keyof typeof m] as number)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* AI Insights Panel */}
        <section>
          <AIInsightsPanel metricsSummary={aiMetricsSummary} />
        </section>

        {/* Quick Comparison Buttons */}
        <section>
          <InsurerMetricButtons 
            category={selectedCategory}
            selectedYear={selectedYear}
            selectedQuarter={selectedQuarter}
          />
        </section>

        {/* Quarterly Comparison Table */}
        <section>
          <QuarterlyComparisonTable 
            category={selectedCategory}
            selectedYear={selectedYear}
            selectedQuarter={selectedQuarter}
          />
        </section>

        {/* Product Breakdown */}
        <section>
          <ProductBreakdownChart 
            category={selectedCategory}
            selectedYear={selectedYear}
            selectedQuarter={selectedQuarter}
            topCount={marketShareTopCount}
          />
        </section>

        {/* Charts Section */}
        <section className="grid lg:grid-cols-2 gap-6">
          {/* Market Share Pie Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    Market Share Distribution
                  </CardTitle>
                  <CardDescription>Top {marketShareTopCount} insurers by gross premium written</CardDescription>
                </div>
                <div className="flex items-center border rounded-lg p-1 bg-muted/30">
                  {[5, 10].map((count) => (
                    <button
                      key={count}
                      onClick={() => setMarketShareTopCount(count as 5 | 10)}
                      className={`px-3 py-1 text-sm rounded-md transition-all ${
                        marketShareTopCount === count
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Top {count}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : marketShareData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={marketShareData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={40}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return value > 3 ? (
                          <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
                            {value.toFixed(1)}%
                          </text>
                        ) : null;
                      }}
                      labelLine={false}
                    >
                      {marketShareData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [
                        `${value.toFixed(1)}% (${formatCurrency(props.payload.premium)})`,
                        'Market Share'
                      ]}
                    />
                    <Legend 
                      layout="horizontal" 
                      align="center" 
                      verticalAlign="bottom"
                      wrapperStyle={{ paddingTop: '10px' }}
                      formatter={(value) => <span className="text-[10px] sm:text-xs">{value}</span>}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No market share data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Claims & Investment Income Comparison */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Claims & Investment Income
                  </CardTitle>
                  <CardDescription>Incurred claims vs investment income (GH₵M)</CardDescription>
                </div>
                <div className="flex items-center border rounded-lg p-1 bg-muted/30">
                  {[5, 10].map((count) => (
                    <button
                      key={count}
                      onClick={() => setClaimsTopCount(count as 5 | 10)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        claimsTopCount === count
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      Top {count}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : claimsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={claimsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `₵${v.toFixed(0)}M`} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number, name: string) => 
                      [`GH₵${value.toFixed(1)}M`, name]
                    } />
                    <Legend />
                    <Bar dataKey="incurredClaims" name="Incurred Claims" fill="hsl(0, 84%, 60%)" />
                    <Bar dataKey="investmentIncome" name="Investment Income" fill="hsl(142, 76%, 36%)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No claims/investment data available
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Solvency Chart */}
        {solvencyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Solvency Ratio by Insurer
              </CardTitle>
              <CardDescription>
                Financial strength indicator - NIC minimum requirement is 100%
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={solvencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Bar dataKey="solvency" name="Solvency Ratio">
                      {solvencyData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span>Strong (≥150%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-amber-500" />
                  <span>Adequate (100-150%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span>Below Minimum (&lt;100%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* New Analytics Section */}
        <section className="grid lg:grid-cols-2 gap-6">
          {/* Premium Growth Leaderboard */}
          <PremiumGrowthLeaderboard 
            category={selectedCategory}
            selectedYear={selectedYear}
            selectedQuarter={selectedQuarter}
          />

          {/* Profitability Heatmap */}
          <ProfitabilityHeatmap metrics={metrics} />
        </section>

        {/* Product Mix Treemap */}
        <section>
          <ProductMixTreemap metrics={metrics} />
        </section>

        {/* Strategic Market Questions */}
        <section>
          <StrategicInsightsQA metrics={metrics} />
        </section>

        {/* Market Performance Summary */}
        <section>
          <MarketPerformanceSummary 
            category={selectedCategory}
            selectedYear={selectedYear}
            selectedQuarter={selectedQuarter}
          />
        </section>

        {/* Historical Trends */}
        <section>
          <HistoricalTrends category={selectedCategory} />
        </section>

        {/* Data Source */}
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Data Source: <span className="font-medium">National Insurance Commission (NIC) Quarterly Reports</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedYear} Q{selectedQuarter} • Last updated from official NIC data
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
