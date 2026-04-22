import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Newspaper, ExternalLink } from 'lucide-react';
import type { NewsArticle, NewsCategory } from '@/types/news';
import { categoryLabels } from '@/types/news';
import { sanitizeText } from '@/lib/utils/text';
import { NewsReaderModal } from './NewsReaderModal';

interface NewArticleAlertContextValue {
  openArticle: (article: NewsArticle) => void;
  registerArticles: (articles: NewsArticle[]) => void;
}

const NewArticleAlertContext = createContext<NewArticleAlertContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
}

/** Rich, branded toast for a single new article. */
function NewArticleToast({
  article,
  extraCount,
  onRead,
}: {
  article: NewsArticle;
  extraCount: number;
  onRead: () => void;
}) {
  const label = categoryLabels[article.category as NewsCategory] ?? 'Insurance News';
  return (
    <div className="flex gap-3 w-full max-w-[380px]">
      {article.image_url ? (
        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
          <img
            src={article.image_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-primary/10 flex items-center justify-center">
          <Newspaper className="h-6 w-6 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            New • {label}
          </span>
          {article.source_name && (
            <span className="text-[10px] text-muted-foreground truncate">
              · {article.source_name}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
          {sanitizeText(article.title)}
        </p>
        {extraCount > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            +{extraCount} more new {extraCount === 1 ? 'story' : 'stories'}
          </p>
        )}
        <button
          type="button"
          onClick={onRead}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Read now <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function NewArticleAlertProvider({ children }: ProviderProps) {
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);
  const [open, setOpen] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const openArticle = useCallback((article: NewsArticle) => {
    setActiveArticle(article);
    setOpen(true);
  }, []);

  const registerArticles = useCallback((articles: NewsArticle[]) => {
    if (!Array.isArray(articles) || articles.length === 0) return;

    // First batch — just record what we've seen, don't notify.
    if (!initializedRef.current) {
      articles.forEach((a) => a?.id && seenIdsRef.current.add(a.id));
      initializedRef.current = true;
      return;
    }

    // Find articles we haven't seen before
    const fresh = articles.filter((a) => a?.id && !seenIdsRef.current.has(a.id));
    if (fresh.length === 0) return;

    fresh.forEach((a) => seenIdsRef.current.add(a.id));

    const latest = fresh[0];
    const extraCount = fresh.length - 1;

    toast.custom(
      (id) => (
        <div className="bg-background border border-border/60 rounded-xl shadow-2xl p-3.5 backdrop-blur-xl ring-1 ring-primary/10">
          <NewArticleToast
            article={latest}
            extraCount={extraCount}
            onRead={() => {
              openArticle(latest);
              toast.dismiss(id);
            }}
          />
        </div>
      ),
      {
        duration: 10000,
        position: 'top-right',
      },
    );
  }, [openArticle]);

  return (
    <NewArticleAlertContext.Provider value={{ openArticle, registerArticles }}>
      {children}
      <NewsReaderModal article={activeArticle} open={open} onOpenChange={setOpen} />
    </NewArticleAlertContext.Provider>
  );
}

export function useNewArticleAlerts() {
  const ctx = useContext(NewArticleAlertContext);
  if (!ctx) throw new Error('useNewArticleAlerts must be used within NewArticleAlertProvider');
  return ctx;
}

/**
 * Optional consumer — returns null if provider isn't mounted, so news cards
 * can be rendered outside the home feed (e.g. dashboards) without crashing.
 */
export function useNewArticleAlertsOptional() {
  return useContext(NewArticleAlertContext);
}

// Hook helper: re-register articles whenever the underlying list changes.
export function useTrackArticles(articles: NewsArticle[] | undefined) {
  const ctx = useContext(NewArticleAlertContext);
  useEffect(() => {
    if (!ctx || !articles) return;
    ctx.registerArticles(articles);
  }, [articles, ctx]);
}
