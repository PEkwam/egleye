import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertTriangle, Building2, Clock, Shield, ChevronRight, Zap, BarChart3, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { NewsArticle } from '@/types/news';
import { format, isToday, isThisWeek, subDays, startOfDay } from 'date-fns';
import { sanitizeText } from '@/lib/utils/text';
import { Sparkline } from '@/components/Sparkline';
import { CountUp } from '@/components/CountUp';

interface ExecutiveDashboardProps {
  articles: NewsArticle[];
  regulatorArticles: NewsArticle[];
  enterpriseArticles: NewsArticle[];
  isLoading?: boolean;
}

export function ExecutiveDashboard({
  articles,
  regulatorArticles,
  enterpriseArticles,
  isLoading,
}: ExecutiveDashboardProps) {
  const stats = useMemo(() => {
    const today = articles.filter(a => a.published_at && isToday(new Date(a.published_at)));
    const thisWeek = articles.filter(a => a.published_at && isThisWeek(new Date(a.published_at)));

    const criticalUpdates = regulatorArticles.filter(a =>
      a.published_at && (isToday(new Date(a.published_at)) || isThisWeek(new Date(a.published_at)))
    );

    const byCategory = articles.reduce((acc, article) => {
      acc[article.category] = (acc[article.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Build per-day series for sparklines (last 14 days)
    const buildSeries = (list: NewsArticle[], days = 14) => {
      const buckets = new Array(days).fill(0);
      const today0 = startOfDay(new Date());
      list.forEach(a => {
        if (!a.published_at) return;
        const d = startOfDay(new Date(a.published_at));
        const diff = Math.floor((today0.getTime() - d.getTime()) / 86400000);
        if (diff >= 0 && diff < days) buckets[days - 1 - diff] += 1;
      });
      return buckets;
    };

    // Week-over-week delta helper
    const wowDelta = (series: number[]) => {
      if (series.length < 14) return 0;
      const last = series.slice(-7).reduce((s, n) => s + n, 0);
      const prev = series.slice(-14, -7).reduce((s, n) => s + n, 0);
      if (prev === 0) return last > 0 ? 100 : 0;
      return Math.round(((last - prev) / prev) * 100);
    };

    const allSeries = buildSeries(articles);
    const regSeries = buildSeries(regulatorArticles);
    const entSeries = buildSeries(enterpriseArticles);

    return {
      todayCount: today.length,
      weekCount: thisWeek.length,
      totalCount: articles.length,
      criticalCount: criticalUpdates.length,
      regulatorCount: regulatorArticles.length,
      enterpriseCount: enterpriseArticles.length,
      byCategory,
      latestRegulator: regulatorArticles[0],
      latestUpdate: articles[0],
      series: { all: allSeries, regulator: regSeries, enterprise: entSeries },
      delta: {
        all: wowDelta(allSeries),
        regulator: wowDelta(regSeries),
        enterprise: wowDelta(entSeries),
      },
    };
  }, [articles, regulatorArticles, enterpriseArticles]);

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-muted rounded w-16 mb-2" />
                <div className="h-4 bg-muted rounded w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  const metricCards = [
    {
      href: '/?time=today',
      icon: Clock,
      value: stats.todayCount,
      label: "Today's News",
      sparkColor: 'hsl(var(--primary))',
      sparkData: stats.series.all.slice(-7),
      delta: stats.delta.all,
      gradient: 'from-primary/15 via-primary/8 to-primary/3',
      border: 'border-primary/25 hover:border-primary/50',
      iconBg: 'bg-gradient-to-br from-primary to-primary/80',
      iconShadow: 'shadow-primary/30',
      glowColor: 'hover:shadow-primary/15',
    },
    {
      href: '/?category=regulator',
      icon: Shield,
      value: stats.regulatorCount,
      label: 'NIC Updates',
      sparkColor: 'hsl(var(--destructive))',
      sparkData: stats.series.regulator.slice(-7),
      delta: stats.delta.regulator,
      gradient: 'from-destructive/12 via-destructive/6 to-destructive/2',
      border: 'border-destructive/20 hover:border-destructive/45',
      iconBg: 'bg-gradient-to-br from-destructive to-destructive/80',
      iconShadow: 'shadow-destructive/30',
      glowColor: 'hover:shadow-destructive/15',
    },
    {
      href: '/?category=enterprise_group',
      icon: Building2,
      value: stats.enterpriseCount,
      label: 'Enterprise',
      sparkColor: 'hsl(var(--accent))',
      sparkData: stats.series.enterprise.slice(-7),
      delta: stats.delta.enterprise,
      gradient: 'from-accent/15 via-accent/8 to-accent/3',
      border: 'border-accent/25 hover:border-accent/50',
      iconBg: 'bg-gradient-to-br from-accent to-accent/80',
      iconShadow: 'shadow-accent/30',
      glowColor: 'hover:shadow-accent/15',
    },
    {
      href: '/?time=week',
      icon: BarChart3,
      value: stats.weekCount,
      label: 'This Week',
      sparkColor: 'hsl(var(--muted-foreground))',
      sparkData: stats.series.all.slice(-7),
      delta: stats.delta.all,
      gradient: 'from-secondary/50 via-secondary/25 to-secondary/10',
      border: 'border-border hover:border-primary/30',
      iconBg: 'bg-gradient-to-br from-muted-foreground/80 to-muted-foreground/60',
      iconShadow: 'shadow-muted-foreground/20',
      glowColor: 'hover:shadow-muted-foreground/10',
    },
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 py-6 md:py-8 relative">
        {/* Executive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              Executive Dashboard
            </h2>
            <p className="text-muted-foreground text-xs md:text-sm mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
              Real-time Ghana insurance intelligence • {format(new Date(), 'MMM d, h:mm a')}
            </p>
          </div>
          {stats.criticalCount > 0 && (
            <Badge variant="destructive" className="animate-pulse flex items-center gap-1.5 self-start sm:self-auto shadow-lg shadow-destructive/20">
              <Zap className="h-3 w-3" />
              {stats.criticalCount} Critical Update{stats.criticalCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Key Metrics Grid - Bento with sparklines */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mb-6 md:mb-8">
          {metricCards.map((card, index) => {
            const positive = card.delta >= 0;
            return (
              <Link key={index} to={card.href} className="group">
                <Card className={`relative overflow-hidden bg-gradient-to-br ${card.gradient} border ${card.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${card.glowColor} h-full`}>
                  {/* Decorative corner glow */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-foreground/3 to-transparent rounded-bl-[60px] group-hover:scale-125 transition-transform duration-500" />
                  <CardContent className="p-3 sm:p-4 md:p-5 relative">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className={`p-2 sm:p-2.5 ${card.iconBg} rounded-xl shadow-lg ${card.iconShadow} group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                        <card.icon className="h-4 w-4 text-primary-foreground" />
                      </div>
                      {card.sparkData.some(v => v > 0) && (
                        <span
                          className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                            positive
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20'
                          }`}
                        >
                          {positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                          {positive ? '+' : ''}{card.delta}%
                        </span>
                      )}
                    </div>
                    <CountUp
                      value={card.value}
                      className="text-2xl sm:text-3xl md:text-[2rem] font-bold text-foreground tabular-nums leading-none block"
                    />
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate mt-1">{card.label}</p>
                    {/* Sparkline — articles per day for the last 7 days. */}
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <div
                          className="mt-2 -mx-1 opacity-90 group-hover:opacity-100 transition-opacity cursor-help"
                          onClick={(e) => e.preventDefault()}
                          aria-label={`Daily ${card.label} articles over the last 7 days`}
                        >
                          <Sparkline
                            data={card.sparkData}
                            color={card.sparkColor}
                            height={28}
                            showTooltip
                            itemLabel="article"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                        <div className="flex items-start gap-1.5">
                          <Info className="h-3 w-3 mt-0.5 flex-shrink-0 opacity-70" />
                          <div>
                            <p className="font-medium mb-0.5">Last 7 days</p>
                            <p className="text-muted-foreground leading-snug">
                              Articles published per day. The total ({card.value}) includes older items, so this line can be flat even when the count is high.
                            </p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>


        {/* Priority Alert - Latest Regulator News */}
        {stats.latestRegulator && (
          <Card className="relative overflow-hidden border-l-4 border-l-destructive bg-gradient-to-r from-destructive/6 via-destructive/3 to-transparent mb-6 group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full blur-2xl pointer-events-none" />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-destructive/10">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                </div>
                <CardTitle className="text-sm font-medium text-destructive">
                  Latest Regulatory Update
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <a 
                href={stats.latestRegulator.source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline"
              >
                <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                  {stats.latestRegulator.title}
                </h3>
              </a>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {sanitizeText(stats.latestRegulator.description)}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {stats.latestRegulator.published_at &&
                    format(new Date(stats.latestRegulator.published_at), 'MMM d, yyyy • h:mm a')}
                </p>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
