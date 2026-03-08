import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown, ChevronUp, Sparkles, Shield, Sword, Lightbulb,
  AlertTriangle, TrendingUp, RefreshCw, Zap, Target, BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MetricRow {
  insurer_id: string;
  insurer_name: string;
  gross_premium: number | null;
  market_share: number | null;
  term_premium: number | null;
  whole_life: number | null;
  endowment: number | null;
  credit_life: number | null;
  universal_life: number | null;
  group_policies: number | null;
  annuities: number | null;
  microinsurance: number | null;
  unit_linked: number | null;
  investment_linked: number | null;
  other_products: number | null;
  branches: number | null;
  employees: number | null;
  years_in_ghana: number | null;
}

interface AIStrategyProps {
  metrics: MetricRow[];
  year: number | null;
  quarter: number | null;
}

interface StrategyAnalysis {
  headline: string;
  executiveSummary: string;
  marketLeaderAnalysis: {
    strengths: string[];
    vulnerabilities: string[];
    recommendation: string;
  };
  challengerStrategy: {
    insight: string;
    opportunities: string[];
  };
  productMixInsights: Array<{ title: string; detail: string }>;
  correlationVerdict: string;
  strategicRecommendations: string[];
  riskFactors: string[];
}

const PRODUCT_KEYS: { key: keyof MetricRow; label: string }[] = [
  { key: 'term_premium', label: 'Term Life' },
  { key: 'whole_life', label: 'Whole Life' },
  { key: 'endowment', label: 'Endowment' },
  { key: 'credit_life', label: 'Credit Life' },
  { key: 'universal_life', label: 'Universal Life' },
  { key: 'group_policies', label: 'Group Policies' },
  { key: 'annuities', label: 'Annuities' },
  { key: 'microinsurance', label: 'Microinsurance' },
  { key: 'unit_linked', label: 'Unit-Linked' },
  { key: 'investment_linked', label: 'Investment-Linked' },
];

// Infer parent group from insurer name patterns
function inferParentGroup(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('enterprise')) return 'Enterprise Group';
  if (n.includes('sanlam') || n.includes('allianz')) return 'Sanlam Allianz';
  if (n.includes('star') && n.includes('life')) return 'Star Group';
  if (n.includes('prudential')) return 'Prudential plc';
  if (n.includes('oldmutual') || n.includes('old mutual')) return 'Old Mutual';
  if (n.includes('metropolitan') || n.includes('metlife')) return 'Metropolitan/MetLife';
  if (n.includes('hollard')) return 'Hollard Group';
  if (n.includes('glico')) return 'GLICO Group';
  if (n.includes('vanguard')) return 'Vanguard Group';
  if (n.includes('donewell')) return 'Donewell Group';
  return '';
}

function useProductMixPayload(metrics: MetricRow[], year: number | null, quarter: number | null) {
  return useMemo(() => {
    const validMetrics = metrics.filter(m => m.gross_premium && m.gross_premium > 0);
    if (!validMetrics.length || !year || !quarter) return null;

    const marketLeader = validMetrics.reduce((top, m) =>
      (m.gross_premium || 0) > (top.gross_premium || 0) ? m : top
    , validMetrics[0]);

    const productLeaders = PRODUCT_KEYS
      .map(({ key, label }) => {
        const leader = validMetrics.reduce((top, m) =>
          ((m[key] as number) || 0) > ((top[key] as number) || 0) ? m : top
        , validMetrics[0]);
        return { product: label, leader: leader.insurer_name, value: (leader[key] as number) || 0 };
      })
      .filter(pl => pl.value > 0);

    const gapsCount = productLeaders.filter(pl => pl.leader !== marketLeader.insurer_name).length;

    const diversificationScores = validMetrics.map(m => {
      const productValues = PRODUCT_KEYS.map(pk => (m[pk.key] as number) || 0).filter(v => v > 0);
      const total = productValues.reduce((s, v) => s + v, 0);
      if (total === 0) return { name: m.insurer_name, score: 0, count: 0 };
      const shares = productValues.map(v => v / total);
      const hhi = shares.reduce((s, sh) => s + sh * sh, 0);
      return { name: m.insurer_name, score: Math.round((1 - hhi) * 100), count: productValues.length };
    }).sort((a, b) => b.score - a.score);

    const correlationData = validMetrics.map(m => ({
      name: m.insurer_name,
      marketShare: m.market_share || 0,
      activeProducts: PRODUCT_KEYS.filter(pk => ((m[pk.key] as number) || 0) > 0).length,
    })).sort((a, b) => b.marketShare - a.marketShare);

    // Build insurer profiles with strategic dimensions
    const insurerProfiles = validMetrics
      .sort((a, b) => (b.gross_premium || 0) - (a.gross_premium || 0))
      .map(m => ({
        name: m.insurer_name,
        branches: m.branches || 0,
        employees: m.employees || 0,
        yearsInGhana: m.years_in_ghana || 0,
        premium: m.gross_premium || 0,
        marketShare: m.market_share || 0,
        website: '',
        parentGroup: inferParentGroup(m.insurer_name),
        distributionScore: (m.branches || 0) * (m.employees || 0),
      }));

    return {
      marketLeader: {
        name: marketLeader.insurer_name,
        premium: marketLeader.gross_premium || 0,
        marketShare: marketLeader.market_share || 0,
      },
      insurerCount: validMetrics.length,
      productLeaders,
      diversificationScores,
      gapsCount,
      totalCategories: productLeaders.length,
      correlationData,
      year,
      quarter,
      insurerProfiles,
    };
  }, [metrics, year, quarter]);
}

