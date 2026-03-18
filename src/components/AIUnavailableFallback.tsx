import { Sparkles, WifiOff, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AIUnavailableFallbackProps {
  title?: string;
  message?: string;
  variant?: 'compact' | 'full';
  className?: string;
}

export function AIUnavailableFallback({
  title = 'AI Insights Temporarily Unavailable',
  message = 'AI-powered analysis will return shortly. Your data and dashboards remain fully functional.',
  variant = 'full',
  className,
}: AIUnavailableFallbackProps) {
  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/40",
        className
      )}>
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground/70 truncate">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("border-border/40 bg-muted/20", className)}>
      <CardContent className="py-10 text-center">
        <div className="relative w-14 h-14 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full bg-muted/60 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-background border-2 border-border flex items-center justify-center">
            <Clock className="h-3 w-3 text-muted-foreground/60" />
          </div>
        </div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-1.5">{title}</h3>
        <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto leading-relaxed">
          {message}
        </p>
      </CardContent>
    </Card>
  );
}
