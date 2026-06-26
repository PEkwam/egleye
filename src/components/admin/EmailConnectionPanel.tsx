import { useEffect, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Mail, Plug, CheckCircle2, AlertCircle, Trash2, Save, Send, Loader2, Eye, EyeOff, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Provider = 'gmail' | 'outlook' | 'sendgrid' | 'mailgun' | 'smtp';

interface EmailProfile {
  id?: string;
  label: string;
  provider: Provider;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  reply_to: string | null;
  is_active: boolean;
  last_verified_at?: string | null;
  last_error?: string | null;
}

const PRESETS: Record<Provider, Partial<EmailProfile> & { hint: string }> = {
  gmail: {
    host: 'smtp.gmail.com', port: 587, secure: false,
    hint: 'Use a Google account with 2-Step Verification and create an App Password (16-character) — the regular Gmail password will not work.',
  },
  outlook: {
    host: 'smtp.office365.com', port: 587, secure: false,
    hint: 'Outlook/Microsoft 365. Account must allow SMTP AUTH (disabled by default for newer tenants — enable it in the Microsoft 365 admin center).',
  },
  sendgrid: {
    host: 'smtp.sendgrid.net', port: 587, secure: false,
    hint: 'Use "apikey" as the username and your SendGrid API key as the password.',
  },
  mailgun: {
    host: 'smtp.mailgun.org', port: 587, secure: false,
    hint: 'Username is your full SMTP login (e.g. postmaster@mg.yourdomain.com).',
  },
  smtp: {
    host: '', port: 587, secure: false,
    hint: 'Generic SMTP — fill in the host, port and credentials provided by your email provider.',
  },
};

const empty = (): EmailProfile => ({
  label: 'My Email Connection',
  provider: 'gmail',
  host: PRESETS.gmail.host as string,
  port: 587,
  secure: false,
  username: '',
  password: '',
  from_email: '',
  from_name: '',
  reply_to: '',
  is_active: true,
});

async function call(action: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('manage-email-connection', {
    body: { action, ...body },
    headers: { 'x-admin-token': sessionStorage.getItem('admin_token') ?? '' },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function EmailConnectionPanel() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<EmailProfile>(empty());
  const [showPwd, setShowPwd] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendTestOpen, setSendTestOpen] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['email-connections'],
    queryFn: async () => (await call('list')) as { profiles: EmailProfile[] },
  });
  const profiles = data?.profiles ?? [];

  const saveMut = useMutation({
    mutationFn: (p: EmailProfile) => call('save', { profile: p }),
    onSuccess: () => {
      toast.success('Email connection saved');
      qc.invalidateQueries({ queryKey: ['email-connections'] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testMut = useMutation({
    mutationFn: (p: EmailProfile) => call('test', { profile: p }),
    onSuccess: (d: any) => {
      toast.success(d.message ?? 'Connection verified ✅');
      qc.invalidateQueries({ queryKey: ['email-connections'] });
    },
    onError: (e: Error) => toast.error(`Verification failed: ${e.message}`),
  });

  const sendTestMut = useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) => call('send_test', { id, to }),
    onSuccess: (d: any) => {
      toast.success(d.message ?? 'Test email sent ✅');
      setSendTestOpen(null);
      setTestEmail('');
    },
    onError: (e: Error) => toast.error(`Send failed: ${e.message}`),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => call('delete', { id }),
    onSuccess: () => {
      toast.success('Connection deleted');
      qc.invalidateQueries({ queryKey: ['email-connections'] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // When the provider changes, snap in preset host/port if user hasn't customized them
  const onProviderChange = (provider: Provider) => {
    const preset = PRESETS[provider];
    setForm((f) => ({
      ...f,
      provider,
      host: preset.host || f.host,
      port: (preset.port as number) ?? f.port,
      secure: (preset.secure as boolean) ?? f.secure,
    }));
  };

  const openCreate = () => {
    setForm(empty());
    setShowPwd(false);
    setDialogOpen(true);
  };

  const openEdit = (p: EmailProfile) => {
    setForm({ ...p, password: '••••••••' });
    setShowPwd(false);
    setDialogOpen(true);
  };

  const isValid = !!(
    form.label.trim() && form.host.trim() && form.port && form.username.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.from_email) &&
    form.password
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-500" />
              Email Connection
            </CardTitle>
            <CardDescription>
              Configure the SMTP server used to send subscriber news alerts. Supports Gmail, Outlook, SendGrid, Mailgun or any custom SMTP server.
            </CardDescription>
          </div>
          <Button onClick={openCreate} size="sm" className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="h-4 w-4 mr-1" /> Add connection
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading connections…
          </div>
        ) : profiles.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <Plug className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No email connection configured. Add one to start sending subscriber alerts from your own mailbox.
            </p>
          </div>
        ) : (
          profiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card/50">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold truncate">{p.label}</span>
                  <Badge variant="outline" className="uppercase text-[10px]">{p.provider}</Badge>
                  {p.is_active && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Active</Badge>}
                  {p.last_verified_at ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" /> Verified {new Date(p.last_verified_at).toLocaleString()}
                    </span>
                  ) : p.last_error ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-rose-600">
                      <AlertCircle className="h-3 w-3" /> {p.last_error.slice(0, 60)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Not verified yet</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {p.from_name ? `${p.from_name} <${p.from_email}>` : p.from_email} · {p.host}:{p.port}{p.secure ? ' (TLS)' : ''}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="outline" size="sm" onClick={() => testMut.mutate(p)} disabled={testMut.isPending}>
                  {testMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span className="hidden sm:inline ml-1">Verify</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSendTestOpen(p.id!)}>
                  <Send className="h-4 w-4" /><span className="hidden sm:inline ml-1">Test send</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => setDeleteId(p.id!)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Edit / Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit email connection' : 'New email connection'}</DialogTitle>
            <DialogDescription>
              All fields marked * are required. The password is stored server-side and never exposed back to the browser.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Label *</Label>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. EGL Eye Gmail" />
              </div>
              <div className="space-y-1.5">
                <Label>Provider *</Label>
                <Select value={form.provider} onValueChange={(v) => onProviderChange(v as Provider)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail (App Password)</SelectItem>
                    <SelectItem value="outlook">Outlook / Microsoft 365</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="mailgun">Mailgun</SelectItem>
                    <SelectItem value="smtp">Custom SMTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-md p-2">
              💡 {PRESETS[form.provider].hint}
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>SMTP host *</Label>
                <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="smtp.example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Port *</Label>
                <Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label className="text-sm">Use implicit TLS (SSL)</Label>
                <p className="text-xs text-muted-foreground">Enable for port 465. Leave off for 587 (STARTTLS).</p>
              </div>
              <Switch checked={form.secure} onCheckedChange={(v) => setForm({ ...form, secure: v })} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Username *</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="login@example.com" autoComplete="off" />
              </div>
              <div className="space-y-1.5">
                <Label>Password *</Label>
                <div className="relative">
                  <Input
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={form.id ? 'Leave masked to keep current' : 'App password / SMTP password'}
                    autoComplete="new-password"
                    className="pr-9"
                  />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From email *</Label>
                <Input
                  type="email"
                  value={form.from_email}
                  onChange={(e) => setForm({ ...form, from_email: e.target.value })}
                  placeholder="news@yourdomain.com"
                />
                <p className="text-[11px] text-muted-foreground">Must be an address the SMTP server allows you to send as.</p>
              </div>
              <div className="space-y-1.5">
                <Label>From name</Label>
                <Input value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} placeholder="EGL Eye Newsroom" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Reply-to (optional)</Label>
                <Input
                  type="email"
                  value={form.reply_to ?? ''}
                  onChange={(e) => setForm({ ...form, reply_to: e.target.value })}
                  placeholder="hello@yourdomain.com"
                />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <div className="flex items-center justify-between rounded-md border border-border p-3 w-full">
                  <div>
                    <Label className="text-sm">Use as active connection</Label>
                    <p className="text-xs text-muted-foreground">Only one profile can be active at a time.</p>
                  </div>
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => testMut.mutate(form)} disabled={!isValid || testMut.isPending}>
              {testMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Verify connection
            </Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={!isValid || saveMut.isPending}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700">
              {saveMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send test dialog */}
      <Dialog open={!!sendTestOpen} onOpenChange={(v) => !v && setSendTestOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send a test email</DialogTitle>
            <DialogDescription>We'll send a small verification email through this connection.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Recipient</Label>
            <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendTestOpen(null)}>Cancel</Button>
            <Button
              onClick={() => sendTestMut.mutate({ id: sendTestOpen!, to: testEmail })}
              disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail) || sendTestMut.isPending}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {sendTestMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Send test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this email connection?</AlertDialogTitle>
            <AlertDialogDescription>
              Subscriber emails will stop sending if this is the active connection and no other profile takes over.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMut.mutate(deleteId)} className="bg-rose-600 hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
