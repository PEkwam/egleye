import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Mail, Plus, Trash2, RefreshCw, Users, Zap, CalendarDays, RotateCcw, FastForward,
  CheckCircle2, AlertCircle, Clock, MoreHorizontal, Search, X, Pencil,
  ChevronDown, ChevronRight, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

// Mask "john.doe@example.com" -> "j•••@example.com"
function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '•••';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const head = local[0] ?? '';
  return `${head}${'•'.repeat(Math.max(3, Math.min(local.length - 1, 6)))}${domain}`;
}

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  frequency: 'instant' | 'daily';
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
  send_stats?: { sent: number; pending: number; failed: number };
}

const isValidEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());

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

type DialogState =
  | { kind: 'reset'; sub: Subscriber }
  | { kind: 'catchup'; sub: Subscriber }
  | { kind: 'delete'; sub: Subscriber }
  | null;

export function SubscriberManager() {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newFrequency, setNewFrequency] = useState<'instant' | 'daily'>('instant');
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [editing, setEditing] = useState<Subscriber | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editFrequency, setEditFrequency] = useState<'instant' | 'daily'>('instant');
  const [editActive, setEditActive] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expanded, setExpanded] = useState(false);
  const [revealAll, setRevealAll] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<null | 'delete'>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['news-subscribers'],
    queryFn: async () => {
      const result = await callManage('list');
      return (result?.subscribers ?? []) as Subscriber[];
    },
  });

  const subscribers = data ?? [];
  const activeCount = subscribers.filter((s) => s.is_active).length;
  const instantCount = subscribers.filter((s) => s.is_active && s.frequency === 'instant').length;
  const dailyCount = subscribers.filter((s) => s.is_active && s.frequency === 'daily').length;

  const filtered = search.trim()
    ? subscribers.filter((s) =>
        (s.email + ' ' + (s.name ?? '')).toLowerCase().includes(search.trim().toLowerCase()),
      )
    : subscribers;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paged = filtered.slice(pageStart, pageStart + pageSize);

  // Reset to page 1 when search or page size changes
  if (page !== 1 && (search || pageSize) && pageStart >= filtered.length && filtered.length > 0) {
    // handled via Math.min above
  }

  const createMutation = useMutation({
    mutationFn: () =>
      callManage('create', {
        email: newEmail.trim().toLowerCase(),
        name: newName.trim() || null,
        frequency: newFrequency,
      }),
    onSuccess: () => {
      toast.success('Subscriber added');
      setNewEmail(''); setNewName(''); setNewFrequency('instant'); setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ['news-subscribers'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add subscriber'),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; changes: Partial<Subscriber> }) =>
      callManage('update', { id: vars.id, ...vars.changes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['news-subscribers'] }),
    onError: (err: Error) => toast.error(err.message || 'Failed to update'),
  });

  const editMutation = useMutation({
    mutationFn: (vars: { id: string; changes: Partial<Subscriber> }) =>
      callManage('update', { id: vars.id, ...vars.changes }),
    onSuccess: () => {
      toast.success('Subscriber updated');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['news-subscribers'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update'),
  });

  const openEdit = (s: Subscriber) => {
    setEditing(s);
    setEditEmail(s.email);
    setEditName(s.name ?? '');
    setEditFrequency(s.frequency);
    setEditActive(s.is_active);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!isValidEmail(editEmail)) { toast.error('Please enter a valid email'); return; }
    const normalized = editEmail.trim().toLowerCase();
    if (
      normalized !== editing.email.toLowerCase() &&
      subscribers.some((s) => s.email.toLowerCase() === normalized)
    ) {
      toast.error('That email is already subscribed'); return;
    }
    editMutation.mutate({
      id: editing.id,
      changes: {
        email: normalized,
        name: editName.trim(),
        frequency: editFrequency,
        is_active: editActive,
      },
    });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => callManage('delete', { id }),
    onSuccess: () => {
      toast.success('Subscriber removed');
      setDialog(null);
      queryClient.invalidateQueries({ queryKey: ['news-subscribers'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to remove'),
  });

  const resetUnreadMutation = useMutation({
    mutationFn: (id: string) => callManage('reset_unread', { id }),
    onSuccess: (res: { cleared: number }) => {
      toast.success(`Unread reset · ${res.cleared} record${res.cleared === 1 ? '' : 's'} cleared`);
      setDialog(null);
      queryClient.invalidateQueries({ queryKey: ['news-subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['email-delivery-sends'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Reset failed'),
  });

  const catchUpMutation = useMutation({
    mutationFn: (id: string) => callManage('mark_caught_up', { id }),
    onSuccess: (res: { marked: number }) => {
      toast.success(`Marked ${res.marked} article${res.marked === 1 ? '' : 's'} as already-sent`);
      setDialog(null);
      queryClient.invalidateQueries({ queryKey: ['news-subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['email-delivery-sends'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Catch-up failed'),
  });

  const bulkMutation = useMutation({
    mutationFn: (op: 'activate' | 'deactivate' | 'set_instant' | 'set_daily' | 'delete') =>
      callManage('bulk', { op, ids: Array.from(selectedIds) }),
    onSuccess: (res: { affected: number }, op) => {
      const verb =
        op === 'delete' ? 'removed' :
        op === 'activate' ? 'activated' :
        op === 'deactivate' ? 'deactivated' :
        op === 'set_instant' ? 'set to Instant' : 'set to Daily';
      toast.success(`${res.affected} subscriber${res.affected === 1 ? '' : 's'} ${verb}`);
      setSelectedIds(new Set());
      setBulkConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['news-subscribers'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Bulk action failed'),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const togglePageSelect = (rows: Subscriber[], allChecked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  };
  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(newEmail)) { toast.error('Please enter a valid email'); return; }
    const normalized = newEmail.trim().toLowerCase();
    if (subscribers.some((s) => s.email.toLowerCase() === normalized)) {
      toast.error('That email is already subscribed'); return;
    }
    createMutation.mutate();
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="min-w-0 flex items-start gap-2 text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={expanded}
              aria-controls="subscribers-panel"
            >
              {expanded
                ? <ChevronDown className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                : <ChevronRight className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />}
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4 text-primary" />
                  News Alert Subscribers
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-1">
                    {subscribers.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {expanded
                    ? 'Manage who receives email alerts for new insurance news.'
                    : 'Click to view and manage subscribers.'}
                </CardDescription>
              </div>
            </button>
            <div className="flex items-center gap-1.5">
              <InlineStat icon={Users} label="Active" value={activeCount} tone="primary" />
              <InlineStat icon={Zap} label="Instant" value={instantCount} tone="amber" />
              <InlineStat icon={CalendarDays} label="Daily" value={dailyCount} tone="blue" />
              {expanded && (
                <>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => setRevealAll((v) => !v)}
                    className="h-8 w-8"
                    title={revealAll ? 'Hide all emails' : 'Reveal all emails'}
                  >
                    {revealAll
                      ? <EyeOff className="h-3.5 w-3.5" />
                      : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => refetch()} disabled={isFetching}
                    className="h-8 w-8"
                    title="Refresh"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Toolbar (only when expanded) */}
          {expanded && (
            <div className="flex items-center gap-2 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search email or name…"
                  className="h-8 pl-8 pr-8 text-xs"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => setShowAdd(true)}
                className="h-8 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          )}
        </CardHeader>

        {/* Add subscriber dialog */}
        <Dialog
          open={showAdd}
          onOpenChange={(open) => {
            setShowAdd(open);
            if (!open) { setNewEmail(''); setNewName(''); setNewFrequency('instant'); }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-primary" />
                Add subscriber
              </DialogTitle>
              <DialogDescription className="text-xs">
                Add a new email recipient for insurance news alerts.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-sub-email" className="text-xs">Email *</Label>
                <Input
                  id="new-sub-email"
                  type="email" value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@example.com" maxLength={255} required autoFocus
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-sub-name" className="text-xs">Name (optional)</Label>
                <Input
                  id="new-sub-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name" maxLength={100}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Frequency</Label>
                <Select value={newFrequency} onValueChange={(v) => setNewFrequency(v as 'instant' | 'daily')}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">
                      <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Instant</span>
                    </SelectItem>
                    <SelectItem value="daily">
                      <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Daily digest</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(false)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={createMutation.isPending} className="h-8 gap-1.5 text-xs">
                  {createMutation.isPending
                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    : <Plus className="h-3.5 w-3.5" />}
                  Add subscriber
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit subscriber dialog */}
        <Dialog
          open={editing !== null}
          onOpenChange={(open) => { if (!open) setEditing(null); }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Pencil className="h-4 w-4 text-primary" />
                Edit subscriber
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update email, name, frequency, or active status.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-sub-email" className="text-xs">Email *</Label>
                <Input
                  id="edit-sub-email"
                  type="email" value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="name@example.com" maxLength={255} required autoFocus
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-sub-name" className="text-xs">Name (optional)</Label>
                <Input
                  id="edit-sub-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Full name" maxLength={100}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Frequency</Label>
                <Select value={editFrequency} onValueChange={(v) => setEditFrequency(v as 'instant' | 'daily')}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">
                      <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Instant</span>
                    </SelectItem>
                    <SelectItem value="daily">
                      <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Daily digest</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                <div className="space-y-0.5">
                  <Label className="text-xs">Active</Label>
                  <p className="text-[11px] text-muted-foreground">Inactive subscribers do not receive emails.</p>
                </div>
                <Switch checked={editActive} onCheckedChange={setEditActive} />
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={editMutation.isPending} className="h-8 gap-1.5 text-xs">
                  {editMutation.isPending
                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    : <Pencil className="h-3.5 w-3.5" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {expanded && (
        <CardContent id="subscribers-panel" className="pt-0">
          {/* Count + bulk bar */}
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <p className="text-[11px] text-muted-foreground">
              {isLoading
                ? 'Loading…'
                : `${filtered.length} of ${subscribers.length} subscriber${subscribers.length === 1 ? '' : 's'}`}
            </p>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <Badge variant="outline" className="h-6 px-2">
                  {selectedIds.size} selected
                </Badge>
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  disabled={bulkMutation.isPending}
                  onClick={() => bulkMutation.mutate('activate')}>
                  Activate
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  disabled={bulkMutation.isPending}
                  onClick={() => bulkMutation.mutate('deactivate')}>
                  Deactivate
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                  disabled={bulkMutation.isPending}
                  onClick={() => bulkMutation.mutate('set_instant')}>
                  <Zap className="h-3 w-3" /> Instant
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                  disabled={bulkMutation.isPending}
                  onClick={() => bulkMutation.mutate('set_daily')}>
                  <CalendarDays className="h-3 w-3" /> Daily
                </Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
                  disabled={bulkMutation.isPending}
                  onClick={() => setBulkConfirm('delete')}>
                  <Trash2 className="h-3 w-3" /> Remove
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={() => setSelectedIds(new Set())}>
                  Clear
                </Button>
              </div>
            )}
          </div>

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-8 border border-dashed border-border/50 rounded-lg">
              <Mail className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                {search ? 'No matches for your search.' : 'No subscribers yet. Click Add to get started.'}
              </p>
            </div>
          )}

          {filtered.length > 0 && (
            <>
              {(() => {
                const pageAllChecked = paged.length > 0 && paged.every((s) => selectedIds.has(s.id));
                const pageSomeChecked = paged.some((s) => selectedIds.has(s.id));
                return (
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/30 border-b border-border/40">
                      <Checkbox
                        checked={pageAllChecked ? true : (pageSomeChecked ? 'indeterminate' : false)}
                        onCheckedChange={() => togglePageSelect(paged, pageAllChecked)}
                        aria-label="Select all on page"
                      />
                      <span className="text-[11px] text-muted-foreground">Select all on page</span>
                    </div>
                    <div className="divide-y divide-border/40">
                      {paged.map((sub) => (
                        <SubscriberRow
                          key={sub.id}
                          sub={sub}
                          checked={selectedIds.has(sub.id)}
                          onToggleCheck={() => toggleSelect(sub.id)}
                          revealed={revealAll || revealedIds.has(sub.id)}
                          onToggleReveal={() => toggleReveal(sub.id)}
                          onEdit={() => openEdit(sub)}
                          onFrequency={(f) => updateMutation.mutate({ id: sub.id, changes: { frequency: f } })}
                          onActive={(a) => updateMutation.mutate({ id: sub.id, changes: { is_active: a } })}
                          onReset={() => setDialog({ kind: 'reset', sub })}
                          onCatchUp={() => setDialog({ kind: 'catchup', sub })}
                          onDelete={() => setDialog({ kind: 'delete', sub })}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Pagination */}
              <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>
                    {pageStart + 1}–{Math.min(pageStart + pageSize, filtered.length)} of {filtered.length}
                  </span>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                    <SelectTrigger className="h-7 w-[72px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>per page</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline" size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <span className="text-[11px] text-muted-foreground tabular-nums px-1">
                    Page {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline" size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
        )}
      </Card>

      {/* Confirm dialogs */}
      <AlertDialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          {dialog?.kind === 'reset' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset unread for {dialog.sub.email}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Clears all delivery records for this subscriber so every existing article becomes
                  "unread" again. They will be re-queued on the next send cycle. Cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => resetUnreadMutation.mutate(dialog.sub.id)}>
                  Reset unread
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {dialog?.kind === 'catchup' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark {dialog.sub.email} as caught up?</AlertDialogTitle>
                <AlertDialogDescription>
                  Marks every existing article as already-sent. The subscriber will only receive
                  articles published from now on. Skips the historical backlog.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => catchUpMutation.mutate(dialog.sub.id)}>
                  Mark caught up
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {dialog?.kind === 'delete' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove {dialog.sub.email}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Permanently removes this subscriber. Their delivery history is also deleted.
                  Cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate(dialog.sub.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InlineStat({
  icon: Icon, label, value, tone,
}: {
  icon: typeof Users; label: string; value: number;
  tone: 'primary' | 'amber' | 'blue';
}) {
  const tones = {
    primary: 'text-primary bg-primary/5 border-primary/15',
    amber: 'text-amber-600 bg-amber-500/5 border-amber-500/15',
    blue: 'text-blue-600 bg-blue-500/5 border-blue-500/15',
  }[tone];
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs ${tones}`}>
      <Icon className="h-3 w-3" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function SubscriberRow({
  sub, checked, onToggleCheck, revealed, onToggleReveal,
  onEdit, onFrequency, onActive, onReset, onCatchUp, onDelete,
}: {
  sub: Subscriber;
  checked: boolean;
  onToggleCheck: () => void;
  revealed: boolean;
  onToggleReveal: () => void;
  onEdit: () => void;
  onFrequency: (f: 'instant' | 'daily') => void;
  onActive: (a: boolean) => void;
  onReset: () => void;
  onCatchUp: () => void;
  onDelete: () => void;
}) {
  const stats = sub.send_stats ?? { sent: 0, pending: 0, failed: 0 };
  const displayEmail = revealed ? sub.email : maskEmail(sub.email);
  return (
    <div className={`flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors ${checked ? 'bg-primary/5' : ''}`}>
      <Checkbox
        checked={checked}
        onCheckedChange={onToggleCheck}
        aria-label={`Select ${sub.email}`}
        className="shrink-0"
      />

      {/* Identity (click to edit) */}
      <button
        type="button"
        onClick={onEdit}
        className="flex-1 min-w-0 text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Edit subscriber"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate font-mono">{displayEmail}</p>
          {sub.name && (
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">· {sub.name}</span>
          )}
          {!sub.is_active && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">Inactive</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
          <span>Added {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}</span>
          {sub.last_sent_at && (
            <span>· Last sent {formatDistanceToNow(new Date(sub.last_sent_at), { addSuffix: true })}</span>
          )}
        </div>
      </button>

      {/* Reveal toggle */}
      <Button
        variant="ghost" size="icon"
        onClick={(e) => { e.stopPropagation(); onToggleReveal(); }}
        className="h-7 w-7 shrink-0"
        title={revealed ? 'Hide email' : 'Reveal email'}
      >
        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>

      {/* Stats chips */}
      <div className="hidden md:flex items-center gap-1 shrink-0">
        <StatChip icon={CheckCircle2} value={stats.sent} tone="emerald" label="sent" />
        <StatChip icon={Clock} value={stats.pending} tone="amber" label="pending" />
        {stats.failed > 0 && (
          <StatChip icon={AlertCircle} value={stats.failed} tone="destructive" label="failed" />
        )}
      </div>

      {/* Controls */}
      <Select value={sub.frequency} onValueChange={(v) => onFrequency(v as 'instant' | 'daily')}>
        <SelectTrigger className="h-7 w-[110px] text-xs shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="instant">
            <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" />Instant</span>
          </SelectItem>
          <SelectItem value="daily">
            <span className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3" />Daily</span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Switch
        checked={sub.is_active}
        onCheckedChange={onActive}
        className="shrink-0"
        aria-label="Active"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-2" /> Reset unread
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onCatchUp}>
            <FastForward className="h-3.5 w-3.5 mr-2" /> Mark caught up
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove subscriber
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function StatChip({
  icon: Icon, value, tone, label,
}: {
  icon: typeof CheckCircle2; value: number;
  tone: 'emerald' | 'amber' | 'destructive'; label: string;
}) {
  const tones = {
    emerald: 'text-emerald-600 bg-emerald-500/5 border-emerald-500/20',
    amber: 'text-amber-600 bg-amber-500/5 border-amber-500/20',
    destructive: 'text-destructive bg-destructive/5 border-destructive/20',
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] tabular-nums ${tones}`}
      title={`${value} ${label}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {value}
    </span>
  );
}
