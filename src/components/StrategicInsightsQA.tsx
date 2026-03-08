import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown, ChevronUp, Lightbulb, HelpCircle, TrendingUp,
  Target, Shuffle, Crown, BarChart3, AlertTriangle
} from 'lucide-react';

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
}

interface StrategicInsightsQAProps {
  metrics: MetricRow[];
}

interface ProductLeader {
  product: string;
  leader: string;
  value: number;
  marketLeaderValue: number;
  marketLeaderName: string;
}

interface InsightAnswer {
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

const formatCurrency = (value: number) => {
  if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `GH₵${(value / 1e3).toFixed(0)}K`;
  return `GH₵${value.toLocaleString()}`;
};

function useStrategicAnalysis(metrics: MetricRow[]) {
  return useMemo(() => {
    if (!metrics.length) return null;

    const validMetrics = metrics.filter(m => m.gross_premium && m.gross_premium > 0);
    if (!validMetrics.length) return null;

    // Find market leader by gross premium
    const marketLeader = validMetrics.reduce((top, m) =>
      (m.gross_premium || 0) > (top.gross_premium || 0) ? m : top
    , validMetrics[0]);

    // Find leader for each product category
    const productLeaders: ProductLeader[] = PRODUCT_KEYS
      .map(({ key, label }) => {
        const leader = validMetrics.reduce((top, m) =>
          ((m[key] as number) || 0) > ((top[key] as number) || 0) ? m : top
        , validMetrics[0]);
        const leaderValue = (leader[key] as number) || 0;
        const marketLeaderValue = (marketLeader[key] as number) || 0;
        return {
          product: label,
          leader: leader.insurer_name,
          value: leaderValue,
          marketLeaderValue,
          marketLeaderName: marketLeader.insurer_name,
        };
      })
      .filter(pl => pl.value > 0);

    // Products where market leader is NOT the category leader
    const gapsForMarketLeader = productLeaders.filter(
      pl => pl.leader !== marketLeader.insurer_name
    );

    // Concentration: how many product categories does the market leader lead?
    const leaderDominanceCount = productLeaders.filter(
      pl => pl.leader === marketLeader.insurer_name
    ).length;

    // Diversification score per insurer
    const diversificationScores = validMetrics.map(m => {
      const productValues = PRODUCT_KEYS.map(pk => (m[pk.key] as number) || 0).filter(v => v > 0);
      const total = productValues.reduce((s, v) => s + v, 0);
      if (total === 0 || productValues.length === 0) return { name: m.insurer_name, score: 0, count: 0 };
      
      // HHI-based: lower = more diversified
      const shares = productValues.map(v => v / total);
      const hhi = shares.reduce((s, sh) => s + sh * sh, 0);
      const diversification = Math.round((1 - hhi) * 100);
      
      return { name: m.insurer_name, score: diversification, count: productValues.length };
    }).sort((a, b) => b.score - a.score);

    // Niche specialists: insurers that are #1 in a product but NOT market leader
    const nicheSpecialists = productLeaders
      .filter(pl => pl.leader !== marketLeader.insurer_name)
      .map(pl => ({ insurer: pl.leader, product: pl.product, value: pl.value }));

    // Correlation analysis: does higher market share = more products?
    const correlationData = validMetrics.map(m => {
      const activeProducts = PRODUCT_KEYS.filter(pk => ((m[pk.key] as number) || 0) > 0).length;
      return {
        name: m.insurer_name,
        marketShare: m.market_share || 0,
        activeProducts,
        premium: m.gross_premium || 0,
      };
    }).sort((a, b) => b.marketShare - a.marketShare);

    return {
      marketLeader,
      productLeaders,
      gapsForMarketLeader,
      leaderDominanceCount,
      totalProductCategories: productLeaders.length,
      diversificationScores,
      nicheSpecialists,
      correlationData,
    };
  }, [metrics]);
}

interface QuestionCardProps {
  icon: React.ReactNode;
  question: string;
  answer: InsightAnswer;
  accentClass: string;
  isOpen: boolean;
  onToggle: () => void;
}

function QuestionCard({ icon, question, answer, accentClass, isOpen, onToggle }: QuestionCardProps) {
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
                {question}
              </h4>
              {!isOpen && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{answer.summary}</p>
              )}
            </div>
            <div className="flex-shrink-0 mt-0.5">
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-2 space-y-3">
          <p className="text-sm text-foreground/90 leading-relaxed">{answer.summary}</p>
          
