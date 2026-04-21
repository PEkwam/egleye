import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Plus, Trash2, RefreshCw, Users, Zap, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  frequency: 'instant' | 'daily';
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
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

export function SubscriberManager() {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newFrequency, setNewFrequency] = useState<'instant' | 'daily'>('instant');

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

  const createMutation = useMutation({
    mutationFn: () =>
      callManage('create', {
        email: newEmail.trim().toLowerCase(),
        name: newName.trim() || null,
        frequency: newFrequency,
      }),
    onSuccess: () => {
      toast.success('Subscriber added');
      setNewEmail('');
      setNewName('');
      setNewFrequency('instant');
      queryClient.invalidateQueries({ queryKey: ['news-subscribers'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add subscriber'),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; changes: Partial<Subscriber> }) =>
      callManage('update', { id: vars.id, ...vars.changes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-subscribers'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => callManage('delete', { id }),
    onSuccess: () => {
      toast.success('Subscriber removed');
      queryClient.invalidateQueries({ queryKey: ['news-subscribers'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to remove'),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(newEmail)) {
      toast.error('Please enter a valid email');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              News Alert Subscribers
            </CardTitle>
            <CardDescription>
              Manage who receives email alerts when new insurance news is published.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> Active
            </div>
            <p className="text-xl font-bold text-primary mt-1">{activeCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" /> Instant
            </div>
            <p className="text-xl font-bold text-amber-600 mt-1">{instantCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" /> Daily
            </div>
            <p className="text-xl font-bold text-blue-600 mt-1">{dailyCount}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Add form */}
        <form onSubmit={handleAdd} className="grid gap-3 p-4 rounded-xl border border-border/60 bg-muted/20">
          <p className="text-sm font-medium">Add subscriber</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub-email" className="text-xs">Email *</Label>
              <Input
                id="sub-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@example.com"
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-name" className="text-xs">Name (optional)</Label>
              <Input
                id="sub-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Jane Doe"
                maxLength={100}
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Alert frequency</Label>
              <Select value={newFrequency} onValueChange={(v) => setNewFrequency(v as 'instant' | 'daily')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant — every new article</SelectItem>
                  <SelectItem value="daily">Daily digest — once per day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </Button>
          </div>
        </form>

        {/* List */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {isLoading ? 'Loading…' : `${subscribers.length} subscriber${subscribers.length === 1 ? '' : 's'}`}
          </p>

          {!isLoading && subscribers.length === 0 && (
            <div className="text-center py-10 border border-dashed border-border/50 rounded-xl">
              <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No subscribers yet. Add one above.</p>
            </div>
          )}

          <div className="divide-y divide-border/50 rounded-xl border border-border/60 overflow-hidden">
            {subscribers.map((sub) => (
              <div
                key={sub.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{sub.email}</p>
                    {!sub.is_active && (
                      <Badge variant="outline" className="text-[10px]">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    {sub.name && <span className="truncate max-w-[160px]">{sub.name}</span>}
                    <span>Added {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}</span>
                    {sub.last_sent_at && (
                      <span>Last sent {formatDistanceToNow(new Date(sub.last_sent_at), { addSuffix: true })}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Select
                    value={sub.frequency}
                    onValueChange={(v) =>
                      updateMutation.mutate({ id: sub.id, changes: { frequency: v as 'instant' | 'daily' } })
                    }
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
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

                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={sub.is_active}
                      onCheckedChange={(checked) =>
                        updateMutation.mutate({ id: sub.id, changes: { is_active: checked } })
                      }
                    />
                    <Label className="text-xs text-muted-foreground">Active</Label>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm(`Remove ${sub.email}?`)) deleteMutation.mutate(sub.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
