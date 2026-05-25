import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { Header } from '@/components/Header';
import { BreakingTicker } from '@/components/BreakingTicker';
import { NewsFilterBar } from '@/components/NewsFilterBar';
import { NewArticleAlertProvider, useTrackArticles, useNewArticleAlerts } from '@/components/NewArticleAlertProvider';
import { DesktopAlertsButton } from '@/components/DesktopAlertsButton';
import { CommandPalette } from '@/components/CommandPalette';
import { ScrollProgressBar } from '@/components/ScrollProgressBar';
import { supabase } from '@/integrations/supabase/client';

import { TimeFilter, type TimeRange } from '@/components/TimeFilter';
import { InsurerComparison } from '@/components/InsurerComparison';
import { Footer } from '@/components/Footer';
import { useNews, useNewsSearch } from '@/hooks/useNews';
import type { NewsCategory, NewsArticle } from '@/types/news';
import { categoryLabels } from '@/types/news';
import type { GhanaInsurer, InsuranceCategory } from '@/types/insurers';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Below-the-fold heavy sections — code-split to shrink the initial bundle.
const HeroSection = lazy(() => import('@/components/HeroSection').then(m => ({ default: m.HeroSection })));
const NewsGrid = lazy(() => import('@/components/NewsGrid').then(m => ({ default: m.NewsGrid })));
const EnterpriseSection = lazy(() => import('@/components/EnterpriseSection').then(m => ({ default: m.EnterpriseSection })));
const NICSection = lazy(() => import('@/components/NICSection').then(m => ({ default: m.NICSection })));
const NPRASection = lazy(() => import('@/components/NPRASection').then(m => ({ default: m.NPRASection })));
const ExecutiveDashboard = lazy(() => import('@/components/ExecutiveDashboard').then(m => ({ default: m.ExecutiveDashboard })));
const AINewsDigest = lazy(() => import('@/components/AINewsDigest').then(m => ({ default: m.AINewsDigest })));

const SectionFallback = () => <div className="container mx-auto px-4 py-8 h-32 animate-pulse bg-muted/20 rounded-lg" />;

// Auto-refresh interval in milliseconds (5 minutes)
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

