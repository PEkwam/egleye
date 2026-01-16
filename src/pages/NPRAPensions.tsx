import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Building2, ExternalLink, TrendingUp, 
  Shield, Users, Landmark, FileText, Scale,
  ChevronRight, Globe, BarChart3,
  RefreshCw, Clock, Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Footer } from '@/components/Footer';
import { useNews } from '@/hooks/useNews';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// NPRA Key Statistics (sample data - can be updated with real data)
const npraStats = {
  totalFunds: 'GH₵ 45.2B',
  registeredSchemes: 156,
  activeTrustees: 32,
  totalContributors: '2.1M',
  growthRate: '18.5%',
  regulatedEntities: 245,
};

const pensionTypes = [
  {
    title: 'First Tier (SSNIT)',
    description: 'Mandatory basic national social security scheme managed by SSNIT',
    icon: Shield,
    color: 'from-blue-500 to-indigo-600',
    details: '13.5% contribution rate (employer 13%, employee 0.5% to SSNIT)',
  },
  {
    title: 'Second Tier (Occupational)',
    description: 'Mandatory occupational pension scheme managed by private trustees',
    icon: Building2,
    color: 'from-emerald-500 to-green-600',
    details: '5% contribution rate managed by licensed trustees and fund managers',
  },
  {
    title: 'Third Tier (Voluntary)',
    description: 'Voluntary personal pension and provident fund schemes',
    icon: Users,
    color: 'from-purple-500 to-violet-600',
    details: 'Tax incentives available - up to 35% of income can be contributed',
  },
];

const regulatoryFunctions = [
  { title: 'Licensing & Registration', icon: FileText, description: 'Trustees, custodians, and fund managers' },
  { title: 'Prudential Supervision', icon: Scale, description: 'Compliance monitoring and enforcement' },
  { title: 'Consumer Protection', icon: Shield, description: 'Protecting pension contributors\' rights' },
  { title: 'Investment Guidelines', icon: TrendingUp, description: 'Setting investment policy frameworks' },
];

// NPRA annual reports data
const annualReports = [
  { year: 2024, url: 'https://npra-live.s3.amazonaws.com/public/documents/2024-NPRA-Annual-Report-v3.pdf' },
  { year: 2023, url: 'https://npra-live.s3.amazonaws.com/public/documents/NPRA_AR_23_web-v3.pdf' },
  { year: 2022, url: 'https://npra-live.s3.amazonaws.com/public/documents/NPRA_AR_23_web.pdf' },
  { year: 2021, url: 'https://npra-live.s3.amazonaws.com/public/documents/Final_NPRA_Report-Web-CAD.pdf' },
  { year: 2020, url: 'https://npra-live.s3.amazonaws.com/public/documents/2020-NPRA-Annual-Report-Webv1-v2.pdf' },
];

