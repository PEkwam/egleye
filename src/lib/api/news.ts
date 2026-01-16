import { supabase } from '@/integrations/supabase/client';
import type { NewsArticle, NewsCategory } from '@/types/news';
import type { TimeRange } from '@/components/TimeFilter';
import { startOfDay, startOfWeek, startOfMonth, format } from 'date-fns';

// Minimum date for news - January 2025
const MIN_NEWS_DATE = '2025-01-01';

// Get date range based on time filter
function getTimeRangeDate(timeRange: TimeRange): string {
  const now = new Date();
  
  switch (timeRange) {
    case 'today':
      return format(startOfDay(now), 'yyyy-MM-dd');
    case 'week':
      return format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'month':
      return format(startOfMonth(now), 'yyyy-MM-dd');
    case 'all':
    default:
      return MIN_NEWS_DATE;
  }
}

export const newsApi = {
  async getArticles(options?: {
    category?: NewsCategory;
    limit?: number;
    featured?: boolean;
    timeRange?: TimeRange;
  }): Promise<NewsArticle[]> {
    const minDate = options?.timeRange ? getTimeRangeDate(options.timeRange) : MIN_NEWS_DATE;
    
    let query = supabase
      .from('news_articles')
      .select('*')
      .gte('published_at', minDate)
      .order('published_at', { ascending: false, nullsFirst: false });

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    if (options?.featured !== undefined) {
      query = query.eq('is_featured', options.featured);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching articles:', error);
      throw error;
    }

    return (data || []) as NewsArticle[];
  },

  async getFeaturedArticle(): Promise<NewsArticle | null> {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .eq('is_featured', true)
      .gte('published_at', MIN_NEWS_DATE)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching featured article:', error);
      return null;
    }

    return data as NewsArticle | null;
  },

  async searchArticles(query: string): Promise<NewsArticle[]> {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .gte('published_at', MIN_NEWS_DATE)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('published_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error searching articles:', error);
      throw error;
    }

    return (data || []) as NewsArticle[];
  },

  async triggerNewsCrawl(): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase.functions.invoke('crawl-insurance-news');

    if (error) {
      console.error('Error triggering news crawl:', error);
      return { success: false, message: error.message };
    }

    return data;
  },
};
