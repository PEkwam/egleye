import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown, ChevronUp, Lightbulb, HelpCircle,
  Target, Shuffle, Crown, BarChart3, AlertTriangle,
  RefreshCw, Sparkles, Network, Building2, Clock, Swords
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
  insurance_service_result: number | null;
  claims_ratio: number | null;
  csm: number | null;
  branches: number | null;
  employees: number | null;
  years_in_ghana: number | null;
}

interface StrategicInsightsQAProps {
  metrics: MetricRow[];
  year: number | null;
  quarter: number | null;
}

interface AIQuestion {
  id: string;
  question: string;
  summary: string;
  dataPoints: string[];
  implication: string;
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

const QUESTION_ICONS: Record<string, { icon: React.ReactNode; accent: string }> = {
  leader_gaps: {
    icon: <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    accent: "bg-amber-500/10",
  },
  distribution_advantage: {
    icon: <Network className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />,
    accent: "bg-cyan-500/10",
  },
  group_affiliations: {
    icon: <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
    accent: "bg-indigo-500/10",
  },
  niche_specialists: {
    icon: <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
    accent: "bg-emerald-500/10",
  },
  leadership_experience: {
    icon: <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
    accent: "bg-orange-500/10",
  },
  overtaking_strategy: {
    icon: <Swords className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
    accent: "bg-rose-500/10",
  },
  diversification_correlation: {
    icon: <Shuffle className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
    accent: "bg-blue-500/10",
  },
  most_diversified: {
    icon: <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
    accent: "bg-purple-500/10",
  },
  growth_opportunities: {
    icon: <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
    accent: "bg-rose-500/10",
  },
};

const DEFAULT_ICON = {
  icon: <HelpCircle className="h-4 w-4 text-primary" />,
  accent: "bg-primary/10",
};

function useStrategicPayload(metrics: MetricRow[], year: number | null, quarter: number | null) {
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
        return {
          product: label,
          leader: leader.insurer_name,
          value: (leader[key] as number) || 0,
          marketLeaderValue: (marketLeader[key] as number) || 0,
        };
      })
      .filter(pl => pl.value > 0);

    const leaderDominanceCount = productLeaders.filter(pl => pl.leader === marketLeader.insurer_name).length;
    const gapsCount = productLeaders.length - leaderDominanceCount;

    const nicheSpecialists = productLeaders
      .filter(pl => pl.leader !== marketLeader.insurer_name)
      .map(pl => ({ insurer: pl.leader, product: pl.product, value: pl.value }));

    const diversificationTop5 = validMetrics.map(m => {
      const productValues = PRODUCT_KEYS.map(pk => (m[pk.key] as number) || 0).filter(v => v > 0);
      const total = productValues.reduce((s, v) => s + v, 0);
      if (total === 0) return { name: m.insurer_name, score: 0, count: 0 };
      const shares = productValues.map(v => v / total);
      const hhi = shares.reduce((s, sh) => s + sh * sh, 0);
      return { name: m.insurer_name, score: Math.round((1 - hhi) * 100), count: productValues.length };
    }).sort((a, b) => b.score - a.score).slice(0, 5);

    const correlationTop5 = validMetrics.map(m => ({
      name: m.insurer_name,
      marketShare: m.market_share || 0,
      activeProducts: PRODUCT_KEYS.filter(pk => ((m[pk.key] as number) || 0) > 0).length,
    })).sort((a, b) => b.marketShare - a.marketShare).slice(0, 5);

    const underservedProducts = PRODUCT_KEYS
      .filter(pk => metrics.some(m => ((m[pk.key] as number) || 0) > 0))
      .map(pk => {
        const values = metrics.map(m => (m[pk.key] as number) || 0);
        return {
          product: pk.label,
          activeInsurers: values.filter(v => v > 0).length,
          totalPremium: values.reduce((s, v) => s + v, 0),
        };
      })
      .sort((a, b) => a.activeInsurers - b.activeInsurers)
      .slice(0, 5);

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
      year,
      quarter,
      marketLeader: {
        name: marketLeader.insurer_name,
        premium: marketLeader.gross_premium || 0,
        marketShare: marketLeader.market_share || 0,
      },
      insurerCount: validMetrics.length,
      productLeaders,
      gapsCount,
      leaderDominanceCount,
      totalCategories: productLeaders.length,
      nicheSpecialists,
      diversificationTop5,
      correlationTop5,
      underservedProducts,
      insurerProfiles,
    };
  }, [metrics, year, quarter]);
}

