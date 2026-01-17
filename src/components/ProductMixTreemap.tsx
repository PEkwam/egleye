import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ProductMixTreemapProps {
  metrics: Array<{
    insurer_id: string;
    insurer_name: string;
    term_premium: number | null;
    whole_life: number | null;
    endowment: number | null;
    credit_life: number | null;
    universal_life: number | null;
    group_policies: number | null;
    gross_premium: number | null;
  }>;
}

interface InsurerProductMix {
  insurer_id: string;
  insurer_name: string;
  totalPremium: number;
  products: {
    name: string;
    value: number;
    percentage: number;
    color: string;
  }[];
}

const PRODUCT_CONFIG = {
  'Term Life': { color: 'bg-blue-500', textColor: 'text-blue-600' },
  'Whole Life': { color: 'bg-emerald-500', textColor: 'text-emerald-600' },
  'Endowment': { color: 'bg-purple-500', textColor: 'text-purple-600' },
  'Credit Life': { color: 'bg-amber-500', textColor: 'text-amber-600' },
  'Universal Life': { color: 'bg-rose-500', textColor: 'text-rose-600' },
  'Group Policies': { color: 'bg-cyan-500', textColor: 'text-cyan-600' },
};

export function ProductMixTreemap({ metrics }: ProductMixTreemapProps) {
  const [isOpen, setIsOpen] = useState(true);

  const insurerProductData = useMemo((): InsurerProductMix[] => {
    return metrics
      .filter(m => m.gross_premium && m.gross_premium > 0)
      .map(m => {
        const products = [
          { name: 'Term Life', value: m.term_premium || 0 },
          { name: 'Whole Life', value: m.whole_life || 0 },
          { name: 'Endowment', value: m.endowment || 0 },
          { name: 'Credit Life', value: m.credit_life || 0 },
          { name: 'Universal Life', value: m.universal_life || 0 },
          { name: 'Group Policies', value: m.group_policies || 0 },
        ].filter(p => p.value > 0);

        const totalProducts = products.reduce((sum, p) => sum + p.value, 0);

        return {
          insurer_id: m.insurer_id,
          insurer_name: m.insurer_name,
          totalPremium: m.gross_premium || 0,
          products: products
            .map(p => ({
              ...p,
              percentage: totalProducts > 0 ? (p.value / totalProducts) * 100 : 0,
              color: PRODUCT_CONFIG[p.name as keyof typeof PRODUCT_CONFIG]?.color || 'bg-gray-500',
            }))
            .sort((a, b) => b.percentage - a.percentage),
        };
      })
      .sort((a, b) => b.totalPremium - a.totalPremium);
  }, [metrics]);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `GH₵${(value / 1e3).toFixed(0)}K`;
    return `GH₵${value.toLocaleString()}`;
  };

  // Get top product for each insurer
  const getTopProduct = (products: InsurerProductMix['products']) => {
    if (products.length === 0) return null;
    return products[0];
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-500" />
                  Product Mix by Insurer
                </CardTitle>
                <CardDescription>Premium breakdown by product type for each insurer</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {insurerProductData.length} Insurers
                </Badge>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {insurerProductData.length > 0 ? (
              <>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b">
                  {Object.entries(PRODUCT_CONFIG).map(([name, config]) => (
                    <div key={name} className="flex items-center gap-1.5">
                      <div className={cn("w-3 h-3 rounded-sm", config.color)} />
                      <span className="text-xs text-muted-foreground">{name}</span>
                    </div>
                  ))}
                </div>

                {/* Insurer List */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {insurerProductData.map((insurer, index) => {
                    const topProduct = getTopProduct(insurer.products);
                    
                    return (
                      <div 
                        key={insurer.insurer_id} 
                        className="p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors"
                      >
                        {/* Insurer Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground w-5">
                              #{index + 1}
                            </span>
                            <div>
                              <h4 className="font-semibold text-sm leading-tight">
                                {insurer.insurer_name}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(insurer.totalPremium)} gross premium
                              </p>
                            </div>
                          </div>
                          {topProduct && (
                            <Badge variant="outline" className="text-xs">
                              Top: {topProduct.name} ({topProduct.percentage.toFixed(0)}%)
                            </Badge>
                          )}
                        </div>

                        {/* Stacked Progress Bar */}
                        <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted mb-2">
                          {insurer.products.map((product) => (
                            <div
                              key={product.name}
                              className={cn("h-full transition-all", product.color)}
                              style={{ width: `${product.percentage}%` }}
                              title={`${product.name}: ${product.percentage.toFixed(1)}%`}
                            />
                          ))}
                        </div>

                        {/* Product Breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                          {insurer.products.map((product) => (
                            <div key={product.name} className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5">
                                <div className={cn("w-2 h-2 rounded-sm", product.color)} />
                                <span className="text-muted-foreground truncate">{product.name}</span>
                              </span>
                              <span className="font-medium ml-1">
                                {product.percentage.toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                <Layers className="h-8 w-8 mb-2 opacity-50" />
                <p>No product data available</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
