import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, AlertCircle, ChevronRight, Bell, ExternalLink, Clock, Zap } from 'lucide-react';
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
    <section className="py-10 sm:py-14 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-emerald-400/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-0 w-[250px] h-[250px] bg-teal-500/4 rounded-full blur-[80px]" />
      </div>
      
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-2xl blur-sm group-hover:blur-md transition-all" />
              <div className="relative w-14 h-14 rounded-xl bg-card shadow-lg flex items-center justify-center overflow-hidden border border-emerald-500/25">
                <img 
                  src="/logos/nic-ghana-logo.png" 
                  alt="NIC Logo" 
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-rose-600 border-2 border-background flex items-center justify-center shadow-lg shadow-red-500/30">
                <Bell className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground flex items-center gap-2">
                NIC Regulatory Updates
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-semibold hidden sm:inline-flex">
                  <Zap className="h-3 w-3 mr-0.5" />
                  Live
                </Badge>
              </h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-50"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                National Insurance Commission • Circulars & Directives
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={onViewAll}
            className="hidden sm:flex items-center gap-2 rounded-xl border-emerald-500/25 text-emerald-600 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-3 gap-5 md:gap-6">
          {/* Featured Article */}
          <Link
            to={`/article/${featuredArticle.id}`}
            className="lg:col-span-2 group relative rounded-2xl overflow-hidden border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-500 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/92 via-emerald-700/88 to-teal-800/90" />
            {featuredArticle.image_url && (
              <img
                src={featuredArticle.image_url}
                alt={featuredArticle.title}
                className="absolute inset-0 w-full h-full object-cover opacity-15 group-hover:opacity-25 group-hover:scale-105 transition-all duration-700"
              />
            )}
            
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-300/10 to-transparent rounded-bl-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-teal-300/8 to-transparent rounded-tr-[80px] pointer-events-none" />
            
            <div className="relative p-5 sm:p-8 h-full min-h-[280px] sm:min-h-[320px] flex flex-col justify-end">
              {/* Top badges */}
              <div className="absolute top-5 sm:top-6 right-5 sm:right-6 flex gap-2 items-center">
                <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 backdrop-blur-md shadow-lg text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Official
                </Badge>
                {articles.length > 1 && (
                  <div className="flex gap-1.5">
                    {[0, 1, 2].slice(0, Math.min(articles.length, 3)).map((i) => (
                      <div
                        key={i}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === currentIndex ? 'bg-primary-foreground w-5' : 'bg-primary-foreground/30 w-2'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-primary-foreground/10 backdrop-blur-sm">
                  <AlertCircle className="h-4 w-4 text-emerald-200" />
                </div>
                <span className="text-emerald-100 text-sm font-semibold">Regulatory Alert</span>
              </div>
              
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground font-display mb-3 sm:mb-4 group-hover:text-emerald-50 transition-colors leading-tight">
                {featuredArticle.title}
              </h3>
              
              {featuredArticle.description && (
                <p className="text-emerald-100/75 line-clamp-2 mb-5 max-w-2xl text-sm sm:text-base">
                  {featuredArticle.description}
                </p>
              )}
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-emerald-200/60 px-3 py-1.5 rounded-full bg-primary-foreground/5 backdrop-blur-sm">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {featuredArticle.published_at
                      ? formatDistanceToNow(new Date(featuredArticle.published_at), { addSuffix: true })
                      : 'Recently'}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 text-sm text-primary-foreground shadow-lg">
                  Read Full Update
                  <ExternalLink className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </Link>

          {/* Article List */}
          <div className="space-y-3">
            {listArticles.map((article, index) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className="group block p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 flex items-center justify-center shrink-0 group-hover:from-emerald-500/25 group-hover:to-teal-500/15 group-hover:scale-110 transition-all duration-300 border border-emerald-500/10">
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
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all mt-1" />
                </div>
              </Link>
            ))}

            {/* Mobile View All */}
            <Button
              variant="outline"
              onClick={onViewAll}
              className="w-full sm:hidden flex items-center justify-center gap-2 rounded-xl border-emerald-500/25 text-emerald-600 hover:bg-emerald-500/10 hover:shadow-lg transition-all"
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
