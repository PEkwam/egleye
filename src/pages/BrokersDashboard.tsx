import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Footer } from '@/components/Footer';
import { BrokerMarketSummary } from '@/components/BrokerMarketSummary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart
} from 'recharts';
import { TrendingUp, TrendingDown, Building2, DollarSign, BarChart3, Award, ArrowLeft, Users, Percent } from 'lucide-react';
import { DashboardNavigation } from '@/components/DashboardNavigation';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';

interface BrokerMetric {
  id: string;
  broker_name: string;
  commission_income: number | null;
  general_admin_expenses: number | null;
  operational_results: number | null;
  total_investments_income: number | null;
  profit_loss_after_tax: number | null;
  market_share: number | null;
  report_year: number;
  report_quarter: number | null;
}

const COLORS = [
  'hsl(142, 76%, 36%)', // emerald
  'hsl(221, 83%, 53%)', // blue
  'hsl(262, 83%, 58%)', // violet
  'hsl(24, 95%, 53%)',  // orange
  'hsl(0, 84%, 60%)',   // red
  'hsl(326, 80%, 58%)', // pink
  'hsl(187, 85%, 43%)', // cyan
  'hsl(84, 60%, 50%)',  // lime
];

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return 'N/A';
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `GH₵ ${(value / 1000000).toFixed(2)}M`;
  } else if (absValue >= 1000) {
    return `GH₵ ${(value / 1000).toFixed(1)}K`;
  }
  return `GH₵ ${value.toLocaleString()}`;
};

const formatPercent = (value: number | null) => {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
};

