import { Building2, TrendingUp, Shield, ArrowRight, Award } from 'lucide-react';
import { NewsCard } from './NewsCard';
import { Button } from '@/components/ui/button';
import type { NewsArticle } from '@/types/news';
import { Skeleton } from '@/components/ui/skeleton';

interface EnterpriseSectionProps {
  articles: NewsArticle[];
  onViewAll: () => void;
  isLoading?: boolean;
}

export function EnterpriseSection({ articles, onViewAll, isLoading }: EnterpriseSectionProps) {
  if (isLoading) {
    return (
      <section className="py-16 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <Skeleton className="w-64 h-12 mb-8" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="w-full h-80 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background decoration - Gold/Yellow theme for Enterprise Group */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-amber-500/5" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-xl bg-[#8B1A4A] shadow-lg flex items-center justify-center overflow-hidden border border-yellow-500/30">
                <img 
                  src="/logos/enterprise-group-logo.jpg" 
                  alt="Enterprise Group Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold font-display">
                <span className="text-yellow-600">Enterprise</span> Group
              </h2>
            </div>
            <p className="text-muted-foreground max-w-xl">
              Latest news from Enterprise Group Ghana - Life Insurance, General Insurance, Pensions & more
            </p>
          </div>

          <Button
            variant="outline"
            onClick={onViewAll}
            className="self-start md:self-auto group rounded-xl border-yellow-500/30 text-yellow-700 hover:bg-yellow-500 hover:text-black transition-all"
          >
            View All Enterprise News
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: Award, label: 'Enterprise Life', value: 'EGL', color: 'yellow' },
            { icon: Shield, label: 'Enterprise Insurance', value: 'EIC', color: 'amber' },
            { icon: TrendingUp, label: 'Enterprise Trustees', value: 'ETL', color: 'orange' },
          ].map((stat, index) => (
            <div
              key={index}
              className="group flex items-center gap-4 p-5 bg-card rounded-xl border border-border/50 hover:border-yellow-500/30 hover:shadow-lg transition-all duration-300"
            >
              <div className={`p-3 rounded-lg bg-${stat.color}-500/10 group-hover:scale-110 transition-transform`}>
                <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
              </div>
              <div className="hidden sm:block">
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                <p className="font-bold text-foreground font-display">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Articles Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.slice(0, 6).map((article, index) => (
            <div
              key={article.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <NewsCard article={article} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
