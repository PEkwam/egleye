// Public unsubscribe endpoint. GET to check, POST to confirm.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function hmacToken(subscriberId: string): Promise<string> {
  const secret = Deno.env.get('ADMIN_PASSWORD') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'fallback';
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(subscriberId));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  let id = url.searchParams.get('id') ?? '';
  let t = url.searchParams.get('t') ?? '';
  let frequency: string | null = null;

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      id = body.id ?? id;
      t = body.t ?? t;
      frequency = body.frequency ?? null;
    } catch { /* noop */ }
  }

  if (!id || !t) return json({ error: 'Missing token' }, 400);
  const expected = await hmacToken(id);
  if (t !== expected) return json({ error: 'Invalid token' }, 403);

  const { data: sub, error } = await supabase
    .from('news_subscribers')
    .select('id, email, name, is_active, frequency')
    .eq('id', id).maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!sub) return json({ error: 'Subscriber not found' }, 404);

  if (req.method === 'POST') {
    if (frequency === 'daily' || frequency === 'instant') {
      const { error: uErr } = await supabase
        .from('news_subscribers')
        .update({ frequency, is_active: true })
        .eq('id', id);
      if (uErr) return json({ error: uErr.message }, 500);
      return json({ ok: true, action: 'frequency_changed', frequency });
    }
    const { error: uErr } = await supabase
      .from('news_subscribers')
      .update({ is_active: false })
      .eq('id', id);
    if (uErr) return json({ error: uErr.message }, 500);
    return json({ ok: true, action: 'unsubscribed' });
  }

  return json({
    ok: true,
    email: sub.email,
    name: sub.name,
    is_active: sub.is_active,
    frequency: sub.frequency,
  });
});