export default function NPRAPensions() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { articles, isLoading, refetch } = useNews('pensions');

  // Auto-rotate featured article
  useEffect(() => {
    if (articles.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.min(articles.length, 3));
    }, 5000);
    return () => clearInterval(interval);
  }, [articles.length]);

  const handleRefreshNews = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('crawl-insurance-news', {
        body: {},
      });
      
      if (error) {
        console.error('Error refreshing news:', error);
        toast.error('Failed to refresh news');
      } else {
        toast.success('News feed refreshed');
        refetch();
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to refresh news');
    } finally {
      setIsRefreshing(false);
    }
  };

  const featuredArticle = articles[currentIndex];
  const listArticles = articles.filter((_, i) => i !== currentIndex).slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Home</span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                  <Landmark className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-lg font-bold">NPRA Pensions</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2"
                asChild
              >
                <Link to="/pension-dashboard">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2"
                asChild
              >
                <a href="https://www.npra.gov.gh/" target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">Visit NPRA</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* News Section - Styled like NIC Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-950/10 via-transparent to-transparent dark:from-amber-950/30" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          
          <div className="relative">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                    <Landmark className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-background flex items-center justify-center">
                    <Bell className="h-2 w-2 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-display text-foreground">
                    Pension News & Updates
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    National Pensions Regulatory Authority • Latest Updates
                  </p>
                </div>
              </div>
              
              <Button 
                variant="outline"
                onClick={handleRefreshNews}
                disabled={isRefreshing}
                className="hidden sm:flex items-center gap-2 rounded-xl border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* News Content */}
            {isLoading ? (
              <div className="grid lg:grid-cols-3 gap-6">
                <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
              </div>
            ) : articles.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-amber-500/30">
                <Landmark className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No pension news available yet</p>
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                  Click refresh to fetch the latest pension news
                </p>
                <Button onClick={handleRefreshNews} disabled={isRefreshing} variant="outline" className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Fetch News Now
                </Button>
              </Card>
            ) : (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Featured Article */}
                {featuredArticle && (
                  <a
                    href={featuredArticle.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lg:col-span-2 group relative rounded-2xl overflow-hidden glass-effect border border-amber-500/20 hover:border-amber-500/40 transition-all duration-500"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-600/90 to-orange-700/90" />
                    {featuredArticle.image_url && (
                      <img
                        src={featuredArticle.image_url}
                        alt={featuredArticle.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                      />
                    )}
                    
                    <div className="relative p-8 h-full min-h-[320px] flex flex-col justify-end">
                      <div className="absolute top-6 right-6 flex gap-2">
                        <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                          <FileText className="h-3 w-3 mr-1" />
                          Pensions
                        </Badge>
                        {articles.length > 1 && (
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
                        <TrendingUp className="h-5 w-5 text-amber-200" />
                        <span className="text-amber-100 text-sm font-medium">Pension Industry Update</span>
                      </div>
                      
                      <h3 className="text-2xl md:text-3xl font-bold text-white font-display mb-4 group-hover:text-amber-100 transition-colors">
                        {featuredArticle.title}
                      </h3>
                      
                      {featuredArticle.description && (
                        <p className="text-amber-100/80 line-clamp-2 mb-6 max-w-2xl">
                          {featuredArticle.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-amber-200/70">
                          <Clock className="h-4 w-4" />
                          <span>
                            {featuredArticle.published_at
                              ? formatDistanceToNow(new Date(featuredArticle.published_at), { addSuffix: true })
                              : 'Recently'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity text-sm text-white">
                          Read Full Article
                          <ExternalLink className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </a>
                )}

                {/* Article List */}
                <div className="space-y-3">
                  {listArticles.map((article, index) => (
                    <a
                      key={article.id}
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block p-4 rounded-xl glass-effect border border-border/50 hover:border-amber-500/30 hover:shadow-lg transition-all duration-300 animate-fade-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                          <Landmark className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-amber-600 transition-colors">
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
                    </a>
                  ))}

                  {/* Mobile Refresh */}
                  <Button 
                    variant="outline"
                    onClick={handleRefreshNews}
                    disabled={isRefreshing}
                    className="w-full sm:hidden flex items-center justify-center gap-2 rounded-xl border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh News
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Key Statistics */}
        <section>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ChevronRight className="h-5 w-5 text-amber-500" />
            Industry Overview
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/15 to-orange-500/5 border-amber-500/30 hover:border-amber-500/50 transition-all hover:scale-[1.02]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                    <TrendingUp className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Total AUM</span>
                </div>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{npraStats.totalFunds}</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/15 to-indigo-500/5 border-blue-500/30 hover:border-blue-500/50 transition-all hover:scale-[1.02]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                    <Shield className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Schemes</span>
                </div>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{npraStats.registeredSchemes}</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/15 to-green-500/5 border-emerald-500/30 hover:border-emerald-500/50 transition-all hover:scale-[1.02]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                    <Building2 className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Trustees</span>
                </div>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{npraStats.activeTrustees}</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/15 to-violet-500/5 border-purple-500/30 hover:border-purple-500/50 transition-all hover:scale-[1.02]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
                    <Users className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Contributors</span>
                </div>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{npraStats.totalContributors}</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-rose-500/15 to-pink-500/5 border-rose-500/30 hover:border-rose-500/50 transition-all hover:scale-[1.02]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600">
                    <TrendingUp className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Growth Rate</span>
                </div>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{npraStats.growthRate}</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-500/15 to-teal-500/5 border-cyan-500/30 hover:border-cyan-500/50 transition-all hover:scale-[1.02]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600">
                    <Scale className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Regulated</span>
                </div>
                <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{npraStats.regulatedEntities}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Three-Tier System */}
        <section>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ChevronRight className="h-5 w-5 text-amber-500" />
            Ghana's Three-Tier Pension System
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            {pensionTypes.map((tier) => {
              const Icon = tier.icon;
              return (
                <Card key={tier.title} className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${tier.color}`} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl bg-gradient-to-br ${tier.color} shadow-lg`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-lg">{tier.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-3">{tier.description}</p>
                    <Badge variant="secondary" className="text-xs">
                      {tier.details}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Regulatory Functions */}
        <section>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ChevronRight className="h-5 w-5 text-amber-500" />
            NPRA Regulatory Functions
          </h3>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {regulatoryFunctions.map((func) => {
              const Icon = func.icon;
              return (
                <Card key={func.title} className="hover:shadow-lg transition-all hover:border-amber-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Icon className="h-4 w-4 text-amber-600" />
                      </div>
                      <h4 className="font-semibold text-sm">{func.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">{func.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Annual Reports */}
        <section>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ChevronRight className="h-5 w-5 text-amber-500" />
            NPRA Annual Reports
          </h3>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {annualReports.map((report) => (
              <a
                key={report.year}
                href={report.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-4 rounded-xl border border-border/50 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                      <FileText className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="font-bold text-lg">{report.year}</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold mb-1">Explore Pension Fund Performance</h3>
                <p className="text-sm text-muted-foreground">View detailed AUM, returns, and contributor analytics</p>
              </div>
              <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                <Link to="/pension-dashboard">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Open Pension Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
