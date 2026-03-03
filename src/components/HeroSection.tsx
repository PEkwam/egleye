import { Link } from 'react-router-dom';
import { NewsCard } from './NewsCard';
import type { NewsArticle } from '@/types/news';
import { Skeleton } from '@/components/ui/skeleton';
import { Newspaper, MapPin, Clock, ExternalLink, TrendingUp } from 'lucide-react';
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
        <div className="text-center py-24 glass-card">
          <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-primary via-yellow-500 to-red-600 flex items-center justify-center shadow-xl animate-float">
            <Newspaper className="h-12 w-12 text-white" />
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
      </section>
    );
  }

  const sidebarArticles = latestArticles.slice(0, 4);
  const hero = featuredArticle || latestArticles[0];

  return (
    <section className="container mx-auto px-4 py-6 md:py-8">
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Featured Article - NIC-style card on mobile, full hero on desktop */}
        <div className="lg:col-span-2 animate-fade-in">
          {hero && (
            <>
              {/* Mobile: NIC-style compact card */}
              <a
                href={hero.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="sm:hidden group relative block rounded-2xl overflow-hidden border border-primary/20 hover:border-primary/40 transition-all duration-500"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" />
                {hero.image_url && (
                  <img
                    src={hero.image_url}
                    alt={hero.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                  />
                )}
                <div className="relative p-4 min-h-[220px] flex flex-col justify-end">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-[10px]">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-md ${categoryColors[hero.category]}`}>
                      {categoryLabels[hero.category]}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white font-display mb-3 group-hover:text-white/90 transition-colors leading-tight line-clamp-3">
                    {hero.title}
                  </h3>

                  {hero.description && (
                    <p className="text-white/70 text-sm line-clamp-2 mb-4">
                      {sanitizeText(hero.description)}
                    </p>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-white/60">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {hero.published_at
                          ? formatDistanceToNow(new Date(hero.published_at), { addSuffix: true })
                          : 'Recently'}
                      </span>
                    </div>
                    {hero.source_name && (
                      <span className="text-xs text-white/50 truncate max-w-[100px]">
                        {hero.source_name}
                      </span>
                    )}
                  </div>
                </div>
              </a>

              {/* Desktop: Original full-size hero card */}
              <div className="hidden sm:block">
                <NewsCard article={hero} variant="featured" />
              </div>
            </>
          )}
        </div>

        {/* Latest News Sidebar */}
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base md:text-lg font-semibold font-display text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Latest from Ghana
            </h3>
          </div>
          {/* Horizontal scroll on mobile, vertical on desktop */}
          <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0 snap-x snap-mandatory lg:snap-none">
            {sidebarArticles.map((article, index) => (
              <div
                key={article.id}
                className="animate-slide-up min-w-[280px] lg:min-w-0 snap-start"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <NewsCard article={article} variant="compact" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
