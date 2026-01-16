import { Zap, MapPin } from 'lucide-react';
import type { NewsArticle } from '@/types/news';

interface BreakingTickerProps {
  articles: NewsArticle[];
}

export function BreakingTicker({ articles }: BreakingTickerProps) {
  if (articles.length === 0) {
    return (
      <div className="bg-primary">
        <div className="container mx-auto px-4 flex items-center">
          <div className="flex-shrink-0 flex items-center gap-2 py-2 md:py-3 pr-3 md:pr-6 border-r border-white/20">
            <div className="breaking-badge text-[10px] md:text-xs px-2 md:px-3">
              <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3" />
              <span className="hidden xs:inline">GHANA</span>
              <span className="xs:hidden">GH</span>
            </div>
          </div>
          <div className="py-2 md:py-3 px-3 md:px-6 text-white/80 text-xs md:text-sm truncate">
            Ghana Insurance News Portal - Click "Refresh" to fetch the latest news
          </div>
        </div>
      </div>
    );
  }

  // Duplicate articles for seamless infinite scroll
  const tickerItems = [...articles, ...articles];

  return (
    <div className="bg-primary">
      <div className="container mx-auto px-4 flex items-center">
        <div className="flex-shrink-0 flex items-center gap-2 py-2 md:py-3 pr-3 md:pr-6 border-r border-white/20">
          <div className="breaking-badge text-[10px] md:text-xs px-2 md:px-3">
            <Zap className="h-2.5 w-2.5 md:h-3 md:w-3" />
            <span>LIVE</span>
          </div>
        </div>
        
        <div className="overflow-hidden flex-1">
          <div className="ticker-track">
            {tickerItems.map((article, index) => (
              <a
                key={`${article.id}-${index}`}
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ticker-item group py-2 md:py-3 px-4 md:px-8 text-sm md:text-base"
              >
                <span className="group-hover:underline line-clamp-1">{article.title}</span>
                {article.source_name && (
                  <span className="text-white/60 text-xs md:text-sm hidden sm:inline">— {article.source_name}</span>
                )}
                <span className="ticker-divider" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
