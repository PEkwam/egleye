 import { useMemo } from 'react';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Building2, TrendingUp, TrendingDown, Shield, Briefcase, Wallet } from 'lucide-react';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { PensionFundMetric } from '@/hooks/usePensionMetrics';

interface FundDetailsTableProps {
  metrics: PensionFundMetric[];
}

const FUND_TYPE_LABELS: Record<string, string> = {
  'Tier 1': 'Tier 1 (SSNIT)',
  'Tier 2': 'Tier 2',
  'Tier 3': 'Tier 3',
};

const formatCurrency = (value: number) => {
  if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
  return `GH₵${value.toLocaleString()}`;
};

export function FundDetailsTable({ metrics }: FundDetailsTableProps) {
  // Group metrics by tier
  const { tier1Funds, tier2Funds, tier3Funds } = useMemo(() => {
    const tier1 = metrics.filter(m => m.fund_type === 'Tier 1').sort((a, b) => (b.aum || 0) - (a.aum || 0));
    const tier2 = metrics.filter(m => m.fund_type === 'Tier 2').sort((a, b) => (b.aum || 0) - (a.aum || 0));
    const tier3 = metrics.filter(m => m.fund_type === 'Tier 3').sort((a, b) => (b.aum || 0) - (a.aum || 0));
    return { tier1Funds: tier1, tier2Funds: tier2, tier3Funds: tier3 };
  }, [metrics]);

  // Calculate tier totals for market share context
  const tierTotals = useMemo(() => ({
    tier2Total: tier2Funds.reduce((sum, m) => sum + (m.aum || 0), 0),
    tier3Total: tier3Funds.reduce((sum, m) => sum + (m.aum || 0), 0),
  }), [tier2Funds, tier3Funds]);

  const renderFundTable = (funds: PensionFundMetric[], tierTotal: number, tierLabel: string) => (
    <ScrollArea className="w-full">
      <div className="min-w-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px] sm:min-w-[180px]">Fund Name</TableHead>
              <TableHead className="min-w-[80px] hidden sm:table-cell">Trustee</TableHead>
              <TableHead className="text-right">AUM</TableHead>
              <TableHead className="text-right">Share</TableHead>
              <TableHead className="text-right">Return</TableHead>
              <TableHead className="text-right">Growth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {funds.map((fund) => {
              // Calculate tier-specific market share
              const tierMarketShare = tierTotal > 0 ? ((fund.aum || 0) / tierTotal) * 100 : 0;
              
              return (
                <TableRow key={fund.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="max-w-[140px] sm:max-w-[180px] truncate text-xs sm:text-sm" title={fund.fund_name}>
                      {fund.fund_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs hidden sm:table-cell">
                    {fund.trustee_name || '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-xs sm:text-sm">
                    {fund.aum ? formatCurrency(fund.aum) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">
                    <span className="font-medium">{tierMarketShare.toFixed(1)}%</span>
                  </TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">
                    {fund.investment_return !== null ? (
                      <span className={`font-medium ${fund.investment_return >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                        {fund.investment_return.toFixed(1)}%
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">
                    {fund.aum_growth_rate !== null ? (
                      <div className="flex items-center justify-end gap-1">
                        {fund.aum_growth_rate >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-destructive" />
                        )}
                        <span className={fund.aum_growth_rate >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                          {fund.aum_growth_rate.toFixed(1)}%
                        </span>
                      </div>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Fund Details
        </CardTitle>
        <CardDescription>
          Complete metrics for all pension funds • {metrics.length} funds
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tier2" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tier1" className="gap-1.5 text-xs sm:text-sm">
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Tier 1</span>
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{tier1Funds.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="tier2" className="gap-1.5 text-xs sm:text-sm">
              <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Tier 2</span>
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{tier2Funds.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="tier3" className="gap-1.5 text-xs sm:text-sm">
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Tier 3</span>
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{tier3Funds.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tier1">
            {tier1Funds.length > 0 ? (
              <>
                <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-amber-600">Tier 1 (BNSSS)</strong> - Basic National Social Security Scheme managed by SSNIT
                  </p>
                  <p className="text-lg font-bold text-amber-600 mt-1">
                    Total: {formatCurrency(tier1Funds[0]?.aum || 0)}
                  </p>
                </div>
                {renderFundTable(tier1Funds, tier1Funds[0]?.aum || 0, 'Tier 1')}
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">No Tier 1 funds available</p>
            )}
          </TabsContent>

          <TabsContent value="tier2">
            {tier2Funds.length > 0 ? (
              <>
                <div className="mb-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-blue-600">Tier 2 (Occupational)</strong> - Mandatory occupational pension schemes
                  </p>
                  <p className="text-lg font-bold text-blue-600 mt-1">
                    Total: {formatCurrency(tierTotals.tier2Total)}
                  </p>
                </div>
                {renderFundTable(tier2Funds, tierTotals.tier2Total, 'Tier 2')}
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">No Tier 2 funds available</p>
            )}
          </TabsContent>

          <TabsContent value="tier3">
            {tier3Funds.length > 0 ? (
              <>
                <div className="mb-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-emerald-600">Tier 3 (Voluntary)</strong> - Personal pension and provident fund schemes
                  </p>
                  <p className="text-lg font-bold text-emerald-600 mt-1">
                    Total: {formatCurrency(tierTotals.tier3Total)}
                  </p>
                </div>
                {renderFundTable(tier3Funds, tierTotals.tier3Total, 'Tier 3')}
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">No Tier 3 funds available</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
