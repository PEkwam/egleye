import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Crown, Medal, Award, Trophy, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PremiumGrowthLeaderboardProps {
  category: string;
  selectedYear: number | null;
  selectedQuarter: number;
}

interface GrowthData {
  insurer_name: string;
  insurer_id: string;
  currentPremium: number;
  previousQuarterPremium: number;
  previousYearPremium: number;
  qoqGrowth: number | null;
  yoyGrowth: number | null;
  rank: number;
}

export function PremiumGrowthLeaderboard({ 
  category, 
  selectedYear, 
  selectedQuarter 
}: PremiumGrowthLeaderboardProps) {
  // Fetch current quarter data
  const { data: currentData } = useQuery({
    queryKey: ['growth-current', category, selectedYear, selectedQuarter],
    queryFn: async () => {
      const { data } = await supabase
        .from('insurer_metrics')
        .select('insurer_id, insurer_name, gross_premium')
        .eq('category', category)
        .eq('report_year', selectedYear)
        .eq('report_quarter', selectedQuarter);
      return data || [];
    },
    enabled: !!selectedYear,
  });

  // Fetch previous quarter data
  const { data: prevQuarterData } = useQuery({
    queryKey: ['growth-prev-quarter', category, selectedYear, selectedQuarter],
    queryFn: async () => {
      const prevQuarter = selectedQuarter === 1 ? 4 : selectedQuarter - 1;
      const prevYear = selectedQuarter === 1 ? (selectedYear || 0) - 1 : selectedYear;
      const { data } = await supabase
        .from('insurer_metrics')
        .select('insurer_id, insurer_name, gross_premium')
        .eq('category', category)
        .eq('report_year', prevYear)
        .eq('report_quarter', prevQuarter);
      return data || [];
    },
    enabled: !!selectedYear,
  });

  // Fetch previous year same quarter data
  const { data: prevYearData } = useQuery({
    queryKey: ['growth-prev-year', category, selectedYear, selectedQuarter],
    queryFn: async () => {
      const { data } = await supabase
        .from('insurer_metrics')
        .select('insurer_id, insurer_name, gross_premium')
        .eq('category', category)
        .eq('report_year', (selectedYear || 0) - 1)
        .eq('report_quarter', selectedQuarter);
      return data || [];
    },
    enabled: !!selectedYear,
  });

  const growthData = useMemo((): GrowthData[] => {
    if (!currentData) return [];

    const prevQuarterMap = new Map(
      (prevQuarterData || []).map(d => [d.insurer_id, d.gross_premium])
    );
    const prevYearMap = new Map(
      (prevYearData || []).map(d => [d.insurer_id, d.gross_premium])
    );

    const calculated = currentData
      .filter(d => d.gross_premium && d.gross_premium > 0)
      .map(d => {
        const prevQ = prevQuarterMap.get(d.insurer_id);
        const prevY = prevYearMap.get(d.insurer_id);
        
        const qoqGrowth = prevQ && prevQ > 0 
          ? ((d.gross_premium - prevQ) / prevQ) * 100 
          : null;
        const yoyGrowth = prevY && prevY > 0 
          ? ((d.gross_premium - prevY) / prevY) * 100 
          : null;

        return {
          insurer_name: d.insurer_name,
          insurer_id: d.insurer_id,
          currentPremium: d.gross_premium,
          previousQuarterPremium: prevQ || 0,
          previousYearPremium: prevY || 0,
          qoqGrowth,
          yoyGrowth,
          rank: 0,
        };
      })
      .sort((a, b) => (b.qoqGrowth || -Infinity) - (a.qoqGrowth || -Infinity))
      .map((d, index) => ({ ...d, rank: index + 1 }));

    return calculated.slice(0, 10);
  }, [currentData, prevQuarterData, prevYearData]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-4 w-4 text-amber-500" />;
      case 2: return <Medal className="h-4 w-4 text-slate-400" />;
      case 3: return <Award className="h-4 w-4 text-amber-600" />;
      default: return <span className="text-xs font-bold text-muted-foreground w-4 text-center">{rank}</span>;
    }
  };

  const getGrowthIndicator = (growth: number | null) => {
    if (growth === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (growth < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const formatGrowth = (growth: number | null) => {
    if (growth === null) return 'N/A';
    return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
    return `GH₵${value.toLocaleString()}`;
  };

  // Calculate previous quarter/year labels
  const prevQuarterLabel = selectedQuarter === 1 
    ? `Q4 ${(selectedYear || 0) - 1}` 
    : `Q${selectedQuarter - 1} ${selectedYear}`;
  const prevYearLabel = `Q${selectedQuarter} ${(selectedYear || 0) - 1}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Premium Growth Leaderboard
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[280px]">
                    <div className="space-y-2 text-xs">
                      <p className="font-semibold">What does this show?</p>
                      <p>Ranks insurers by their <strong>Gross Premium growth rate</strong> compared to previous periods.</p>
                      <div className="space-y-1 pt-1 border-t">
                        <p><strong>QoQ (Quarter-over-Quarter):</strong> Growth vs {prevQuarterLabel}</p>
                        <p><strong>YoY (Year-over-Year):</strong> Growth vs {prevYearLabel}</p>
                      </div>
                      <p className="text-muted-foreground pt-1">N/A means no data available for comparison period.</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>Top performers by quarterly growth</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            Q{selectedQuarter} {selectedYear}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Insurer</th>
                <th className="px-4 py-3 text-right font-medium">Premium</th>
                <th className="px-4 py-3 text-right font-medium">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="cursor-help underline decoration-dotted">
                        QoQ
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Quarter-over-Quarter growth vs {prevQuarterLabel}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="cursor-help underline decoration-dotted">
                        YoY
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Year-over-Year growth vs {prevYearLabel}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </th>
              </tr>
            </thead>
            <tbody>
              {growthData.map((item) => (
                <tr 
                  key={item.insurer_id} 
                  className={cn(
                    "border-b hover:bg-muted/30 transition-colors",
                    item.rank <= 3 && "bg-gradient-to-r from-amber-500/5 to-transparent"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center w-6 h-6">
                      {getRankIcon(item.rank)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-medium truncate max-w-[150px] block cursor-help">
                            {item.insurer_name.length > 20 
                              ? item.insurer_name.slice(0, 20) + '...' 
                              : item.insurer_name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs space-y-1">
                            <p className="font-semibold">{item.insurer_name}</p>
                            {item.previousQuarterPremium > 0 && (
                              <p>Prev Qtr: {formatCurrency(item.previousQuarterPremium)}</p>
                            )}
                            {item.previousYearPremium > 0 && (
                              <p>Same Qtr Last Year: {formatCurrency(item.previousYearPremium)}</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {formatCurrency(item.currentPremium)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {getGrowthIndicator(item.qoqGrowth)}
                      <span className={cn(
                        "font-medium text-xs",
                        item.qoqGrowth === null && "text-muted-foreground",
                        item.qoqGrowth !== null && item.qoqGrowth > 0 && "text-emerald-600 dark:text-emerald-400",
                        item.qoqGrowth !== null && item.qoqGrowth < 0 && "text-red-600 dark:text-red-400"
                      )}>
                        {formatGrowth(item.qoqGrowth)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {getGrowthIndicator(item.yoyGrowth)}
                      <span className={cn(
                        "font-medium text-xs",
                        item.yoyGrowth === null && "text-muted-foreground",
                        item.yoyGrowth !== null && item.yoyGrowth > 0 && "text-emerald-600 dark:text-emerald-400",
                        item.yoyGrowth !== null && item.yoyGrowth < 0 && "text-red-600 dark:text-red-400"
                      )}>
                        {formatGrowth(item.yoyGrowth)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {growthData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No growth data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
