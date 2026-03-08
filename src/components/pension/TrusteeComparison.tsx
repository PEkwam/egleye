import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight,
  Building2, DollarSign, Users, BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, LineChart, Line, Legend,
} from 'recharts';
import { CHART_COLORS } from './types';
import type { PensionFundMetric } from '@/hooks/usePensionMetrics';

const fmt = (value: number) => {
  if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `GH₵${(value / 1e3).toFixed(0)}K`;
  return `GH₵${value.toLocaleString()}`;
};

const pctChange = (current: number | null, previous: number | null) => {
  if (!current || !previous || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
};

const ChangeIndicator = ({ value }: { value: number | null }) => {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>;
  const isPositive = value > 0;
  const isZero = Math.abs(value) < 0.01;
  if (isZero) return <Badge variant="secondary" className="gap-1 text-xs"><Minus className="h-3 w-3" />0.0%</Badge>;
  return (
    <Badge variant={isPositive ? 'default' : 'destructive'} className="gap-1 text-xs">
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {isPositive ? '+' : ''}{value.toFixed(1)}%
    </Badge>
  );
};

export function TrusteeComparison() {
  const [selectedTrustee, setSelectedTrustee] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');

  // Fetch ALL years of pension data for comparison
  const { data: allMetrics = [], isLoading } = useQuery({
    queryKey: ['pension-all-years-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pension_fund_metrics')
        .select('*')
        .order('report_year', { ascending: true });
      if (error) throw error;
      return data as PensionFundMetric[];
    },
  });

  // Unique trustees
  const trustees = useMemo(() => {
    const names = [...new Set(allMetrics.map(m => m.trustee_name || m.fund_name))].sort();
    return names;
  }, [allMetrics]);

  // Available years
  const years = useMemo(() => {
    return [...new Set(allMetrics.map(m => m.report_year))].sort();
  }, [allMetrics]);

  // Filter metrics
  const filtered = useMemo(() => {
    let data = allMetrics;
    if (selectedTier !== 'all') data = data.filter(m => m.fund_type === selectedTier);
    if (selectedTrustee !== 'all') data = data.filter(m => (m.trustee_name || m.fund_name) === selectedTrustee);
    return data;
  }, [allMetrics, selectedTier, selectedTrustee]);

  // Group by trustee, then by year → compute YoY changes
  const trusteeYoY = useMemo(() => {
    const grouped: Record<string, Record<number, PensionFundMetric[]>> = {};
    filtered.forEach(m => {
      const key = m.trustee_name || m.fund_name;
      if (!grouped[key]) grouped[key] = {};
      if (!grouped[key][m.report_year]) grouped[key][m.report_year] = [];
      grouped[key][m.report_year].push(m);
    });

    return Object.entries(grouped).map(([name, yearData]) => {
      const yearSummaries = Object.entries(yearData).map(([yr, metrics]) => {
        const year = Number(yr);
        const totalAUM = metrics.reduce((s, m) => s + (m.aum || 0), 0);
        const totalContributors = metrics.reduce((s, m) => s + (m.total_contributors || 0), 0);
        const avgReturn = metrics.filter(m => m.investment_return).length > 0
          ? metrics.reduce((s, m) => s + (m.investment_return || 0), 0) / metrics.filter(m => m.investment_return).length
          : null;
        const totalContributions = metrics.reduce((s, m) => s + (m.total_contributions || 0), 0);
        return { year, totalAUM, totalContributors, avgReturn, totalContributions, fundCount: metrics.length };
      }).sort((a, b) => a.year - b.year);

      // Compute YoY changes
      const withChanges = yearSummaries.map((curr, i) => {
        const prev = i > 0 ? yearSummaries[i - 1] : null;
        return {
          ...curr,
          aumChange: pctChange(curr.totalAUM, prev?.totalAUM ?? null),
          contributorChange: pctChange(curr.totalContributors, prev?.totalContributors ?? null),
          contributionChange: pctChange(curr.totalContributions, prev?.totalContributions ?? null),
        };
      });

      const latest = withChanges[withChanges.length - 1];
      return { name, years: withChanges, latest };
    }).sort((a, b) => (b.latest?.totalAUM || 0) - (a.latest?.totalAUM || 0));
  }, [filtered]);

  // AUM trend chart data (top 8 trustees across years)
  const trendData = useMemo(() => {
    const topTrustees = selectedTrustee === 'all'
      ? trusteeYoY.slice(0, 8).map(t => t.name)
      : [selectedTrustee];

    return years.map(year => {
      const point: Record<string, number | string> = { year: year.toString() };
      topTrustees.forEach(name => {
        const trustee = trusteeYoY.find(t => t.name === name);
        const yearData = trustee?.years.find(y => y.year === year);
        point[name] = yearData ? yearData.totalAUM / 1e9 : 0;
      });
      return point;
    });
  }, [years, trusteeYoY, selectedTrustee]);

  const topTrusteeNames = useMemo(() => {
    if (selectedTrustee !== 'all') return [selectedTrustee];
    return trusteeYoY.slice(0, 8).map(t => t.name);
  }, [trusteeYoY, selectedTrustee]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="h-32 animate-pulse bg-muted/30" /></Card>
        ))}
      </div>
    );
  }

  if (allMetrics.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Comparison Data Available</h3>
          <p className="text-muted-foreground">Upload pension data for multiple years to enable year-over-year comparisons.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={selectedTier} onValueChange={setSelectedTier}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="Tier 1">Tier 1</SelectItem>
            <SelectItem value="Tier 2">Tier 2</SelectItem>
            <SelectItem value="Tier 3">Tier 3</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedTrustee} onValueChange={setSelectedTrustee}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Select Trustee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trustees</SelectItem>
            {trustees.map(t => (
              <SelectItem key={t} value={t}>{t.length > 30 ? t.slice(0, 30) + '…' : t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs px-3 py-1.5">
          {trusteeYoY.length} trustees • {years.length} years
        </Badge>
      </div>

      {/* AUM Trend Chart */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              AUM Growth Trends
            </CardTitle>
            <CardDescription>
              {selectedTrustee === 'all' ? 'Top trustees' : selectedTrustee} • GH₵ Billions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${v.toFixed(1)}B`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number, name: string) => [`GH₵${v.toFixed(2)}B`, name.length > 25 ? name.slice(0, 25) + '…' : name]}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                {topTrusteeNames.length <= 6 && <Legend wrapperStyle={{ fontSize: '10px' }} />}
                {topTrusteeNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={name.length > 20 ? name.slice(0, 20) + '…' : name}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* YoY Comparison Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Year-over-Year Performance
          </CardTitle>
          <CardDescription>AUM, contributors, and investment returns by year</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground sticky left-0 bg-muted/30 min-w-[160px]">Trustee</th>
                  {years.map(y => (
                    <th key={y} colSpan={2} className="text-center p-3 font-medium text-muted-foreground border-l border-border/30">
                      {y}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-border bg-muted/20">
                  <th className="sticky left-0 bg-muted/20" />
                  {years.map(y => (
                    <th key={`${y}-sub`} colSpan={2} className="text-center px-2 py-1.5 text-[10px] text-muted-foreground border-l border-border/30">
                      <div className="flex justify-center gap-3">
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />AUM</span>
                        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />YoY</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trusteeYoY.slice(0, 20).map((trustee, idx) => (
                  <tr key={trustee.name} className={`border-b border-border/20 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/5'}`}>
                    <td className="p-3 font-medium sticky left-0 bg-card">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                        <span className="truncate max-w-[140px]" title={trustee.name}>
                          {trustee.name.length > 22 ? trustee.name.slice(0, 22) + '…' : trustee.name}
                        </span>
                      </div>
                    </td>
                    {years.map(year => {
                      const yearData = trustee.years.find(y => y.year === year);
                      return (
                        <td key={year} colSpan={2} className="text-center p-2 border-l border-border/30">
                          {yearData ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-semibold text-xs">{fmt(yearData.totalAUM)}</span>
                              <ChangeIndicator value={yearData.aumChange} />
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Movers */}
      {years.length >= 2 && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Biggest Gainers */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Top Gainers
              </CardTitle>
              <CardDescription>Highest AUM growth (latest year)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {trusteeYoY
                .filter(t => t.latest?.aumChange !== null && t.latest?.aumChange !== undefined && t.latest.aumChange > 0)
                .sort((a, b) => (b.latest?.aumChange || 0) - (a.latest?.aumChange || 0))
                .slice(0, 5)
                .map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 w-5">{i + 1}</span>
                      <span className="text-sm font-medium truncate">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{fmt(t.latest?.totalAUM || 0)}</span>
                      <ChangeIndicator value={t.latest?.aumChange ?? null} />
                    </div>
                  </div>
                ))}
              {trusteeYoY.filter(t => t.latest?.aumChange && t.latest.aumChange > 0).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No growth data available</p>
              )}
            </CardContent>
          </Card>

          {/* Biggest Decliners */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Notable Declines
              </CardTitle>
              <CardDescription>Largest AUM decreases (latest year)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {trusteeYoY
                .filter(t => t.latest?.aumChange !== null && t.latest?.aumChange !== undefined && t.latest.aumChange < 0)
                .sort((a, b) => (a.latest?.aumChange || 0) - (b.latest?.aumChange || 0))
                .slice(0, 5)
                .map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 w-5">{i + 1}</span>
                      <span className="text-sm font-medium truncate">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{fmt(t.latest?.totalAUM || 0)}</span>
                      <ChangeIndicator value={t.latest?.aumChange ?? null} />
                    </div>
                  </div>
                ))}
              {trusteeYoY.filter(t => t.latest?.aumChange && t.latest.aumChange < 0).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No decline data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
