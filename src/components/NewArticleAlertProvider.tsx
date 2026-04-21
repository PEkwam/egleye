import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Newspaper } from 'lucide-react';
import type { NewsArticle } from '@/types/news';
import { NewsReaderModal } from './NewsReaderModal';

interface NewArticleAlertContextValue {
  openArticle: (article: NewsArticle) => void;
  registerArticles: (articles: NewsArticle[]) => void;
}

const NewArticleAlertContext = createContext<NewArticleAlertContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
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

    // Notify on the most recent fresh article (single toast to avoid spam)
    const latest = fresh[0];
    const extraCount = fresh.length - 1;
    const description = extraCount > 0
      ? `${latest.title} +${extraCount} more new ${extraCount === 1 ? 'story' : 'stories'}`
      : latest.title;

    toast(`New insurance news`, {
      description,
      icon: <Newspaper className="h-4 w-4 text-primary" />,
      duration: 8000,
      action: {
        label: 'Read',
        onClick: () => openArticle(latest),
      },
    });
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
