import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, Award, AlertTriangle, Zap, Crown, Medal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MarketPerformanceSummaryProps {
  category: string;
  selectedYear: number;
  selectedQuarter: number;
}

export function MarketPerformanceSummary({ 
  category, 
  selectedYear, 
  selectedQuarter 
}: MarketPerformanceSummaryProps) {
  // Fetch current and previous quarter data
  const { data: currentData = [], isLoading } = useQuery({
    queryKey: ['market-performance-current', category, selectedYear, selectedQuarter],
    queryFn: async () => {
      let query = supabase
        .from('insurer_metrics')
        .select('*')
        .eq('report_year', selectedYear)
        .eq('report_quarter', selectedQuarter)
        .order('gross_premium', { ascending: false });

      if (category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: previousData = [] } = useQuery({
    queryKey: ['market-performance-previous', category, selectedYear, selectedQuarter],
    queryFn: async () => {
      const prevQuarter = selectedQuarter === 1 ? 4 : selectedQuarter - 1;
      const prevYear = selectedQuarter === 1 ? selectedYear - 1 : selectedYear;
      
      let query = supabase
        .from('insurer_metrics')
        .select('*')
        .eq('report_year', prevYear)
        .eq('report_quarter', prevQuarter)
        .order('gross_premium', { ascending: false });

      if (category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) return [];
      return data || [];
    },
  });

  // Calculate market performance metrics
  const performance = useMemo(() => {
    // Filter out records with zero or null gross_premium for calculations
    const validCurrentData = currentData.filter(m => m.gross_premium && m.gross_premium > 0);
    const validPreviousData = previousData.filter(m => m.gross_premium && m.gross_premium > 0);
    
    const currentTotal = validCurrentData.reduce((sum, m) => sum + (m.gross_premium || 0), 0);
    const previousTotal = validPreviousData.reduce((sum, m) => sum + (m.gross_premium || 0), 0);
    const premiumGrowth = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    // Top performer - use filtered data and calculate market share dynamically
    const sortedByPremium = [...validCurrentData].sort((a, b) => (b.gross_premium || 0) - (a.gross_premium || 0));
    const topPerformer = sortedByPremium[0] ? {
      ...sortedByPremium[0],
      // Calculate market share dynamically: (insurer premium / total) * 100
      calculatedMarketShare: currentTotal > 0 
        ? ((sortedByPremium[0].gross_premium || 0) / currentTotal) * 100 
        : 0
    } : null;
    
    // Most improved (biggest QoQ growth)
    let mostImproved = null;
    let highestGrowth = -Infinity;
    
    validCurrentData.forEach(curr => {
      const prev = validPreviousData.find(p => 
        p.insurer_name.toLowerCase() === curr.insurer_name.toLowerCase()
      );
      if (prev && prev.gross_premium && curr.gross_premium) {
        const growth = ((curr.gross_premium - prev.gross_premium) / prev.gross_premium) * 100;
        if (growth > highestGrowth) {
          highestGrowth = growth;
          mostImproved = { ...curr, growth };
        }
      }
    });

    // Highest claims ratio (potential concern) - filter for valid ratios
    const highestClaimsRatio = [...validCurrentData]
      .filter(m => m.claims_ratio && m.claims_ratio > 0)
      .sort((a, b) => (b.claims_ratio || 0) - (a.claims_ratio || 0))[0];

    // Highest solvency (strongest financially)
    const strongestSolvency = [...validCurrentData]
      .filter(m => m.solvency_ratio && m.solvency_ratio > 0)
      .sort((a, b) => (b.solvency_ratio || 0) - (a.solvency_ratio || 0))[0];

    // Best expense ratio (most efficient)
    const mostEfficient = [...validCurrentData]
      .filter(m => m.expense_ratio && m.expense_ratio > 0)
      .sort((a, b) => (a.expense_ratio || 0) - (b.expense_ratio || 0))[0];

    return {
      currentTotal,
      previousTotal,
      premiumGrowth,
      topPerformer,
      mostImproved: mostImproved ? { ...mostImproved, growthRate: highestGrowth } : null,
      highestClaimsRatio,
      strongestSolvency,
      mostEfficient,
      companiesCount: validCurrentData.length,
    };
  }, [currentData, previousData]);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
    return `GH₵${value.toLocaleString()}`;
  };

  const formatName = (name: string) => {
    if (name.length > 20) return name.substring(0, 20) + '...';
    return name;
  };

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

  return (
    <Card className="border-border/40 bg-gradient-to-br from-card to-secondary/20">
      <CardHeader className="pb-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl font-semibold">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              Market Performance Summary
            </CardTitle>
            <CardDescription className="mt-1 ml-12">
              Key performance highlights for {selectedYear} Q{selectedQuarter}
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1 bg-primary/5">
            <Zap className="h-3 w-3" />
            {performance.companiesCount} Companies
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Market Leader */}
          {performance.topPerformer && performance.topPerformer.gross_premium > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200/50 dark:border-amber-800/50">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-3">
                <Crown className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Market Leader</span>
              </div>
              <h3 className="font-bold text-lg text-foreground mb-1">
                {formatName(performance.topPerformer.insurer_name)}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(performance.topPerformer.gross_premium || 0)}
                </span>
                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/30">
                  {performance.topPerformer.calculatedMarketShare.toFixed(1)}% share
                </Badge>
              </div>
            </div>
          )}

          {/* Most Improved */}
          {performance.mostImproved && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-800/50">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-3">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Most Improved</span>
              </div>
              <h3 className="font-bold text-lg text-foreground mb-1">
                {formatName(performance.mostImproved.insurer_name)}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  +{performance.mostImproved.growthRate.toFixed(1)}%
                </span>
                <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30">
                  QoQ Growth
                </Badge>
              </div>
            </div>
          )}

          {/* Strongest Solvency */}
          {performance.strongestSolvency && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-800/50">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-3">
                <Award className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Strongest Solvency</span>
              </div>
              <h3 className="font-bold text-lg text-foreground mb-1">
                {formatName(performance.strongestSolvency.insurer_name)}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {(performance.strongestSolvency.solvency_ratio || 0).toFixed(1)}%
                </span>
                <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/30">
                  Solvency Ratio
                </Badge>
              </div>
            </div>
          )}

          {/* Most Efficient */}
          {performance.mostEfficient && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200/50 dark:border-purple-800/50">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-3">
                <Medal className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Most Efficient</span>
              </div>
              <h3 className="font-bold text-lg text-foreground mb-1">
                {formatName(performance.mostEfficient.insurer_name)}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {((performance.mostEfficient.expense_ratio || 0) * 100).toFixed(1)}%
                </span>
                <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-400 hover:bg-purple-500/30">
                  Expense Ratio
                </Badge>
              </div>
            </div>
          )}

          {/* Industry Premium Growth */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-400 mb-3">
              {performance.premiumGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className="text-xs font-semibold uppercase tracking-wide">Industry Growth</span>
            </div>
            <h3 className="font-bold text-lg text-foreground mb-1">Total Premium</h3>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">
                {formatCurrency(performance.currentTotal)}
              </span>
              <Badge 
                className={`${
                  performance.premiumGrowth >= 0 
                    ? 'bg-green-500/20 text-green-700 dark:text-green-400' 
                    : 'bg-red-500/20 text-red-700 dark:text-red-400'
                }`}
              >
                {performance.premiumGrowth >= 0 ? '+' : ''}{performance.premiumGrowth.toFixed(1)}% QoQ
              </Badge>
            </div>
          </div>

          {/* Highest Claims Ratio (Watch) */}
          {performance.highestClaimsRatio && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200/50 dark:border-orange-800/50">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 mb-3">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Highest Claims</span>
              </div>
              <h3 className="font-bold text-lg text-foreground mb-1">
                {formatName(performance.highestClaimsRatio.insurer_name)}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {((performance.highestClaimsRatio.claims_ratio || 0) * 100).toFixed(1)}%
                </span>
                <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400 hover:bg-orange-500/30">
                  Claims Ratio
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}