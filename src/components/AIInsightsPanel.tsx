import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, TrendingUp, TrendingDown, Minus, 
  AlertTriangle, Lightbulb, Target, RefreshCw,
  ChevronRight, Crown, Rocket, Scale
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MetricsSummary {
  totalPremium: number;
  totalAssets: number;
  totalProfit: number;
  avgExpenseRatio: number;
  avgClaimsRatio: number;
  companiesCount: number;
  topInsurers: { name: string; premium: number; marketShare: number }[];
  category: string;
  year: number;
  quarter: number;
  totalClaims?: number;
}

interface AIAnalysis {
  headline: string;
  summary: string;
  marketLeader?: { name: string; insight: string };
  emergingPlayers?: string[];
  claimsAnalysis?: string;
  keyMetrics: { label: string; value: string; trend: 'up' | 'down' | 'stable'; insight: string }[];
  opportunities: string[];
  risks: string[];
  recommendation: string;
}

interface AIInsightsPanelProps {
  metricsSummary: MetricsSummary;
}

export function AIInsightsPanel({ metricsSummary }: AIInsightsPanelProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchInsights = async () => {
    if (metricsSummary.companiesCount === 0) {
      toast.error('No data available for analysis');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dashboard-insights', {
        body: { metricsSummary },
      });

      if (error) throw error;
      if (data?.analysis) {
        setAnalysis(data.analysis);
        setHasLoaded(true);
      }
    } catch (error: any) {
      console.error('AI insights error:', error);
      if (error.message?.includes('429')) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('402')) {
        toast.error('AI credits exhausted. Please add funds.');
      } else {
        toast.error('Failed to generate insights');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch when year or quarter changes
  useEffect(() => {
    if (metricsSummary.companiesCount > 0) {
      // Reset and fetch new insights when filters change
      setAnalysis(null);
      setHasLoaded(false);
      fetchInsights();
    }
  }, [metricsSummary.category, metricsSummary.year, metricsSummary.quarter]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <Skeleton className="h-6 w-48" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-primary/20">
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 text-primary/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">AI-Powered Insights</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Get executive-level analysis of the insurance market data
          </p>
          <Button onClick={fetchInsights} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-primary/20 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Executive Insights</CardTitle>
              <CardDescription>
                Q{metricsSummary.quarter} {metricsSummary.year} • {
                  metricsSummary.category === 'life' ? 'Life Insurance' 
                  : metricsSummary.category === 'nonlife' ? 'Non-Life Insurance' 
                  : metricsSummary.category === 'pension' ? 'Pension' : 'All Sectors'
                }
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchInsights} className="gap-1">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Headline & Summary */}
        <div className="p-4 rounded-xl bg-background/50 border border-border/50">
          <h3 className="text-xl font-bold text-foreground mb-2">{analysis.headline}</h3>
          <p className="text-muted-foreground">{analysis.summary}</p>
        </div>

        {/* Market Leader & Emerging Players */}
        <div className="grid md:grid-cols-2 gap-4">
          {analysis.marketLeader && (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-4 w-4 text-amber-600" />
                <span className="font-semibold text-amber-700 dark:text-amber-400">Market Leader</span>
              </div>
              <p className="text-lg font-bold text-foreground mb-1">{analysis.marketLeader.name}</p>
              <p className="text-sm text-muted-foreground">{analysis.marketLeader.insight}</p>
            </div>
          )}

          {analysis.emergingPlayers && analysis.emergingPlayers.length > 0 && (
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Rocket className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-blue-700 dark:text-blue-400">Emerging Players</span>
              </div>
              <ul className="space-y-1">
                {analysis.emergingPlayers.slice(0, 3).map((player, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <ChevronRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>{player}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Claims Analysis */}
        {analysis.claimsAnalysis && (
          <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="h-4 w-4 text-purple-600" />
              <span className="font-semibold text-purple-700 dark:text-purple-400">Claims & Efficiency Analysis</span>
            </div>
            <p className="text-sm">{analysis.claimsAnalysis}</p>
          </div>
        )}

        {/* Key Metrics */}
        {analysis.keyMetrics && analysis.keyMetrics.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {analysis.keyMetrics.slice(0, 4).map((metric, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-background/50 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                  {getTrendIcon(metric.trend)}
                </div>
                <p className="text-lg font-bold">{metric.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{metric.insight}</p>
              </div>
            ))}
          </div>
        )}

        {/* Opportunities & Risks */}
        <div className="grid md:grid-cols-2 gap-4">
          {analysis.opportunities && analysis.opportunities.length > 0 && (
            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-700 dark:text-green-400">Opportunities</span>
              </div>
              <ul className="space-y-2">
                {analysis.opportunities.map((opp, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <ChevronRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.risks && analysis.risks.length > 0 && (
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-semibold text-red-700 dark:text-red-400">Risk Factors</span>
              </div>
              <ul className="space-y-2">
                {analysis.risks.map((risk, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <ChevronRight className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Strategic Recommendation */}
        {analysis.recommendation && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">Strategic Recommendation</span>
            </div>
            <p className="text-sm">{analysis.recommendation}</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Powered by AI • Analysis based on NIC Q{metricsSummary.quarter} {metricsSummary.year} data
        </p>
      </CardContent>
    </Card>
  );
}
