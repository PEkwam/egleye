import { useMemo } from 'react';
import { TrendingUp, Crown, Medal, Target, Zap, AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BrokerMetric {
  id: string;
  broker_name: string;
  commission_income: number | null;
  profit_loss_after_tax: number | null;
  market_share: number | null;
  general_admin_expenses: number | null;
  operational_results: number | null;
}

interface BrokerMarketSummaryProps {
  metrics: BrokerMetric[];
  previousMetrics?: BrokerMetric[];
  year: number;
  quarter: string;
}

export function BrokerMarketSummary({ 
  metrics, 
  previousMetrics = [],
  year, 
  quarter 
}: BrokerMarketSummaryProps) {
  const performance = useMemo(() => {
    const currentTotal = metrics.reduce((sum, m) => sum + (m.commission_income || 0), 0);
    const previousTotal = previousMetrics.reduce((sum, m) => sum + (m.commission_income || 0), 0);
    const commissionGrowth = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    // Market Leader (by commission income)
    const topPerformer = [...metrics].sort((a, b) => (b.commission_income || 0) - (a.commission_income || 0))[0];

    // Most Improved (highest QoQ growth in commission)
    let mostImproved = null;
    let highestGrowth = -Infinity;
    
    metrics.forEach(curr => {
      const prev = previousMetrics.find(p => 
        p.broker_name.toLowerCase() === curr.broker_name.toLowerCase()
      );
      if (prev && prev.commission_income && curr.commission_income) {
        const growth = ((curr.commission_income - prev.commission_income) / prev.commission_income) * 100;
        if (growth > highestGrowth) {
          highestGrowth = growth;
          mostImproved = { ...curr, growthRate: growth };
        }
      }
    });

    // Most Profitable (highest profit after tax)
    const mostProfitable = [...metrics]
      .filter(m => m.profit_loss_after_tax && m.profit_loss_after_tax > 0)
      .sort((a, b) => (b.profit_loss_after_tax || 0) - (a.profit_loss_after_tax || 0))[0];

    // Most Efficient (lowest expense to commission ratio)
    const mostEfficient = [...metrics]
      .filter(m => m.commission_income && m.general_admin_expenses && m.commission_income > 0)
      .map(m => ({
        ...m,
        efficiencyRatio: ((m.general_admin_expenses || 0) / (m.commission_income || 1)) * 100
      }))
      .sort((a, b) => a.efficiencyRatio - b.efficiencyRatio)[0];

    // Highest Loss (biggest negative profit)
    const highestLoss = [...metrics]
      .filter(m => m.profit_loss_after_tax && m.profit_loss_after_tax < 0)
      .sort((a, b) => (a.profit_loss_after_tax || 0) - (b.profit_loss_after_tax || 0))[0];

    // Total industry profit
    const totalProfit = metrics.reduce((sum, m) => sum + (m.profit_loss_after_tax || 0), 0);
    const profitableBrokers = metrics.filter(m => (m.profit_loss_after_tax || 0) > 0).length;

    return {
      currentTotal,
      commissionGrowth,
      topPerformer,
      mostImproved,
      mostProfitable,
      mostEfficient,
      highestLoss,
      totalProfit,
      profitableBrokers,
      companiesCount: metrics.length,
    };
  }, [metrics, previousMetrics]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
    if (Math.abs(value) >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1e3) return `GH₵${(value / 1e3).toFixed(0)}K`;
    return `GH₵${value.toLocaleString()}`;
  };

  const formatName = (name: string) => {
    if (name.length > 22) return name.substring(0, 22) + '...';
    return name;
  };

  return (
    <Card className="border-border/40 bg-gradient-to-br from-card via-card to-purple-500/5">
      <CardHeader className="pb-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl font-semibold">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10">
                <Target className="h-5 w-5 text-purple-500" />
              </div>
              Market Performance Summary
            </CardTitle>
            <CardDescription className="mt-1 ml-12">
              Key broker performance highlights for {year} {quarter === 'all' ? 'Full Year' : `Q${quarter}`}
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1 bg-purple-500/5 border-purple-500/20">
            <Zap className="h-3 w-3" />
            {performance.companiesCount} Brokers
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
                {formatName(performance.topPerformer.broker_name)}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(performance.topPerformer.commission_income || 0)}
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
                {formatName(performance.mostImproved.broker_name)}
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

          {/* Most Profitable */}
          {performance.mostProfitable && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-3">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Most Profitable</span>
              </div>
              <h3 className="font-bold text-lg text-foreground mb-1">
                {formatName(performance.mostProfitable.broker_name)}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(performance.mostProfitable.profit_loss_after_tax || 0)}
                </span>
                <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/30">
                  Net Profit
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
                {formatName(performance.mostEfficient.broker_name)}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {performance.mostEfficient.efficiencyRatio.toFixed(1)}%
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
              {performance.commissionGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className="text-xs font-semibold uppercase tracking-wide">Industry Growth</span>
            </div>
            <h3 className="font-bold text-lg text-foreground mb-1">Total Commission</h3>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">
                {formatCurrency(performance.currentTotal)}
              </span>
              {performance.commissionGrowth !== 0 && (
                <Badge 
                  className={`${
                    performance.commissionGrowth >= 0 
                      ? 'bg-green-500/20 text-green-700 dark:text-green-400' 
                      : 'bg-red-500/20 text-red-700 dark:text-red-400'
                  }`}
                >
                  {performance.commissionGrowth >= 0 ? '+' : ''}{performance.commissionGrowth.toFixed(1)}% QoQ
                </Badge>
              )}
            </div>
          </div>

          {/* Profitability Overview */}
          <div className={`p-4 rounded-xl bg-gradient-to-br ${performance.totalProfit >= 0 ? 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200/50 dark:border-emerald-800/50' : 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200/50 dark:border-orange-800/50'} border hover:shadow-lg transition-all duration-300`}>
            <div className={`flex items-center gap-2 ${performance.totalProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'} mb-3`}>
              {performance.totalProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <span className="text-xs font-semibold uppercase tracking-wide">Industry Profitability</span>
            </div>
            <h3 className="font-bold text-lg text-foreground mb-1">
              {performance.profitableBrokers} / {performance.companiesCount} Profitable
            </h3>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${performance.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(performance.totalProfit)}
              </span>
              <Badge className={`${performance.totalProfit >= 0 ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                Net Industry
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}