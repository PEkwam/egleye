import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Building2, TrendingUp, TrendingDown } from 'lucide-react';
 import { ScrollArea } from '@/components/ui/scroll-area';
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
  const sortedMetrics = [...metrics].sort((a, b) => (b.aum || 0) - (a.aum || 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-amber-500" />
          Fund Details
        </CardTitle>
        <CardDescription>
          Complete metrics for all pension funds • {metrics.length} funds
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px] sm:min-w-[200px]">Fund Name</TableHead>
                <TableHead className="min-w-[60px]">Type</TableHead>
                <TableHead className="min-w-[100px] hidden sm:table-cell">Trustee</TableHead>
                <TableHead className="text-right">AUM</TableHead>
                <TableHead className="text-right">Market Share</TableHead>
                <TableHead className="text-right">Return</TableHead>
                <TableHead className="text-right">Growth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMetrics.map((fund) => (
                <TableRow key={fund.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="max-w-[140px] sm:max-w-[200px] truncate text-xs sm:text-sm" title={fund.fund_name}>
                      {fund.fund_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        fund.fund_type === 'Tier 1' ? 'border-amber-500/50 text-amber-600' :
                        fund.fund_type === 'Tier 2' ? 'border-blue-500/50 text-blue-600' :
                        'border-emerald-500/50 text-emerald-600'
                      }`}
                    >
                      {FUND_TYPE_LABELS[fund.fund_type] || fund.fund_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">
                    {fund.trustee_name || '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-xs sm:text-sm">
                    {fund.aum ? formatCurrency(fund.aum) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {fund.market_share !== null ? (
                      <span className="font-medium">{fund.market_share.toFixed(2)}%</span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {fund.investment_return !== null ? (
                      <span className={`font-medium ${fund.investment_return >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {fund.investment_return.toFixed(2)}%
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {fund.aum_growth_rate !== null ? (
                      <div className="flex items-center justify-end gap-1">
                        {fund.aum_growth_rate >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={fund.aum_growth_rate >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {fund.aum_growth_rate.toFixed(1)}%
                        </span>
                      </div>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