interface QuestionCardProps {
  question: AIQuestion;
  icon: React.ReactNode;
  accentClass: string;
  isOpen: boolean;
  onToggle: () => void;
}

function QuestionCard({ question, icon, accentClass, isOpen, onToggle }: QuestionCardProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className={cn(
          "group cursor-pointer rounded-xl border p-4 transition-all duration-200",
          "hover:shadow-md hover:border-primary/30",
          isOpen ? "bg-card border-primary/20 shadow-sm" : "bg-card/60 border-border/40"
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
              accentClass
            )}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm leading-tight text-foreground group-hover:text-primary transition-colors">
                {question.question}
              </h4>
              {!isOpen && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{question.summary}</p>
              )}
            </div>
            <div className="flex-shrink-0 mt-0.5">
              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-2 space-y-3">
          <p className="text-sm text-foreground/90 leading-relaxed">{question.summary}</p>
          <div className="space-y-1.5">
            {question.dataPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 flex-shrink-0" />
                <span>{point}</span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-accent/30 border border-accent/20">
            <Lightbulb className="h-3.5 w-3.5 text-accent-foreground/70 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-accent-foreground/80 leading-relaxed italic">{question.implication}</p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function StrategicInsightsQA({ metrics, year, quarter }: StrategicInsightsQAProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const payload = useStrategicPayload(metrics, year, quarter);

  const { data: aiQuestions, isLoading, error, refetch, isFetching } = useQuery<AIQuestion[]>({
    queryKey: ['strategic-qa', year, quarter],
    queryFn: async () => {
      if (!payload) throw new Error('No data');
      const { data, error } = await supabase.functions.invoke('strategic-qa', {
        body: { strategicData: payload },
      });
      if (error) {
        if (error.message?.includes('429')) toast.error('AI rate limit reached. Try again shortly.');
        else if (error.message?.includes('402')) toast.error('AI credits exhausted.');
        throw error;
      }
      return data.analysis.questions || [];
    },
    enabled: !!payload,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  if (!payload) return null;

  const toggleQuestion = (index: number) => {
    setOpenQuestion(prev => prev === index ? null : index);
  };

  return (
    <Card className="border-primary/10">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <HelpCircle className="h-4 w-4 text-primary" />
                  </div>
                  Strategic Market Questions
                  <Badge variant="outline" className="text-[10px] border-primary/20 text-primary font-normal">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  AI analysis of competitive strategy, distribution, affiliations & product positioning • {year} Q{quarter}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {aiQuestions && (
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
                <Badge variant="outline" className="text-xs font-mono border-primary/20 text-primary">
                  {aiQuestions?.length || '...'} Insights
                </Badge>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-2">
            {isLoading || isFetching ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <div key={i} className="rounded-xl border border-border/40 p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-9 h-9 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-center text-xs text-muted-foreground pt-1">
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  Analyzing competitive strategies, distribution networks & market positioning...
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 mx-auto text-destructive/60 mb-2" />
                <p className="text-sm text-muted-foreground">Failed to generate strategic insights</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                </Button>
              </div>
            ) : aiQuestions && aiQuestions.length > 0 ? (
              <>
                {aiQuestions.map((q, i) => {
                  const style = QUESTION_ICONS[q.id] || DEFAULT_ICON;
                  return (
                    <QuestionCard
                      key={q.id || i}
                      question={q}
                      icon={style.icon}
                      accentClass={style.accent}
                      isOpen={openQuestion === i}
                      onToggle={() => toggleQuestion(i)}
                    />
                  );
                })}
                <p className="text-[10px] text-muted-foreground/50 text-center pt-2">
                  AI-generated • {year} Q{quarter} • Analyzing product mix, distribution, affiliations & competitive strategy
                </p>
              </>
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
