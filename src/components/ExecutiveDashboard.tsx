import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, AlertTriangle, Building2, Clock, FileText, Shield, ChevronRight, Zap, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { NewsArticle } from '@/types/news';
import { format, isToday, isThisWeek } from 'date-fns';
import { sanitizeText } from '@/lib/utils/text';

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
      gradient: 'from-primary/15 via-primary/8 to-primary/3',
      border: 'border-primary/25 hover:border-primary/50',
      iconBg: 'bg-gradient-to-br from-primary to-primary/80',
      iconShadow: 'shadow-primary/30',
      textColor: 'text-primary',
      glowColor: 'hover:shadow-primary/15',
    },
    {
      href: '/?category=regulator',
      icon: Shield,
      value: stats.regulatorCount,
      label: 'NIC Updates',
      gradient: 'from-destructive/12 via-destructive/6 to-destructive/2',
      border: 'border-destructive/20 hover:border-destructive/45',
      iconBg: 'bg-gradient-to-br from-destructive to-destructive/80',
      iconShadow: 'shadow-destructive/30',
      textColor: 'text-destructive',
      glowColor: 'hover:shadow-destructive/15',
    },
    {
      href: '/?category=enterprise_group',
      icon: Building2,
      value: stats.enterpriseCount,
      label: 'Enterprise',
      gradient: 'from-accent/15 via-accent/8 to-accent/3',
      border: 'border-accent/25 hover:border-accent/50',
      iconBg: 'bg-gradient-to-br from-accent to-accent/80',
      iconShadow: 'shadow-accent/30',
      textColor: 'text-accent-foreground',
      glowColor: 'hover:shadow-accent/15',
    },
    {
      href: '/?time=week',
      icon: BarChart3,
      value: stats.weekCount,
      label: 'This Week',
      gradient: 'from-secondary/50 via-secondary/25 to-secondary/10',
      border: 'border-border hover:border-primary/30',
      iconBg: 'bg-gradient-to-br from-muted-foreground/80 to-muted-foreground/60',
      iconShadow: 'shadow-muted-foreground/20',
      textColor: 'text-muted-foreground',
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

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 mb-6 md:mb-8">
          {metricCards.map((card, index) => (
            <Link key={index} to={card.href} className="group">
              <Card className={`relative overflow-hidden bg-gradient-to-br ${card.gradient} border ${card.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${card.glowColor} h-full`}>
                {/* Decorative corner glow */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-foreground/3 to-transparent rounded-bl-[60px] group-hover:scale-125 transition-transform duration-500" />
                <CardContent className="p-3 sm:p-4 md:p-6 relative">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className={`p-2 sm:p-2.5 ${card.iconBg} rounded-xl shadow-lg ${card.iconShadow} group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                      <card.icon className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tabular-nums">{card.value}</p>
                      <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">{card.label}</p>
                    </div>
                  </div>
                  {/* Subtle progress indicator */}
                  <div className="mt-3 h-0.5 w-full bg-border/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${card.iconBg} rounded-full transition-all duration-1000`} 
                      style={{ width: `${Math.min(100, (card.value / Math.max(stats.totalCount, 1)) * 100 + 15)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
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