const BrokersDashboard = () => {
  const navigate = useNavigate();
const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('1');
  const [selectedMetric, setSelectedMetric] = useState<'commission_income' | 'profit_loss_after_tax' | 'market_share'>('commission_income');
  const [displayFilter, setDisplayFilter] = useState<'all' | 'top5' | 'top10'>('all');

  // Fetch broker metrics
  const { data: brokerMetrics = [], isLoading } = useQuery({
    queryKey: ['broker-metrics', selectedYear, selectedQuarter],
    queryFn: async () => {
      let query = supabase
        .from('broker_metrics')
        .select('*')
        .eq('report_year', parseInt(selectedYear))
        .order('commission_income', { ascending: false, nullsFirst: false });

      if (selectedQuarter !== 'all') {
        query = query.eq('report_quarter', parseInt(selectedQuarter));
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BrokerMetric[];
    },
  });

  // Get available years
  const { data: availableYears = [] } = useQuery({
    queryKey: ['broker-available-years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broker_metrics')
        .select('report_year')
        .order('report_year', { ascending: false });
      
      if (error) throw error;
      const years = [...new Set(data?.map(d => d.report_year) || [])];
      return years;
    },
  });

  // Set default year to highest available
  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0].toString());
    }
  }, [availableYears, selectedYear]);

  // Fetch previous quarter data for comparison
  const { data: previousBrokerMetrics = [] } = useQuery({
    queryKey: ['broker-metrics-previous', selectedYear, selectedQuarter],
    queryFn: async () => {
      if (!selectedYear) return [];
      const currentYear = parseInt(selectedYear);
      
      if (selectedQuarter === 'all') {
        const { data, error } = await supabase
          .from('broker_metrics')
          .select('*')
          .eq('report_year', currentYear - 1)
          .order('commission_income', { ascending: false, nullsFirst: false });
        if (error) return [];
        return (data || []) as BrokerMetric[];
      } else {
        const currentQ = parseInt(selectedQuarter);
        const prevQuarter = currentQ === 1 ? 4 : currentQ - 1;
        const prevYear = currentQ === 1 ? currentYear - 1 : currentYear;
        
        const { data, error } = await supabase
          .from('broker_metrics')
          .select('*')
          .eq('report_year', prevYear)
          .eq('report_quarter', prevQuarter)
          .order('commission_income', { ascending: false, nullsFirst: false });
        if (error) return [];
        return (data || []) as BrokerMetric[];
      }
    },
    enabled: !!selectedYear,
  });

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (brokerMetrics.length === 0) return null;

    const totalCommission = brokerMetrics.reduce((sum, b) => sum + (b.commission_income || 0), 0);
    const totalProfit = brokerMetrics.reduce((sum, b) => sum + (b.profit_loss_after_tax || 0), 0);
    const totalExpenses = brokerMetrics.reduce((sum, b) => sum + (b.general_admin_expenses || 0), 0);
    const profitableBrokers = brokerMetrics.filter(b => (b.profit_loss_after_tax || 0) > 0).length;
    const avgMarketShare = brokerMetrics.reduce((sum, b) => sum + (b.market_share || 0), 0) / brokerMetrics.length;

    return {
      totalCommission,
      totalProfit,
      totalExpenses,
      profitableBrokers,
      totalBrokers: brokerMetrics.length,
      avgMarketShare,
    };
  }, [brokerMetrics]);

  // Top brokers by selected metric based on filter
  const topBrokers = useMemo(() => {
    const sorted = [...brokerMetrics].sort((a, b) => (b[selectedMetric] || 0) - (a[selectedMetric] || 0));
    if (displayFilter === 'top5') return sorted.slice(0, 5);
    if (displayFilter === 'top10') return sorted.slice(0, 10);
    return sorted;
  }, [brokerMetrics, selectedMetric, displayFilter]);

  // Filtered brokers for table display
  const filteredBrokers = useMemo(() => {
    const sorted = [...brokerMetrics].sort((a, b) => (b.commission_income || 0) - (a.commission_income || 0));
    if (displayFilter === 'top5') return sorted.slice(0, 5);
    if (displayFilter === 'top10') return sorted.slice(0, 10);
    return sorted;
  }, [brokerMetrics, displayFilter]);

  // Market share pie chart data - respects displayFilter
  const marketShareData = useMemo(() => {
    const sorted = [...brokerMetrics].sort((a, b) => (b.market_share || 0) - (a.market_share || 0));
    
    let dataToShow: BrokerMetric[];
    if (displayFilter === 'top5') {
      dataToShow = sorted.slice(0, 5);
    } else if (displayFilter === 'top10') {
      dataToShow = sorted.slice(0, 10);
    } else {
      // For 'all', show top 7 + others
      dataToShow = sorted.slice(0, 7);
    }

    const data = dataToShow.map(b => ({
      name: b.broker_name.length > 20 ? b.broker_name.slice(0, 17) + '...' : b.broker_name,
      value: (b.market_share || 0) * 100,
      fullName: b.broker_name,
    }));

    // Only add "Others" for 'all' filter
    if (displayFilter === 'all' && sorted.length > 7) {
      const othersTotal = sorted
        .slice(7)
        .reduce((sum, b) => sum + (b.market_share || 0), 0);
      if (othersTotal > 0) {
        data.push({ name: 'Others', value: othersTotal * 100, fullName: 'Others' });
      }
    }

    return data;
  }, [brokerMetrics, displayFilter]);

  // Quarterly trend data
  const { data: quarterlyTrend = [] } = useQuery({
    queryKey: ['broker-quarterly-trend', selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broker_metrics')
        .select('report_quarter, commission_income, profit_loss_after_tax')
        .eq('report_year', parseInt(selectedYear))
        .order('report_quarter');

      if (error) throw error;

      const quarterlyData = [1, 2, 3, 4].map(q => {
        const quarterBrokers = (data || []).filter(d => d.report_quarter === q);
        return {
          quarter: `Q${q}`,
          commission: quarterBrokers.reduce((sum, b) => sum + (b.commission_income || 0), 0) / 1000000,
          profit: quarterBrokers.reduce((sum, b) => sum + (b.profit_loss_after_tax || 0), 0) / 1000000,
        };
      });

      return quarterlyData;
    },
  });

  if (!selectedYear || isLoading) {
    return <DashboardSkeleton variant="brokers" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
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
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-lg font-bold truncate">Brokers Dashboard</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">NIC Performance Analytics</p>
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
      
      <main className="container mx-auto px-4 py-6">
        {/* Modern Filters Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium bg-primary/5 border-primary/20">
              {selectedYear}
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 text-sm bg-muted/50">
              {selectedQuarter === 'all' ? 'All Quarters' : `Q${selectedQuarter}`}
            </Badge>
            <Badge variant="secondary" className="px-3 py-1.5 text-sm">
              {brokerMetrics.length} Brokers
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px] h-9 bg-background border-border/50">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {(availableYears.length > 0 ? availableYears : [2025, 2024, 2023]).map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="w-[110px] h-9 bg-background border-border/50">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters</SelectItem>
                <SelectItem value="1">Q1</SelectItem>
                <SelectItem value="2">Q2</SelectItem>
                <SelectItem value="3">Q3</SelectItem>
                <SelectItem value="4">Q4</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/50">
              <span className="text-xs text-muted-foreground px-2 font-medium">Show:</span>
              {(['all', 'top5', 'top10'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={displayFilter === filter ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDisplayFilter(filter)}
                  className={`h-7 px-3 text-xs ${displayFilter === filter ? 'shadow-sm' : ''}`}
                >
                  {filter === 'all' ? 'All' : filter === 'top5' ? 'Top 5' : 'Top 10'}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : brokerMetrics.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">No broker data available for {selectedYear} {selectedQuarter !== 'all' ? `Q${selectedQuarter}` : ''}</p>
            <p className="text-sm text-muted-foreground mt-2">Upload broker data from the admin panel to get started.</p>
          </Card>
        ) : (
          <>
            {/* Market Performance Summary */}
            <BrokerMarketSummary 
              metrics={brokerMetrics} 
              previousMetrics={previousBrokerMetrics}
              year={parseInt(selectedYear)} 
              quarter={selectedQuarter} 
            />

            {/* Modern Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 mt-6">
              <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Commission Income</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(summaryMetrics?.totalCommission || 0)}</p>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-emerald-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`bg-gradient-to-br ${(summaryMetrics?.totalProfit || 0) >= 0 ? 'from-blue-500/5 to-blue-500/10 border-blue-500/20' : 'from-red-500/5 to-red-500/10 border-red-500/20'} hover:shadow-lg transition-all duration-300`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Profit After Tax</p>
                      <p className={`text-2xl font-bold mt-1 ${(summaryMetrics?.totalProfit || 0) >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {formatCurrency(summaryMetrics?.totalProfit || 0)}
                      </p>
                    </div>
                    <div className={`h-11 w-11 rounded-xl ${(summaryMetrics?.totalProfit || 0) >= 0 ? 'bg-blue-500/15' : 'bg-red-500/15'} flex items-center justify-center`}>
                      {(summaryMetrics?.totalProfit || 0) >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-violet-500/5 to-violet-500/10 border-violet-500/20 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Brokers</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{summaryMetrics?.totalBrokers}</p>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-violet-500/15 flex items-center justify-center">
                      <Users className="h-5 w-5 text-violet-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Profitable</p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        <span className="text-emerald-500">{summaryMetrics?.profitableBrokers}</span>
                        <span className="text-muted-foreground text-lg"> / {summaryMetrics?.totalBrokers}</span>
                      </p>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-amber-500/15 flex items-center justify-center">
                      <Percent className="h-5 w-5 text-amber-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              {/* Top Brokers Chart */}
              <Card className="border-border/50 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {displayFilter === 'all' ? 'All' : displayFilter === 'top5' ? 'Top 5' : 'Top 10'} Brokers
                      </CardTitle>
                      <CardDescription className="text-xs">Performance by selected metric</CardDescription>
                    </div>
                    <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as typeof selectedMetric)}>
                      <SelectTrigger className="w-[150px] h-8 text-xs bg-muted/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commission_income">Commission Income</SelectItem>
                        <SelectItem value="profit_loss_after_tax">Profit After Tax</SelectItem>
                        <SelectItem value="market_share">Market Share</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart 
                      data={topBrokers.slice(0, displayFilter === 'all' ? 15 : undefined)}
                      layout="vertical"
                      margin={{ top: 0, right: 30, bottom: 0, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={true} vertical={false} />
                      <XAxis 
                        type="number" 
                        tickFormatter={(v) => selectedMetric === 'market_share' ? `${(v * 100).toFixed(1)}%` : `${(v / 1000000).toFixed(1)}M`}
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="broker_name" 
                        width={140} 
                        tickFormatter={(v) => v.length > 18 ? v.slice(0, 15) + '...' : v}
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        formatter={(value: number) => selectedMetric === 'market_share' 
                          ? formatPercent(value) 
                          : formatCurrency(value)
                        }
                        labelFormatter={(label) => label}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar 
                        dataKey={selectedMetric} 
                        fill="url(#barGradient)" 
                        radius={[0, 6, 6, 0]}
                      />
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="hsl(262, 83%, 58%)" />
                          <stop offset="100%" stopColor="hsl(221, 83%, 53%)" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Market Share Pie Chart */}
              <Card className="border-border/50 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Market Share Distribution</CardTitle>
                  <CardDescription className="text-xs">
                    {displayFilter === 'all' ? 'Top 7 brokers' : displayFilter === 'top5' ? 'Top 5 brokers' : 'Top 10 brokers'} by market share
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={marketShareData}
                        cx="50%"
                        cy="45%"
                        innerRadius={0}
                        outerRadius={80}
                        paddingAngle={1}
                        dataKey="value"
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return value > 1.5 ? (
                            <text
                              x={x}
                              y={y}
                              fill="white"
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize={10}
                              fontWeight="600"
                              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                            >
                              {value.toFixed(1)}%
                            </text>
                          ) : null;
                        }}
                        labelLine={false}
                      >
                        {marketShareData.map((_, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `${value.toFixed(2)}%`}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={50}
                        wrapperStyle={{ paddingTop: '10px' }}
                        formatter={(value) => <span className="text-[10px] text-muted-foreground">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Quarterly Trend */}
            <Card className="mb-6 border-border/50 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Quarterly Performance Trend - {selectedYear}</CardTitle>
                <CardDescription className="text-xs">Commission income and profit after tax (in millions GH₵)</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={quarterlyTrend}>
                    <defs>
                      <linearGradient id="commissionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis dataKey="quarter" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `${v.toFixed(0)}M`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value: number) => `GH₵ ${value.toFixed(2)}M`}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Area 
                      type="monotone" 
                      dataKey="commission" 
                      name="Commission Income" 
                      stroke="hsl(142, 76%, 36%)" 
                      strokeWidth={2}
                      fill="url(#commissionGradient)"
                      dot={{ r: 4, fill: 'hsl(142, 76%, 36%)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="profit" 
                      name="Profit After Tax" 
                      stroke="hsl(221, 83%, 53%)" 
                      strokeWidth={2}
                      fill="url(#profitGradient)"
                      dot={{ r: 4, fill: 'hsl(221, 83%, 53%)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Full Table */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {displayFilter === 'all' ? 'All' : displayFilter === 'top5' ? 'Top 5' : 'Top 10'} Brokers Data
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {selectedQuarter === 'all' ? 'All Quarters' : `Q${selectedQuarter}`} {selectedYear} • {filteredBrokers.length} brokers
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {filteredBrokers.length} records
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="min-w-[200px] font-semibold text-xs">Broker Name</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Q</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Commission</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Expenses</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Op. Results</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Investments</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Profit/Loss</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBrokers.map((broker, idx) => (
                        <TableRow key={broker.id} className={idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'}>
                          <TableCell className="font-medium text-xs">{broker.broker_name}</TableCell>
                          <TableCell className="text-right text-xs">Q{broker.report_quarter}</TableCell>
                          <TableCell className="text-right text-xs">{formatCurrency(broker.commission_income)}</TableCell>
                          <TableCell className="text-right text-xs">{formatCurrency(broker.general_admin_expenses)}</TableCell>
                          <TableCell className={`text-right text-xs ${(broker.operational_results || 0) < 0 ? 'text-red-500' : ''}`}>
                            {formatCurrency(broker.operational_results)}
                          </TableCell>
                          <TableCell className="text-right text-xs">{formatCurrency(broker.total_investments_income)}</TableCell>
                          <TableCell className={`text-right font-medium text-xs ${(broker.profit_loss_after_tax || 0) < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {formatCurrency(broker.profit_loss_after_tax)}
                          </TableCell>
                          <TableCell className="text-right text-xs">{formatPercent(broker.market_share)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default BrokersDashboard;
