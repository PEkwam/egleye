import { useState } from 'react';
import { 
  DollarSign, Building, TrendingUp, AlertCircle, LineChart, Clock, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface InsurerMetricButtonsProps {
  category: string;
  selectedYear: number;
  selectedQuarter: number;
}

type MetricKey = 'csm' | 'gross_premium' | 'total_assets' | 'profit_after_tax' | 'market_share' | 
                 'total_claims_paid' | 'investment_income' | 'insurance_service_result' | 
                 'total_investments' | 'total_liabilities' | 'technical_results_margin' |
                 'insurance_finance_income' | 'acquisition_cashflow' | 'share_insurance_service_results';

interface MetricConfig {
  key: MetricKey;
  label: string;
  icon: React.ElementType;
  format: (value: number | null) => string;
  color: string;
  bgColor: string;
  sortDesc: boolean;
}

const metrics: MetricConfig[] = [
  {
    key: 'csm',
    label: 'CSM',
    icon: TrendingUp,
    format: (v) => v ? (Math.abs(v) >= 1e9 ? `GH₵${(v / 1e9).toFixed(2)}B` : `GH₵${(v / 1e6).toFixed(1)}M`) : '-',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50 border-violet-200',
    sortDesc: true,
  },
  {
    key: 'gross_premium',
    label: 'Insurance Revenue',
    icon: DollarSign,
    format: (v) => v ? (v >= 1e9 ? `GH₵${(v / 1e9).toFixed(2)}B` : `GH₵${(v / 1e6).toFixed(1)}M`) : '-',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
    sortDesc: true,
  },
  {
    key: 'total_assets',
    label: 'Total Assets',
    icon: Building,
    format: (v) => v ? (v >= 1e9 ? `GH₵${(v / 1e9).toFixed(2)}B` : `GH₵${(v / 1e6).toFixed(1)}M`) : '-',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50 border-slate-200',
    sortDesc: true,
  },
  {
    key: 'profit_after_tax',
    label: 'Profit After Tax',
    icon: TrendingUp,
    format: (v) => v ? (Math.abs(v) >= 1e9 ? `GH₵${(v / 1e9).toFixed(2)}B` : `GH₵${(v / 1e6).toFixed(1)}M`) : '-',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50 border-slate-200',
    sortDesc: true,
  },
  {
    key: 'total_claims_paid',
    label: 'Incurred Claims',
    icon: AlertCircle,
    format: (v) => v ? (Math.abs(v) >= 1e9 ? `GH₵${(v / 1e9).toFixed(2)}B` : `GH₵${(v / 1e6).toFixed(1)}M`) : '-',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    sortDesc: true,
  },
  {
    key: 'investment_income',
    label: 'Investment Income',
    icon: LineChart,
    format: (v) => v ? (Math.abs(v) >= 1e9 ? `GH₵${(v / 1e9).toFixed(2)}B` : `GH₵${(v / 1e6).toFixed(1)}M`) : '-',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 border-teal-200',
    sortDesc: true,
  },
  {
    key: 'market_share',
    label: 'Market Share',
    icon: Clock,
    format: (v) => v ? `${(v * 100).toFixed(1)}%` : '-',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 border-cyan-200',
    sortDesc: true,
  },
];

const getRankIcon = (rank: number) => {
  switch(rank) {
    case 0: return '🥇';
    case 1: return '🥈';
    case 2: return '🥉';
    default: return null;
  }
};

const getRankBg = (rank: number) => {
  switch(rank) {
    case 0: return 'bg-amber-100 text-amber-700';
    case 1: return 'bg-slate-200 text-slate-700';
    case 2: return 'bg-orange-100 text-orange-700';
    default: return 'bg-muted text-muted-foreground';
  }
};

type TopCountOption = 'all' | 5 | 10;

export function InsurerMetricButtons({
  category,
  selectedYear,
  selectedQuarter,
}: InsurerMetricButtonsProps) {
  const [topCount, setTopCount] = useState<TopCountOption>('all');
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('csm');

  const { data: metricsData = [], isLoading } = useQuery({
    queryKey: ['insurer-metrics-buttons', category, selectedYear, selectedQuarter],
    queryFn: async () => {
      let query = supabase
        .from('insurer_metrics')
        .select('*')
        .eq('report_year', selectedYear)
        .eq('report_quarter', selectedQuarter);

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate total premium for dynamic market share calculation
  const totalIndustryPremium = metricsData.reduce((sum, m) => sum + (m.gross_premium || 0), 0);

  const currentMetric = metrics.find(m => m.key === selectedMetric) || metrics[5];

  const getSortedData = () => {
    // For market share, calculate dynamically from gross_premium / total
    const dataWithCalculatedShare = metricsData.map(m => ({
      ...m,
      calculated_market_share: totalIndustryPremium > 0 
        ? (m.gross_premium || 0) / totalIndustryPremium 
        : 0
    }));

    const metricKey = selectedMetric === 'market_share' ? 'calculated_market_share' : selectedMetric;
    
    const sorted = [...dataWithCalculatedShare]
      .filter(m => m[metricKey] !== null && m[metricKey] !== undefined)
      .sort((a, b) => {
        const aVal = (a[metricKey] as number) || 0;
        const bVal = (b[metricKey] as number) || 0;
        return currentMetric.sortDesc ? bVal - aVal : aVal - bVal;
      });
    
    if (topCount === 'all') return sorted;
    return sorted.slice(0, topCount);
  };

  const sortedData = getSortedData();
  const metricKeyForMax = selectedMetric === 'market_share' ? 'calculated_market_share' : selectedMetric;
  const maxValue = sortedData[0]?.[metricKeyForMax] as number || 1;

  if (metricsData.length === 0 && !isLoading) {
    return (
      <Card className="border-border/40">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto opacity-30 mb-3" />
          <p>No comparison data available for this period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Quick Comparison</CardTitle>
              <p className="text-xs text-muted-foreground">Click a metric to view rankings</p>
            </div>
          </div>
          
          {/* Top Filter - Show: All, Top 5, Top 10 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <div className="flex items-center rounded-md overflow-hidden border border-border">
              {(['all', 5, 10] as TopCountOption[]).map((count) => (
                <button
                  key={count}
                  onClick={() => setTopCount(count)}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${
                    topCount === count
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {count === 'all' ? 'All' : `Top ${count}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-2">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const isSelected = selectedMetric === metric.key;
            return (
              <button
                key={metric.key}
                onClick={() => setSelectedMetric(metric.key)}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? `${metric.bgColor} border-current ${metric.color} shadow-sm`
                    : 'bg-background border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current" />
                )}
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-2 ${
                  isSelected ? 'bg-white/80' : 'bg-muted'
                }`}>
                  <Icon className={`h-5 w-5 ${isSelected ? metric.color : 'text-muted-foreground'}`} />
                </div>
                <span className={`text-xs font-medium leading-tight block ${
                  isSelected ? 'text-current' : 'text-muted-foreground'
                }`}>
                  {metric.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Rankings Table */}
        <div className="bg-muted/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${currentMetric.bgColor}`}>
                <currentMetric.icon className={`h-4 w-4 ${currentMetric.color}`} />
              </div>
              <div>
                <h4 className="font-semibold text-sm">{currentMetric.label} Rankings</h4>
                <p className="text-xs text-muted-foreground">
                  {topCount === 'all' ? 'All' : `Top ${topCount}`} • {selectedYear} Q{selectedQuarter}
                </p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">
              {sortedData.length} companies
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : sortedData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No data available for this metric
            </div>
          ) : (
            <div className="space-y-2">
              {/* Table Header */}
              <div className="grid grid-cols-[3rem_1fr_auto] gap-3 px-2 py-1 text-xs font-medium text-muted-foreground">
                <span>Rank</span>
                <span>Company</span>
                <span className="text-right">{currentMetric.label}</span>
              </div>

              {/* Table Body */}
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {sortedData.map((item, idx) => {
                  // Use calculated market share for market_share metric
                  const currentValue = selectedMetric === 'market_share' 
                    ? ((item as any).calculated_market_share as number) || 0
                    : (item[selectedMetric] as number) || 0;
                  const percentage = (currentValue / maxValue) * 100;
                  const rankEmoji = getRankIcon(idx);
                  
                  return (
                    <div 
                      key={item.id} 
                      className="grid grid-cols-[3rem_1fr_auto] gap-3 items-center bg-background rounded-lg px-2 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      {/* Rank */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${getRankBg(idx)}`}>
                        {rankEmoji || idx + 1}
                      </div>
                      
                      {/* Company Name & Progress */}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate" title={item.insurer_name}>
                          {item.insurer_name}
                        </p>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                          <div 
                            className={`h-full rounded-full transition-all duration-500`}
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: currentMetric.color.includes('violet') ? '#7c3aed' :
                                              currentMetric.color.includes('emerald') ? '#059669' :
                                              currentMetric.color.includes('amber') ? '#d97706' :
                                              currentMetric.color.includes('teal') ? '#0d9488' :
                                              currentMetric.color.includes('cyan') ? '#0891b2' :
                                              '#475569'
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Value */}
                      <span className={`font-semibold text-sm ${currentMetric.color}`}>
                        {currentMetric.format(currentValue)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
