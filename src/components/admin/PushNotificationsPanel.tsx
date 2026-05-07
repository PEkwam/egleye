import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Send, Trash2, Monitor, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { DesktopAlertsButton } from '@/components/DesktopAlertsButton';

interface Device {
  id: string;
  audience: string;
  label: string | null;
  user_agent: string | null;
  is_active: boolean;
  last_success_at: string | null;
  last_error: string | null;
  created_at: string;
}

async function callPush(action: string, payload: Record<string, unknown> = {}) {
  const token = sessionStorage.getItem('admin_token');
  if (!token) throw new Error('Not authenticated');
  const { data, error } = await supabase.functions.invoke('web-push', {
    body: { action, ...payload },
    headers: { 'x-admin-token': token },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function PushNotificationsPanel() {
  const qc = useQueryClient();
  const [audience, setAudience] = useState<'all' | 'public' | 'admin'>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { data: devices, isLoading } = useQuery({
    queryKey: ['push-devices'],
    queryFn: async () => (await callPush('list_devices')).devices as Device[],
  });

  const broadcast = useMutation({
    mutationFn: () =>
      callPush('broadcast', {
        audience,
        title: title.trim() || 'EGL EYE Insurance Update',
        body: body.trim(),
      }),
    onSuccess: (res: any) => {
      toast.success(`Sent to ${res.sent}/${res.total} device${res.total === 1 ? '' : 's'}`);
      setTitle('');
      setBody('');
      qc.invalidateQueries({ queryKey: ['push-devices'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => callPush('delete_device', { id }),
    onSuccess: () => {
      toast.success('Device removed');
      qc.invalidateQueries({ queryKey: ['push-devices'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const stats = (devices ?? []).reduce(
    (acc, d) => {
      acc.total += 1;
      if (d.is_active) acc.active += 1;
      if (d.audience === 'admin') acc.admin += 1;
      else acc.public += 1;
      return acc;
    },
    { total: 0, active: 0, admin: 0, public: 0 },
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> Desktop Push Notifications
              </CardTitle>
              <CardDescription>
                Send insurance alerts straight to system tray / Action Centre — no portal needed.
              </CardDescription>
            </div>
            <DesktopAlertsButton audience="admin" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Devices</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Active</div>
              <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Public</div>
              <div className="text-2xl font-bold">{stats.public}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Admin list</div>
              <div className="text-2xl font-bold">{stats.admin}</div>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Send className="h-4 w-4" /> Broadcast a custom alert
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <Label className="text-xs">Audience</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="public">Public visitors</SelectItem>
                    <SelectItem value="admin">Admin list only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. NIC just released Q3 figures" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                placeholder="Short summary that will appear in the notification…"
                maxLength={220}
              />
            </div>
            <Button onClick={() => broadcast.mutate()} disabled={broadcast.isPending || !body.trim()}>
              {broadcast.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
              Send notification
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered devices</CardTitle>
          <CardDescription>Each browser/device that opted in to desktop alerts.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : !devices || devices.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No devices yet. Visitors who click "Desktop alerts" will appear here.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {devices.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-card">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Monitor className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {d.label || (d.user_agent ? d.user_agent.split(' ').slice(0, 4).join(' ') : 'Device')}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] py-0 h-4">{d.audience}</Badge>
                        {d.is_active ? (
                          <span className="text-emerald-600">active</span>
                        ) : (
                          <span className="text-destructive">inactive</span>
                        )}
                        {d.last_success_at && (
                          <span>· last sent {formatDistanceToNow(new Date(d.last_success_at), { addSuffix: true })}</span>
                        )}
                        {d.last_error && (
                          <span className="text-destructive truncate">· {d.last_error.slice(0, 60)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(d.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
