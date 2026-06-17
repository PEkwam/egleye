import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Archive, ChevronDown, RefreshCw, PlayCircle, Mail, AlertCircle, CheckCircle2, Clock, SkipForward, Inbox, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow, addDays, parseISO } from 'date-fns';

interface WeekRow {
  week_start: string;
  sent: number;
  failed: number;
  pending: number;
  skipped: number;
  total: number;
}

interface ArchiveSend {
  id: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  attempts: number;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  failed_at: string | null;
  archived_at: string;
  subscriber: { id: string; email: string; name: string | null } | null;
  article: { id: string; title: string; source_name: string | null } | null;
}

const statusTone: Record<ArchiveSend['status'], string> = {
  sent: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
  skipped: 'bg-muted text-muted-foreground border-border',
};
const statusIcon = {
  sent: CheckCircle2, pending: Clock, failed: AlertCircle, skipped: SkipForward,
} as const;

async function callManage(action: string, payload: Record<string, unknown> = {}) {
  const token = sessionStorage.getItem('admin_token');
  if (!token) throw new Error('Not authenticated');
  const { data, error } = await supabase.functions.invoke('manage-subscribers', {
    body: { action, ...payload },
    headers: { 'x-admin-token': token },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function EmailDeliveryArchive() {
  const queryClient = useQueryClient();
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const weeksQuery = useQuery({
    queryKey: ['email-archive-weeks'],
    queryFn: () => callManage('list_archive_weeks') as Promise<{ weeks: WeekRow[] }>,
  });

  const runArchive = useMutation({
    mutationFn: () => callManage('run_archive') as Promise<{ moved: number }>,
    onSuccess: (res) => {
      toast.success(
        res.moved > 0
          ? `Archived ${res.moved} record${res.moved === 1 ? '' : 's'}`
          : 'Nothing to archive (no records older than 7 days)'
      );
      queryClient.invalidateQueries({ queryKey: ['email-archive-weeks'] });
      queryClient.invalidateQueries({ queryKey: ['email-delivery-sends'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Archive failed'),
  });

  const emptyArchive = useMutation({
    mutationFn: () => callManage('empty_archive') as Promise<{ deleted: number }>,
    onSuccess: (res) => {
      toast.success(`Emptied archive · ${res.deleted} record${res.deleted === 1 ? '' : 's'} deleted`);
      setConfirmEmpty(false);
      queryClient.invalidateQueries({ queryKey: ['email-archive-weeks'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Empty archive failed');
      setConfirmEmpty(false);
    },
  });

  const weeks = weeksQuery.data?.weeks ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-primary" />
              Delivery Archive
            </CardTitle>
            <CardDescription>
              Weekly snapshots of subscriber email delivery. Records older than 7 days are
              moved here automatically every Monday.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => runArchive.mutate()}
              disabled={runArchive.isPending}
              className="gap-1.5"
            >
              <PlayCircle className={`h-3.5 w-3.5 ${runArchive.isPending ? 'animate-pulse' : ''}`} />
              Archive now
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => weeksQuery.refetch()}
              disabled={weeksQuery.isFetching}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${weeksQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmEmpty(true)}
              disabled={emptyArchive.isPending || weeks.length === 0}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Empty archive
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {weeksQuery.isLoading && (
          <div className="text-center py-8 text-sm text-muted-foreground">Loading…</div>
        )}

        {!weeksQuery.isLoading && weeks.length === 0 && (
          <div className="text-center py-10 border border-dashed border-border/50 rounded-xl">
            <Inbox className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium">No archived weeks yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              The first weekly archive runs automatically. You can also click
              "Archive now" to move records older than 7 days immediately.
            </p>
          </div>
        )}

        {weeks.map((w) => (
          <WeekItem
            key={w.week_start}
            week={w}
            expanded={expandedWeek === w.week_start}
            onToggle={() => setExpandedWeek(expandedWeek === w.week_start ? null : w.week_start)}
          />
        ))}
      </CardContent>

      <AlertDialog open={confirmEmpty} onOpenChange={setConfirmEmpty}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty delivery archive?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every archived send record across all weeks.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={emptyArchive.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); emptyArchive.mutate(); }}
              disabled={emptyArchive.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {emptyArchive.isPending ? 'Emptying…' : 'Empty archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function WeekItem({ week, expanded, onToggle }: { week: WeekRow; expanded: boolean; onToggle: () => void }) {
  const start = parseISO(week.week_start);
  const end = addDays(start, 6);
  const label = `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;

  const sendsQuery = useQuery({
    queryKey: ['email-archive-week', week.week_start],
    queryFn: () => callManage('list_archive_sends', { week: week.week_start, limit: 200 }) as Promise<{ sends: ArchiveSend[]; totalCount: number }>,
    enabled: expanded,
  });

  const sends = sendsQuery.data?.sends ?? [];

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button className="w-full text-left p-3 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors">
          <div className="flex items-center gap-3 flex-wrap">
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} />
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-muted-foreground">· {week.total} record{week.total === 1 ? '' : 's'}</span>
            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              {week.sent > 0 && <Badge variant="outline" className={statusTone.sent}>{week.sent} sent</Badge>}
              {week.failed > 0 && <Badge variant="outline" className={statusTone.failed}>{week.failed} failed</Badge>}
              {week.pending > 0 && <Badge variant="outline" className={statusTone.pending}>{week.pending} pending</Badge>}
              {week.skipped > 0 && <Badge variant="outline" className={statusTone.skipped}>{week.skipped} skipped</Badge>}
            </div>
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 ml-2 sm:ml-6 pl-3 border-l border-border/40 space-y-1">
          {sendsQuery.isLoading && (
            <div className="py-4 text-xs text-muted-foreground">Loading week…</div>
          )}
          {!sendsQuery.isLoading && sends.length === 0 && (
            <div className="py-4 text-xs text-muted-foreground">No records.</div>
          )}
          {sends.map((s) => {
            const Icon = statusIcon[s.status];
            const ts = s.sent_at || s.failed_at || s.created_at;
            return (
              <div key={s.id} className="p-2.5 rounded-md hover:bg-muted/30">
                <div className="flex items-start gap-2 flex-wrap">
                  <Badge variant="outline" className={`${statusTone[s.status]} gap-1 text-[10px] px-2 py-0.5`}>
                    <Icon className="h-3 w-3" />
                    {s.status}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {s.article?.title ?? <span className="italic text-muted-foreground">Article removed</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {s.subscriber?.email ?? <span className="italic">subscriber removed</span>}
                      </span>
                      {s.article?.source_name && <span>· {s.article.source_name}</span>}
                      <span>· {formatDistanceToNow(new Date(ts), { addSuffix: true })}</span>
                    </div>
                    {s.error_message && (
                      <p className="mt-1 text-xs text-destructive font-mono break-words">{s.error_message}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
