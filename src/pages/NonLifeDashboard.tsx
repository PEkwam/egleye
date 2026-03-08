import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Car, TrendingUp, Award, BarChart3, PieChart, Calendar, Sparkles, Flame, Shield, Ship, Users, Clock } from 'lucide-react';
import { NoDataBadge } from '@/components/NoDataBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend } from 'recharts';
import { NonLifeQuarterlyTrends } from '@/components/NonLifeQuarterlyTrends';
import { NonLifeMotorBreakdown } from '@/components/NonLifeMotorBreakdown';
import { NonLifeAIInsights } from '@/components/NonLifeAIInsights';
import { PropertyBreakdown } from '@/components/PropertyBreakdown';
import { AccidentLiabilityBreakdown } from '@/components/AccidentLiabilityBreakdown';
import { MarineAviationBreakdown } from '@/components/MarineAviationBreakdown';
import { NonLifeMarketSummary } from '@/components/NonLifeMarketSummary';
import { DashboardNavigation } from '@/components/DashboardNavigation';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { PullToRefresh } from '@/components/PullToRefresh';
import { VirtualizedTable } from '@/components/VirtualizedTable';
import { TrendingIndicator, TrendBadge } from '@/components/TrendingIndicator';
import { CollapsibleSection, CollapsibleGroup } from '@/components/CollapsibleSection';

const COLORS = ['hsl(145, 75%, 40%)', 'hsl(221, 83%, 53%)', 'hsl(262, 83%, 58%)', 'hsl(24, 95%, 53%)', 'hsl(340, 75%, 55%)', 'hsl(180, 70%, 45%)', 'hsl(45, 90%, 50%)', 'hsl(300, 60%, 50%)', 'hsl(200, 70%, 50%)', 'hsl(120, 60%, 45%)'];

