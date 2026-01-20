import { Sparkles, Award, Lightbulb, ChevronRight, AlertTriangle, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIAnalysis, MetricConfig } from './types';
import { type GhanaInsurer } from '@/types/insurers';

interface AIInsightsTabProps {
  selectedInsurers: GhanaInsurer[];
  aiAnalysis: AIAnalysis | undefined;
  isLoading: boolean;
  onGenerateAnalysis: () => void;
  metricsConfig: MetricConfig[];
  historicalDataCount: number;
}

export function AIInsightsTab({
  selectedInsurers,
  aiAnalysis,
  isLoading,
  onGenerateAnalysis,
  metricsConfig,
  historicalDataCount,
}: AIInsightsTabProps) {
  if (isLoading) {
    return (
      <div className="p-8 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 flex flex-col items-center justify-center">
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative p-4 rounded-full bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>
        <h4 className="font-semibold text-lg mb-1">Generating AI Analysis</h4>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Analyzing {selectedInsurers.length} insurers across {metricsConfig.length} metrics...
        </p>
      </div>
    );
  }

  if (aiAnalysis) {
    return (
      <div className="space-y-4">
        {/* Executive Summary */}
        <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">AI Executive Summary</h4>
              <p className="text-sm text-muted-foreground">Powered by advanced AI analysis</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onGenerateAnalysis}
              className="gap-1 text-xs"
            >
              <Loader2 className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <p className="text-sm leading-relaxed">{aiAnalysis.summary}</p>
        </div>

        {/* Market Leader */}
        {aiAnalysis.leader && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                  Market Leader: {aiAnalysis.leader.name}
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">{aiAnalysis.leader.reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Key Insights */}
        <div className="space-y-3">
          <h5 className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Key Insights
          </h5>
          {aiAnalysis.insights.map((insight, idx) => (
            <div 
              key={idx}
              className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border/40"
            >
              <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm">{insight}</p>
            </div>
          ))}
        </div>

        {/* Risks & Opportunities */}
        <div className="grid md:grid-cols-2 gap-4">
          {aiAnalysis.risks.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
              <h5 className="text-sm font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4" />
                Risk Factors
              </h5>
              <ul className="space-y-2">
                {aiAnalysis.risks.map((risk, idx) => (
                  <li key={idx} className="text-sm text-rose-600 dark:text-rose-300 flex items-start gap-2">
                    <span className="text-rose-400 mt-1">•</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {aiAnalysis.opportunities.length > 0 && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <h5 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4" />
                Opportunities
              </h5>
              <ul className="space-y-2">
                {aiAnalysis.opportunities.map((opp, idx) => (
                  <li key={idx} className="text-sm text-emerald-600 dark:text-emerald-300 flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    {opp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border/40 text-center">
            <p className="text-2xl font-bold text-primary">{selectedInsurers.length}</p>
            <p className="text-xs text-muted-foreground">Companies Compared</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/40 text-center">
            <p className="text-2xl font-bold text-primary">{metricsConfig.length}</p>
            <p className="text-xs text-muted-foreground">Metrics Analyzed</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/40 text-center">
            <p className="text-2xl font-bold text-primary">{historicalDataCount}</p>
            <p className="text-xs text-muted-foreground">Data Points</p>
          </div>
        </div>
      </div>
    );
  }

  // No analysis yet
  return (
    <div className="space-y-4">
      <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">AI-Powered Analysis</h4>
            <p className="text-sm text-muted-foreground">Get expert insights from comparing the selected insurers</p>
          </div>
        </div>
        
        {selectedInsurers.length < 2 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            Select at least 2 insurers to generate AI-powered comparative analysis.
          </p>
        ) : (
          <Button 
            onClick={onGenerateAnalysis} 
            className="w-full gap-2"
            disabled={isLoading}
          >
            <Sparkles className="h-4 w-4" />
            Generate AI Analysis
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border/40 text-center">
          <p className="text-2xl font-bold text-primary">{selectedInsurers.length}</p>
          <p className="text-xs text-muted-foreground">Companies Compared</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border/40 text-center">
          <p className="text-2xl font-bold text-primary">{metricsConfig.length}</p>
          <p className="text-xs text-muted-foreground">Metrics Analyzed</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border/40 text-center">
          <p className="text-2xl font-bold text-primary">{historicalDataCount}</p>
          <p className="text-xs text-muted-foreground">Data Points</p>
        </div>
      </div>
    </div>
  );
}
