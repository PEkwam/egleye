import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronRight, BarChart3, Crown, Medal, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

interface QuarterlyComparisonTableProps {
  category: string;
  selectedYear: number;
  selectedQuarter: number;
}

interface MetricData {
  insurer_id: string;
  insurer_name: string;
  current: number | null;
  previousQuarter: number | null;
  previousYear: number | null;
  qoqChange: number | null;
  yoyChange: number | null;
}

const formatCurrency = (value: number | null) => {
  if (value === null) return '-';
  if (Math.abs(value) >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `GH₵${(value / 1e3).toFixed(0)}K`;
  return `GH₵${value.toFixed(0)}`;
};

const formatChange = (value: number | null) => {
  if (value === null) return '-';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

const ChangeIndicator = ({ value, size = 'sm' }: { value: number | null; size?: 'sm' | 'lg' }) => {
  if (value === null) return <span className="text-muted-foreground/50">-</span>;
  
  const isPositive = value > 1;
  const isNegative = value < -1;
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  
  const sizeClasses = size === 'lg' 
    ? 'text-sm font-semibold gap-1.5' 
    : 'text-xs font-medium gap-1';
  
  const iconSize = size === 'lg' ? 'h-4 w-4' : 'h-3 w-3';
  
  const colorClasses = isPositive 
    ? 'text-emerald-600 dark:text-emerald-400' 
    : isNegative 
    ? 'text-rose-600 dark:text-rose-400' 
    : 'text-muted-foreground';
  
  return (
    <div className={`flex items-center ${sizeClasses} ${colorClasses}`}>
      <Icon className={iconSize} />
      <span>{formatChange(value)}</span>
    </div>
  );
};

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 0) {
    return (
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-400/30">
        <Crown className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }
  if (rank === 1) {
    return (
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-lg shadow-slate-400/30">
        <Medal className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-400/30">
        <Award className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
      {rank + 1}
    </div>
  );
};

export function QuarterlyComparisonTable({ 
  category, 
  selectedYear, 
  selectedQuarter 
}: QuarterlyComparisonTableProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Fetch all quarters data for comparison
  const { data: allMetrics = [], isLoading } = useQuery({
    queryKey: ['quarterly-comparison', category],
    queryFn: async () => {
      const query = supabase
        .from('insurer_metrics')
        .select('*')
        .order('report_year', { ascending: false })
        .order('report_quarter', { ascending: false });

      if (category && category !== 'all') {
        query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate comparison metrics
  const comparisonData = useMemo(() => {
    const metrics: Record<string, { premium: MetricData; assets: MetricData; profit: MetricData }> = {};
    
    // Get current quarter data
    const currentQuarterData = allMetrics.filter(
      m => m.report_year === selectedYear && m.report_quarter === selectedQuarter
    );

    // Calculate previous quarter
    const prevQ = selectedQuarter === 1 ? 4 : selectedQuarter - 1;
    const prevQYear = selectedQuarter === 1 ? selectedYear - 1 : selectedYear;
    
    // Get previous quarter data
    const prevQuarterData = allMetrics.filter(
      m => m.report_year === prevQYear && m.report_quarter === prevQ
    );

    // Get same quarter last year
    const yoyData = allMetrics.filter(
      m => m.report_year === selectedYear - 1 && m.report_quarter === selectedQuarter
    );

    currentQuarterData.forEach(current => {
      const prevQ = prevQuarterData.find(p => p.insurer_name === current.insurer_name);
      const yoy = yoyData.find(y => y.insurer_name === current.insurer_name);

      const calcChange = (curr: number | null, prev: number | null) => {
        if (!curr || !prev || prev === 0) return null;
        return ((curr - prev) / prev) * 100;
      };

      metrics[current.insurer_id] = {
        premium: {
          insurer_id: current.insurer_id,
          insurer_name: current.insurer_name,
          current: current.gross_premium,
          previousQuarter: prevQ?.gross_premium || null,
          previousYear: yoy?.gross_premium || null,
          qoqChange: calcChange(current.gross_premium, prevQ?.gross_premium || null),
          yoyChange: calcChange(current.gross_premium, yoy?.gross_premium || null),
        },
        assets: {
          insurer_id: current.insurer_id,
          insurer_name: current.insurer_name,
          current: current.total_assets,
          previousQuarter: prevQ?.total_assets || null,
          previousYear: yoy?.total_assets || null,
          qoqChange: calcChange(current.total_assets, prevQ?.total_assets || null),
          yoyChange: calcChange(current.total_assets, yoy?.total_assets || null),
        },
        profit: {
          insurer_id: current.insurer_id,
          insurer_name: current.insurer_name,
          current: current.profit_after_tax,
          previousQuarter: prevQ?.profit_after_tax || null,
          previousYear: yoy?.profit_after_tax || null,
          qoqChange: calcChange(current.profit_after_tax, prevQ?.profit_after_tax || null),
          yoyChange: calcChange(current.profit_after_tax, yoy?.profit_after_tax || null),
        },
      };
    });

    return Object.values(metrics).sort((a, b) => 
      (b.premium.current || 0) - (a.premium.current || 0)
    );
  }, [allMetrics, selectedYear, selectedQuarter]);

  if (isLoading) {
    return (
      <Card className="border-border/40 bg-gradient-to-br from-card via-card to-muted/20 shadow-lg">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-sm text-muted-foreground">Loading comparison data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const prevQ = selectedQuarter === 1 ? 4 : selectedQuarter - 1;
  const prevQYear = selectedQuarter === 1 ? selectedYear - 1 : selectedYear;

  return (
    <Card className="border-border/40 bg-gradient-to-br from-card via-card to-muted/20 shadow-lg overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-4 border-b border-border/30">
          <CollapsibleTrigger className="w-full text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    Quarterly Performance Comparison
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    {selectedYear} Q{selectedQuarter} vs Q{prevQ} {prevQYear !== selectedYear ? prevQYear : ''} (QoQ) and {selectedYear - 1} Q{selectedQuarter} (YoY)
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="rounded-full px-3 gap-1.5">
                {comparisonData.length} companies
              </Badge>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-border/40 bg-muted/30">
                    <TableHead className="min-w-[200px] sticky left-0 bg-muted/30 z-10 py-4">
                      <span className="font-semibold text-foreground">Company</span>
                    </TableHead>
                    <TableHead className="text-right min-w-[110px] py-4">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">Premium</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center min-w-[90px] py-4">
                      <span className="text-xs text-muted-foreground font-medium">QoQ</span>
                    </TableHead>
                    <TableHead className="text-center min-w-[90px] py-4">
                      <span className="text-xs text-muted-foreground font-medium">YoY</span>
                    </TableHead>
                    <TableHead className="text-right min-w-[110px] py-4">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-semibold text-blue-700 dark:text-blue-400">Assets</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center min-w-[90px] py-4">
                      <span className="text-xs text-muted-foreground font-medium">QoQ</span>
                    </TableHead>
                    <TableHead className="text-center min-w-[90px] py-4">
                      <span className="text-xs text-muted-foreground font-medium">YoY</span>
                    </TableHead>
                    <TableHead className="text-right min-w-[110px] py-4">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-semibold text-amber-700 dark:text-amber-400">Profit</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center min-w-[90px] py-4">
                      <span className="text-xs text-muted-foreground font-medium">QoQ</span>
                    </TableHead>
                    <TableHead className="text-center min-w-[90px] py-4 pr-4">
                      <span className="text-xs text-muted-foreground font-medium">YoY</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.map((data, idx) => (
                    <TableRow 
                      key={data.premium.insurer_id} 
                      className={`
                        border-b border-border/20 transition-colors hover:bg-muted/30
                        ${idx < 3 ? 'bg-gradient-to-r from-muted/40 via-muted/20 to-transparent' : ''}
                      `}
                    >
                      <TableCell className="font-medium sticky left-0 bg-inherit z-10 py-4">
                        <div className="flex items-center gap-3">
                          <RankBadge rank={idx} />
                          <span className="truncate max-w-[150px] font-medium" title={data.premium.insurer_name}>
                            {data.premium.insurer_name.length > 22 
                              ? data.premium.insurer_name.substring(0, 22) + '...' 
                              : data.premium.insurer_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <span className="font-bold text-foreground">
                          {formatCurrency(data.premium.current)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <ChangeIndicator value={data.premium.qoqChange} />
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <ChangeIndicator value={data.premium.yoyChange} />
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <span className="font-bold text-foreground">
                          {formatCurrency(data.assets.current)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <ChangeIndicator value={data.assets.qoqChange} />
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <ChangeIndicator value={data.assets.yoyChange} />
                      </TableCell>
                      <TableCell className={`text-right py-4 ${(data.profit.current || 0) < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                        <span className="font-bold">
                          {formatCurrency(data.profit.current)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <ChangeIndicator value={data.profit.qoqChange} />
                      </TableCell>
                      <TableCell className="text-center py-4 pr-4">
                        <ChangeIndicator value={data.profit.yoyChange} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            
            {comparisonData.length === 0 && (
              <div className="text-center py-12 px-4">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No data available for the selected period</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Try selecting a different quarter or year</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
