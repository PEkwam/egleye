import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { newsApi } from '@/lib/api/news';
import type { NewsArticle, NewsCategory } from '@/types/news';
import type { TimeRange } from '@/components/TimeFilter';

export function useNews(category?: NewsCategory | 'all', timeRange?: TimeRange) {
  const categoryFilter = category === 'all' ? undefined : category;

  const { data: articles = [], isLoading, refetch } = useQuery({
    queryKey: ['news-articles', categoryFilter, timeRange],
    queryFn: () => newsApi.getArticles({ category: categoryFilter, limit: 50, timeRange }),
  });

  const { data: featuredArticle } = useQuery({
    queryKey: ['featured-article', timeRange],
    queryFn: () => newsApi.getFeaturedArticle(timeRange),
  });

  const { data: enterpriseArticles = [] } = useQuery({
    queryKey: ['enterprise-group-articles', timeRange],
    queryFn: () => newsApi.getArticles({ category: 'enterprise_group', limit: 100, timeRange }),
  });

  const { data: regulatorArticles = [] } = useQuery({
    queryKey: ['regulator-articles', timeRange],
    queryFn: () => newsApi.getArticles({ category: 'regulator', limit: 100, timeRange }),
  });

  // Real-time subscription for new articles
  useEffect(() => {
    const channel = supabase
      .channel('news-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'news_articles',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    articles,
    featuredArticle,
    enterpriseArticles,
    regulatorArticles,
    isLoading,
    refetch,
  };
}

export function useNewsSearch(query: string) {
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['news-search', query],
    queryFn: () => newsApi.searchArticles(query),
    enabled: query.length > 2,
  });

  return { results, isLoading };
}