          <div className="space-y-1.5">
            {answer.dataPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 flex-shrink-0" />
                <span>{point}</span>
              </div>
            ))}
          </div>
          
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-accent/30 border border-accent/20">
            <Lightbulb className="h-3.5 w-3.5 text-accent-foreground/70 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-accent-foreground/80 leading-relaxed italic">{answer.implication}</p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function StrategicInsightsQA({ metrics }: StrategicInsightsQAProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const analysis = useStrategicAnalysis(metrics);

  if (!analysis) return null;

  const {
    marketLeader, gapsForMarketLeader, leaderDominanceCount,
    totalProductCategories, diversificationScores, nicheSpecialists, correlationData,
  } = analysis;

  const toggleQuestion = (index: number) => {
    setOpenQuestion(prev => prev === index ? null : index);
  };

  const questions: { icon: React.ReactNode; question: string; answer: InsightAnswer; accentClass: string }[] = [
    {
      icon: <Crown className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />,
      accentClass: "bg-amber-500/10",
      question: `Why doesn't ${marketLeader.insurer_name} lead in every product category?`,
      answer: {
        summary: `${marketLeader.insurer_name} leads the market with ${formatCurrency(marketLeader.gross_premium || 0)} in gross premium, but only dominates ${leaderDominanceCount} out of ${totalProductCategories} product categories. This is a common pattern — market leadership comes from volume concentration, not universal dominance.`,
        dataPoints: [
          ...gapsForMarketLeader.slice(0, 4).map(g =>
            `In ${g.product}, ${g.leader} leads with ${formatCurrency(g.value)} vs ${marketLeader.insurer_name}'s ${formatCurrency(g.marketLeaderValue)}`
          ),
          `${marketLeader.insurer_name} leads in ${leaderDominanceCount}/${totalProductCategories} categories — ${Math.round((leaderDominanceCount / totalProductCategories) * 100)}% dominance rate`,
        ],
        implication: "Market share leadership is typically built on 2-3 high-volume products rather than across-the-board dominance. This creates opportunities for niche specialists.",
      },
    },
    {
      icon: <Target className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />,
      accentClass: "bg-emerald-500/10",
      question: "Which insurers are niche specialists beating the market leader?",
      answer: {
        summary: nicheSpecialists.length > 0
          ? `${nicheSpecialists.length} specialist${nicheSpecialists.length > 1 ? 's' : ''} outperform the market leader in specific product categories — proving that focused strategy can beat scale.`
          : `The market leader currently dominates all active product categories, indicating either strong diversification or limited competition in niche segments.`,
        dataPoints: nicheSpecialists.length > 0
          ? nicheSpecialists.slice(0, 5).map(ns =>
              `${ns.insurer} leads in ${ns.product} with ${formatCurrency(ns.value)}`
            )
          : [`${marketLeader.insurer_name} leads across all ${totalProductCategories} categories`],
        implication: nicheSpecialists.length > 0
          ? "Niche specialists often achieve higher profitability in their focus areas despite lower overall market share. This suggests strategic depth beats breadth."
          : "A single-leader market may indicate consolidation trends or barriers to entry in specialized products.",
      },
    },
    {
      icon: <Shuffle className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />,
      accentClass: "bg-blue-500/10",
      question: "Does product diversification correlate with higher market share?",
      answer: {
        summary: (() => {
          const top3 = correlationData.slice(0, 3);
          const avgProductsTop = Math.round(top3.reduce((s, d) => s + d.activeProducts, 0) / top3.length);
          const bottom3 = correlationData.slice(-3);
          const avgProductsBottom = Math.round(bottom3.reduce((s, d) => s + d.activeProducts, 0) / bottom3.length);
          return `Top 3 insurers by market share offer an average of ${avgProductsTop} product categories vs ${avgProductsBottom} for the bottom 3. ${avgProductsTop > avgProductsBottom ? 'Diversification and market share appear positively correlated.' : 'Diversification alone doesn\'t guarantee market share — execution matters more.'}`;
        })(),
        dataPoints: correlationData.slice(0, 5).map(d =>
          `${d.name}: ${d.marketShare?.toFixed(1)}% market share, ${d.activeProducts} active products`
        ),
        implication: "While offering more products can drive revenue, the most profitable insurers often excel by being exceptional in fewer categories rather than average across many.",
      },
    },
    {
      icon: <BarChart3 className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />,
      accentClass: "bg-purple-500/10",
      question: "Who has the most diversified product mix?",
      answer: {
        summary: diversificationScores[0]
          ? `${diversificationScores[0].name} has the most balanced product mix (${diversificationScores[0].score}% diversification score across ${diversificationScores[0].count} products), while ${diversificationScores[diversificationScores.length - 1]?.name} is the most concentrated.`
          : "Insufficient data to calculate diversification scores.",
        dataPoints: diversificationScores.slice(0, 5).map((d, i) =>
          `${i + 1}. ${d.name}: ${d.score}% diversification across ${d.count} product${d.count !== 1 ? 's' : ''}`
        ),
        implication: "A balanced product mix reduces risk from regulatory changes or market shifts in any single segment, but may dilute competitive advantage in high-growth areas.",
      },
    },
    {
      icon: <AlertTriangle className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400" />,
      accentClass: "bg-rose-500/10",
      question: "What product gaps represent the biggest growth opportunities?",
      answer: {
        summary: (() => {
          const underserved = PRODUCT_KEYS.filter(pk => {
            const total = metrics.reduce((s, m) => s + ((m[pk.key] as number) || 0), 0);
            return total > 0;
          }).map(pk => {
            const values = metrics.map(m => (m[pk.key] as number) || 0);
            const active = values.filter(v => v > 0).length;
            const total = values.reduce((s, v) => s + v, 0);
            return { product: pk.label, activeInsurers: active, totalPremium: total };
          }).sort((a, b) => a.activeInsurers - b.activeInsurers);

          const leastContested = underserved[0];
          return leastContested
            ? `${leastContested.product} has the fewest competitors (only ${leastContested.activeInsurers} insurers active), representing a potential blue ocean for new entrants or expansions.`
            : "All product categories appear evenly contested.";
        })(),
        dataPoints: (() => {
          return PRODUCT_KEYS.filter(pk => {
            return metrics.some(m => ((m[pk.key] as number) || 0) > 0);
          }).map(pk => {
            const values = metrics.map(m => (m[pk.key] as number) || 0);
            const active = values.filter(v => v > 0).length;
            const total = values.reduce((s, v) => s + v, 0);
            return { product: pk.label, activeInsurers: active, totalPremium: total };
          })
          .sort((a, b) => a.activeInsurers - b.activeInsurers)
          .slice(0, 5)
          .map(d => `${d.product}: ${d.activeInsurers} active insurer${d.activeInsurers !== 1 ? 's' : ''}, ${formatCurrency(d.totalPremium)} total premium`);
        })(),
        implication: "Low competition + growing demand signals a strategic opportunity. Insurers entering underserved categories early can establish dominance before the market matures.",
      },
    },
  ];

  return (
    <Card className="border-primary/10">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <HelpCircle className="h-4.5 w-4.5 text-primary" />
                  </div>
                  Strategic Market Questions
                </CardTitle>
                <CardDescription className="mt-1">
                  Click each question to explore data-driven answers about product mix & market share
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono border-primary/20 text-primary">
                  {questions.length} Insights
                </Badge>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-2">
            {questions.map((q, i) => (
              <QuestionCard
                key={i}
                icon={q.icon}
                question={q.question}
                answer={q.answer}
                accentClass={q.accentClass}
                isOpen={openQuestion === i}
                onToggle={() => toggleQuestion(i)}
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
