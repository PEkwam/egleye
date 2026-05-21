import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

type State =
  | { kind: 'loading' }
  | { kind: 'invalid'; message: string }
  | { kind: 'ready'; email: string; name: string | null; frequency: string; is_active: boolean }
  | { kind: 'done'; action: 'unsubscribed' | 'frequency_changed'; frequency?: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const id = params.get('id') ?? '';
  const t = params.get('t') ?? '';
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [submitting, setSubmitting] = useState(false);
  const { siteName } = useSiteSettings();

  useEffect(() => {
    (async () => {
      if (!id || !t) { setState({ kind: 'invalid', message: 'Missing unsubscribe link parameters.' }); return; }
      const { data, error } = await supabase.functions.invoke('news-unsubscribe', {
        body: null,
        method: 'GET' as never,
      } as never).catch(() => ({ data: null, error: { message: 'Network error' } } as any));
      // Fallback: hit the function URL directly with GET since invoke is POST
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/news-unsubscribe?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`;
        const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
        const body = await res.json();
        if (!res.ok) { setState({ kind: 'invalid', message: body.error || 'Invalid link' }); return; }
        setState({ kind: 'ready', email: body.email, name: body.name, frequency: body.frequency, is_active: body.is_active });
      } catch (e: any) {
        setState({ kind: 'invalid', message: e.message || 'Could not verify link' });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function call(payload: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/news-unsubscribe`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ id, t, ...payload }),
      });
      const body = await res.json();
      if (!res.ok) { setState({ kind: 'invalid', message: body.error || 'Action failed' }); return; }
      setState({ kind: 'done', action: body.action, frequency: body.frequency });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === 'loading' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying your link…
            </div>
          )}
          {state.kind === 'invalid' && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5" /> {state.message}
            </div>
          )}
          {state.kind === 'ready' && (
            <>
              <p className="text-sm text-muted-foreground">
                Manage alerts for <span className="font-medium text-foreground">{state.email}</span>.
              </p>
              <div className="space-y-2">
                <Button className="w-full" variant="default" disabled={submitting}
                  onClick={() => call({ frequency: 'daily' })}>
                  Switch to daily digest (one email per day)
                </Button>
                <Button className="w-full" variant="outline" disabled={submitting}
                  onClick={() => call({ frequency: 'instant' })}>
                  Keep instant alerts
                </Button>
                <Button className="w-full" variant="destructive" disabled={submitting}
                  onClick={() => call({})}>
                  Unsubscribe from all emails
                </Button>
              </div>
            </>
          )}
          {state.kind === 'done' && (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm">
                {state.action === 'unsubscribed'
                  ? `You're unsubscribed from ${siteName} alerts.`
                  : `Frequency updated to ${state.frequency}.`}
              </p>
              <Link to="/" className="text-xs text-primary hover:underline">Back to {siteName}</Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
