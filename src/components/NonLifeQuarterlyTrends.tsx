import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

const COLORS = [
  'hsl(221, 83%, 53%)',
  'hsl(145, 75%, 40%)',
  'hsl(262, 83%, 58%)',
  'hsl(24, 95%, 53%)',
  'hsl(340, 75%, 55%)',
  'hsl(180, 70%, 45%)',
  'hsl(45, 90%, 50%)',
  'hsl(300, 60%, 50%)',
  'hsl(200, 70%, 50%)',
  'hsl(120, 60%, 45%)',
];

export function NonLifeQuarterlyTrends() {
  const [selectedYear, setSelectedYear] = useState(2025);
  const [insurerFilter, setInsurerFilter] = useState<'top5' | 'top10'>('top5');

  // Get available years
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

  const { data: allQuarterData = [], isLoading } = useQuery({
    queryKey: ['nonlife-quarterly-trends', selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nonlife_insurer_metrics')
        .select('*')
        .eq('report_year', selectedYear)
        .order('report_quarter', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const filterCount = insurerFilter === 'top5' ? 5 : 10;

  // Get available quarters for selected year
  const availableQuarters = useMemo(() => {
    return [...new Set(allQuarterData.map(d => d.report_quarter))].sort((a, b) => (a || 0) - (b || 0));
  }, [allQuarterData]);

  // Get top insurers by latest quarter revenue
  const topInsurers = useMemo(() => {
    const latestQuarter = Math.max(...availableQuarters.filter(q => q !== null) as number[]);
    const latestData = allQuarterData.filter(d => d.report_quarter === latestQuarter);
    return latestData
      .sort((a, b) => (b.insurance_service_revenue || 0) - (a.insurance_service_revenue || 0))
      .slice(0, filterCount)
      .map(d => d.insurer_id);
  }, [allQuarterData, availableQuarters, filterCount]);

  // Build trend data
  const trendData = useMemo(() => {
    return availableQuarters.map(q => {
      const qData = allQuarterData.filter(d => d.report_quarter === q);
      const point: Record<string, string | number> = { quarter: `Q${q}` };
      
      topInsurers.forEach(insurerId => {
        const insurer = qData.find(d => d.insurer_id === insurerId);
        if (insurer) {
          point[insurerId] = (insurer.insurance_service_revenue || 0) / 1e6;
        }
      });
      
      return point;
    });
  }, [allQuarterData, topInsurers, availableQuarters]);

  // Get insurer names mapping
  const insurerNames = useMemo(() => {
    const names: Record<string, string> = {};
    allQuarterData.forEach(d => {
      if (!names[d.insurer_id]) {
        names[d.insurer_id] = d.insurer_name.split(' ').slice(0, 2).join(' ');
      }
    });
    return names;
  }, [allQuarterData]);

  // Calculate quarterly growth (first to last available quarter)
  const growthData = useMemo(() => {
    if (availableQuarters.length < 2) return [];
    
    const firstQuarter = Math.min(...availableQuarters.filter(q => q !== null) as number[]);
    const lastQuarter = Math.max(...availableQuarters.filter(q => q !== null) as number[]);
    
    return topInsurers.map(insurerId => {
      const firstQ = allQuarterData.find(d => d.insurer_id === insurerId && d.report_quarter === firstQuarter);
      const lastQ = allQuarterData.find(d => d.insurer_id === insurerId && d.report_quarter === lastQuarter);
      const firstRevenue = firstQ?.insurance_service_revenue || 0;
      const lastRevenue = lastQ?.insurance_service_revenue || 0;
      const growth = firstRevenue > 0 ? ((lastRevenue - firstRevenue) / firstRevenue) * 100 : 0;
      
      return {
        insurerId,
        name: insurerNames[insurerId] || insurerId,
        firstRevenue: firstRevenue / 1e6,
        lastRevenue: lastRevenue / 1e6,
        firstQuarter,
        lastQuarter,
        growth,
      };
    }).sort((a, b) => b.growth - a.growth);
  }, [allQuarterData, topInsurers, insurerNames, availableQuarters]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Year:</span>
          <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-24">
              <Calendar className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show:</span>
          <div className="flex rounded-lg border overflow-hidden">
            <Button
              variant={insurerFilter === 'top5' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setInsurerFilter('top5')}
              className="rounded-none"
            >
              Top 5
            </Button>
            <Button
              variant={insurerFilter === 'top10' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setInsurerFilter('top10')}
              className="rounded-none"
            >
              Top 10
            </Button>
          </div>
        </div>
      </div>

      {/* Quarterly Trends Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            {selectedYear} Performance Progression - Top {filterCount} Non-Life Insurers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="quarter" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => `₵${v}M`}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [`₵${value.toFixed(1)}M`, insurerNames[name] || name]}
                />
                <Legend 
                  formatter={(value) => insurerNames[value] || value}
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                {topInsurers.map((insurerId, idx) => (
                  <Line
                    key={insurerId}
                    type="monotone"
                    dataKey={insurerId}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4, fill: COLORS[idx % COLORS.length] }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No quarterly data available for {selectedYear}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quarterly Growth Summary */}
      {growthData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Q{growthData[0]?.firstQuarter} to Q{growthData[0]?.lastQuarter} {selectedYear} Growth Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {growthData.map((item, idx) => (
                <div 
                  key={item.insurerId}
                  className="p-4 rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate">{item.name}</span>
                    <div className={`flex items-center gap-1 text-xs font-bold ${
                      item.growth > 0 ? 'text-green-600' : item.growth < 0 ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      {item.growth > 0 ? <TrendingUp className="h-3 w-3" /> : 
                       item.growth < 0 ? <TrendingDown className="h-3 w-3" /> : 
                       <Minus className="h-3 w-3" />}
                      {Math.abs(item.growth).toFixed(1)}%
                    </div>
                  </div>
                  <div className="flex items-end justify-between text-xs text-muted-foreground">
                    <div>
                      <span className="block">Q{item.firstQuarter}: ₵{item.firstRevenue.toFixed(1)}M</span>
                    </div>
                    <div className="text-right">
                      <span className="block font-medium text-foreground">Q{item.lastQuarter}: ₵{item.lastRevenue.toFixed(1)}M</span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${Math.min(100, (item.lastRevenue / (growthData[0]?.lastRevenue || 1)) * 100)}%`,
                        backgroundColor: COLORS[idx % COLORS.length]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}