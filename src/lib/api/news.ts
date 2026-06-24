import { supabase } from '@/integrations/supabase/client';
import type { NewsArticle, NewsCategory } from '@/types/news';
import type { TimeRange } from '@/components/TimeFilter';
import { startOfDay, startOfWeek, startOfMonth, format } from 'date-fns';
import { filterInsuranceArticles } from '@/lib/utils/insuranceFilter';

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

    // Defense-in-depth: enforce insurance-only news at the display layer.
    return filterInsuranceArticles((data || []) as NewsArticle[]);
  },

  async getFeaturedArticle(timeRange?: TimeRange): Promise<NewsArticle | null> {
    const minDate = timeRange ? getTimeRangeDate(timeRange) : MIN_NEWS_DATE;

    // Pull a few candidates so we can drop any non-insurance items at the edge.
    const { data: featured } = await supabase
      .from('news_articles')
      .select('*')
      .eq('is_featured', true)
      .gte('published_at', minDate)
      .order('published_at', { ascending: false })
      .limit(10);

    const featuredInsurance = filterInsuranceArticles((featured || []) as NewsArticle[]);
    if (featuredInsurance.length > 0) return featuredInsurance[0];

    const { data: latest } = await supabase
      .from('news_articles')
      .select('*')
      .gte('published_at', minDate)
      .order('published_at', { ascending: false })
      .limit(20);

    const latestInsurance = filterInsuranceArticles((latest || []) as NewsArticle[]);
    return latestInsurance[0] ?? null;
  },

  async searchArticles(query: string): Promise<NewsArticle[]> {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .gte('published_at', MIN_NEWS_DATE)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('published_at', { ascending: false })
      .limit(40);

    if (error) {
      console.error('Error searching articles:', error);
      throw error;
    }

    return filterInsuranceArticles((data || []) as NewsArticle[]);
  },

  async triggerNewsCrawl(): Promise<{ success: boolean; message: string }> {
    // Crawling is now triggered exclusively by the scheduled cron job (every 15 minutes)
    // and by admins via the DataAdmin panel. End-user "refresh" requests simply
    // re-fetch the latest articles from the database instead of invoking the
    // unauthenticated edge function (which would let any visitor burn AI credits).
    return { success: true, message: 'Showing latest available articles.' };
  },
};
