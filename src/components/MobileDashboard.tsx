import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Heart, Car, Landmark, Building2, TrendingUp, TrendingDown, 
  DollarSign, Users, ArrowRight, ChevronLeft, ChevronRight,
  Percent, Shield, Activity, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CategoryMetrics {
  title: string;
  icon: React.ElementType;
  href: string;
  color: string;
  bgColor: string;
  metrics: {
    label: string;
    value: string;
    trend?: number;
    icon: React.ElementType;
  }[];
  topPlayer: string;
  marketSize: string;
}

const formatCurrency = (value: number | null) => {
  if (!value) return 'No data';
  if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(0)}M`;
  return `GH₵${value.toLocaleString()}`;
};

export const MobileDashboard = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch latest life metrics
  const { data: lifeData } = useQuery({
    queryKey: ['mobile-life-metrics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('insurer_metrics')
        .select('*')
        .order('report_year', { ascending: false })
        .order('report_quarter', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Fetch latest non-life metrics
  const { data: nonLifeData } = useQuery({
    queryKey: ['mobile-nonlife-metrics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('nonlife_insurer_metrics')
        .select('*')
        .order('report_year', { ascending: false })
        .order('report_quarter', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Fetch latest pension metrics
  const { data: pensionData } = useQuery({
    queryKey: ['mobile-pension-metrics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pension_fund_metrics')
        .select('*')
        .order('report_year', { ascending: false })
        .order('report_quarter', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Fetch broker metrics
  const { data: brokerData } = useQuery({
    queryKey: ['mobile-broker-metrics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('broker_metrics')
        .select('*')
        .order('report_year', { ascending: false })
        .order('report_quarter', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Calculate aggregates
  const lifeAggregates = lifeData?.reduce((acc, curr) => {
    if (!acc.year || curr.report_year > acc.year) {
      acc.year = curr.report_year;
      acc.quarter = curr.report_quarter;
    }
    return acc;
  }, { year: 0, quarter: 0 } as { year: number; quarter: number | null });

  const latestLifeData = lifeData?.filter(
    d => d.report_year === lifeAggregates?.year && d.report_quarter === lifeAggregates?.quarter
  ) || [];

  const lifeTotalPremium = latestLifeData.reduce((sum, d) => sum + (d.gross_premium || 0), 0);
  const lifeTopPlayer = latestLifeData.sort((a, b) => (b.gross_premium || 0) - (a.gross_premium || 0))[0];

  const nonLifeAggregates = nonLifeData?.reduce((acc, curr) => {
    if (!acc.year || curr.report_year > acc.year) {
      acc.year = curr.report_year;
      acc.quarter = curr.report_quarter;
    }
    return acc;
  }, { year: 0, quarter: 0 } as { year: number; quarter: number | null });

  const latestNonLifeData = nonLifeData?.filter(
    d => d.report_year === nonLifeAggregates?.year && d.report_quarter === nonLifeAggregates?.quarter
  ) || [];

  const nonLifeTotalRevenue = latestNonLifeData.reduce((sum, d) => sum + (d.insurance_service_revenue || 0), 0);
  const nonLifeTopPlayer = latestNonLifeData.sort((a, b) => (b.insurance_service_revenue || 0) - (a.insurance_service_revenue || 0))[0];
  const nonLifeAvgYears = latestNonLifeData.filter(d => d.years_in_ghana && d.years_in_ghana > 0).length > 0
    ? latestNonLifeData.filter(d => d.years_in_ghana && d.years_in_ghana > 0).reduce((sum, d) => sum + (d.years_in_ghana || 0), 0) / latestNonLifeData.filter(d => d.years_in_ghana && d.years_in_ghana > 0).length
    : 0;

  const pensionAggregates = pensionData?.reduce((acc, curr) => {
    if (!acc.year || curr.report_year > acc.year) {
      acc.year = curr.report_year;
      acc.quarter = curr.report_quarter;
    }
    return acc;
  }, { year: 0, quarter: 0 } as { year: number; quarter: number | null });

  const latestPensionData = pensionData?.filter(
    d => d.report_year === pensionAggregates?.year && d.report_quarter === pensionAggregates?.quarter
  ) || [];

  const pensionTotalAUM = latestPensionData.reduce((sum, d) => sum + (d.aum || 0), 0);
  const pensionTopPlayer = latestPensionData.sort((a, b) => (b.aum || 0) - (a.aum || 0))[0];
  const pensionAvgYears = latestPensionData.filter(d => d.years_in_ghana && d.years_in_ghana > 0).length > 0
    ? latestPensionData.filter(d => d.years_in_ghana && d.years_in_ghana > 0).reduce((sum, d) => sum + (d.years_in_ghana || 0), 0) / latestPensionData.filter(d => d.years_in_ghana && d.years_in_ghana > 0).length
    : 0;

  const brokerAggregates = brokerData?.reduce((acc, curr) => {
    if (!acc.year || curr.report_year > acc.year) {
      acc.year = curr.report_year;
      acc.quarter = curr.report_quarter;
    }
    return acc;
  }, { year: 0, quarter: 0 } as { year: number; quarter: number | null });

  const latestBrokerData = brokerData?.filter(
    d => d.report_year === brokerAggregates?.year && d.report_quarter === brokerAggregates?.quarter
  ) || [];

  const brokerTotalCommission = latestBrokerData.reduce((sum, d) => sum + (d.commission_income || 0), 0);
  const brokerTopPlayer = latestBrokerData.sort((a, b) => (b.commission_income || 0) - (a.commission_income || 0))[0];

  const categories: CategoryMetrics[] = [
    {
      title: 'Life Insurance',
      icon: Heart,
      href: '/executive-dashboard',
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      metrics: [
        { label: 'Gross Premium', value: formatCurrency(lifeTotalPremium), icon: DollarSign },
        { label: 'Companies', value: String(latestLifeData.length), icon: Building2 },
        { label: 'Avg Claims Ratio', value: `${(latestLifeData.reduce((s, d) => s + (d.claims_ratio || 0), 0) / latestLifeData.length || 0).toFixed(1)}%`, icon: Percent },
      ],
      topPlayer: lifeTopPlayer?.insurer_name || 'No data',
      marketSize: formatCurrency(lifeTotalPremium),
    },
    {
      title: 'Non-Life Insurance',
      icon: Car,
      href: '/nonlife-dashboard',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      metrics: [
        { label: 'Service Revenue', value: formatCurrency(nonLifeTotalRevenue), icon: DollarSign },
        { label: 'Companies', value: String(latestNonLifeData.length), icon: Building2 },
        { label: 'Avg Years', value: nonLifeAvgYears > 0 ? `${nonLifeAvgYears.toFixed(0)} yrs` : 'No data', icon: Clock },
      ],
      topPlayer: nonLifeTopPlayer?.insurer_name || 'No data',
      marketSize: formatCurrency(nonLifeTotalRevenue),
    },
    {
      title: 'Pensions',
      icon: Landmark,
      href: '/pension-dashboard',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      metrics: [
        { label: 'Total AUM', value: formatCurrency(pensionTotalAUM), icon: DollarSign },
        { label: 'Schemes', value: String(latestPensionData.length), icon: Shield },
        { label: 'Avg Years', value: pensionAvgYears > 0 ? `${pensionAvgYears.toFixed(0)} yrs` : 'No data', icon: Clock },
      ],
      topPlayer: pensionTopPlayer?.fund_name || 'No data',
      marketSize: formatCurrency(pensionTotalAUM),
    },
    {
      title: 'Brokers',
      icon: Building2,
      href: '/brokers-dashboard',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      metrics: [
        { label: 'Commission Income', value: formatCurrency(brokerTotalCommission), icon: DollarSign },
        { label: 'Active Brokers', value: String(latestBrokerData.length), icon: Users },
        { label: 'Avg Profit', value: formatCurrency(latestBrokerData.reduce((s, d) => s + (d.profit_loss_after_tax || 0), 0) / latestBrokerData.length), icon: TrendingUp },
      ],
      topPlayer: brokerTopPlayer?.broker_name || 'N/A',
      marketSize: formatCurrency(brokerTotalCommission),
    },
  ];

  const scrollToCard = (index: number) => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.offsetWidth * 0.85;
      scrollRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      });
      setActiveIndex(index);
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.offsetWidth * 0.85;
      const newIndex = Math.round(scrollRef.current.scrollLeft / cardWidth);
      if (newIndex !== activeIndex) {
        setActiveIndex(Math.min(newIndex, categories.length - 1));
      }
    }
  };

  return (
    <div className="md:hidden py-4">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Market Overview</h2>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => scrollToCard(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => scrollToCard(Math.min(categories.length - 1, activeIndex + 1))}
            disabled={activeIndex === categories.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Swipeable Cards Container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-3 px-4 pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((category, index) => (
          <Card
            key={category.title}
            className={cn(
              "flex-shrink-0 w-[85vw] snap-center border-0 shadow-lg",
              "bg-gradient-to-br from-card to-card/80"
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl", category.bgColor)}>
                    <category.icon className={cn("h-5 w-5", category.color)} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">{category.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">Market Leader</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {lifeAggregates?.year || new Date().getFullYear()}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Top Player Highlight */}
              <div className={cn("p-3 rounded-xl", category.bgColor)}>
                <p className="text-xs text-muted-foreground mb-1">Market Leader</p>
                <p className={cn("font-semibold text-sm truncate", category.color)}>
                  {category.topPlayer}
                </p>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-3 gap-2">
                {category.metrics.map((metric) => (
                  <div key={metric.label} className="text-center p-2 rounded-lg bg-secondary/30">
                    <metric.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs font-semibold">{metric.value}</p>
                    <p className="text-[10px] text-muted-foreground">{metric.label}</p>
                  </div>
                ))}
              </div>

              {/* View Dashboard Link */}
              <Link to={category.href}>
                <Button variant="outline" className="w-full group" size="sm">
                  View Dashboard
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-2">
        {categories.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToCard(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === activeIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  );
};
