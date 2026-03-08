import { TrendingUp, Shield, ArrowRight, Award } from 'lucide-react';
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
    <section className="py-8 sm:py-16 relative overflow-hidden">
      {/* Ambient background glows — gold/amber theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-amber-500/5" />
      <div className="absolute top-10 right-20 w-[500px] h-[500px] rounded-full blur-[120px] bg-yellow-500/8 pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[350px] h-[350px] rounded-full blur-[120px] bg-amber-500/8 pointer-events-none" />
      {/* Decorative corner shape */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-yellow-500/10 to-transparent rounded-bl-full pointer-events-none" />
      
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="relative group/logo">
                <div className="absolute -inset-1 bg-yellow-500/20 rounded-xl blur-md group-hover/logo:bg-yellow-500/30 transition-all duration-300" />
                <div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-[#8B1A4A] shadow-lg flex items-center justify-center overflow-hidden border border-yellow-500/30">
                  <img 
                    src="/logos/enterprise-group-logo.jpg" 
                    alt="Enterprise Group Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display">
                  <span className="bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">Enterprise</span>{' '}
                  <span className="text-foreground">Group</span>
                </h2>
              </div>
            </div>
            <p className="text-muted-foreground max-w-xl">
              Latest news from Enterprise Group Ghana — Life Insurance, General Insurance, Pensions & more
            </p>
          </div>

          <Button
            variant="outline"
            onClick={onViewAll}
            className="self-start md:self-auto group rounded-xl border-yellow-500/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500 hover:text-black hover:shadow-lg hover:shadow-yellow-500/20 transition-all duration-300"
          >
            View All Enterprise News
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Stats — glassmorphism cards */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: Award, label: 'Enterprise Life', value: 'EGL', gradient: 'from-yellow-500/15 to-yellow-600/5', border: 'hover:border-yellow-500/40', shadow: 'hover:shadow-yellow-500/10', iconColor: 'text-yellow-600' },
            { icon: Shield, label: 'Enterprise Insurance', value: 'EIC', gradient: 'from-amber-500/15 to-amber-600/5', border: 'hover:border-amber-500/40', shadow: 'hover:shadow-amber-500/10', iconColor: 'text-amber-600' },
            { icon: TrendingUp, label: 'Enterprise Trustees', value: 'ETL', gradient: 'from-orange-500/15 to-orange-600/5', border: 'hover:border-orange-500/40', shadow: 'hover:shadow-orange-500/10', iconColor: 'text-orange-600' },
          ].map((stat, index) => (
            <div
              key={index}
              className={`group flex items-center gap-4 p-5 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 ${stat.border} ${stat.shadow} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}
            >
              <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.gradient} group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div className="hidden sm:block">
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                <p className="font-bold text-foreground font-display">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Articles Grid — glassmorphism wrappers */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.slice(0, 6).map((article, index) => (
            <div
              key={article.id}
              className="group block rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-yellow-500/30 hover:shadow-lg hover:shadow-yellow-500/5 hover:-translate-y-0.5 transition-all duration-300 animate-slide-up overflow-hidden"
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
