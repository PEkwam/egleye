import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  PieChart, DollarSign, Building2, TrendingUp, 
  ChevronRight, BarChart3, Users
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import { Link } from 'react-router-dom';

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

export function HomeInsurerMetrics() {
  // Default to most recent Q1 data
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState(1);

  // Fetch available years to determine the latest year with Q1 data
  const { data: availableData } = useQuery({
    queryKey: ['home-available-quarters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurer_metrics')
        .select('report_year, report_quarter')
        .eq('category', 'life')
        .eq('report_quarter', 1)
        .order('report_year', { ascending: false });

      if (error) {
        console.error('Error fetching available years:', error);
        return [];
      }
      
      // Get unique years that have Q1 data
      const years = [...new Set(data?.map(d => d.report_year) || [])];
      return years;
    },
  });

  // Set default year to most recent year with Q1 data
  useEffect(() => {
    if (availableData && availableData.length > 0 && selectedYear === null) {
      setSelectedYear(availableData[0]);
    }
  }, [availableData, selectedYear]);

  // Fetch metrics independently for the home page
  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['home-insurer-metrics', selectedYear, selectedQuarter],
    queryFn: async () => {
      if (!selectedYear) return [];
      
      const { data, error } = await supabase
        .from('insurer_metrics')
        .select('*')
        .eq('report_year', selectedYear)
        .eq('report_quarter', selectedQuarter)
        .eq('category', 'life')
        .order('market_share', { ascending: false });

      if (error) {
        console.error('Error fetching home metrics:', error);
        return [];
      }
      return data || [];
    },
    enabled: selectedYear !== null,
  });

  // Calculate industry totals
  const industryTotals = useMemo(() => ({
    totalPremium: metrics.reduce((sum, m) => sum + (m.gross_premium || 0), 0),
    totalAssets: metrics.reduce((sum, m) => sum + (m.total_assets || 0), 0),
    totalProfit: metrics.reduce((sum, m) => sum + (m.profit_after_tax || 0), 0),
    companiesCount: metrics.length,
  }), [metrics]);

  // Top 5 insurers for pie chart - calculate market share dynamically from gross_premium
  const topInsurers = useMemo(() => {
    const totalPremium = metrics.reduce((sum, m) => sum + (m.gross_premium || 0), 0);
    return metrics
      .filter(m => m.gross_premium && m.gross_premium > 0)
      .sort((a, b) => (b.gross_premium || 0) - (a.gross_premium || 0))
      .slice(0, 5)
      .map((m, idx) => ({
        name: m.insurer_name.split(' ').slice(0, 2).join(' '),
        fullName: m.insurer_name,
        // Calculate market share: insurer premium / total premium * 100
        value: totalPremium > 0 ? ((m.gross_premium || 0) / totalPremium) * 100 : 0,
        premium: m.gross_premium || 0,
        fill: CHART_COLORS[idx % CHART_COLORS.length],
      }));
  }, [metrics]);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `₵${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `₵${(value / 1e6).toFixed(0)}M`;
    return `₵${value.toLocaleString()}`;
  };

  if (isLoading || selectedYear === null) {
    return (
      <section className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-[250px]" />
              <div className="space-y-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-6 md:py-8">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3 md:pb-4 px-4 md:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
                <span className="text-base md:text-xl">Life Insurance Overview</span>
              </CardTitle>
              <CardDescription className="mt-1 text-xs md:text-sm">
                Ghana NIC data • Q{selectedQuarter} {selectedYear}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[80px] md:w-[90px] h-8 md:h-9 text-xs md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border shadow-lg z-50">
                  {[2025, 2024, 2023].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                value={selectedQuarter.toString()} 
                onValueChange={(v) => setSelectedQuarter(parseInt(v))}
              >
                <SelectTrigger className="w-[70px] md:w-[80px] h-8 md:h-9 text-xs md:text-sm">
                  <SelectValue placeholder="Quarter" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border shadow-lg z-50">
                  {[1, 2, 3, 4].map(q => (
                    <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          {metrics.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-muted-foreground">
              <PieChart className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-40" />
              <p className="text-sm md:text-base">No data available for Q{selectedQuarter} {selectedYear}</p>
              <p className="text-xs md:text-sm mt-2">Try selecting a different period</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {/* Pie Chart */}
              <div className="h-[220px] md:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={topInsurers}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={25}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return value > 8 ? (
                          <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight="bold">
                            {value.toFixed(0)}%
                          </text>
                        ) : null;
                      }}
                      labelLine={false}
                    >
                      {topInsurers.map((entry, index) => (
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
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      formatter={(value) => <span className="text-[10px] md:text-xs">{value}</span>}
                      wrapperStyle={{ fontSize: '10px' }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>

              {/* Key Stats */}
              <div className="space-y-2 md:space-y-3">
                <div className="p-3 md:p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-1.5 md:gap-2 text-green-600 mb-0.5 md:mb-1">
                    <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="text-[10px] md:text-xs font-medium">Total Gross Premium</span>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-foreground">
                    {formatCurrency(industryTotals.totalPremium)}
                  </p>
                </div>

                <div className="p-3 md:p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-1.5 md:gap-2 text-blue-600 mb-0.5 md:mb-1">
                    <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="text-[10px] md:text-xs font-medium">Total Assets</span>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-foreground">
                    {formatCurrency(industryTotals.totalAssets)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <div className="p-2.5 md:p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-1.5 md:gap-2 text-amber-600 mb-0.5 md:mb-1">
                      <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      <span className="text-[10px] md:text-xs font-medium">Profit</span>
                    </div>
                    <p className="text-base md:text-lg font-bold text-foreground">
                      {formatCurrency(industryTotals.totalProfit)}
                    </p>
                  </div>

                  <div className="p-2.5 md:p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-1.5 md:gap-2 text-purple-600 mb-0.5 md:mb-1">
                      <Users className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      <span className="text-[10px] md:text-xs font-medium">Companies</span>
                    </div>
                    <p className="text-base md:text-lg font-bold text-foreground">
                      {industryTotals.companiesCount}
                    </p>
                  </div>
                </div>

                <Link to="/executive-dashboard">
                  <Button variant="outline" className="w-full gap-2 mt-1 md:mt-2 h-9 md:h-10 text-xs md:text-sm">
                    <BarChart3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    View Full Dashboard
                    <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4 ml-auto" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Top Insurers List */}
          {topInsurers.length > 0 && (
            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border/50">
              <h4 className="text-xs md:text-sm font-medium mb-2 md:mb-3">Top 5 Market Leaders</h4>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {topInsurers.map((insurer, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5"
                  >
                    <div 
                      className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" 
                      style={{ backgroundColor: insurer.fill }}
                    />
                    <span className="text-[10px] md:text-xs">{insurer.name}</span>
                    <span className="text-[10px] md:text-xs text-muted-foreground">
                      {insurer.value.toFixed(1)}%
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
