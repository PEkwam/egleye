import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface TrendData {
  period: string;
  [key: string]: string | number;
}

const CHART_COLORS = [
  'hsl(142, 76%, 36%)',
  'hsl(221, 83%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(24, 95%, 53%)',
  'hsl(0, 84%, 60%)',
];

type MetricKey = 'gross_premium' | 'market_share' | 'total_assets' | 'expense_ratio' | 'profit_after_tax' | 'claims_ratio';

const metricOptions: { value: MetricKey; label: string; suffix: string }[] = [
  { value: 'gross_premium', label: 'Gross Premium (₵M)', suffix: '₵M' },
  { value: 'market_share', label: 'Market Share (%)', suffix: '%' },
  { value: 'total_assets', label: 'Total Assets (₵M)', suffix: '₵M' },
  { value: 'expense_ratio', label: 'Expense Ratio (%)', suffix: '%' },
  { value: 'claims_ratio', label: 'Claims Ratio (%)', suffix: '%' },
  { value: 'profit_after_tax', label: 'Profit After Tax (₵M)', suffix: '₵M' },
];

interface HistoricalTrendsProps {
  category?: string;
}

export function HistoricalTrends({ category = 'life' }: HistoricalTrendsProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('gross_premium');
  const [selectedInsurers, setSelectedInsurers] = useState<string[]>([]);

  // Fetch all historical data from DB
  const { data: allMetrics = [], isLoading } = useQuery({
    queryKey: ['historical-metrics', category],
    queryFn: async () => {
      let query = supabase
        .from('insurer_metrics')
        .select('*')
        .order('report_year', { ascending: true })
        .order('report_quarter', { ascending: true });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching historical metrics:', error);
        return [];
      }
      
      // Map null quarters to Q4 for display
      return (data || []).map(d => ({
        ...d,
        report_quarter: d.report_quarter || 4
      }));
    },
  });

  // Normalize insurer name to create a consistent key
  const normalizeInsurerKey = (name: string) => {
    return name.toLowerCase()
      .replace(/\b(insurance|assurance|company|limited|ltd|ghana|plc)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Get unique insurers that have data - prioritize by latest quarter premium
  // Group by normalized name to avoid duplicates from inconsistent insurer_ids
  const insurersWithData = useMemo(() => {
    const insurerMap = new Map<string, { id: string; name: string; latestPremium: number; ids: string[] }>();
    
    // Sort by year and quarter descending to get latest data first
    const sortedMetrics = [...allMetrics].sort((a, b) => {
      if (a.report_year !== b.report_year) return b.report_year - a.report_year;
      return (b.report_quarter || 4) - (a.report_quarter || 4);
    });
    
    sortedMetrics.forEach(m => {
      const normalizedKey = normalizeInsurerKey(m.insurer_name);
      
      if (!insurerMap.has(normalizedKey)) {
        insurerMap.set(normalizedKey, {
          id: normalizedKey, // Use normalized key as the unified ID
          name: m.insurer_name,
          latestPremium: m.gross_premium || 0,
          ids: [m.insurer_id], // Track all original IDs for this insurer
        });
      } else {
        // Add this ID to the existing insurer's list
        const existing = insurerMap.get(normalizedKey)!;
        if (!existing.ids.includes(m.insurer_id)) {
          existing.ids.push(m.insurer_id);
        }
      }
    });
    
    return Array.from(insurerMap.values())
      .sort((a, b) => b.latestPremium - a.latestPremium);
  }, [allMetrics]);

  // Auto-select top 3 if none selected - use useEffect instead of useMemo
  useEffect(() => {
    if (selectedInsurers.length === 0 && insurersWithData.length > 0) {
      setSelectedInsurers(insurersWithData.slice(0, 3).map(i => i.id));
    }
  }, [insurersWithData]);

  // Transform data for chart - group by year+quarter
  const chartData = useMemo(() => {
    const periodsMap = new Map<string, TrendData>();
    
    allMetrics.forEach(m => {
      const period = `Q${m.report_quarter}'${String(m.report_year).slice(2)}`;
      const normalizedKey = normalizeInsurerKey(m.insurer_name);
      
      if (!periodsMap.has(period)) {
        periodsMap.set(period, { 
          period, 
          sortKey: m.report_year * 10 + (m.report_quarter || 0) 
        } as TrendData & { sortKey: number });
      }
      
      const periodData = periodsMap.get(period)!;
      if (selectedInsurers.includes(normalizedKey)) {
        const value = m[selectedMetric] as number | null;
        if (value !== null) {
          // Convert to millions for premium/assets/profit
          if (['gross_premium', 'total_assets', 'profit_after_tax'].includes(selectedMetric)) {
            periodData[normalizedKey] = value / 1e6;
          } else {
            periodData[normalizedKey] = value;
          }
        }
      }
    });
    
    return Array.from(periodsMap.values())
      .sort((a, b) => (a as any).sortKey - (b as any).sortKey)
      .map(({ sortKey, ...rest }) => rest as TrendData);
  }, [allMetrics, selectedInsurers, selectedMetric]);

  // Calculate YoY change for each insurer (using normalized keys)
  const yoyChanges = useMemo(() => {
    const changes: Record<string, { value: number; change: number; direction: 'up' | 'down' | 'flat' }> = {};
    
    selectedInsurers.forEach(normalizedKey => {
      // Find all metrics matching this normalized insurer key
      const sortedData = allMetrics
        .filter(m => normalizeInsurerKey(m.insurer_name) === normalizedKey && m[selectedMetric] !== null)
        .sort((a, b) => {
          const aKey = a.report_year * 10 + (a.report_quarter || 0);
          const bKey = b.report_year * 10 + (b.report_quarter || 0);
          return bKey - aKey;
        });
      
      if (sortedData.length >= 2) {
        let latest = sortedData[0][selectedMetric] as number || 0;
        let previous = sortedData[1][selectedMetric] as number || 0;
        
        // Convert to millions for display
        if (['gross_premium', 'total_assets', 'profit_after_tax'].includes(selectedMetric)) {
          latest = latest / 1e6;
          previous = previous / 1e6;
        }
        
        const change = previous ? ((latest - previous) / Math.abs(previous)) * 100 : 0;
        changes[normalizedKey] = {
          value: latest,
          change: Math.abs(change),
          direction: change > 1 ? 'up' : change < -1 ? 'down' : 'flat',
        };
      } else if (sortedData.length === 1) {
        let value = sortedData[0][selectedMetric] as number || 0;
        if (['gross_premium', 'total_assets', 'profit_after_tax'].includes(selectedMetric)) {
          value = value / 1e6;
        }
        changes[normalizedKey] = {
          value,
          change: 0,
          direction: 'flat',
        };
      }
    });
    
    return changes;
  }, [allMetrics, selectedInsurers, selectedMetric]);

  const toggleInsurer = (insurerId: string) => {
    setSelectedInsurers(prev => {
      if (prev.includes(insurerId)) {
        return prev.filter(id => id !== insurerId);
      }
      if (prev.length < 5) {
        return [...prev, insurerId];
      }
      return prev;
    });
  };

  const getInsurerName = (insurerId: string) => {
    const insurer = insurersWithData.find(i => i.id === insurerId);
    const name = insurer?.name || insurerId;
    // Shorten the name for display
    return name.split(' ').slice(0, 2).join(' ');
  };

  const metricInfo = metricOptions.find(m => m.value === selectedMetric);

  return (
    <Card className="border-border/40 bg-card shadow-sm">
      <CardHeader className="pb-4 border-b border-border/40">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            Life Insurance Market Overview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricKey)}>
              <SelectTrigger className="w-[180px] rounded-lg bg-secondary/50 border-border/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {metricOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        {/* Insurer selector */}
        <div className="flex flex-wrap gap-2">
          {insurersWithData.slice(0, 15).map((insurer, idx) => {
            const isSelected = selectedInsurers.includes(insurer.id);
            const colorIdx = selectedInsurers.indexOf(insurer.id);
            return (
              <button
                key={insurer.id}
                onClick={() => toggleInsurer(insurer.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-secondary text-foreground border-2'
                    : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                }`}
                style={isSelected ? { borderColor: CHART_COLORS[colorIdx % CHART_COLORS.length] } : undefined}
              >
                {isSelected && (
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: CHART_COLORS[colorIdx % CHART_COLORS.length] }}
                  />
                )}
                {insurer.name.split(' ').slice(0, 2).join(' ')}
              </button>
            );
          })}
          {insurersWithData.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground">No historical data available.</p>
          )}
        </div>

        {/* Chart */}
        {chartData.length > 0 && selectedInsurers.length > 0 ? (
          <div className="h-[300px] w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-border/40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                  tickFormatter={(value) => {
                    if (metricInfo?.suffix === '%') return `${value}%`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}B`;
                    return `${value.toFixed(0)}`;
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}${metricInfo?.suffix === '%' ? '%' : 'M'}`,
                    getInsurerName(name)
                  ]}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Legend 
                  formatter={(value) => getInsurerName(value)} 
                  wrapperStyle={{ paddingTop: '10px' }}
                />
                {selectedInsurers.map((insurerId, idx) => (
                  <Line
                    key={insurerId}
                    type="monotone"
                    dataKey={insurerId}
                    name={insurerId}
                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 5, strokeWidth: 2, fill: 'white' }}
                    activeDot={{ r: 7, strokeWidth: 0, fill: CHART_COLORS[idx % CHART_COLORS.length] }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : !isLoading && (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground bg-secondary/30 rounded-xl border border-dashed border-border/50">
            <p>Select insurers above to view trends</p>
          </div>
        )}

        {/* YoY Summary Cards */}
        {Object.keys(yoyChanges).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {selectedInsurers.map((insurerId, idx) => {
              const change = yoyChanges[insurerId];
              if (!change) return null;
              
              return (
                <div 
                  key={insurerId}
                  className="p-3 rounded-xl bg-secondary/30 border border-border/50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                    <span className="text-xs font-medium truncate">{getInsurerName(insurerId)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">
                      {change.value.toFixed(1)}{metricInfo?.suffix === '%' ? '%' : 'M'}
                    </span>
                    <div className={`flex items-center gap-1 text-xs ${
                      change.direction === 'up' ? 'text-green-600' : 
                      change.direction === 'down' ? 'text-red-500' : 'text-muted-foreground'
                    }`}>
                      {change.direction === 'up' && <TrendingUp className="h-3 w-3" />}
                      {change.direction === 'down' && <TrendingDown className="h-3 w-3" />}
                      {change.direction === 'flat' && <Minus className="h-3 w-3" />}
                      <span>{change.change.toFixed(1)}%</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">vs Previous</p>
                </div>
              );
            })}
          </div>
        )}

        {/* View Full Dashboard Button */}
        <div className="flex justify-end pt-2">
          <Link to="/executive-dashboard">
            <Button variant="outline" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              View Full Dashboard
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading historical data...</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}