import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target, Award, RefreshCw, Zap, Shield } from 'lucide-react';

interface AIAnalysis {
  headline: string;
  summary: string;
  marketLeader?: {
    name: string;
    insight: string;
  };
  emergingPlayers?: string[];
  keyMetrics?: Array<{
    label: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    insight: string;
  }>;
  claimsAnalysis?: string;
  opportunities?: string[];
  risks?: string[];
  recommendation?: string;
}

interface NonLifeAIInsightsProps {
  metrics: Array<{
    insurer_name: string;
    insurance_service_revenue: number | null;
    market_share: number | null;
    profit_after_tax: number | null;
    claims_ratio: number | null;
    expense_ratio: number | null;
    total_assets: number | null;
  }>;
  year: number;
  quarter: number;
}

export function NonLifeAIInsights({ metrics, year, quarter }: NonLifeAIInsightsProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);

  const metricsSummary = useMemo(() => {
    const totalPremium = metrics.reduce((sum, m) => sum + (m.insurance_service_revenue || 0), 0);
    const totalAssets = metrics.reduce((sum, m) => sum + (m.total_assets || 0), 0);
    const totalProfit = metrics.reduce((sum, m) => sum + (m.profit_after_tax || 0), 0);
    const avgExpenseRatio = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + (m.expense_ratio || 0), 0) / metrics.filter(m => m.expense_ratio).length 
      : 0;
    const avgClaimsRatio = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + (m.claims_ratio || 0), 0) / metrics.filter(m => m.claims_ratio).length 
      : 0;

    const topInsurers = metrics.slice(0, 10).map(m => ({
      name: m.insurer_name,
      premium: m.insurance_service_revenue || 0,
      marketShare: (m.market_share || 0) * 100, // Convert decimal to percentage
      profit: m.profit_after_tax || 0,
      claimsRatio: m.claims_ratio || 0,
      expenseRatio: m.expense_ratio || 0,
    }));

    return {
      totalPremium,
      totalAssets,
      totalProfit,
      avgExpenseRatio,
      avgClaimsRatio,
      companiesCount: metrics.length,
      topInsurers,
      category: 'nonlife',
      year,
      quarter,
    };
  }, [metrics, year, quarter]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('dashboard-insights', {
        body: { metricsSummary },
      });
      if (error) throw error;
      return data.analysis as AIAnalysis;
    },
    onSuccess: (data) => {
      setAnalysis(data);
    },
  });

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4 rounded-full bg-muted" />;
  };

  if (!analysis && !mutation.isPending) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/5 via-violet-500/5 to-indigo-500/5 border-purple-500/20">
        <CardContent className="p-8 text-center">
          <div className="p-4 rounded-full bg-purple-500/10 w-fit mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-purple-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">AI-Powered Market Insights</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Get intelligent analysis of the non-life insurance market trends, competitive dynamics, and strategic recommendations.
          </p>
          <Button 
            onClick={() => mutation.mutate()}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate AI Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (mutation.isPending) {
    return (
      <Card className="border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
            Analyzing Market Data...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mutation.isError) {
    return (
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 mb-4">Failed to generate insights. Please try again.</p>
          <Button variant="outline" onClick={() => mutation.mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Headline & Summary */}
      <Card className="bg-gradient-to-br from-purple-500/5 via-violet-500/5 to-indigo-500/5 border-purple-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Market Analysis
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => mutation.mutate()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            {analysis?.headline}
          </h2>
          <p className="text-muted-foreground leading-relaxed">{analysis?.summary}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Leader */}
        {analysis?.marketLeader && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-5 w-5 text-amber-500" />
                Market Leader
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">{analysis.marketLeader.name}</h3>
              <p className="text-sm text-muted-foreground">{analysis.marketLeader.insight}</p>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        {analysis?.keyMetrics && analysis.keyMetrics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-5 w-5 text-blue-500" />
                Key Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.keyMetrics.slice(0, 4).map((metric, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <TrendIcon trend={metric.trend} />
                      <span className="text-sm font-medium">{metric.label}</span>
                    </div>
                    <Badge variant="outline">{metric.value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Claims Analysis */}
      {analysis?.claimsAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-green-500" />
              Claims Efficiency Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{analysis.claimsAnalysis}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Opportunities */}
        {analysis?.opportunities && analysis.opportunities.length > 0 && (
          <Card className="border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-green-700">
                <Lightbulb className="h-5 w-5" />
                Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.opportunities.map((opp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Risks */}
        {analysis?.risks && analysis.risks.length > 0 && (
          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Risks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Strategic Recommendation */}
      {analysis?.recommendation && (
        <Card className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-blue-500" />
              Strategic Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground font-medium">{analysis.recommendation}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
