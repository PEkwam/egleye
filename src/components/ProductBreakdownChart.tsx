import { useMemo } from 'react';
import { PieChart as PieChartIcon, BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProductBreakdownChartProps {
  category: string;
  selectedYear: number;
  selectedQuarter: number;
  topCount: number;
}

const PRODUCT_COLORS: Record<string, string> = {
  'Group Policies': 'hsl(221, 83%, 53%)',
  'Term': 'hsl(142, 76%, 36%)',
  'Credit Life': 'hsl(262, 83%, 58%)',
  'Whole Life': 'hsl(45, 93%, 47%)',
  'Endowment': 'hsl(0, 84%, 60%)',
  'Universal Life': 'hsl(173, 80%, 40%)',
  'Annuities': 'hsl(291, 64%, 42%)',
  'Microinsurance': 'hsl(24, 95%, 53%)',
  'Unit-Linked': 'hsl(200, 80%, 50%)',
  'Investment-Linked': 'hsl(330, 70%, 50%)',
  'Critical Illness': 'hsl(15, 80%, 45%)',
  'Other Products': 'hsl(210, 20%, 60%)',
};

const PRODUCT_KEYS = [
  { key: 'group_policies', label: 'Group Policies' },
  { key: 'term_premium', label: 'Term' },
  { key: 'credit_life', label: 'Credit Life' },
  { key: 'whole_life', label: 'Whole Life' },
  { key: 'endowment', label: 'Endowment' },
  { key: 'universal_life', label: 'Universal Life' },
  { key: 'annuities', label: 'Annuities' },
  { key: 'microinsurance', label: 'Microinsurance' },
  { key: 'unit_linked', label: 'Unit-Linked' },
  { key: 'investment_linked', label: 'Investment-Linked' },
  { key: 'critical_illness', label: 'Critical Illness' },
  { key: 'other_products', label: 'Other Products' },
];

const formatCurrency = (value: number) => {
  if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `GH₵${(value / 1e3).toFixed(0)}K`;
  return `GH₵${value.toFixed(0)}`;
};

export function ProductBreakdownChart({
  category,
  selectedYear,
  selectedQuarter,
  topCount,
}: ProductBreakdownChartProps) {
  // Current quarter data
  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['product-breakdown', category, selectedYear, selectedQuarter],
    queryFn: async () => {
      const query = supabase
        .from('insurer_metrics')
        .select('*')
        .eq('report_year', selectedYear)
        .eq('report_quarter', selectedQuarter)
        .order('gross_premium', { ascending: false });

      if (category && category !== 'all') {
        query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Historical data for trends (all quarters for the year + previous year)
  const { data: historicalData = [] } = useQuery({
    queryKey: ['product-breakdown-history', category, selectedYear],
    queryFn: async () => {
      const query = supabase
        .from('insurer_metrics')
        .select('report_year, report_quarter, group_policies, term_premium, credit_life, whole_life, endowment, universal_life, annuities, microinsurance, unit_linked, investment_linked, critical_illness, other_products, gross_premium')
        .in('report_year', [selectedYear, selectedYear - 1])
        .order('report_year', { ascending: true })
        .order('report_quarter', { ascending: true });

      if (category && category !== 'all') {
        query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Aggregate product totals from metrics
  const getProductTotals = (data: typeof metrics) => {
    const totals: Record<string, number> = {};
    PRODUCT_KEYS.forEach(({ key, label }) => {
      const total = data.reduce((sum, m) => sum + ((m as Record<string, unknown>)[key] as number || 0), 0);
      if (total > 0) totals[label] = total;
    });
    return totals;
  };

  // Product mix for pie chart (industry total)
  const productMixData = useMemo(() => {
    const totals = getProductTotals(metrics);
    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value,
        fill: PRODUCT_COLORS[name] || 'hsl(210, 20%, 60%)',
      }))
      .sort((a, b) => b.value - a.value);
  }, [metrics]);

  // Product breakdown by insurer for bar chart
  const insurerProductData = useMemo(() => {
    return metrics.slice(0, topCount).map(m => {
      const row: Record<string, unknown> = {
        name: m.insurer_name.length > 12 ? m.insurer_name.substring(0, 12) + '...' : m.insurer_name,
        fullName: m.insurer_name,
      };
      PRODUCT_KEYS.forEach(({ key, label }) => {
        row[label] = (m as Record<string, unknown>)[key] || 0;
      });
      return row;
    });
  }, [metrics, topCount]);

  // Quarterly trend data
  const quarterlyTrendData = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {};

    historicalData.forEach(m => {
      const period = `Q${m.report_quarter}'${String(m.report_year).slice(-2)}`;
      if (!grouped[period]) grouped[period] = {};
      PRODUCT_KEYS.forEach(({ key, label }) => {
        grouped[period][label] = (grouped[period][label] || 0) + ((m as Record<string, unknown>)[key] as number || 0);
      });
    });

    return Object.entries(grouped)
      .map(([period, products]) => ({ period, ...products }))
      .sort((a, b) => {
        const [aq, ay] = [parseInt(a.period.slice(1)), parseInt(a.period.slice(-2))];
        const [bq, by] = [parseInt(b.period.slice(1)), parseInt(b.period.slice(-2))];
        return ay !== by ? ay - by : aq - bq;
      });
  }, [historicalData]);

  // Yearly comparison data
  const yearlyComparisonData = useMemo(() => {
    const grouped: Record<number, Record<string, number>> = {};

    historicalData.forEach(m => {
      if (!grouped[m.report_year]) grouped[m.report_year] = {};
      PRODUCT_KEYS.forEach(({ key, label }) => {
        grouped[m.report_year][label] = (grouped[m.report_year][label] || 0) + ((m as Record<string, unknown>)[key] as number || 0);
      });
    });

    return Object.entries(grouped)
      .map(([year, products]) => ({ year: Number(year), ...products }))
      .sort((a, b) => a.year - b.year);
  }, [historicalData]);

  // Active product labels (those with data in current view)
  const activeProducts = useMemo(() => {
    return PRODUCT_KEYS
      .map(p => p.label)
      .filter(label => productMixData.some(d => d.name === label && d.value > 0));
  }, [productMixData]);

  const hasProductData = productMixData.some(d => d.value > 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasProductData) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PieChartIcon className="h-5 w-5 text-primary" />
            Product Mix Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No product breakdown data available for {selectedYear} Q{selectedQuarter}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Product Mix Analysis
        </CardTitle>
        <CardDescription>
          Distribution of premium by product type • {selectedYear} Q{selectedQuarter}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="industry" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 max-w-[500px]">
            <TabsTrigger value="industry">Industry Total</TabsTrigger>
            <TabsTrigger value="insurers">By Insurer</TabsTrigger>
            <TabsTrigger value="quarterly" className="gap-1">
              <Calendar className="h-3 w-3" />
              <span className="hidden sm:inline">Quarterly</span>
            </TabsTrigger>
            <TabsTrigger value="yearly" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              <span className="hidden sm:inline">Yearly</span>
            </TabsTrigger>
          </TabsList>

          {/* Industry Total Tab */}
          <TabsContent value="industry" className="space-y-4">
            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 h-[320px] p-4 rounded-xl bg-gradient-to-br from-secondary/30 to-background border border-border/40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productMixData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={50}
                      paddingAngle={2}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return percent > 0.05 ? (
                          <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
                            {(percent * 100).toFixed(1)}%
                          </text>
                        ) : null;
                      }}
                      labelLine={false}
                    >
                      {productMixData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} stroke="white" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="lg:col-span-2 space-y-2">
                <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-primary rounded-full" />
                  Product Breakdown
                </h4>
                {productMixData.map((product) => {
                  const total = productMixData.reduce((sum, p) => sum + p.value, 0);
                  const percentage = total > 0 ? (product.value / total) * 100 : 0;
                  return (
                    <div key={product.name} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3.5 h-3.5 rounded-md shadow-sm" style={{ backgroundColor: product.fill }} />
                        <span className="text-sm font-medium">{product.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-foreground">{formatCurrency(product.value)}</span>
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 mt-3 border-t-2 border-primary/20">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5">
                    <span className="font-bold text-sm">Total Premium</span>
                    <span className="font-bold text-lg text-primary">{formatCurrency(productMixData.reduce((sum, p) => sum + p.value, 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* By Insurer Tab */}
          <TabsContent value="insurers">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insurerProductData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  {activeProducts.map(label => (
                    <Bar key={label} dataKey={label} stackId="a" fill={PRODUCT_COLORS[label]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Quarterly Comparison Tab */}
          <TabsContent value="quarterly">
            {quarterlyTrendData.length > 1 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Product mix trends across quarters ({selectedYear - 1}–{selectedYear})</p>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quarterlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Legend />
                      {activeProducts.map(label => (
                        <Bar key={label} dataKey={label} fill={PRODUCT_COLORS[label]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Need data from multiple quarters to show comparison.</p>
                <p className="text-xs mt-1">Upload more quarterly reports via Data Admin.</p>
              </div>
            )}
          </TabsContent>

          {/* Yearly Comparison Tab */}
          <TabsContent value="yearly">
            {yearlyComparisonData.length > 1 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Year-over-year product mix comparison</p>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Legend />
                      {activeProducts.map(label => (
                        <Bar key={label} dataKey={label} fill={PRODUCT_COLORS[label]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Need data from multiple years to show comparison.</p>
                <p className="text-xs mt-1">Upload reports from different years via Data Admin.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
