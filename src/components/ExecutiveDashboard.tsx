import { useMemo } from 'react';
import { TrendingUp, AlertTriangle, Building2, Clock, FileText, Shield } from 'lucide-react';
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
    
    // Critical updates - regulator news from today/this week
    const criticalUpdates = regulatorArticles.filter(a => 
      a.published_at && (isToday(new Date(a.published_at)) || isThisWeek(new Date(a.published_at)))
    );

    // Categorize by type
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

  return (
    <section className="container mx-auto px-4 py-6 md:py-8">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Executive Dashboard
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Real-time Ghana insurance intelligence • Updated {format(new Date(), 'MMM d, h:mm a')}
          </p>
        </div>
        {stats.criticalCount > 0 && (
          <Badge variant="destructive" className="animate-pulse flex items-center gap-1 self-start sm:self-auto">
            <AlertTriangle className="h-3 w-3" />
            {stats.criticalCount} Critical Update{stats.criticalCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Key Metrics Grid - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="p-2 bg-primary/20 rounded-lg w-fit">
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.todayCount}</p>
                <p className="text-xs md:text-sm text-muted-foreground">Today's News</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="p-2 bg-destructive/20 rounded-lg w-fit">
                <Shield className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.regulatorCount}</p>
                <p className="text-xs md:text-sm text-muted-foreground">NIC Updates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="p-2 bg-accent/20 rounded-lg w-fit">
                <Building2 className="h-4 w-4 md:h-5 md:w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.enterpriseCount}</p>
                <p className="text-xs md:text-sm text-muted-foreground">Enterprise</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/30 to-secondary/10 border-secondary/30">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="p-2 bg-secondary rounded-lg w-fit">
                <FileText className="h-4 w-4 md:h-5 md:w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.weekCount}</p>
                <p className="text-xs md:text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Alert - Latest Regulator News */}
      {stats.latestRegulator && (
        <Card className="border-l-4 border-l-destructive bg-destructive/5 mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
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
              <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
                {stats.latestRegulator.title}
              </h3>
            </a>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {sanitizeText(stats.latestRegulator.description)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.latestRegulator.published_at &&
                format(new Date(stats.latestRegulator.published_at), 'MMM d, yyyy • h:mm a')}
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
