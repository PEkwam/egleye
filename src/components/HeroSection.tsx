import { NewsCard } from './NewsCard';
import type { NewsArticle } from '@/types/news';
import { Skeleton } from '@/components/ui/skeleton';
import { Newspaper, MapPin, Clock, TrendingUp, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { categoryLabels, categoryColors } from '@/types/news';
import { sanitizeText } from '@/lib/utils/text';

interface HeroSectionProps {
  featuredArticle: NewsArticle | null;
  latestArticles: NewsArticle[];
  isLoading?: boolean;
}

export function HeroSection({ featuredArticle, latestArticles, isLoading }: HeroSectionProps) {
  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="w-full h-[280px] sm:h-[500px] rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="w-40 h-8" />
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="w-full h-28 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!featuredArticle && latestArticles.length === 0) {
    return (
      <section className="container mx-auto px-4 py-16">
        <div className="text-center py-24 glass-card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="relative">
            <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center shadow-xl animate-float">
              <Newspaper className="h-12 w-12 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-bold font-display mb-4 text-foreground">
              Welcome to Ghana InsureWatch
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Your source for Ghana insurance industry news, including Enterprise Group updates and NIC regulatory news.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Covering Ghana's Insurance Industry</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Auto-updates every hour</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const sidebarArticles = latestArticles.slice(0, 4);
  const hero = featuredArticle || latestArticles[0];

  return (
    <section className="relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/6 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 py-6 md:py-10 relative">
        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Featured Article */}
          <div className="lg:col-span-2 animate-fade-in">
            {hero && (
              <>
                {/* Mobile: Glassmorphism featured card */}
                <a
                  href={hero.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sm:hidden group relative block rounded-2xl overflow-hidden border border-primary/20 hover:border-primary/40 transition-all duration-500 shadow-lg hover:shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-primary/70" />
                  {hero.image_url && (
                    <img
                      src={hero.image_url}
                      alt={hero.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-700"
                      loading="lazy"
                    />
                  )}
                  <div className="relative p-5 min-h-[220px] flex flex-col justify-end">
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-white/20 text-primary-foreground border-0 backdrop-blur-md text-[10px] shadow-lg">
                        <Zap className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 mb-2.5">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-lg shadow-sm ${categoryColors[hero.category]}`}>
                        {categoryLabels[hero.category]}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-primary-foreground font-display mb-2.5 leading-tight line-clamp-3">
                      {sanitizeText(hero.title)}
                    </h3>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-primary-foreground/60">
                        <Clock className="h-3 w-3" />
                        <span>
                          {hero.published_at
                            ? formatDistanceToNow(new Date(hero.published_at), { addSuffix: true })
                            : 'Recently'}
                        </span>
                      </div>
                      {hero.source_name && (
                        <span className="text-[11px] text-primary-foreground/50 truncate max-w-[100px]">
                          {hero.source_name}
                        </span>
                      )}
                    </div>
                  </div>
                </a>

                {/* Desktop: Full-size hero card */}
                <div className="hidden sm:block">
                  <NewsCard article={hero} variant="featured" />
                </div>
              </>
            )}
          </div>

          {/* Latest News Sidebar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm md:text-lg font-semibold font-display text-foreground flex items-center gap-2">
                <div className="relative">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary block animate-pulse" />
                  <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-primary animate-ping opacity-40" />
                </div>
                Latest from Ghana
              </h3>
              <Sparkles className="h-4 w-4 text-accent hidden md:block" />
            </div>
            <div className="flex flex-col gap-2.5 lg:gap-3">
              {sidebarArticles.map((article, index) => (
                <div
                  key={article.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <NewsCard article={article} variant="compact" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
