import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  termLife: number;
  wholeLife: number;
  endowment: number;
  creditLife: number;
  universalLife: number;
  groupPolicies: number;
  topProduct: string;
}

const PRODUCT_COLORS = {
  'Term Life': 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  'Whole Life': 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  'Endowment': 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  'Credit Life': 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  'Universal Life': 'bg-rose-500/20 text-rose-700 dark:text-rose-400',
  'Group Policies': 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400',
};

const PRODUCT_TOOLTIPS = {
  'Term': 'Term Life: Coverage for a specific period (e.g., 10, 20, 30 years). Pays out only if death occurs during the term.',
  'Whole': 'Whole Life: Permanent coverage with a savings component. Builds cash value over time.',
  'Endow': 'Endowment: Combines insurance with savings. Pays lump sum at maturity or on death.',
  'Credit': 'Credit Life: Pays off outstanding debt (loans, mortgages) if the borrower dies.',
  'Univ': 'Universal Life: Flexible permanent insurance with adjustable premiums and death benefits.',
  'Group': 'Group Policies: Coverage for groups (employers, associations) under a single policy.',
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
        ];

        const topProduct = products.reduce((max, p) => p.value > max.value ? p : max, products[0]);

        return {
          insurer_id: m.insurer_id,
          insurer_name: m.insurer_name,
          totalPremium: m.gross_premium || 0,
          termLife: m.term_premium || 0,
          wholeLife: m.whole_life || 0,
          endowment: m.endowment || 0,
          creditLife: m.credit_life || 0,
          universalLife: m.universal_life || 0,
          groupPolicies: m.group_policies || 0,
          topProduct: topProduct.value > 0 ? topProduct.name : '-',
        };
      })
      .sort((a, b) => b.totalPremium - a.totalPremium);
  }, [metrics]);

  const formatCurrency = (value: number) => {
    if (value === 0) return '-';
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const getCellStyle = (value: number, total: number) => {
    if (value === 0) return '';
    const percentage = (value / total) * 100;
    if (percentage >= 40) return 'font-bold';
    if (percentage >= 20) return 'font-semibold';
    return '';
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[300px]">
                        <div className="space-y-2 text-xs">
                          <p className="font-semibold">What does this show?</p>
                          <p>Breaks down each insurer's <strong>Gross Written Premium</strong> by product category.</p>
                          <div className="space-y-1 pt-1 border-t">
                            <p className="font-semibold">Product Types:</p>
                            <p>• <strong>Term:</strong> Fixed-period coverage</p>
                            <p>• <strong>Whole:</strong> Lifetime coverage + savings</p>
                            <p>• <strong>Endowment:</strong> Insurance + investment</p>
                            <p>• <strong>Credit:</strong> Loan protection</p>
                            <p>• <strong>Universal:</strong> Flexible permanent</p>
                            <p>• <strong>Group:</strong> Employer/association plans</p>
                          </div>
                          <p className="text-muted-foreground pt-1">Values in GH₵ millions. Bold = dominant product.</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <CardDescription>Premium breakdown by product type (GH₵ millions)</CardDescription>
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
              <div className="overflow-x-auto">
                <TooltipProvider>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-8 text-center">#</TableHead>
                        <TableHead className="min-w-[150px]">Insurer</TableHead>
                        <TableHead className="text-right">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help underline decoration-dotted text-blue-600 dark:text-blue-400">
                              Term
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              <p className="text-xs">{PRODUCT_TOOLTIPS['Term']}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-right">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help underline decoration-dotted text-emerald-600 dark:text-emerald-400">
                              Whole
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              <p className="text-xs">{PRODUCT_TOOLTIPS['Whole']}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-right">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help underline decoration-dotted text-purple-600 dark:text-purple-400">
                              Endow
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              <p className="text-xs">{PRODUCT_TOOLTIPS['Endow']}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-right">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help underline decoration-dotted text-amber-600 dark:text-amber-400">
                              Credit
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              <p className="text-xs">{PRODUCT_TOOLTIPS['Credit']}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-right">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help underline decoration-dotted text-rose-600 dark:text-rose-400">
                              Univ
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              <p className="text-xs">{PRODUCT_TOOLTIPS['Univ']}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-right">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help underline decoration-dotted text-cyan-600 dark:text-cyan-400">
                              Group
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              <p className="text-xs">{PRODUCT_TOOLTIPS['Group']}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-center">Top Product</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {insurerProductData.map((insurer, index) => {
                        const productTotal = insurer.termLife + insurer.wholeLife + insurer.endowment + 
                          insurer.creditLife + insurer.universalLife + insurer.groupPolicies;
                        
                        return (
                          <TableRow key={insurer.insurer_id} className="hover:bg-muted/50">
                            <TableCell className="text-center text-xs text-muted-foreground font-medium">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help">
                                    <span className="font-medium text-sm block truncate max-w-[140px]">
                                      {insurer.insurer_name.length > 18 
                                        ? insurer.insurer_name.slice(0, 18) + '...' 
                                        : insurer.insurer_name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      GH₵{formatCurrency(insurer.totalPremium)} total
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-semibold text-sm">{insurer.insurer_name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className={cn(
                              "text-right text-xs font-mono",
                              getCellStyle(insurer.termLife, productTotal),
                              insurer.termLife > 0 && "text-blue-600 dark:text-blue-400"
                            )}>
                              {formatCurrency(insurer.termLife)}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right text-xs font-mono",
                              getCellStyle(insurer.wholeLife, productTotal),
                              insurer.wholeLife > 0 && "text-emerald-600 dark:text-emerald-400"
                            )}>
                              {formatCurrency(insurer.wholeLife)}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right text-xs font-mono",
                              getCellStyle(insurer.endowment, productTotal),
                              insurer.endowment > 0 && "text-purple-600 dark:text-purple-400"
                            )}>
                              {formatCurrency(insurer.endowment)}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right text-xs font-mono",
                              getCellStyle(insurer.creditLife, productTotal),
                              insurer.creditLife > 0 && "text-amber-600 dark:text-amber-400"
                            )}>
                              {formatCurrency(insurer.creditLife)}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right text-xs font-mono",
                              getCellStyle(insurer.universalLife, productTotal),
                              insurer.universalLife > 0 && "text-rose-600 dark:text-rose-400"
                            )}>
                              {formatCurrency(insurer.universalLife)}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right text-xs font-mono",
                              getCellStyle(insurer.groupPolicies, productTotal),
                              insurer.groupPolicies > 0 && "text-cyan-600 dark:text-cyan-400"
                            )}>
                              {formatCurrency(insurer.groupPolicies)}
                            </TableCell>
                            <TableCell className="text-center">
                              {insurer.topProduct !== '-' ? (
                                <Badge 
                                  variant="secondary" 
                                  className={cn(
                                    "text-[10px] px-1.5 py-0",
                                    PRODUCT_COLORS[insurer.topProduct as keyof typeof PRODUCT_COLORS]
                                  )}
                                >
                                  {insurer.topProduct.replace(' Life', '').replace(' Policies', '')}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TooltipProvider>
              </div>
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
