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

const fmt = (value: number) => {
  if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
  return `GH₵${value.toLocaleString()}`;
};

export function FundDetailsTable({ metrics }: FundDetailsTableProps) {
  const { tier1Funds, tier2Funds, tier3Funds } = useMemo(() => ({
    tier1Funds: metrics.filter(m => m.fund_type === 'Tier 1').sort((a, b) => (b.aum || 0) - (a.aum || 0)),
    tier2Funds: metrics.filter(m => m.fund_type === 'Tier 2').sort((a, b) => (b.aum || 0) - (a.aum || 0)),
    tier3Funds: metrics.filter(m => m.fund_type === 'Tier 3').sort((a, b) => (b.aum || 0) - (a.aum || 0)),
  }), [metrics]);

  const tierTotals = useMemo(() => ({
    tier2: tier2Funds.reduce((sum, m) => sum + (m.aum || 0), 0),
    tier3: tier3Funds.reduce((sum, m) => sum + (m.aum || 0), 0),
  }), [tier2Funds, tier3Funds]);

  const renderTable = (funds: PensionFundMetric[], tierTotal: number) => (
    <ScrollArea className="w-full">
      <div className="min-w-[550px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[40px] w-[40px]">#</TableHead>
              <TableHead className="min-w-[160px]">Fund / Trustee</TableHead>
              <TableHead className="text-right">AUM</TableHead>
              <TableHead className="text-right">Share</TableHead>
              <TableHead className="text-right">Return</TableHead>
              <TableHead className="text-right">Growth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {funds.map((fund, idx) => {
              const share = tierTotal > 0 ? ((fund.aum || 0) / tierTotal) * 100 : 0;
              return (
                <TableRow key={fund.id} className="hover:bg-muted/50">
                  <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="max-w-[180px]">
                      <p className="text-sm font-medium truncate" title={fund.fund_name}>{fund.fund_name}</p>
                      {fund.trustee_name && (
                        <p className="text-xs text-muted-foreground truncate">{fund.trustee_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {fund.aum ? fmt(fund.aum) : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {share > 0 ? `${share.toFixed(1)}%` : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {fund.investment_return != null ? (
                      <span className={fund.investment_return >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>
                        {fund.investment_return.toFixed(1)}%
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {fund.aum_growth_rate != null ? (
                      <div className="flex items-center justify-end gap-1">
                        {fund.aum_growth_rate >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-destructive" />
                        )}
                        <span className={fund.aum_growth_rate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>
                          {fund.aum_growth_rate.toFixed(1)}%
                        </span>
                      </div>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );

  const tierConfig = [
    { key: 'tier1', label: 'Tier 1', icon: Shield, funds: tier1Funds, total: tier1Funds[0]?.aum || 0, color: 'text-amber-600', bgColor: 'bg-amber-500/10 border-amber-500/20', desc: 'BNSSS — Managed by SSNIT' },
    { key: 'tier2', label: 'Tier 2', icon: Briefcase, funds: tier2Funds, total: tierTotals.tier2, color: 'text-blue-600', bgColor: 'bg-blue-500/10 border-blue-500/20', desc: 'Mandatory Occupational Schemes' },
    { key: 'tier3', label: 'Tier 3', icon: Wallet, funds: tier3Funds, total: tierTotals.tier3, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10 border-emerald-500/20', desc: 'Voluntary Personal Schemes' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Fund Details
        </CardTitle>
        <CardDescription>{metrics.length} funds across all tiers</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tier2" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            {tierConfig.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="gap-1.5 text-xs sm:text-sm">
                <t.icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{t.funds.length}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {tierConfig.map((t) => (
            <TabsContent key={t.key} value={t.key}>
              {t.funds.length > 0 ? (
                <>
                  <div className={`mb-3 p-3 rounded-lg ${t.bgColor} border`}>
                    <p className="text-xs text-muted-foreground">
                      <strong className={t.color}>{t.label}</strong> — {t.desc}
                    </p>
                    <p className={`text-lg font-bold ${t.color} mt-1`}>
                      Total: {fmt(t.total)}
                    </p>
                  </div>
                  {renderTable(t.funds, t.total)}
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">No {t.label} funds available</p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
