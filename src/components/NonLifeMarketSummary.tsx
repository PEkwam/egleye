import { useMemo } from 'react';
import { TrendingUp, Crown, Medal, Target, Zap, AlertTriangle, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NonLifeMetric {
  id: string;
  insurer_name: string;
  insurance_service_revenue: number | null;
  market_share: number | null;
  profit_after_tax: number | null;
  claims_ratio: number | null;
  expense_ratio: number | null;
}

interface NonLifeMarketSummaryProps {
  metrics: NonLifeMetric[];
  previousMetrics?: NonLifeMetric[];
  year: number;
  quarter: number;
}

export function NonLifeMarketSummary({ 
  metrics, 
  previousMetrics = [],
  year, 
  quarter 
}: NonLifeMarketSummaryProps) {
  const performance = useMemo(() => {
    const currentTotal = metrics.reduce((sum, m) => sum + (m.insurance_service_revenue || 0), 0);
    const previousTotal = previousMetrics.reduce((sum, m) => sum + (m.insurance_service_revenue || 0), 0);
    const revenueGrowth = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    // Market Leader
    const topPerformer = [...metrics].sort((a, b) => (b.market_share || 0) - (a.market_share || 0))[0];

    // Most Improved (highest QoQ growth)
    let mostImproved = null;
    let highestGrowth = -Infinity;
    
    metrics.forEach(curr => {
      const prev = previousMetrics.find(p => 
        p.insurer_name.toLowerCase() === curr.insurer_name.toLowerCase()
      );
      if (prev && prev.insurance_service_revenue && curr.insurance_service_revenue) {
        const growth = ((curr.insurance_service_revenue - prev.insurance_service_revenue) / prev.insurance_service_revenue) * 100;
        if (growth > highestGrowth) {
          highestGrowth = growth;
          mostImproved = { ...curr, growthRate: growth };
        }
      }
    });

    // Most Efficient (lowest expense ratio)
    const mostEfficient = [...metrics]
      .filter(m => m.expense_ratio && m.expense_ratio > 0)
      .sort((a, b) => (a.expense_ratio || 0) - (b.expense_ratio || 0))[0];

    // Highest Claims Ratio
    const highestClaims = [...metrics]
      .filter(m => m.claims_ratio && m.claims_ratio > 0)
      .sort((a, b) => (b.claims_ratio || 0) - (a.claims_ratio || 0))[0];

    return {
      currentTotal,
      revenueGrowth,
      topPerformer,
      mostImproved,
      mostEfficient,
      highestClaims,
      companiesCount: metrics.length,
    };
  }, [metrics, previousMetrics]);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
    return `GH₵${value.toLocaleString()}`;
  };

  const formatName = (name: string) => {
    if (name.length > 20) return name.substring(0, 20) + '...';
    return name;
  };

  return (
    <Card className="border-border/40 bg-gradient-to-br from-card via-card to-blue-500/5">
      <CardHeader className="pb-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl font-semibold">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              Market Performance Summary
            </CardTitle>
            <CardDescription className="mt-1 ml-12">
              Key performance highlights for {year} Q{quarter}
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1 bg-blue-500/5 border-blue-500/20">
            <Zap className="h-3 w-3" />
            {performance.companiesCount} Companies
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Market Leader */}
          {performance.topPerformer && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200/50 dark:border-amber-800/50 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-3">
                <Crown className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Market Leader</span>
              </div>
              <h3 className="font-bold text-lg text-foreground mb-1">
                {formatName(performance.topPerformer.insurer_name)}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(performance.topPerformer.insurance_service_revenue || 0)}
                </span>
                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/30">
                  {((performance.topPerformer.market_share || 0) * 100).toFixed(1)}% share
                </Badge>
              </div>
            </div>
          )}

          {/* Most Improved */}
          {performance.mostImproved && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-800/50 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300">
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

          {/* Most Efficient */}
          {performance.mostEfficient && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200/50 dark:border-purple-800/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300">
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

          {/* Industry Growth */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border border-slate-200/50 dark:border-slate-800/50 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-400 mb-3">
              {performance.revenueGrowth >= 0 ? (
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
                  performance.revenueGrowth >= 0 
                    ? 'bg-green-500/20 text-green-700 dark:text-green-400' 
                    : 'bg-red-500/20 text-red-700 dark:text-red-400'
                }`}
              >
                {performance.revenueGrowth >= 0 ? '+' : ''}{performance.revenueGrowth.toFixed(1)}% QoQ
              </Badge>
            </div>
          </div>

          {/* Highest Claims */}
          {performance.highestClaims && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200/50 dark:border-orange-800/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 mb-3">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Highest Claims</span>
              </div>
              <h3 className="font-bold text-lg text-foreground mb-1">
                {formatName(performance.highestClaims.insurer_name)}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {((performance.highestClaims.claims_ratio || 0) * 100).toFixed(1)}%
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