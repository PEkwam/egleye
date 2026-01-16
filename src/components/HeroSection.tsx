import { NewsCard } from './NewsCard';
import type { NewsArticle } from '@/types/news';
import { Skeleton } from '@/components/ui/skeleton';
import { Newspaper, MapPin } from 'lucide-react';

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
            <Skeleton className="w-full h-[500px] rounded-2xl" />
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

  return (
    <section className="container mx-auto px-4 py-6 md:py-8">
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Featured Article */}
        <div className="lg:col-span-2 animate-fade-in">
          {featuredArticle ? (
            <NewsCard article={featuredArticle} variant="featured" />
          ) : latestArticles[0] ? (
            <NewsCard article={latestArticles[0]} variant="featured" />
          ) : null}
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
