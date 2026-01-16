import { useMemo } from 'react';
import { PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProductBreakdownChartProps {
  category: string;
  selectedYear: number;
  selectedQuarter: number;
  topCount: number;
}

const PRODUCT_COLORS = {
  'Group Policies': 'hsl(221, 83%, 53%)',
  'Term': 'hsl(142, 76%, 36%)',
  'Credit Life': 'hsl(262, 83%, 58%)',
  'Whole Life': 'hsl(45, 93%, 47%)',
  'Endowment': 'hsl(0, 84%, 60%)',
  'Universal Life': 'hsl(173, 80%, 40%)',
};

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

  // Product mix for pie chart (industry total)
  const productMixData = useMemo(() => {
    const totals = {
      'Group Policies': 0,
      'Term': 0,
      'Credit Life': 0,
      'Whole Life': 0,
      'Endowment': 0,
      'Universal Life': 0,
    };

    metrics.forEach(m => {
      totals['Group Policies'] += m.group_policies || 0;
      totals['Term'] += m.term_premium || 0;
      totals['Credit Life'] += m.credit_life || 0;
      totals['Whole Life'] += m.whole_life || 0;
      totals['Endowment'] += m.endowment || 0;
      totals['Universal Life'] += m.universal_life || 0;
    });

    return Object.entries(totals)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value,
        fill: PRODUCT_COLORS[name as keyof typeof PRODUCT_COLORS],
      }))
      .sort((a, b) => b.value - a.value);
  }, [metrics]);

  // Product breakdown by insurer for bar chart
  const insurerProductData = useMemo(() => {
    return metrics.slice(0, topCount).map(m => ({
      name: m.insurer_name.length > 12 ? m.insurer_name.substring(0, 12) + '...' : m.insurer_name,
      fullName: m.insurer_name,
      'Group Policies': m.group_policies || 0,
      'Term': m.term_premium || 0,
      'Credit Life': m.credit_life || 0,
      'Whole Life': m.whole_life || 0,
      'Endowment': m.endowment || 0,
      'Universal Life': m.universal_life || 0,
    }));
  }, [metrics, topCount]);

  // Check if we have any product data
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
          <TabsList className="grid w-full grid-cols-2 max-w-[300px]">
            <TabsTrigger value="industry">Industry Total</TabsTrigger>
            <TabsTrigger value="insurers">By Insurer</TabsTrigger>
          </TabsList>

          <TabsContent value="industry" className="space-y-4">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Pie Chart - Takes 3 columns */}
              <div className="lg:col-span-3 h-[320px] p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border border-border/40">
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
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return percent > 0.05 ? (
                          <text 
                            x={x} 
                            y={y} 
                            fill="white" 
                            textAnchor="middle" 
                            dominantBaseline="central" 
                            fontSize={11}
                            fontWeight="bold"
                          >
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

              {/* Legend with values - Takes 2 columns */}
              <div className="lg:col-span-2 space-y-2">
                <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-primary rounded-full" />
                  Product Breakdown
                </h4>
                {productMixData.map((product) => {
                  const total = productMixData.reduce((sum, p) => sum + p.value, 0);
                  const percentage = total > 0 ? (product.value / total) * 100 : 0;
                  return (
                    <div 
                      key={product.name} 
                      className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-md shadow-sm"
                          style={{ backgroundColor: product.fill }}
                        />
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
                  <Bar dataKey="Group Policies" stackId="a" fill={PRODUCT_COLORS['Group Policies']} />
                  <Bar dataKey="Term" stackId="a" fill={PRODUCT_COLORS['Term']} />
                  <Bar dataKey="Credit Life" stackId="a" fill={PRODUCT_COLORS['Credit Life']} />
                  <Bar dataKey="Whole Life" stackId="a" fill={PRODUCT_COLORS['Whole Life']} />
                  <Bar dataKey="Endowment" stackId="a" fill={PRODUCT_COLORS['Endowment']} />
                  <Bar dataKey="Universal Life" stackId="a" fill={PRODUCT_COLORS['Universal Life']} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