export default function NonLifeDashboard() {
const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  const [marketShareFilter, setMarketShareFilter] = useState<'all' | 'top5' | 'top10'>('top5');
  const queryClient = useQueryClient();

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['nonlife-metrics'] });
    await queryClient.invalidateQueries({ queryKey: ['nonlife-metrics-previous'] });
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  // Fetch available years
  const { data: availableYears = [] } = useQuery({
    queryKey: ['nonlife-available-years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nonlife_insurer_metrics')
        .select('report_year')
        .order('report_year', { ascending: false });
      
      if (error) throw error;
      const years = [...new Set(data?.map(d => d.report_year) || [])];
      return years;
    },
  });

  // Fetch available quarters for selected year
  const { data: availableQuarters = [] } = useQuery({
    queryKey: ['nonlife-available-quarters', selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nonlife_insurer_metrics')
        .select('report_quarter')
        .eq('report_year', selectedYear!)
        .order('report_quarter', { ascending: false });
      
      if (error) throw error;
      const quarters = [...new Set(data?.map(d => d.report_quarter).filter(Boolean) || [])] as number[];
      return quarters;
    },
    enabled: selectedYear !== null,
  });

  // Set default year to highest available
  useEffect(() => {
    if (availableYears.length > 0 && selectedYear === null) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Set default quarter to latest available
  useEffect(() => {
    if (availableQuarters.length > 0 && selectedQuarter === null) {
      setSelectedQuarter(availableQuarters[0]);
    }
  }, [availableQuarters, selectedQuarter]);

  // Scroll to top when filters change
  useEffect(() => {
    if (selectedYear !== null && selectedQuarter !== null) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [selectedYear, selectedQuarter]);

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['nonlife-metrics', selectedYear, selectedQuarter],
    queryFn: async () => {
      if (!selectedYear || !selectedQuarter) return [];
      const { data, error } = await supabase
        .from('nonlife_insurer_metrics')
        .select('*')
        .eq('report_year', selectedYear)
        .eq('report_quarter', selectedQuarter)
        .order('market_share', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: selectedYear !== null && selectedQuarter !== null,
  });

  // Fetch previous quarter data for comparison
  const { data: previousMetrics = [] } = useQuery({
    queryKey: ['nonlife-metrics-previous', selectedYear, selectedQuarter],
    queryFn: async () => {
      if (!selectedYear || !selectedQuarter) return [];
      const prevQuarter = selectedQuarter === 1 ? 4 : selectedQuarter - 1;
      const prevYear = selectedQuarter === 1 ? selectedYear - 1 : selectedYear;
      
      const { data, error } = await supabase
        .from('nonlife_insurer_metrics')
        .select('*')
        .eq('report_year', prevYear)
        .eq('report_quarter', prevQuarter)
        .order('market_share', { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: selectedYear !== null && selectedQuarter !== null,
  });

  const totalRevenue = metrics.reduce((sum, m) => sum + (m.insurance_service_revenue || 0), 0);
  const totalMotor = metrics.reduce((sum, m) => sum + (m.motor_comprehensive || 0) + (m.motor_third_party || 0), 0);
  const topInsurer = metrics[0];
  
  // Calculate average years in Ghana
  const avgYearsInGhana = useMemo(() => {
    const withYears = metrics.filter(m => m.years_in_ghana && m.years_in_ghana > 0);
    if (withYears.length === 0) return 0;
    return withYears.reduce((sum, m) => sum + (m.years_in_ghana || 0), 0) / withYears.length;
  }, [metrics]);

  // Calculate the number of items to show based on filter
  const chartFilterCount = useMemo(() => {
    if (marketShareFilter === 'all') return metrics.length;
    if (marketShareFilter === 'top5') return Math.min(5, metrics.length);
    return Math.min(10, metrics.length);
  }, [marketShareFilter, metrics.length]);

  // Filter chart data based on selection
  const chartData = useMemo(() => {
    return metrics.slice(0, chartFilterCount).map(m => ({
      name: m.insurer_name.split(' ')[0],
      revenue: (m.insurance_service_revenue || 0) / 1e6,
      motor: ((m.motor_comprehensive || 0) + (m.motor_third_party || 0)) / 1e6,
      profit: (m.profit_after_tax || 0) / 1e6,
    }));
  }, [metrics, chartFilterCount]);

  // Filter pie chart data based on selection - multiply by 100 for percentage display
  const marketShareData = useMemo(() => {
    return metrics.slice(0, chartFilterCount).map((m, i) => ({
      name: m.insurer_name.split(' ')[0],
      value: (m.market_share || 0) * 100,
      fill: COLORS[i % COLORS.length],
    }));
  }, [metrics, chartFilterCount]);

  // Custom label renderer for pie chart
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    if (value < 3) return null;
    
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
        {`${value.toFixed(1)}%`}
      </text>
    );
  };

  // Show proper empty state with navigation when no data
  if (!selectedYear && !isLoading && availableYears.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-950/10">
        <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <Button variant="ghost" size="sm" asChild className="hover:bg-primary/10 shrink-0">
                  <Link to="/">
                    <ArrowLeft className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Back</span>
                  </Link>
                </Button>
                <div className="h-6 w-px bg-border hidden sm:block" />
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-lg shadow-green-500/20 shrink-0">
                    <Car className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-sm sm:text-lg font-bold truncate">Non-Life Dashboard</h1>
                    <p className="text-xs text-muted-foreground hidden sm:block">Motor, Property, Marine & Engineering</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <DashboardNavigation />
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12">
          <Card className="max-w-lg mx-auto text-center py-12">
            <CardContent>
              <Car className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
              <p className="text-muted-foreground mb-6">
                Non-Life insurance data hasn't been uploaded yet. Please upload data via the Data Admin page.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link to="/data-admin">Go to Data Admin</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/">Return Home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return <DashboardSkeleton variant="nonlife" />;
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-950/10">
      {/* Modern Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button variant="ghost" size="sm" asChild className="hover:bg-primary/10 shrink-0">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Link>
              </Button>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-lg shadow-green-500/20 shrink-0">
                  <Car className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-lg font-bold truncate">Non-Life Dashboard</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">Motor, Property, Marine & Engineering</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <DashboardNavigation />
              <Link to="/" className="hidden sm:block">
                <img 
                  src="/enterprise-life-logo.png" 
                  alt="Enterprise Life" 
                  className="h-8 sm:h-10 w-auto object-contain"
                />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={handleRefresh} className="h-[calc(100vh-64px)] md:h-auto md:overflow-visible">
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Filters Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium bg-primary/5 border-primary/20">
              {selectedYear}
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 text-sm bg-muted/50">
              Q{selectedQuarter}
            </Badge>
            <Badge variant="secondary" className="px-3 py-1.5 text-sm">
              {metrics.length} Insurers
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedYear?.toString() || ''} onValueChange={v => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[100px] h-9 bg-background border-border/50">
                <Calendar className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedQuarter?.toString() || ''} onValueChange={v => setSelectedQuarter(parseInt(v))}>
              <SelectTrigger className="w-[80px] h-9 bg-background border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(availableQuarters.length > 0 ? availableQuarters : [1,2,3,4]).map(q => <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>)}
              </SelectContent>
            </Select>
            
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/50">
              <span className="text-xs text-muted-foreground px-2 font-medium">Show:</span>
              {(['all', 'top5', 'top10'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={marketShareFilter === filter ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMarketShareFilter(filter)}
                  className={`h-7 px-3 text-xs ${marketShareFilter === filter ? 'shadow-sm' : ''}`}
                >
                  {filter === 'all' ? 'All' : filter === 'top5' ? 'Top 5' : 'Top 10'}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Market Performance Summary - New Component */}
        <NonLifeMarketSummary 
          metrics={metrics} 
          previousMetrics={previousMetrics}
          year={selectedYear} 
          quarter={selectedQuarter} 
        />

        {/* Key Metrics Cards with Trend Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Service Revenue</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{totalRevenue > 0 ? `₵${(totalRevenue / 1e9).toFixed(2)}B` : 'N/A'}</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {previousMetrics.length > 0 && totalRevenue > 0 && (
                  <TrendingIndicator 
                    currentValue={totalRevenue} 
                    previousValue={previousMetrics.reduce((sum, m) => sum + (m.insurance_service_revenue || 0), 0)}
                    size="sm"
                  />
                )}
                <Badge variant="secondary" className="text-xs">Q{selectedQuarter} {selectedYear}</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Motor Premium</p>
                  <p className="text-2xl font-bold text-foreground mt-1">₵{(totalMotor / 1e9).toFixed(2)}B</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-green-500/15 flex items-center justify-center">
                  <Car className="h-5 w-5 text-green-500" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {previousMetrics.length > 0 && (
                  <TrendingIndicator 
                    currentValue={totalMotor} 
                    previousValue={previousMetrics.reduce((sum, m) => sum + (m.motor_comprehensive || 0) + (m.motor_third_party || 0), 0)}
                    size="sm"
                  />
                )}
                <Badge variant="secondary" className="text-xs">All Motor Types</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Market Leader</p>
                  <p className="text-lg font-bold truncate mt-1">{topInsurer?.insurer_name.split(' ').slice(0,2).join(' ')}</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <Award className="h-5 w-5 text-amber-500" />
                </div>
              </div>
              <Badge className="mt-3 text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400">{((topInsurer?.market_share || 0) * 100).toFixed(1)}% share</Badge>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Insurers</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{metrics.length}</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-purple-500/15 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {previousMetrics.length > 0 && (
                  <TrendingIndicator 
                    currentValue={metrics.length} 
                    previousValue={previousMetrics.length}
                    format="number"
                    size="sm"
                  />
                )}
              <Badge variant="secondary" className="text-xs">Non-Life Sector</Badge>
              </div>
            </CardContent>
          </Card>
          
          {/* Years in Ghana */}
          <Card className="bg-gradient-to-br from-cyan-500/5 to-cyan-500/10 border-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Years in Ghana</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{avgYearsInGhana > 0 ? `${avgYearsInGhana.toFixed(0)} yrs` : 'N/A'}</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-cyan-500" />
                </div>
              </div>
              <div className="mt-3">
                <Badge variant="secondary" className="text-xs">Avg. Industry Experience</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="mb-6 bg-muted/50 inline-flex w-auto min-w-full md:min-w-0">
              <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="motor" className="gap-1.5 text-xs sm:text-sm">
                <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Motor Breakdown</span>
                <span className="sm:hidden">Motor</span>
              </TabsTrigger>
              <TabsTrigger value="property" className="gap-1.5 text-xs sm:text-sm">
                <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Property & Fire</span>
                <span className="sm:hidden">Property</span>
              </TabsTrigger>
              <TabsTrigger value="accident" className="gap-1.5 text-xs sm:text-sm">
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Accident & Liability</span>
                <span className="sm:hidden">Accident</span>
              </TabsTrigger>
              <TabsTrigger value="marine" className="gap-1.5 text-xs sm:text-sm">
                <Ship className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Marine & Aviation</span>
                <span className="sm:hidden">Marine</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-1.5 text-xs sm:text-sm">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Quarterly Trends</span>
                <span className="sm:hidden">Trends</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-1.5 text-xs sm:text-sm">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">AI Insights</span>
                <span className="sm:hidden">AI</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="border-border/50 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    {marketShareFilter === 'all' ? 'All' : marketShareFilter === 'top5' ? 'Top 5' : 'Top 10'} by Revenue (₵M)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} layout="vertical">
                      <XAxis type="number" tickFormatter={v => `₵${v}M`} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `₵${v.toFixed(1)}M`} />
                      <Bar dataKey="revenue" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card className="border-border/50 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <PieChart className="h-5 w-5 text-green-500" />
                    Market Share - {marketShareFilter === 'all' ? 'All' : marketShareFilter === 'top5' ? 'Top 5' : 'Top 10'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie 
                        data={marketShareData} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="45%" 
                        outerRadius={90}
                        labelLine={false}
                        label={renderCustomLabel}
                      >
                        {marketShareData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Legend formatter={(value, entry: any) => `${value}: ${entry.payload.value?.toFixed(1)}%`} />
                      <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="motor">
            <NonLifeMotorBreakdown year={selectedYear} quarter={selectedQuarter} />
          </TabsContent>

          <TabsContent value="property">
            <PropertyBreakdown year={selectedYear} quarter={selectedQuarter} />
          </TabsContent>

          <TabsContent value="accident">
            <AccidentLiabilityBreakdown year={selectedYear} quarter={selectedQuarter} />
          </TabsContent>

          <TabsContent value="marine">
            <MarineAviationBreakdown year={selectedYear} quarter={selectedQuarter} />
          </TabsContent>

          <TabsContent value="trends">
            <NonLifeQuarterlyTrends />
          </TabsContent>

          <TabsContent value="insights">
            <NonLifeAIInsights metrics={metrics} year={selectedYear} quarter={selectedQuarter} />
          </TabsContent>
        </Tabs>

        {/* Rankings Table with Virtualization and Trends */}
        <CollapsibleSection 
          title="Non-Life Insurance Rankings" 
          subtitle={`Q${selectedQuarter} ${selectedYear} • ${metrics.length} insurers`}
          icon={BarChart3}
          variant="card"
          badge={
            previousMetrics.length > 0 && (
              <TrendBadge 
                currentValue={totalRevenue} 
                previousValue={previousMetrics.reduce((sum, m) => sum + (m.insurance_service_revenue || 0), 0)}
                label="prev quarter"
              />
            )
          }
        >
          <VirtualizedTable
            data={metrics}
            keyField="id"
            showRank
            trendField="insurance_service_revenue"
            previousData={previousMetrics}
            maxHeight={400}
            columns={[
              {
                key: 'insurer_name',
                header: 'Insurer',
                render: (item) => (
                  <span className="font-medium">{item.insurer_name}</span>
                )
              },
              {
                key: 'insurance_service_revenue',
                header: 'Revenue',
                align: 'right' as const,
                width: '100px',
                render: (item) => `₵${((item.insurance_service_revenue || 0) / 1e6).toFixed(1)}M`
              },
              {
                key: 'motor',
                header: 'Motor',
                align: 'right' as const,
                width: '90px',
                render: (item) => `₵${(((item.motor_comprehensive || 0) + (item.motor_third_party || 0)) / 1e6).toFixed(1)}M`
              },
              {
                key: 'profit_after_tax',
                header: 'Profit',
                align: 'right' as const,
                width: '90px',
                render: (item) => (
                  <span className={(item.profit_after_tax || 0) >= 0 ? 'text-green-600' : 'text-red-500'}>
                    ₵{((item.profit_after_tax || 0) / 1e6).toFixed(1)}M
                  </span>
                )
              },
              {
                key: 'claims_ratio',
                header: 'Claims',
                align: 'right' as const,
                width: '70px',
                render: (item) => `${item.claims_ratio ? ((item.claims_ratio * 100).toFixed(1)) : '-'}%`
              },
              {
                key: 'market_share',
                header: 'Share',
                align: 'right' as const,
                width: '70px',
                render: (item) => (
                  <span className="font-medium">{item.market_share ? ((item.market_share * 100).toFixed(1)) : '-'}%</span>
                )
              },
            ]}
          />
        </CollapsibleSection>
      </main>
      </PullToRefresh>
    </div>
  );
}