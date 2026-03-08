import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { ArrowLeft, Clock, ExternalLink, Share2, Bookmark, ChevronRight, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { NewsArticle, NewsCategory } from '@/types/news';
import { categoryLabels, categoryColors } from '@/types/news';

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: article, isLoading } = useQuery({
    queryKey: ['article', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as NewsArticle;
    },
    enabled: !!id,
  });

  const { data: relatedArticles = [] } = useQuery({
    queryKey: ['related-articles', article?.category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('category', article?.category)
        .neq('id', id)
        .order('published_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data as NewsArticle[];
    },
    enabled: !!article?.category,
  });

  const handleShare = async () => {
    if (navigator.share && article) {
      try {
        await navigator.share({
          title: article.title,
          text: article.description || '',
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleBookmark = () => {
    toast.success('Article bookmarked!', { description: 'Feature coming soon' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-80 rounded-2xl mb-8" />
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/2 mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Article not found</h1>
          <Link to="/">
            <Button>Go back to news</Button>
          </Link>
        </div>
      </div>
    );
  }

  const publishedDate = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true })
    : 'Recently';

  const formattedDate = article.published_at
    ? format(new Date(article.published_at), 'MMMM d, yyyy • h:mm a')
    : '';

  // Estimate reading time
  const wordCount = (article.content || article.description || '').split(' ').length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to News</span>
            </Link>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBookmark}
                className="h-9 w-9 rounded-xl hover:bg-secondary"
              >
                <Bookmark className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="h-9 w-9 rounded-xl hover:bg-secondary"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="default" size="sm" className="rounded-xl gap-2">
                  <span className="hidden sm:inline">Read Original</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <article className="max-w-4xl mx-auto">
          {/* Hero Image */}
          {article.image_url && (
            <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-8 group">
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <Badge className="category-badge-overlay text-sm px-3 py-1">
                  {categoryLabels[article.category as NewsCategory]}
                </Badge>
              </div>
            </div>
          )}

          {/* Article Header */}
          <header className="mb-8">
            {!article.image_url && (
              <Badge className={`${categoryColors[article.category as NewsCategory]} text-sm px-3 py-1 mb-4`}>
                {categoryLabels[article.category as NewsCategory]}
              </Badge>
            )}
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display text-foreground mb-6 leading-tight">
              {article.title}
            </h1>

            {article.description && (
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                {article.description}
              </p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-6 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formattedDate || publishedDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{readingTime} min read</span>
              </div>
              {article.source_name && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{article.source_name}</span>
                </div>
              )}
            </div>
          </header>

          {/* Article Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
            {article.content ? (
              <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                {article.content}
              </div>
            ) : (
              <div className="text-center py-12 glass-effect rounded-2xl border border-border/50">
                <p className="text-muted-foreground mb-4">
                  Full article content is available at the source.
                </p>
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="gap-2">
                    Read Full Article
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            )}
          </div>

          {/* Share Section */}
          <div className="flex items-center justify-center gap-4 py-8 border-y border-border/50 mb-12">
            <span className="text-sm text-muted-foreground">Share this article:</span>
            <Button variant="outline" size="sm" onClick={handleShare} className="rounded-xl gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleBookmark} className="rounded-xl gap-2">
              <Bookmark className="h-4 w-4" />
              Save
            </Button>
          </div>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold font-display mb-6">Related Stories</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    to={`/article/${related.id}`}
                    className="group p-4 rounded-xl glass-effect border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex gap-4">
                      {related.image_url && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
                          <img
                            src={related.image_url}
                            alt={related.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2">
                          {related.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {related.published_at
                              ? formatDistanceToNow(new Date(related.published_at), { addSuffix: true })
                              : 'Recently'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center">
          <Link to="/">
            <Button variant="outline" className="rounded-xl gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to All News
            </Button>
          </Link>
        </div>
      </footer>
    </div>
  );
}