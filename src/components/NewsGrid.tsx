import { NewsCard } from './NewsCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { NewsArticle, NewsCategory } from '@/types/news';
import { categoryLabels } from '@/types/news';
import { Layers } from 'lucide-react';

interface NewsGridProps {
  articles: NewsArticle[];
  title?: string;
  category?: NewsCategory | 'all';
  isLoading?: boolean;
}

export function NewsGrid({ articles, title, category, isLoading }: NewsGridProps) {
  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-8">
        {title && <Skeleton className="w-48 h-10 mb-8" />}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="w-full h-80 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (articles.length === 0) {
    return (
      <section className="container mx-auto px-4 py-8">
        <div className="text-center py-20 glass-card">
          <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-secondary flex items-center justify-center">
            <Layers className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-lg">
            {category && category !== 'all'
              ? `No ${categoryLabels[category]} news articles yet.`
              : 'No news articles found.'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Click "Refresh" to fetch the latest news
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-6 md:py-8">
      {title && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-6 md:mb-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-display text-foreground">{title}</h2>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {articles.map((article, index) => (
          <div
            key={article.id}
            className="animate-slide-up"
            style={{ animationDelay: `${(index % 8) * 50}ms` }}
          >
            <NewsCard article={article} />
          </div>
        ))}
      </div>
    </section>
  );
}
