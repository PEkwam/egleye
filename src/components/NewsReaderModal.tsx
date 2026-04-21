import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Clock, Calendar, Building2, Share2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import type { NewsArticle, NewsCategory } from '@/types/news';
import { categoryLabels, categoryColors } from '@/types/news';
import { sanitizeText } from '@/lib/utils/text';

interface NewsReaderModalProps {
  article: NewsArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewsReaderModal({ article, open, onOpenChange }: NewsReaderModalProps) {
  if (!article) return null;

  const publishedDate = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true })
    : 'Recently';

  const formattedDate = article.published_at
    ? format(new Date(article.published_at), 'MMMM d, yyyy • h:mm a')
    : '';

  const wordCount = (article.content || article.description || '').split(' ').length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/article/${article.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.description || '',
          url: shareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{sanitizeText(article.title)}</DialogTitle>
          <DialogDescription>{sanitizeText(article.description || 'Article preview')}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[90vh]">
          {/* Hero image */}
          {article.image_url && (
            <div className="relative h-48 sm:h-64 md:h-80 w-full overflow-hidden bg-secondary">
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 flex-wrap">
                <Badge className={`${categoryColors[article.category as NewsCategory]} text-xs px-2.5 py-1`}>
                  {categoryLabels[article.category as NewsCategory]}
                </Badge>
                {article.source_name && (
                  <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-xs">
                    {article.source_name}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="p-5 sm:p-7">
            {!article.image_url && (
              <Badge className={`${categoryColors[article.category as NewsCategory]} text-xs px-2.5 py-1 mb-4`}>
                {categoryLabels[article.category as NewsCategory]}
              </Badge>
            )}

            {/* Title */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display text-foreground leading-tight mb-3">
              {sanitizeText(article.title)}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pb-4 border-b border-border/50 mb-5">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formattedDate || publishedDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{readingTime} min read</span>
              </div>
              {article.source_name && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{article.source_name}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {article.description && (
              <p className="text-base text-muted-foreground leading-relaxed mb-5">
                {sanitizeText(article.description)}
              </p>
            )}

            {/* Content */}
            {article.content ? (
              <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {sanitizeText(article.content)}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 glass-effect rounded-xl border border-border/50">
                <p className="text-sm text-muted-foreground mb-3">
                  Full article content is available at the source.
                </p>
              </div>
            )}

            {/* Action bar */}
            <div className="sticky bottom-0 mt-6 -mx-5 sm:-mx-7 px-5 sm:px-7 py-4 bg-background/95 backdrop-blur-sm border-t border-border/50 flex flex-wrap items-center gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button size="sm" className="gap-2">
                  Open original
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
