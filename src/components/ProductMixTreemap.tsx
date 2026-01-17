import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ProductMixTreemapProps {
  metrics: Array<{
    insurer_name: string;
    term_premium: number | null;
    whole_life: number | null;
    endowment: number | null;
    credit_life: number | null;
    universal_life: number | null;
    group_policies: number | null;
  }>;
}

interface ProductData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

const PRODUCT_COLORS = {
  'Term Life': 'bg-blue-500',
  'Whole Life': 'bg-emerald-500',
  'Endowment': 'bg-purple-500',
  'Credit Life': 'bg-amber-500',
  'Universal Life': 'bg-rose-500',
  'Group Policies': 'bg-cyan-500',
};

const PRODUCT_BG_COLORS = {
  'Term Life': 'from-blue-500/90 to-blue-600/90',
  'Whole Life': 'from-emerald-500/90 to-emerald-600/90',
  'Endowment': 'from-purple-500/90 to-purple-600/90',
  'Credit Life': 'from-amber-500/90 to-amber-600/90',
  'Universal Life': 'from-rose-500/90 to-rose-600/90',
  'Group Policies': 'from-cyan-500/90 to-cyan-600/90',
};

export function ProductMixTreemap({ metrics }: ProductMixTreemapProps) {
  const productData = useMemo((): ProductData[] => {
    const totals = {
      'Term Life': 0,
      'Whole Life': 0,
      'Endowment': 0,
      'Credit Life': 0,
      'Universal Life': 0,
      'Group Policies': 0,
    };

    metrics.forEach(m => {
      totals['Term Life'] += m.term_premium || 0;
      totals['Whole Life'] += m.whole_life || 0;
      totals['Endowment'] += m.endowment || 0;
      totals['Credit Life'] += m.credit_life || 0;
      totals['Universal Life'] += m.universal_life || 0;
      totals['Group Policies'] += m.group_policies || 0;
    });

    const total = Object.values(totals).reduce((sum, v) => sum + v, 0);

    return Object.entries(totals)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: PRODUCT_COLORS[name as keyof typeof PRODUCT_COLORS],
        percentage: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [metrics]);

  const totalPremium = productData.reduce((sum, p) => sum + p.value, 0);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
    return `GH₵${value.toLocaleString()}`;
  };

  // Calculate treemap layout
  const getTreemapLayout = () => {
    if (productData.length === 0) return [];
    
    const sorted = [...productData];
    const layout: Array<{ 
      name: string; 
      value: number; 
      percentage: number;
      width: number; 
      height: number; 
      x: number; 
      y: number;
      bgGradient: string;
    }> = [];

    // Simple treemap: first item takes left half, rest stack on right
    if (sorted.length === 1) {
      layout.push({
        ...sorted[0],
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        bgGradient: PRODUCT_BG_COLORS[sorted[0].name as keyof typeof PRODUCT_BG_COLORS],
      });
    } else if (sorted.length === 2) {
      layout.push({
        ...sorted[0],
        width: 60,
        height: 100,
        x: 0,
        y: 0,
        bgGradient: PRODUCT_BG_COLORS[sorted[0].name as keyof typeof PRODUCT_BG_COLORS],
      });
      layout.push({
        ...sorted[1],
        width: 40,
        height: 100,
        x: 60,
        y: 0,
        bgGradient: PRODUCT_BG_COLORS[sorted[1].name as keyof typeof PRODUCT_BG_COLORS],
      });
    } else {
      // First takes ~50% left
      const firstPct = Math.max(35, Math.min(55, sorted[0].percentage));
      layout.push({
        ...sorted[0],
        width: firstPct,
        height: 100,
        x: 0,
        y: 0,
        bgGradient: PRODUCT_BG_COLORS[sorted[0].name as keyof typeof PRODUCT_BG_COLORS],
      });

      // Stack remaining on right
      const remaining = sorted.slice(1);
      const rightWidth = 100 - firstPct;
      let currentY = 0;
      
      remaining.forEach((item, index) => {
        const itemHeight = (item.percentage / remaining.reduce((s, i) => s + i.percentage, 0)) * 100;
        layout.push({
          ...item,
          width: rightWidth,
          height: itemHeight,
          x: firstPct,
          y: currentY,
          bgGradient: PRODUCT_BG_COLORS[item.name as keyof typeof PRODUCT_BG_COLORS],
        });
        currentY += itemHeight;
      });
    }

    return layout;
  };

  const treemapLayout = getTreemapLayout();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-500" />
              Product Mix Distribution
            </CardTitle>
            <CardDescription>Premium breakdown by product type</CardDescription>
          </div>
          <Badge variant="secondary" className="font-mono">
            {formatCurrency(totalPremium)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {productData.length > 0 ? (
          <>
            {/* Treemap Visualization */}
            <div className="relative h-64 w-full rounded-lg overflow-hidden border">
              <TooltipProvider>
                {treemapLayout.map((item) => (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "absolute transition-all duration-300 hover:brightness-110 cursor-pointer",
                          "flex flex-col items-center justify-center text-white font-medium",
                          "bg-gradient-to-br",
                          item.bgGradient
                        )}
                        style={{
                          left: `${item.x}%`,
                          top: `${item.y}%`,
                          width: `${item.width}%`,
                          height: `${item.height}%`,
                        }}
                      >
                        {item.width > 20 && item.height > 15 && (
                          <>
                            <span className="text-xs sm:text-sm font-semibold text-center px-1 drop-shadow-md">
                              {item.name}
                            </span>
                            <span className="text-lg sm:text-xl font-bold drop-shadow-md">
                              {item.percentage.toFixed(1)}%
                            </span>
                          </>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs">{formatCurrency(item.value)}</p>
                        <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}% of total</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              {productData.map((product) => (
                <div key={product.name} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-sm", product.color)} />
                  <span className="text-xs text-muted-foreground">{product.name}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <Info className="h-8 w-8 mb-2 opacity-50" />
            <p>No product data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
