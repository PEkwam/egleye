// Web Push edge function — handles VAPID bootstrap, subscribe/unsubscribe,
// and broadcasting push notifications to registered devices.
//
// Actions:
//   public_key                       -> { publicKey }
//   subscribe   { subscription, audience?, label?, subscriberId? }
//   unsubscribe { endpoint }
//   broadcast   { audience?, articleId?, title, body, image?, sourceUrl?, portalUrl? }   (admin)
//   send_article { articleId, audience? }                                               (admin)
//   list_devices                                                                        (admin)
//   delete_device { id }                                                                (admin)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import webpush from 'https://esm.sh/web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabase
    .from('site_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .maybeSingle();
  return (data?.setting_value as string | null) ?? null;
}

async function setSetting(key: string, value: string) {
  await supabase
    .from('site_settings')
    .upsert({ setting_key: key, setting_value: value, setting_type: 'text' }, { onConflict: 'setting_key' });
}

async function verifyAdminToken(token: string | null): Promise<boolean> {
  const secret = Deno.env.get('ADMIN_PASSWORD');
  if (!token || !secret) return false;
  if (!token.startsWith('admin.')) return false;
  const parts = token.split('.');
  if (parts.length !== 4) return false;
  const [, expiresAtRaw, nonce, signature] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || !nonce || !signature) return false;
  const payload = `${expiresAtRaw}.${nonce}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

async function ensureVapid(): Promise<{ publicKey: string; privateKey: string; subject: string }> {
  let publicKey = await getSetting('vapid_public_key');
  let privateKey = await getSetting('vapid_private_key');
  const subject = (await getSetting('vapid_subject')) || 'mailto:admin@egleye.app';

  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
    await setSetting('vapid_public_key', publicKey);
    await setSetting('vapid_private_key', privateKey);
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return { publicKey, privateKey, subject };
}

async function sendOne(
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 },
    );
    await supabase
      .from('push_subscriptions')
      .update({ last_success_at: new Date().toISOString(), last_error: null, is_active: true })
      .eq('id', sub.id);
    return { ok: true };
  } catch (err: any) {
    const status = err?.statusCode ?? 0;
    const errorMessage = err?.body || err?.message || 'send failed';
    // 404 / 410 — endpoint is gone, deactivate
    if (status === 404 || status === 410) {
      await supabase.from('push_subscriptions').update({ is_active: false, last_error: errorMessage }).eq('id', sub.id);
    } else {
      await supabase.from('push_subscriptions').update({ last_error: errorMessage }).eq('id', sub.id);
    }
    return { ok: false, status, error: errorMessage };
  }
}

async function broadcastToAudience(
  audience: 'public' | 'admin' | 'all',
  payload: Record<string, unknown>,
) {
  await ensureVapid();
  let query = supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, audience')
    .eq('is_active', true);
  if (audience !== 'all') query = query.eq('audience', audience);

  const { data: subs, error } = await query;
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  for (const s of subs ?? []) {
    const r = await sendOne(s as any, payload);
    if (r.ok) sent += 1;
    else failed += 1;
  }
  return { sent, failed, total: (subs ?? []).length };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const adminToken = req.headers.get('x-admin-token');

    if (action === 'public_key') {
      const { publicKey } = await ensureVapid();
      return json({ publicKey });
    }

    if (action === 'subscribe') {
      const sub = body.subscription;
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
        return json({ error: 'Invalid subscription' }, 400);
      }
      // Only callers presenting a valid admin token can register as the 'admin' audience.
      // All other callers (anonymous/public) are forced into the 'public' audience to
      // prevent untrusted devices from receiving admin-targeted broadcasts.
      let audience: 'admin' | 'public' = 'public';
      if (body.audience === 'admin') {
        if (!(await verifyAdminToken(adminToken))) {
          return json({ error: 'Admin token required for admin audience' }, 401);
        }
        audience = 'admin';
      }
      const row = {
        endpoint: String(sub.endpoint),
        p256dh: String(sub.keys.p256dh),
        auth: String(sub.keys.auth),
        audience,
        subscriber_id: body.subscriberId ?? null,
        label: body.label ? String(body.label).slice(0, 100) : null,
        user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
        is_active: true,
      };
      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert(row, { onConflict: 'endpoint' })
        .select()
        .single();
      if (error) throw error;
      return json({ subscription: data });
    }

    if (action === 'unsubscribe') {
      const endpoint = String(body.endpoint ?? '');
      if (!endpoint) return json({ error: 'Missing endpoint' }, 400);
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      return json({ success: true });
    }

    // ---- Admin-only below ----
    if (!(await verifyAdminToken(adminToken))) return json({ error: 'Unauthorized' }, 401);

    if (action === 'list_devices') {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id, audience, label, user_agent, is_active, last_success_at, last_error, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return json({ devices: data });
    }

    if (action === 'delete_device') {
      const id = String(body.id ?? '');
      if (!id) return json({ error: 'Missing id' }, 400);
      await supabase.from('push_subscriptions').delete().eq('id', id);
      return json({ success: true });
    }

    if (action === 'broadcast') {
      const audience = body.audience === 'admin' || body.audience === 'public' ? body.audience : 'all';
      const payload = {
        title: String(body.title ?? 'EGL EYE'),
        body: String(body.body ?? ''),
        image: body.image ?? undefined,
        articleId: body.articleId ?? null,
        sourceUrl: body.sourceUrl ?? null,
        portalUrl: body.portalUrl ?? '/',
        tag: body.tag ?? `egl-${Date.now()}`,
      };
      const result = await broadcastToAudience(audience, payload);
      return json({ success: true, ...result });
    }

    if (action === 'send_article') {
      const articleId = String(body.articleId ?? '');
      const audience = body.audience === 'admin' || body.audience === 'public' ? body.audience : 'all';
      if (!articleId) return json({ error: 'Missing articleId' }, 400);
      const { data: art, error } = await supabase
        .from('news_articles')
        .select('id, title, description, image_url, source_url, source_name')
        .eq('id', articleId)
        .single();
      if (error || !art) return json({ error: 'Article not found' }, 404);

      const payload = {
        title: art.source_name ? `${art.source_name}: ${art.title}` : art.title,
        body: (art.description ?? '').slice(0, 220),
        image: art.image_url ?? undefined,
        articleId: art.id,
        sourceUrl: art.source_url,
        portalUrl: '/',
        tag: `egl-article-${art.id}`,
      };
      const result = await broadcastToAudience(audience as any, payload);
      return json({ success: true, ...result });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    console.error('web-push error', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return json({ error: message }, 500);
  }
});
