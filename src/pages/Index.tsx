import { useState, useMemo, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { BreakingTicker } from '@/components/BreakingTicker';
import { HeroSection } from '@/components/HeroSection';
import { NewsGrid } from '@/components/NewsGrid';
import { EnterpriseSection } from '@/components/EnterpriseSection';
import { NICSection } from '@/components/NICSection';
import { NPRASection } from '@/components/NPRASection';
import { ExecutiveDashboard } from '@/components/ExecutiveDashboard';
import { MobileDashboard } from '@/components/MobileDashboard';

import { TimeFilter, type TimeRange } from '@/components/TimeFilter';
import { InsurerComparison } from '@/components/InsurerComparison';
import { HomeInsurerMetrics } from '@/components/HomeInsurerMetrics';
import { Footer } from '@/components/Footer';
import { useNews, useNewsSearch } from '@/hooks/useNews';
import type { NewsCategory } from '@/types/news';
import { categoryLabels } from '@/types/news';
import type { GhanaInsurer, InsuranceCategory } from '@/types/insurers';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Auto-refresh interval in milliseconds (5 minutes)
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

const Index = () => {
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
    return searchQuery.length > 2 ? searchResults : articles;
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
      {/* Breaking News Ticker */}
      <BreakingTicker articles={tickerArticles} />
      
      <Header
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        onSearch={handleSearch}
        onInsurerSelect={handleInsurerSelect}
        activeInsuranceCategory={activeInsuranceCategory}
      />

      {/* Filters Section - Mobile optimized */}
      <div className="container mx-auto px-3 sm:px-4 py-2 md:py-4 border-b border-border/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
            <TimeFilter selected={timeRange} onChange={handleTimeRangeChange} />
            <div className="hidden md:block">
              <InsurerComparison />
            </div>
          </div>
          <div className="text-[10px] sm:text-xs bg-primary/10 text-primary px-2 py-1 sm:py-1.5 rounded-full font-medium flex items-center gap-1 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            <span className="hidden sm:inline">Insurance News Only</span>
            <span className="sm:hidden">Live</span>
          </div>
        </div>
      </div>

      <main>
        {/* Mobile Dashboard with Swipeable Cards - removed Market Overview cards */}

        {/* Executive Dashboard - Desktop */}
        {showSections && (
          <div className="hidden md:block">
            <ExecutiveDashboard
              articles={articles}
              regulatorArticles={regulatorArticles}
              enterpriseArticles={enterpriseArticles}
              isLoading={isLoading}
            />
          </div>
        )}


        {showHero && (
          <HeroSection
            featuredArticle={featuredArticle}
            latestArticles={displayArticles.filter((a) => a.id !== featuredArticle?.id)}
            isLoading={isLoading}
          />
        )}

        {/* Life Insurance Overview removed from home page */}


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
      </main>

      <Footer />
    </div>
  );
};

export default Index;
