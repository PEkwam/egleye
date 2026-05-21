import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Mail, RefreshCw, Send, AlertCircle, CheckCircle2, Clock, SkipForward, RotateCw, Inbox, Play, TestTube,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SendRow {
  id: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  attempts: number;
  error_message: string | null;
  queued_at: string;
  sent_at: string | null;
  failed_at: string | null;
  created_at: string;
  subscriber: { id: string; email: string; name: string | null } | null;
  article: { id: string; title: string; source_name: string | null } | null;
}

interface SendsResponse {
  sends: SendRow[];
  totals: { pending: number; sent: number; failed: number; skipped: number };
  totalCount: number;
}

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

const statusConfig: Record<SendRow['status'], { label: string; icon: typeof CheckCircle2; className: string }> = {
  sent:    { label: 'Sent',    icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  pending: { label: 'Pending', icon: Clock,        className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  failed:  { label: 'Failed',  icon: AlertCircle,  className: 'bg-destructive/10 text-destructive border-destructive/30' },
  skipped: { label: 'Skipped', icon: SkipForward,  className: 'bg-muted text-muted-foreground border-border' },
};

export function EmailDeliveryDashboard() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [testEmail, setTestEmail] = useState('');

  async function callSender(action: string, payload: Record<string, unknown> = {}) {
    const token = sessionStorage.getItem('admin_token');
    if (!token) throw new Error('Not authenticated');
    const { data, error } = await supabase.functions.invoke('send-news-email', {
      body: { action, ...payload },
      headers: { 'x-admin-token': token },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  const gmailStatus = useQuery({
    queryKey: ['gmail-status'],
    queryFn: () => callSender('status') as Promise<{ connected: boolean; profile?: { emailAddress: string } | null; error?: string; status?: number }>,
    refetchInterval: 60000,
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['email-delivery-sends', statusFilter],
    queryFn: async () => {
      const result = await callManage('list_sends', {
        limit: 100,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      return result as SendsResponse;
    },
    refetchInterval: 30000,
  });

  const totals = data?.totals ?? { pending: 0, sent: 0, failed: 0, skipped: 0 };
  const sends = data?.sends ?? [];

  const retryMutation = useMutation({
    mutationFn: (id: string) => callManage('retry_send', { id }),
    onSuccess: () => {
      toast.success('Send re-queued');
      queryClient.invalidateQueries({ queryKey: ['email-delivery-sends'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Retry failed'),
  });

  const retryAllMutation = useMutation({
    mutationFn: () => callManage('retry_all_failed'),
    onSuccess: (res: { retried: number }) => {
      toast.success(`Re-queued ${res.retried} failed send${res.retried === 1 ? '' : 's'}`);
      queryClient.invalidateQueries({ queryKey: ['email-delivery-sends'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Bulk retry failed'),
  });

  const processMutation = useMutation({
    mutationFn: () => callSender('process_queue', { limit: 25 }) as Promise<{ processed: number; sent: number; failed: number }>,
    onSuccess: (res) => {
      toast.success(`Processed ${res.processed} · ${res.sent} sent · ${res.failed} failed`);
      queryClient.invalidateQueries({ queryKey: ['email-delivery-sends'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Processing failed'),
  });

  const testMutation = useMutation({
    mutationFn: (email: string) => callSender('send_test', { email }) as Promise<{ ok: boolean; from?: string }>,
    onSuccess: (res) => {
      toast.success(`Test email sent from ${res.from ?? 'Gmail'}`);
      setTestEmail('');
    },
    onError: (err: Error) => toast.error(err.message || 'Test send failed'),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Email Delivery
            </CardTitle>
            <CardDescription>
              Monitor news alert delivery, inspect failures, and retry failed sends.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="default"
              size="sm"
              onClick={() => processMutation.mutate()}
              disabled={processMutation.isPending || totals.pending === 0}
              className="gap-1.5"
            >
              <Play className={`h-3.5 w-3.5 ${processMutation.isPending ? 'animate-pulse' : ''}`} />
              Process queue ({totals.pending})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => retryAllMutation.mutate()}
              disabled={retryAllMutation.isPending || totals.failed === 0}
              className="gap-1.5"
            >
              <RotateCw className={`h-3.5 w-3.5 ${retryAllMutation.isPending ? 'animate-spin' : ''}`} />
              Retry all failed
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Gmail sender status + test */}
        <div className="mt-4 p-3 rounded-lg border border-border/60 bg-muted/30 flex flex-wrap items-center gap-3">
          <Badge variant="outline" className={gmailStatus.data?.connected
            ? 'gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
            : 'gap-1.5 bg-amber-500/10 text-amber-600 border-amber-500/30'}>
            <Mail className="h-3 w-3" />
            {gmailStatus.data?.connected
              ? `Gmail: ${gmailStatus.data.profile?.emailAddress ?? 'connected'}`
              : 'Gmail: not connected'}
          </Badge>
          {!gmailStatus.data?.connected && gmailStatus.data?.error && (
            <span className="text-xs text-muted-foreground max-w-sm">
              {gmailStatus.data.error}
            </span>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Input
              type="email"
              placeholder="you@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="h-8 w-56 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => testMutation.mutate(testEmail)}
              disabled={testMutation.isPending || !testEmail || !gmailStatus.data?.connected}
              className="gap-1.5"
            >
              <TestTube className="h-3.5 w-3.5" />
              Send test
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <StatCard label="Sent"    value={totals.sent}    icon={CheckCircle2} tone="emerald" />
          <StatCard label="Pending" value={totals.pending} icon={Clock}        tone="amber" />
          <StatCard label="Failed"  value={totals.failed}  icon={AlertCircle}  tone="destructive" />
          <StatCard label="Skipped" value={totals.skipped} icon={SkipForward}  tone="muted" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filter:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="sent">Sent only</SelectItem>
              <SelectItem value="pending">Pending only</SelectItem>
              <SelectItem value="failed">Failed only</SelectItem>
              <SelectItem value="skipped">Skipped only</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            Showing {sends.length} most recent
          </span>
        </div>

        {/* Empty state */}
        {!isLoading && sends.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border/50 rounded-xl">
            <Inbox className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No send attempts yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Once email delivery is enabled, every send attempt to a subscriber
              will be logged here with status, errors, and retry options.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8 text-sm text-muted-foreground">Loading…</div>
        )}

        {/* Table */}
        {sends.length > 0 && (
          <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/50">
            {sends.map((send) => {
              const cfg = statusConfig[send.status];
              const Icon = cfg.icon;
              const ts = send.sent_at || send.failed_at || send.created_at;
              return (
                <div key={send.id} className="p-3 sm:p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3 flex-wrap">
                    <Badge variant="outline" className={`${cfg.className} gap-1 text-[10px] px-2 py-0.5`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {send.article?.title ?? <span className="italic text-muted-foreground">Article removed</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {send.subscriber?.email ?? <span className="italic">subscriber removed</span>}
                        </span>
                        {send.article?.source_name && <span>· {send.article.source_name}</span>}
                        <span>· {formatDistanceToNow(new Date(ts), { addSuffix: true })}</span>
                        {send.attempts > 0 && <span>· {send.attempts} attempt{send.attempts === 1 ? '' : 's'}</span>}
                      </div>
                      {send.error_message && (
                        <div className="mt-2 px-3 py-2 rounded-md bg-destructive/5 border border-destructive/20">
                          <p className="text-xs text-destructive font-mono break-words">
                            {send.error_message}
                          </p>
                        </div>
                      )}
                    </div>

                    {send.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryMutation.mutate(send.id)}
                        disabled={retryMutation.isPending}
                        className="gap-1.5 text-xs"
                      >
                        <RotateCw className="h-3 w-3" />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  label, value, icon: Icon, tone,
}: {
  label: string;
  value: number;
  icon: typeof CheckCircle2;
  tone: 'emerald' | 'amber' | 'destructive' | 'muted';
}) {
  const toneClasses = {
    emerald:     'bg-emerald-500/5 border-emerald-500/15 text-emerald-600',
    amber:       'bg-amber-500/5 border-amber-500/15 text-amber-600',
    destructive: 'bg-destructive/5 border-destructive/15 text-destructive',
    muted:       'bg-muted/40 border-border text-muted-foreground',
  }[tone];
  return (
    <div className={`p-3 rounded-lg border ${toneClasses}`}>
      <div className="flex items-center gap-1.5 text-xs">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