export function AIProductMixStrategy({ metrics, year, quarter }: AIStrategyProps) {
  const [isOpen, setIsOpen] = useState(true);
  const payload = useProductMixPayload(metrics, year, quarter);

  const { data: analysis, isLoading, error, refetch, isFetching } = useQuery<StrategyAnalysis>({
    queryKey: ['product-mix-strategy', year, quarter],
    queryFn: async () => {
      if (!payload) throw new Error('No data');
      const { data, error } = await supabase.functions.invoke('product-mix-strategy', {
        body: { productMixData: payload },
      });
      if (error) {
        if (error.message?.includes('429')) {
          toast.error('AI rate limit reached. Please try again in a moment.');
        } else if (error.message?.includes('402')) {
          toast.error('AI credits exhausted. Please add funds.');
        }
        throw error;
      }
      return data.analysis;
    },
    enabled: !!payload,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  if (!payload) return null;

  return (
    <Card className="border-primary/10 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  AI Strategic Analysis
                  <Badge variant="outline" className="text-[10px] border-primary/20 text-primary font-normal">
                    Powered by AI
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Deep analysis of product mix, distribution strategies, affiliations & competitive positioning
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {analysis && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); refetch(); }}
                    disabled={isFetching}
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                  </Button>
                )}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading || isFetching ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-20 w-full" />
                <div className="grid md:grid-cols-2 gap-4">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
                <Skeleton className="h-24 w-full" />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 mx-auto text-destructive/60 mb-2" />
                <p className="text-sm text-muted-foreground">Failed to generate AI analysis</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                </Button>
              </div>
            ) : analysis ? (
              <div className="space-y-5">
                {/* Headline & Summary */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border border-primary/10">
                  <h3 className="font-bold text-base text-foreground mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    {analysis.headline}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{analysis.executiveSummary}</p>
                </div>

                {/* Market Leader vs Challengers */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-border/40 bg-card">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Market Leader Position
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Strengths</p>
                        {analysis.marketLeaderAnalysis.strengths.map((s, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs text-foreground/80 mb-1">
                            <TrendingUp className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Vulnerabilities</p>
                        {analysis.marketLeaderAnalysis.vulnerabilities.map((v, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs text-foreground/80 mb-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span>{v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 rounded-lg bg-primary/5 border border-primary/10 mt-2">
                        <p className="text-xs text-primary font-medium">
                          💡 {analysis.marketLeaderAnalysis.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-border/40 bg-card">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Sword className="h-4 w-4 text-accent-foreground" />
                      Challenger Playbook
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                      {analysis.challengerStrategy.insight}
                    </p>
                    <div className="space-y-1.5">
                      {analysis.challengerStrategy.opportunities.map((opp, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                          <Target className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                          <span>{opp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Product Mix Insights */}
                {analysis.productMixInsights && analysis.productMixInsights.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Product Mix & Distribution Insights
                    </h4>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {analysis.productMixInsights.map((insight, i) => (
                        <div key={i} className="p-3 rounded-lg border border-border/30 bg-muted/20">
                          <p className="text-xs font-semibold text-foreground mb-1">{insight.title}</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Correlation Verdict */}
                <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-accent-foreground" />
                    Distribution, Affiliations & Market Share Verdict
                  </h4>
                  <p className="text-xs text-accent-foreground/80 leading-relaxed">
                    {analysis.correlationVerdict}
                  </p>
                </div>

                {/* Recommendations & Risks */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                      Strategic Recommendations
                    </h4>
                    {analysis.strategicRecommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                        </div>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                      Risk Factors
                    </h4>
                    {analysis.riskFactors.map((risk, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive/60 mt-0.5 flex-shrink-0" />
                        <span>{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground/50 text-center pt-2">
                  AI-generated analysis • {year} Q{quarter} • Product mix, distribution & competitive strategy
                </p>
              </div>
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
