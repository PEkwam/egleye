import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, AlertCircle, ChevronRight, Bell, ExternalLink, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import type { NewsArticle } from '@/types/news';

interface NICSectionProps {
  articles: NewsArticle[];
  isLoading?: boolean;
  onViewAll?: () => void;
}

export function NICSection({ articles, isLoading, onViewAll }: NICSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-rotate featured article
  useEffect(() => {
    if (articles.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.min(articles.length, 3));
    }, 5000);
    return () => clearInterval(interval);
  }, [articles.length]);

  if (isLoading) {
    return (
      <section className="py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="flex items-center gap-3 mb-8">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (articles.length === 0) return null;

  const featuredArticle = articles[currentIndex];
  const listArticles = articles.filter((_, i) => i !== currentIndex).slice(0, 4);

  return (
    <section className="py-12 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/10 via-transparent to-transparent dark:from-emerald-950/30" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-white shadow-lg flex items-center justify-center overflow-hidden border border-emerald-500/20">
                <img 
                  src="/logos/nic-ghana-logo.png" 
                  alt="NIC Logo" 
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-background flex items-center justify-center">
                <Bell className="h-2 w-2 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display text-foreground">
                NIC Regulatory Updates
              </h2>
              <p className="text-sm text-muted-foreground">
                National Insurance Commission • Circulars & Directives
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={onViewAll}
            className="hidden sm:flex items-center gap-2 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Featured Article */}
          <Link
            to={`/article/${featuredArticle.id}`}
            className="lg:col-span-2 group relative rounded-2xl overflow-hidden glass-effect border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-500"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/90 to-emerald-800/90" />
            {featuredArticle.image_url && (
              <img
                src={featuredArticle.image_url}
                alt={featuredArticle.title}
                className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500"
              />
            )}
            
            <div className="relative p-4 sm:p-8 h-full min-h-[280px] sm:min-h-[320px] flex flex-col justify-end">
              {/* Decorative */}
              <div className="absolute top-6 right-6 flex gap-2">
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                  <FileText className="h-3 w-3 mr-1" />
                  Official
                </Badge>
                {currentIndex > 0 && (
                  <div className="flex gap-1">
                    {[0, 1, 2].slice(0, Math.min(articles.length, 3)).map((i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === currentIndex ? 'bg-white w-4' : 'bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-emerald-300" />
                <span className="text-emerald-200 text-sm font-medium">Regulatory Alert</span>
              </div>
              
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-display mb-3 sm:mb-4 group-hover:text-emerald-100 transition-colors">
                {featuredArticle.title}
              </h3>
              
              {featuredArticle.description && (
                <p className="text-emerald-100/80 line-clamp-2 mb-6 max-w-2xl">
                  {featuredArticle.description}
                </p>
              )}
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-emerald-200/70">
                  <Clock className="h-4 w-4" />
                  <span>
                    {featuredArticle.published_at
                      ? formatDistanceToNow(new Date(featuredArticle.published_at), { addSuffix: true })
                      : 'Recently'}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity text-sm text-white">
                  Read Full Update
                  <ExternalLink className="h-3 w-3" />
                </div>
              </div>
            </div>
          </Link>

          {/* Article List */}
          <div className="space-y-4">
            {listArticles.map((article, index) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className="group block p-4 rounded-xl glass-effect border border-border/50 hover:border-emerald-500/30 hover:shadow-lg transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-emerald-600 transition-colors">
                      {article.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {article.published_at
                          ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true })
                          : 'Recently'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}

            {/* Mobile View All */}
            <Button
              variant="outline"
              onClick={onViewAll}
              className="w-full sm:hidden flex items-center justify-center gap-2 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
            >
              View All NIC Updates
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}