import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ProfitabilityHeatmapProps {
  metrics: Array<{
    insurer_id: string;
    insurer_name: string;
    gross_premium: number | null;
    profit_after_tax: number | null;
    expense_ratio: number | null;
    claims_ratio: number | null;
  }>;
}

interface HeatmapCell {
  insurer_name: string;
  insurer_id: string;
  profitMargin: number;
  profit: number;
  premium: number;
  intensity: number;
}

export function ProfitabilityHeatmap({ metrics }: ProfitabilityHeatmapProps) {
  const heatmapData = useMemo((): HeatmapCell[] => {
    const calculated = metrics
      .filter(m => m.gross_premium && m.gross_premium > 0)
      .map(m => {
        const profit = m.profit_after_tax || 0;
        const premium = m.gross_premium || 1;
        const profitMargin = (profit / premium) * 100;
        
        return {
          insurer_name: m.insurer_name,
          insurer_id: m.insurer_id,
          profitMargin,
          profit,
          premium,
          intensity: 0,
        };
      })
      .sort((a, b) => b.profitMargin - a.profitMargin);

    if (calculated.length > 0) {
      const margins = calculated.map(c => c.profitMargin);
      const minMargin = Math.min(...margins);
      const maxMargin = Math.max(...margins);
      const range = maxMargin - minMargin || 1;

      calculated.forEach(cell => {
        cell.intensity = (cell.profitMargin - minMargin) / range;
      });
    }

    return calculated;
  }, [metrics]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1e9) return `GH₵${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
    return `GH₵${value.toLocaleString()}`;
  };

  const getHeatColor = (margin: number) => {
    if (margin > 15) return 'bg-emerald-500/90 text-white';
    if (margin > 10) return 'bg-emerald-400/80 text-white';
    if (margin > 5) return 'bg-green-400/70 text-white';
    if (margin > 0) return 'bg-lime-400/60 text-slate-900';
    if (margin > -5) return 'bg-amber-400/70 text-slate-900';
    if (margin > -10) return 'bg-orange-500/80 text-white';
    return 'bg-red-500/90 text-white';
  };

  const avgMargin = heatmapData.length > 0
    ? heatmapData.reduce((sum, d) => sum + d.profitMargin, 0) / heatmapData.length
    : 0;

  const profitable = heatmapData.filter(d => d.profitMargin > 0).length;
  const unprofitable = heatmapData.filter(d => d.profitMargin <= 0).length;

  const gridCols = 4;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Profitability Heatmap
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[280px]">
                    <div className="space-y-2 text-xs">
                      <p className="font-semibold">What does this show?</p>
                      <p>Visualizes each insurer's <strong>Profit Margin</strong> as a color-coded heatmap.</p>
                      <div className="space-y-1 pt-1 border-t">
                        <p><strong>Profit Margin Formula:</strong></p>
                        <p className="font-mono bg-muted px-1 rounded">(Profit After Tax ÷ Gross Premium) × 100</p>
                      </div>
                      <div className="space-y-1 pt-1 border-t">
                        <p><strong>Color Scale:</strong></p>
                        <p>🟢 Green = High profit margin ({">"} 5%)</p>
                        <p>🟡 Yellow/Amber = Low or break-even</p>
                        <p>🔴 Red = Operating at a loss</p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>Profit margins by insurer</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300">
              <TrendingUp className="h-3 w-3" />
              {profitable} Profitable
            </Badge>
            <Badge variant="outline" className="gap-1 text-red-600 border-red-300">
              <TrendingDown className="h-3 w-3" />
              {unprofitable} Loss
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {heatmapData.length > 0 ? (
          <>
            {/* Summary Stats */}
            <div className="flex items-center justify-center gap-6 mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Avg Margin</p>
                <p className={cn(
                  "text-lg font-bold",
                  avgMargin >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {avgMargin >= 0 ? '+' : ''}{avgMargin.toFixed(1)}%
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Top Performer</p>
                <p className="text-sm font-semibold text-emerald-600 truncate max-w-[120px]">
                  {heatmapData[0]?.insurer_name.split(' ')[0]}
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Needs Attention</p>
                <p className="text-sm font-semibold text-red-600 truncate max-w-[120px]">
                  {heatmapData[heatmapData.length - 1]?.insurer_name.split(' ')[0]}
                </p>
              </div>
            </div>

            {/* Heatmap Grid */}
            <TooltipProvider>
              <div 
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
              >
                {heatmapData.map((cell) => (
                  <Tooltip key={cell.insurer_id}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "aspect-square rounded-md flex flex-col items-center justify-center cursor-pointer",
                          "transition-all duration-200 hover:scale-105 hover:shadow-lg",
                          getHeatColor(cell.profitMargin)
                        )}
                      >
                        <span className="text-[10px] font-medium text-center px-0.5 leading-tight truncate w-full">
                          {cell.insurer_name.split(' ')[0].slice(0, 8)}
                        </span>
                        <span className="text-xs font-bold">
                          {cell.profitMargin >= 0 ? '+' : ''}{cell.profitMargin.toFixed(0)}%
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <div className="space-y-1.5">
                        <p className="font-semibold text-sm">{cell.insurer_name}</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <span className="text-muted-foreground">Profit Margin:</span>
                          <span className={cn(
                            "font-medium text-right",
                            cell.profitMargin >= 0 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {cell.profitMargin >= 0 ? '+' : ''}{cell.profitMargin.toFixed(1)}%
                          </span>
                          <span className="text-muted-foreground">Profit After Tax:</span>
                          <span className="font-medium text-right">{formatCurrency(cell.profit)}</span>
                          <span className="text-muted-foreground">Gross Premium:</span>
                          <span className="font-medium text-right">{formatCurrency(cell.premium)}</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-1">
              <span className="text-[10px] text-muted-foreground mr-1">Loss</span>
              <div className="w-4 h-3 rounded-sm bg-red-500/90" />
              <div className="w-4 h-3 rounded-sm bg-orange-500/80" />
              <div className="w-4 h-3 rounded-sm bg-amber-400/70" />
              <div className="w-4 h-3 rounded-sm bg-lime-400/60" />
              <div className="w-4 h-3 rounded-sm bg-green-400/70" />
              <div className="w-4 h-3 rounded-sm bg-emerald-400/80" />
              <div className="w-4 h-3 rounded-sm bg-emerald-500/90" />
              <span className="text-[10px] text-muted-foreground ml-1">Profit</span>
            </div>
          </>
        ) : (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            No profitability data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
