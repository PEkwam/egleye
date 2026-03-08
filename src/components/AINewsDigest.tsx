import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, RefreshCw, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface DigestData {
  digest: string | null;
  articleCount: number;
  generatedAt: string;
}

async function fetchDigest(): Promise<DigestData> {
  const { data, error } = await supabase.functions.invoke('news-digest');
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function AINewsDigest() {
  const [manualRefresh, setManualRefresh] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ai-news-digest'],
    queryFn: fetchDigest,
    staleTime: 30 * 60 * 1000, // 30 min cache
    retry: 1,
  });

  const handleRefresh = async () => {
    setManualRefresh(true);
    try {
      await refetch();
      toast.success('Digest refreshed');
    } catch {
      toast.error('Failed to refresh digest');
    } finally {
      setManualRefresh(false);
    }
  };

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-4">
        <Card className="relative overflow-hidden border-primary/20">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </section>
    );
  }

  if (error || !data?.digest) {
    return null; // Silently hide if AI fails — non-critical feature
  }

  const lines = data.digest
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Detect sentiment line (last line usually)
  const sentimentLine = lines.find(
    (l) =>
      l.toLowerCase().includes('sentiment') ||
      l.toLowerCase().includes('bullish') ||
      l.toLowerCase().includes('bearish') ||
      l.toLowerCase().includes('neutral')
  );
  const bulletPoints = lines.filter((l) => l !== sentimentLine);

  const generatedTime = data.generatedAt
    ? new Date(data.generatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <section className="container mx-auto px-4 py-4">
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-lg">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/6 rounded-full blur-[60px] pointer-events-none" />

        <CardHeader className="pb-2 relative">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-display">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              AI Daily Digest
            </CardTitle>

            <div className="flex items-center gap-2">
              {data.articleCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-2 py-0.5 font-medium"
                >
                  {data.articleCount} articles analyzed
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
                disabled={manualRefresh}
              >
                <RefreshCw
                  className={`h-4 w-4 ${manualRefresh ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-2.5 pt-1">
          {bulletPoints.map((point, i) => {
            // Strip leading bullet characters
            const cleaned = point.replace(/^[•\-\*]\s*/, '');
            return (
              <div key={i} className="flex gap-2.5 items-start">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {cleaned}
                </p>
              </div>
            );
          })}

          {sentimentLine && (
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
              <p className="text-xs font-medium text-muted-foreground">
                {sentimentLine.replace(/^[•\-\*]\s*/, '')}
              </p>
            </div>
          )}

          {generatedTime && (
            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              Generated at {generatedTime}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