const IndexInner = () => {
  const [activeCategory, setActiveCategory] = useState<NewsCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [activeInsuranceCategory, setActiveInsuranceCategory] = useState<InsuranceCategory | null>(null);
  const [selectedInsurer, setSelectedInsurer] = useState<GhanaInsurer | null>(null);

  // Handle time range change with scroll to top
  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

const { articles, featuredArticle, enterpriseArticles, regulatorArticles, isLoading, refetch } = useNews(activeCategory, timeRange);
  const pensionArticles = useMemo(() => articles.filter(a => a.category === 'pensions'), [articles]);
  const { results: searchResults, isLoading: isSearching } = useNewsSearch(searchQuery);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Detect newly-arrived articles for the in-app toast alert
  useTrackArticles(articles);
  const { openArticle } = useNewArticleAlerts();

  // Deep-link: open reader modal when arriving via ?article=ID (push notification click)
  useEffect(() => {
    const url = new URL(window.location.href);
    const articleId = url.searchParams.get('article');
    if (!articleId) return;
    (async () => {
      const { data } = await supabase.from('news_articles').select('*').eq('id', articleId).maybeSingle();
      if (data) {
        openArticle(data as unknown as NewsArticle);
        url.searchParams.delete('article');
        window.history.replaceState({}, '', url.toString());
      }
    })();
  }, [openArticle]);

  // Listen for messages from the push service worker (already-open tab path)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = async (event: MessageEvent) => {
      if (event.data?.type !== 'OPEN_ARTICLE' || !event.data.articleId) return;
      const { data } = await supabase
        .from('news_articles')
        .select('*')
        .eq('id', event.data.articleId)
        .maybeSingle();
      if (data) openArticle(data as unknown as NewsArticle);
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [openArticle]);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Feed refreshed successfully', { duration: 2000 });
    } catch (error) {
      toast.error('Failed to refresh feed');
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  // Auto-refresh news every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      toast.info('News feed auto-refreshed', { duration: 2000 });
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [refetch]);

  const displayArticles = useMemo(() => {
    const raw = searchQuery.length > 2 ? searchResults : articles;
    return raw.filter((a): a is NewsArticle => a != null && typeof a.id === 'string');
  }, [articles, searchResults, searchQuery]);

  const handleCategoryChange = (category: NewsCategory | 'all') => {
    setActiveCategory(category);
    setSearchQuery('');
    setActiveInsuranceCategory(null);
    setSelectedInsurer(null);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 0) {
      setActiveCategory('all');
    }
  };

  const handleInsurerSelect = (insurer: GhanaInsurer) => {
    setSelectedInsurer(insurer);
    setActiveInsuranceCategory(insurer.category);
  };

  const showHero = activeCategory === 'all' && searchQuery.length === 0 && !selectedInsurer;
  const showSections = activeCategory === 'all' && searchQuery.length === 0 && !selectedInsurer;

  // Filter out featured and sidebar articles for the grid when showing hero
  const gridArticles = showHero
    ? displayArticles.filter((a) => a.id !== featuredArticle?.id).slice(4)
    : displayArticles;

  const gridTitle = searchQuery.length > 2
    ? `Search results for "${searchQuery}" (${displayArticles.length})`
    : selectedInsurer
    ? `${selectedInsurer.shortName} News`
    : activeCategory !== 'all'
    ? `${categoryLabels[activeCategory]} News (${articles.length})`
    : showHero
    ? `More Stories (${gridArticles.length} of ${articles.length})`
    : `All News (${articles.length})`;

  // Get latest articles for the ticker - prioritize regulator news
  const tickerArticles = useMemo(() => {
    const regulatorNews = articles.filter((a) => a.category === 'regulator');
    const otherNews = articles.filter((a) => a.category !== 'regulator');
    return [...regulatorNews, ...otherNews].slice(0, 8);
  }, [articles]);


  return (
    <div className="min-h-screen bg-background mesh-gradient">
      <ScrollProgressBar />
      <CommandPalette />
      {/* Breaking News Ticker */}
      <BreakingTicker articles={tickerArticles} />
      
      <Header
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        onSearch={handleSearch}
        onInsurerSelect={handleInsurerSelect}
        activeInsuranceCategory={activeInsuranceCategory}
      />

      {/* News Filter Bar */}
      <NewsFilterBar
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        articleCount={articles.length}
      />

      {/* Filters Section - Modern glassmorphism bar */}
      <div className="container mx-auto px-3 sm:px-4 py-2.5 md:py-3 border-b border-border/30">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
            <TimeFilter selected={timeRange} onChange={handleTimeRangeChange} />
            <div className="hidden md:block">
              <InsurerComparison />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <DesktopAlertsButton audience="public" />
            <div className="text-[10px] sm:text-xs bg-primary/10 text-primary px-2.5 py-1 sm:py-1.5 rounded-full font-semibold flex items-center gap-1.5 border border-primary/15 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="hidden sm:inline">Insurance News Only</span>
              <span className="sm:hidden">Live</span>
            </div>
          </div>
        </div>
      </div>

      <main>
        <Suspense fallback={<SectionFallback />}>
          {/* Executive Dashboard */}
          {showSections && (
            <ExecutiveDashboard
              articles={articles}
              regulatorArticles={regulatorArticles}
              enterpriseArticles={enterpriseArticles}
              isLoading={isLoading}
            />
          )}

          {/* AI News Digest */}
          {showSections && <AINewsDigest />}

          {showHero && (
            <HeroSection
              featuredArticle={featuredArticle}
              latestArticles={displayArticles.filter((a) => a.id !== featuredArticle?.id)}
              isLoading={isLoading}
            />
          )}

          {/* NIC Regulatory Section */}
          {showSections && (
            <NICSection
              articles={regulatorArticles}
              onViewAll={() => handleCategoryChange('regulator')}
              isLoading={isLoading}
            />
          )}

          {/* NPRA Pension Section */}
          {showSections && pensionArticles.length > 0 && (
            <NPRASection
              articles={pensionArticles}
              onViewAll={() => handleCategoryChange('pensions')}
              isLoading={isLoading}
            />
          )}

          {showSections && enterpriseArticles.length > 0 && (
            <EnterpriseSection
              articles={enterpriseArticles}
              onViewAll={() => handleCategoryChange('enterprise_group')}
              isLoading={isLoading}
            />
          )}

          <NewsGrid
            articles={gridArticles}
            title={gridTitle}
            category={activeCategory}
            isLoading={isLoading || isSearching}
          />
        </Suspense>
      </main>


      <Footer />
    </div>
  );
};

const Index = () => (
  <NewArticleAlertProvider>
    <IndexInner />
  </NewArticleAlertProvider>
);

export default Index;
