import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, Power, PowerOff, Trash2, Plus, Radio, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type NewsSource = {
  id: string;
  name: string;
  url: string;
  category: string;
  source_label: string;
  mode: string;
  is_local: boolean;
  is_enabled: boolean;
  last_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  articles_found_total: number;
  last_articles_found: number | null;
};

type CrawlRun = {
  id: string;
  started_at: string;
  finished_at: string | null;
  trigger_source: string;
  mode: string;
  sources_run: number;
  articles_fetched: number;
  articles_kept: number;
  articles_inserted: number;
  duplicates_skipped: number;
  errors: number;
  status: string;
  error_message: string | null;
};

export function NewsSourcesPanel({ onTriggerCrawl, isCrawling }: { onTriggerCrawl?: (mode?: string) => void; isCrawling?: boolean }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', url: '', source_label: '', category: 'general', mode: 'general', is_local: false });

  const adminInvoke = async <T,>(body: Record<string, unknown>): Promise<T> => {
    const { data, error } = await supabase.functions.invoke('manage-news-sources', {
      body,
      headers: { 'x-admin-token': sessionStorage.getItem('admin_token') ?? '' },
    });
    if (error) throw error;
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data as T;
  };

  const sourcesQ = useQuery<NewsSource[]>({
    queryKey: ['news-sources'],
    queryFn: async () => {
      const data = await adminInvoke<{ sources: NewsSource[] }>({ action: 'list_sources' });
      return data.sources ?? [];
    },
    refetchInterval: 30_000,
  });

  const runsQ = useQuery<CrawlRun[]>({
    queryKey: ['news-crawl-runs'],
    queryFn: async () => {
      const data = await adminInvoke<{ runs: CrawlRun[] }>({ action: 'list_runs' });
      return data.runs ?? [];
    },
    refetchInterval: 15_000,
  });


  const sources = sourcesQ.data ?? [];
  const runs = runsQ.data ?? [];

  // A background/scheduled crawl is in flight when the most recent run has no finish time
  const activeRun = useMemo(() => runs.find((r) => r.status === 'running' && !r.finished_at), [runs]);
  const crawlInProgress = Boolean(isCrawling || activeRun);

  const filtered = useMemo(() => {
    return sources.filter((s) => {
      if (modeFilter !== 'all' && s.mode !== modeFilter) return false;
      if (statusFilter === 'enabled' && !s.is_enabled) return false;
      if (statusFilter === 'disabled' && s.is_enabled) return false;
      if (statusFilter === 'errors' && s.last_status !== 'error') return false;
      if (search && !`${s.name} ${s.source_label} ${s.url}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [sources, search, modeFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: sources.length,
    enabled: sources.filter((s) => s.is_enabled).length,
    errors: sources.filter((s) => s.last_status === 'error').length,
    ok: sources.filter((s) => s.last_status === 'ok').length,
  }), [sources]);

  const callManage = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('manage-news-sources', {
      body,
      headers: { 'x-admin-token': sessionStorage.getItem('admin_token') ?? '' },
    });
    if (error) throw error;
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data;
  };

  const toggleOne = async (id: string, is_enabled: boolean) => {
    try {
      await callManage({ action: 'toggle', id, is_enabled });
      toast.success(is_enabled ? 'Source enabled' : 'Source disabled');
      qc.invalidateQueries({ queryKey: ['news-sources'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to toggle source');
    }
  };

  const bulkToggle = async (is_enabled: boolean) => {
    const ids = filtered.map((s) => s.id);
    if (ids.length === 0) return;
    try {
      await callManage({ action: 'bulk_toggle', ids, is_enabled });
      toast.success(`${is_enabled ? 'Enabled' : 'Disabled'} ${ids.length} source${ids.length === 1 ? '' : 's'}`);
      qc.invalidateQueries({ queryKey: ['news-sources'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to bulk toggle');
    }
  };

  const deleteOne = async (id: string) => {
    if (!confirm('Delete this source? This cannot be undone.')) return;
    try {
      await callManage({ action: 'delete', id });
      toast.success('Source deleted');
      qc.invalidateQueries({ queryKey: ['news-sources'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const addSource = async () => {
    if (!newSource.name || !newSource.url || !newSource.source_label) {
      toast.error('Name, URL, and source label are required');
      return;
    }
    try {
      await callManage({ action: 'add', ...newSource });
      toast.success('Source added');
      qc.invalidateQueries({ queryKey: ['news-sources'] });
      setAddOpen(false);
      setNewSource({ name: '', url: '', source_label: '', category: 'general', mode: 'general', is_local: false });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add source');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              News Sources & Run History
            </CardTitle>
            <CardDescription>
              Toggle which RSS feeds the crawler uses, watch recent crawl runs, and trigger a fresh run on demand.
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">{stats.enabled}/{stats.total} enabled</Badge>
            {stats.errors > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" /> {stats.errors} failing
              </Badge>
            )}
            <Button
              size="sm"
              onClick={() => onTriggerCrawl?.()}
              disabled={crawlInProgress}
              className={crawlInProgress ? 'opacity-50 cursor-not-allowed' : undefined}
              title={activeRun ? 'A crawl is already running in the background' : undefined}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${crawlInProgress ? 'animate-spin' : ''}`} />
              {crawlInProgress ? (activeRun ? `Crawl running (${activeRun.trigger_source})…` : 'Running…') : 'Run crawler now'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sources">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sources">Sources ({sources.length})</TabsTrigger>
            <TabsTrigger value="runs">Recent runs ({runs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or URL..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modes</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="nic">NIC</SelectItem>
                  <SelectItem value="pension">Pension</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="errors">Failing</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => bulkToggle(true)}><Power className="h-4 w-4 mr-1" />Enable filtered</Button>
              <Button variant="outline" size="sm" onClick={() => bulkToggle(false)}><PowerOff className="h-4 w-4 mr-1" />Disable filtered</Button>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add source</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add RSS source</DialogTitle>
                    <DialogDescription>Add a new RSS feed for the crawler to monitor.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Display name</Label><Input value={newSource.name} onChange={(e) => setNewSource({ ...newSource, name: e.target.value })} placeholder="e.g. MyJoyOnline Business" /></div>
                    <div><Label>RSS URL</Label><Input value={newSource.url} onChange={(e) => setNewSource({ ...newSource, url: e.target.value })} placeholder="https://..." /></div>
                    <div><Label>Source label</Label><Input value={newSource.source_label} onChange={(e) => setNewSource({ ...newSource, source_label: e.target.value })} placeholder="e.g. MyJoyOnline" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Category</Label>
                        <Select value={newSource.category} onValueChange={(v) => setNewSource({ ...newSource, category: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">general</SelectItem>
                            <SelectItem value="regulator">regulator</SelectItem>
                            <SelectItem value="pensions">pensions</SelectItem>
                            <SelectItem value="enterprise_group">enterprise_group</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Mode</Label>
                        <Select value={newSource.mode} onValueChange={(v) => setNewSource({ ...newSource, mode: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">general</SelectItem>
                            <SelectItem value="nic">nic</SelectItem>
                            <SelectItem value="pension">pension</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={newSource.is_local} onCheckedChange={(v) => setNewSource({ ...newSource, is_local: v })} />
                      <Label>Local Ghana outlet (not a Google News search)</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button onClick={addSource}>Add source</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="h-[480px] rounded-md border">
              <div className="divide-y">
                {filtered.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">No sources match the current filters.</div>
                )}
                {filtered.map((s) => (
                  <div key={s.id} className="p-3 flex items-center gap-3 hover:bg-muted/40">
                    <Switch checked={s.is_enabled} onCheckedChange={(v) => toggleOne(s.id, v)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{s.name}</span>
                        <Badge variant="outline" className="text-[10px]">{s.mode}</Badge>
                        {s.is_local && <Badge variant="secondary" className="text-[10px]">local</Badge>}
                        {s.last_status === 'error' && <Badge variant="destructive" className="text-[10px] gap-1"><AlertCircle className="h-2.5 w-2.5" />error</Badge>}
                        {s.last_status === 'ok' && <Badge variant="secondary" className="text-[10px] gap-1"><CheckCircle2 className="h-2.5 w-2.5" />ok</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{s.url}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
                        <span>Total: {s.articles_found_total}</span>
                        {typeof s.last_articles_found === 'number' && <span>Last: {s.last_articles_found}</span>}
                        {s.last_run_at && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(s.last_run_at), { addSuffix: true })}</span>}
                        {s.last_error && <span className="text-destructive truncate max-w-[300px]" title={s.last_error}>{s.last_error}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteOne(s.id)} title="Delete source">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="runs">
            <ScrollArea className="h-[480px] rounded-md border">
              <div className="divide-y">
                {runs.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">No crawl runs yet. Trigger one with "Run crawler now".</div>
                )}
                {runs.map((r) => {
                  const duration = r.finished_at ? Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000) : null;
                  return (
                    <div key={r.id} className="p-3 hover:bg-muted/40">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={r.status === 'completed' ? 'secondary' : r.status === 'failed' ? 'destructive' : 'outline'} className="text-[10px]">{r.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{r.mode}</Badge>
                        <Badge variant="outline" className="text-[10px]">via {r.trigger_source}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.started_at), { addSuffix: true })}</span>
                        {duration !== null && <span className="text-xs text-muted-foreground">· {duration}s</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                        <span>{r.sources_run} sources</span>
                        <span>{r.articles_fetched} fetched</span>
                        <span className="text-foreground">{r.articles_inserted} new</span>
                        <span>{r.duplicates_skipped} duplicates</span>
                        {r.errors > 0 && <span className="text-destructive">{r.errors} errors</span>}
                      </div>
                      {r.error_message && <div className="text-xs text-destructive mt-1">{r.error_message}</div>}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
