import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Heart, Car, Wallet, TrendingUp, TrendingDown,
  Users, DollarSign, PieChart, Shield, Activity,
  Building2, Percent, BarChart3, Target, Scale
} from 'lucide-react';
import { useInsurerMetrics, useNonLifeMetrics } from '@/hooks/useInsurerMetrics';
import { usePensionMetrics } from '@/hooks/usePensionMetrics';

type InsightCategory = 'life' | 'nonlife' | 'pensions';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  colorClass?: string;
}

function MetricCard({ icon, label, value, subValue, trend, trendValue, colorClass = 'from-primary/10 to-primary/5 border-primary/20' }: MetricCardProps) {
  return (
    <Card className={`bg-gradient-to-br ${colorClass}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-background/50">
                {icon}
              </div>
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-foreground">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
            )}
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
            }`}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
              {trendValue}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number | null | undefined, inMillions = true): string {
  if (value === null || value === undefined) return 'N/A';
  if (inMillions) {
    return `GHS ${(value / 1000000).toFixed(1)}M`;
  }
  return `GHS ${value.toLocaleString()}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(1)}%`;
}

function LifeInsuranceInsights() {
  const { metrics, isLoading, availableYears } = useInsurerMetrics('life');
  const selectedYear = availableYears[0] || new Date().getFullYear();

  const summary = useMemo(() => {
    if (!metrics || metrics.length === 0) return null;
    
    const totalGrossPremium = metrics.reduce((sum, m) => sum + (m.gross_premium || 0), 0);
    const totalAssets = metrics.reduce((sum, m) => sum + (m.total_assets || 0), 0);
    const totalClaims = metrics.reduce((sum, m) => sum + (m.total_claims_paid || 0), 0);
    const avgClaimsRatio = metrics.reduce((sum, m) => sum + (m.claims_ratio || 0), 0) / metrics.length;
    const avgExpenseRatio = metrics.reduce((sum, m) => sum + (m.expense_ratio || 0), 0) / metrics.length;
    const totalProfit = metrics.reduce((sum, m) => sum + (m.profit_after_tax || 0), 0);
    const topInsurer = metrics.sort((a, b) => (b.market_share || 0) - (a.market_share || 0))[0];
    
    return {
      totalGrossPremium,
      totalAssets,
      totalClaims,
      avgClaimsRatio,
      avgExpenseRatio,
      totalProfit,
      companiesCount: metrics.length,
      topInsurer,
    };
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No life insurance data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {summary.companiesCount} licensed life insurers • {selectedYear || 'Latest'}
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={<DollarSign className="h-4 w-4 text-green-600" />}
          label="Gross Premium"
          value={formatCurrency(summary.totalGrossPremium)}
          subValue="Total written premium"
          colorClass="from-green-500/10 to-green-500/5 border-green-500/20"
        />
        <MetricCard
          icon={<Building2 className="h-4 w-4 text-blue-600" />}
          label="Total Assets"
          value={formatCurrency(summary.totalAssets)}
          subValue="Industry-wide assets"
          colorClass="from-blue-500/10 to-blue-500/5 border-blue-500/20"
        />
        <MetricCard
          icon={<Shield className="h-4 w-4 text-amber-600" />}
          label="Claims Paid"
          value={formatCurrency(summary.totalClaims)}
          subValue="Policyholder payouts"
          colorClass="from-amber-500/10 to-amber-500/5 border-amber-500/20"
        />
        <MetricCard
          icon={<Activity className="h-4 w-4 text-purple-600" />}
          label="Profit After Tax"
          value={formatCurrency(summary.totalProfit)}
          trend={summary.totalProfit > 0 ? 'up' : 'down'}
          colorClass="from-purple-500/10 to-purple-500/5 border-purple-500/20"
        />
        <MetricCard
          icon={<Percent className="h-4 w-4 text-rose-600" />}
          label="Avg Claims Ratio"
          value={formatPercent(summary.avgClaimsRatio)}
          subValue="Claims / Premium"
          colorClass="from-rose-500/10 to-rose-500/5 border-rose-500/20"
        />
        <MetricCard
          icon={<BarChart3 className="h-4 w-4 text-indigo-600" />}
          label="Avg Expense Ratio"
          value={formatPercent(summary.avgExpenseRatio)}
          subValue="Operational efficiency"
          colorClass="from-indigo-500/10 to-indigo-500/5 border-indigo-500/20"
        />
        <MetricCard
          icon={<Users className="h-4 w-4 text-cyan-600" />}
          label="Companies"
          value={summary.companiesCount}
          subValue="Active life insurers"
          colorClass="from-cyan-500/10 to-cyan-500/5 border-cyan-500/20"
        />
        <MetricCard
          icon={<Target className="h-4 w-4 text-emerald-600" />}
          label="Market Leader"
          value={summary.topInsurer?.insurer_name?.split(' ')[0] || 'N/A'}
          subValue={`${formatPercent(summary.topInsurer?.market_share)} market share`}
          colorClass="from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
        />
      </div>
    </div>
  );
}

function NonLifeInsuranceInsights() {
  const { metrics, isLoading } = useNonLifeMetrics();

  const summary = useMemo(() => {
    if (!metrics || metrics.length === 0) return null;
    
    const totalRevenue = metrics.reduce((sum, m) => sum + (m.insurance_service_revenue || 0), 0);
    const totalAssets = metrics.reduce((sum, m) => sum + (m.total_assets || 0), 0);
    const totalClaims = metrics.reduce((sum, m) => sum + (m.total_incurred_claims || 0), 0);
    const avgClaimsRatio = metrics.reduce((sum, m) => sum + (m.claims_ratio || 0), 0) / metrics.length;
    const avgExpenseRatio = metrics.reduce((sum, m) => sum + (m.expense_ratio || 0), 0) / metrics.length;
    const totalProfit = metrics.reduce((sum, m) => sum + (m.profit_after_tax || 0), 0);
    
    // Motor insurance totals
    const totalMotor = metrics.reduce((sum, m) => 
      sum + (m.motor_comprehensive || 0) + (m.motor_third_party || 0) + (m.motor_third_party_fire_theft || 0) + (m.motor_others || 0), 0);
    
    // Property/Fire totals
    const totalProperty = metrics.reduce((sum, m) => 
      sum + (m.fire_property_private || 0) + (m.fire_property_commercial || 0), 0);
    
    const topInsurer = metrics.sort((a, b) => (b.market_share || 0) - (a.market_share || 0))[0];
    
    return {
      totalRevenue,
      totalAssets,
      totalClaims,
      avgClaimsRatio,
      avgExpenseRatio,
      totalProfit,
      totalMotor,
      totalProperty,
      companiesCount: metrics.length,
      topInsurer,
    };
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Car className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No non-life insurance data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {summary.companiesCount} licensed non-life insurers
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={<DollarSign className="h-4 w-4 text-green-600" />}
          label="Service Revenue"
          value={formatCurrency(summary.totalRevenue)}
          subValue="Insurance service revenue"
          colorClass="from-green-500/10 to-green-500/5 border-green-500/20"
        />
        <MetricCard
          icon={<Car className="h-4 w-4 text-blue-600" />}
          label="Motor Premium"
          value={formatCurrency(summary.totalMotor)}
          subValue="All motor products"
          colorClass="from-blue-500/10 to-blue-500/5 border-blue-500/20"
        />
        <MetricCard
          icon={<Building2 className="h-4 w-4 text-amber-600" />}
          label="Property/Fire"
          value={formatCurrency(summary.totalProperty)}
          subValue="Property insurance"
          colorClass="from-amber-500/10 to-amber-500/5 border-amber-500/20"
        />
        <MetricCard
          icon={<Shield className="h-4 w-4 text-red-600" />}
          label="Incurred Claims"
          value={formatCurrency(summary.totalClaims)}
          subValue="Total claims incurred"
          colorClass="from-red-500/10 to-red-500/5 border-red-500/20"
        />
        <MetricCard
          icon={<Percent className="h-4 w-4 text-rose-600" />}
          label="Avg Claims Ratio"
          value={formatPercent(summary.avgClaimsRatio)}
          subValue="Claims / Revenue"
          colorClass="from-rose-500/10 to-rose-500/5 border-rose-500/20"
        />
        <MetricCard
          icon={<BarChart3 className="h-4 w-4 text-indigo-600" />}
          label="Avg Expense Ratio"
          value={formatPercent(summary.avgExpenseRatio)}
          subValue="Operating efficiency"
          colorClass="from-indigo-500/10 to-indigo-500/5 border-indigo-500/20"
        />
        <MetricCard
          icon={<Activity className="h-4 w-4 text-purple-600" />}
          label="Profit After Tax"
          value={formatCurrency(summary.totalProfit)}
          trend={summary.totalProfit > 0 ? 'up' : 'down'}
          colorClass="from-purple-500/10 to-purple-500/5 border-purple-500/20"
        />
        <MetricCard
          icon={<Target className="h-4 w-4 text-emerald-600" />}
          label="Market Leader"
          value={summary.topInsurer?.insurer_name?.split(' ')[0] || 'N/A'}
          subValue={`${formatPercent(summary.topInsurer?.market_share)} market share`}
          colorClass="from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
        />
      </div>
    </div>
  );
}

function PensionInsights() {
  const { metrics, isLoading } = usePensionMetrics();

  const summary = useMemo(() => {
    if (!metrics || metrics.length === 0) return null;
    
    const totalAUM = metrics.reduce((sum, m) => sum + (m.aum || 0), 0);
    const totalContributions = metrics.reduce((sum, m) => sum + (m.total_contributions || 0), 0);
    const totalBenefits = metrics.reduce((sum, m) => sum + (m.total_benefits_paid || 0), 0);
    const totalContributors = metrics.reduce((sum, m) => sum + (m.total_contributors || 0), 0);
    const avgReturn = metrics.reduce((sum, m) => sum + (m.investment_return || 0), 0) / metrics.length;
    const avgExpenseRatio = metrics.reduce((sum, m) => sum + (m.expense_ratio || 0), 0) / metrics.length;
    
    // Group by fund type
    const tier2Funds = metrics.filter(m => m.fund_type === 'tier2');
    const tier3Funds = metrics.filter(m => m.fund_type === 'tier3');
    
    const topFund = metrics.sort((a, b) => (b.aum || 0) - (a.aum || 0))[0];
    
    return {
      totalAUM,
      totalContributions,
      totalBenefits,
      totalContributors,
      avgReturn,
      avgExpenseRatio,
      fundsCount: metrics.length,
      tier2Count: tier2Funds.length,
      tier3Count: tier3Funds.length,
      topFund,
    };
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No pension fund data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {summary.fundsCount} pension funds • {summary.tier2Count} Tier 2 • {summary.tier3Count} Tier 3
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={<PieChart className="h-4 w-4 text-green-600" />}
          label="Assets Under Mgmt"
          value={formatCurrency(summary.totalAUM)}
          subValue="Total AUM"
          colorClass="from-green-500/10 to-green-500/5 border-green-500/20"
        />
        <MetricCard
          icon={<DollarSign className="h-4 w-4 text-blue-600" />}
          label="Contributions"
          value={formatCurrency(summary.totalContributions)}
          subValue="Total contributions"
          colorClass="from-blue-500/10 to-blue-500/5 border-blue-500/20"
        />
        <MetricCard
          icon={<Wallet className="h-4 w-4 text-amber-600" />}
          label="Benefits Paid"
          value={formatCurrency(summary.totalBenefits)}
          subValue="Pension payouts"
          colorClass="from-amber-500/10 to-amber-500/5 border-amber-500/20"
        />
        <MetricCard
          icon={<Users className="h-4 w-4 text-purple-600" />}
          label="Contributors"
          value={summary.totalContributors?.toLocaleString() || 'N/A'}
          subValue="Active members"
          colorClass="from-purple-500/10 to-purple-500/5 border-purple-500/20"
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          label="Avg Return"
          value={formatPercent(summary.avgReturn)}
          subValue="Investment return"
          trend={summary.avgReturn > 0 ? 'up' : 'down'}
          colorClass="from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
        />
        <MetricCard
          icon={<Percent className="h-4 w-4 text-rose-600" />}
          label="Avg Expense Ratio"
          value={formatPercent(summary.avgExpenseRatio)}
          subValue="Fund expenses"
          colorClass="from-rose-500/10 to-rose-500/5 border-rose-500/20"
        />
        <MetricCard
          icon={<Scale className="h-4 w-4 text-indigo-600" />}
          label="Pension Funds"
          value={summary.fundsCount}
          subValue="Registered schemes"
          colorClass="from-indigo-500/10 to-indigo-500/5 border-indigo-500/20"
        />
        <MetricCard
          icon={<Target className="h-4 w-4 text-cyan-600" />}
          label="Largest Fund"
          value={summary.topFund?.fund_name?.split(' ').slice(0, 2).join(' ') || 'N/A'}
          subValue={formatCurrency(summary.topFund?.aum)}
          colorClass="from-cyan-500/10 to-cyan-500/5 border-cyan-500/20"
        />
      </div>
    </div>
  );
}

export function QuickInsights() {
  const [activeTab, setActiveTab] = useState<InsightCategory>('life');

  return (
    <section className="container mx-auto px-4 py-6 md:py-8">
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Quick Insights
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Key metrics by insurance category
              </p>
            </div>
            <Badge variant="outline" className="w-fit">
              NIC & NPRA Data
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InsightCategory)}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="life" className="gap-2">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Life Insurance</span>
                <span className="sm:hidden">Life</span>
              </TabsTrigger>
              <TabsTrigger value="nonlife" className="gap-2">
                <Car className="h-4 w-4" />
                <span className="hidden sm:inline">Non-Life</span>
                <span className="sm:hidden">Motor</span>
              </TabsTrigger>
              <TabsTrigger value="pensions" className="gap-2">
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Pensions</span>
                <span className="sm:hidden">Pension</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="life">
              <LifeInsuranceInsights />
            </TabsContent>
            
            <TabsContent value="nonlife">
              <NonLifeInsuranceInsights />
            </TabsContent>
            
            <TabsContent value="pensions">
              <PensionInsights />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}
