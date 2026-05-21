// Gmail-powered news alert sender.
// Actions:
//   - enqueue_article  { articleId }            (called by crawler, no admin token)
//   - process_queue    { limit?: number = 25 }  (admin token)
//   - send_test        { email, articleId? }    (admin token)
//   - status                                    (admin token) -> returns connected gmail address + daily count

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_mail/gmail/v1';
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://egleye.lovable.app').replace(/\/+$/, '');

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// ---------- helpers ----------
function b64urlEncode(s: string): string {
  // UTF-8 safe base64url
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacToken(subscriberId: string): Promise<string> {
  const secret = Deno.env.get('ADMIN_PASSWORD') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'fallback';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(subscriberId));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 32);
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

interface Article {
  id: string;
  title: string;
  description: string | null;
  source_url: string;
  source_name: string | null;
  image_url: string | null;
  category: string;
  published_at: string | null;
}

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
}

interface SiteBrand {
  siteName: string;
  tagline: string;
  primary: string; // hex
}

async function loadBrand(): Promise<SiteBrand> {
  const { data } = await supabase
    .from('site_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['site_name', 'site_tagline', 'color_theme']);
  const m = new Map((data ?? []).map((r) => [r.setting_key, r.setting_value]));
  const theme = m.get('color_theme') ?? 'enterprise_life';
  return {
    siteName: m.get('site_name') || 'InsuraWatch',
    tagline: m.get('site_tagline') || 'Ghana Insurance Intelligence',
    primary: theme === 'enterprise_group' ? '#7A1F2B' : '#1B5E3A',
  };
}

function buildHtml(article: Article, subscriber: Subscriber, brand: SiteBrand, unsubUrl: string): string {
  const articleUrl = `${SITE_URL}/article/${article.id}`;
  const greeting = subscriber.name ? `Hi ${escapeHtml(subscriber.name.split(' ')[0])},` : 'Hello,';
  const desc = article.description ? escapeHtml(article.description.slice(0, 280)) : '';
  const img = article.image_url ? `<img src="${escapeHtml(article.image_url)}" alt="" style="width:100%;max-width:560px;height:auto;border-radius:8px;display:block;margin:0 0 20px"/>` : '';
  const source = article.source_name ? `<span style="color:#6b7280">${escapeHtml(article.source_name)}</span>` : '';
  const date = article.published_at ? new Date(article.published_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
  const meta = [source, date].filter(Boolean).join(' &middot; ');
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
  <div style="font-size:13px;color:#6b7280;margin-bottom:16px">${escapeHtml(brand.siteName)} &mdash; ${escapeHtml(brand.tagline)}</div>
  <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px">
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5">${greeting}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.5">A new story just landed in your Ghana insurance feed:</p>
    ${img}
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-family:Georgia,'Times New Roman',serif;color:#111827">
      <a href="${escapeHtml(articleUrl)}" style="color:#111827;text-decoration:none">${escapeHtml(article.title)}</a>
    </h1>
    ${meta ? `<div style="margin:0 0 16px;font-size:12px">${meta}</div>` : ''}
    ${desc ? `<p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#374151">${desc}&hellip;</p>` : ''}
    <a href="${escapeHtml(articleUrl)}" style="display:inline-block;background:${brand.primary};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600">Read full article</a>
  </div>
  <div style="margin-top:20px;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6">
    You're receiving this because you subscribed to ${escapeHtml(brand.siteName)} alerts.<br>
    <a href="${escapeHtml(unsubUrl)}" style="color:#6b7280">Unsubscribe</a> &middot;
    <a href="${escapeHtml(SITE_URL)}" style="color:#6b7280">Visit portal</a>
  </div>
</div>
</body></html>`;
}

function buildPlain(article: Article, brand: SiteBrand, unsubUrl: string): string {
  const url = `${SITE_URL}/article/${article.id}`;
  return [
    `${brand.siteName} - ${brand.tagline}`,
    '',
    article.title,
    article.source_name ? `Source: ${article.source_name}` : '',
    '',
    article.description ? article.description.slice(0, 400) : '',
    '',
    `Read: ${url}`,
    '',
    `Unsubscribe: ${unsubUrl}`,
  ].filter(Boolean).join('\n');
}

async function buildRawMessage(opts: {
  from?: string;
  fromName: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubUrl: string;
}): Promise<string> {
  const boundary = `b_${crypto.randomUUID().replace(/-/g, '')}`;
  const headers = [
    opts.from ? `From: ${opts.fromName} <${opts.from}>` : null,
    `To: ${opts.to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(opts.subject)))}?=`,
    `MIME-Version: 1.0`,
    `List-Unsubscribe: <${opts.unsubUrl}>`,
    `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean).join('\r\n');
  const body = [
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    '',
    opts.text,
    '',
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    '',
    opts.html,
    '',
    `--${boundary}--`,
  ].join('\r\n');
  return b64urlEncode(`${headers}\r\n\r\n${body}`);
}

type GmailProfileResult = {
  profile: { emailAddress: string; messagesTotal?: number } | null;
  error?: string;
  status?: number;
};

async function getGmailProfile(): Promise<GmailProfileResult> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GOOGLE_MAIL_API_KEY = Deno.env.get('GOOGLE_MAIL_API_KEY');
  if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) return { profile: null, error: 'Gmail connector secrets are not available', status: 500 };
  const res = await fetch(`${GATEWAY_URL}/users/me/profile`, {
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': GOOGLE_MAIL_API_KEY,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      profile: null,
      error: data?.error?.message || `Gmail profile check failed with HTTP ${res.status}`,
      status: res.status,
    };
  }
  return { profile: data };
}

async function sendViaGmail(raw: string): Promise<{ id?: string; error?: string; status: number }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GOOGLE_MAIL_API_KEY = Deno.env.get('GOOGLE_MAIL_API_KEY');
  if (!LOVABLE_API_KEY) return { error: 'LOVABLE_API_KEY not configured', status: 500 };
  if (!GOOGLE_MAIL_API_KEY) return { error: 'Gmail not connected', status: 500 };

  const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': GOOGLE_MAIL_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data?.error?.message || `HTTP ${res.status}`, status: res.status };
  return { id: data.id, status: res.status };
}

// ---------- handler ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* noop */ }
  const action = String(body.action || '');

  const requiresAdmin = ['process_queue', 'send_test', 'status'].includes(action);
  if (requiresAdmin) {
    const token = req.headers.get('x-admin-token');
    if (!(await verifyAdminToken(token))) {
      return json({ error: 'Unauthorized' }, 401);
    }
  }

  try {
    if (action === 'status') {
      const result = await getGmailProfile();
      const hasConnectorSecrets = !!Deno.env.get('LOVABLE_API_KEY') && !!Deno.env.get('GOOGLE_MAIL_API_KEY');
      return json({
        connected: hasConnectorSecrets,
        profile: result.profile,
        error: hasConnectorSecrets ? undefined : result.error,
        status: result.status,
      });
    }

    if (action === 'enqueue_article') {
      const articleId = String(body.articleId || '');
      if (!articleId) return json({ error: 'Missing articleId' }, 400);

      const { data: subs, error: sErr } = await supabase
        .from('news_subscribers')
        .select('id')
        .eq('is_active', true)
        .eq('frequency', 'instant');
      if (sErr) throw sErr;

      const rows = (subs ?? []).map((s) => ({
        subscriber_id: s.id,
        article_id: articleId,
        status: 'pending',
      }));
      if (rows.length === 0) return json({ enqueued: 0 });

      const { error: iErr, count } = await supabase
        .from('news_subscriber_sends')
        .upsert(rows, { onConflict: 'subscriber_id,article_id', ignoreDuplicates: true, count: 'exact' });
      if (iErr) throw iErr;
      return json({ enqueued: count ?? rows.length });
    }

    if (action === 'send_test') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Invalid email' }, 400);

      let article: Article;
      if (body.articleId) {
        const { data, error } = await supabase.from('news_articles').select('*').eq('id', body.articleId).single();
        if (error) throw error;
        article = data as Article;
      } else {
        const { data, error } = await supabase
          .from('news_articles').select('*')
          .order('published_at', { ascending: false, nullsFirst: false })
          .limit(1).single();
        if (error) throw error;
        article = data as Article;
      }

      const brand = await loadBrand();
      const fakeSub: Subscriber = { id: 'test', email, name: 'Test User' };
      const unsubUrl = `${SITE_URL}/unsubscribe?id=test&t=test`;
      const html = buildHtml(article, fakeSub, brand, unsubUrl);
      const text = buildPlain(article, brand, unsubUrl);

      const { profile } = await getGmailProfile();
      const raw = await buildRawMessage({
        from: profile?.emailAddress,
        fromName: brand.siteName,
        to: email,
        subject: '[TEST] EGL EYE News Alert',
        html, text, unsubUrl,
      });
      const result = await sendViaGmail(raw);
      if (result.error) return json({ ok: false, error: result.error }, 502);
      return json({ ok: true, messageId: result.id, from: profile?.emailAddress ?? 'connected Gmail account' });
    }

    if (action === 'process_queue') {
      const limit = Math.min(Math.max(Number(body.limit ?? 25), 1), 100);

      const { data: pending, error: pErr } = await supabase
        .from('news_subscriber_sends')
        .select('id, subscriber_id, article_id, attempts')
        .eq('status', 'pending')
        .lt('attempts', 5)
        .order('created_at', { ascending: true })
        .limit(limit);
      if (pErr) throw pErr;
      if (!pending || pending.length === 0) return json({ processed: 0, sent: 0, failed: 0 });

      const subIds = [...new Set(pending.map((r) => r.subscriber_id))];
      const artIds = [...new Set(pending.map((r) => r.article_id))];
      const [{ data: subs }, { data: arts }, brand, gmail] = await Promise.all([
        supabase.from('news_subscribers').select('id, email, name, is_active').in('id', subIds),
        supabase.from('news_articles').select('id, title, description, source_url, source_name, image_url, category, published_at').in('id', artIds),
        loadBrand(),
        getGmailProfile(),
      ]);
      const subMap = new Map((subs ?? []).map((s: any) => [s.id, s]));
      const artMap = new Map((arts ?? []).map((a: any) => [a.id, a]));
      const hasConnectorSecrets = !!Deno.env.get('LOVABLE_API_KEY') && !!Deno.env.get('GOOGLE_MAIL_API_KEY');
      if (!hasConnectorSecrets) return json({ error: 'Gmail not connected' }, 500);

      let sent = 0, failed = 0;
      for (const row of pending) {
        const sub = subMap.get(row.subscriber_id) as Subscriber & { is_active: boolean } | undefined;
        const art = artMap.get(row.article_id) as Article | undefined;

        if (!sub || !sub.is_active || !art) {
          await supabase.from('news_subscriber_sends').update({
            status: 'skipped', error_message: !sub ? 'subscriber missing' : !art ? 'article missing' : 'subscriber inactive',
            sent_at: new Date().toISOString(),
          }).eq('id', row.id);
          continue;
        }

        const token = await hmacToken(sub.id);
        const unsubUrl = `${SITE_URL}/unsubscribe?id=${sub.id}&t=${token}`;
        const html = buildHtml(art, sub, brand, unsubUrl);
        const text = buildPlain(art, brand, unsubUrl);
        const raw = await buildRawMessage({
          from: gmail.profile?.emailAddress, fromName: brand.siteName, to: sub.email,
          subject: 'EGL EYE News Alert', html, text, unsubUrl,
        });
        const result = await sendViaGmail(raw);

        if (result.error) {
          failed++;
          const retryable = result.status === 429 || result.status >= 500;
          await supabase.from('news_subscriber_sends').update({
            status: retryable ? 'pending' : 'failed',
            attempts: (row.attempts ?? 0) + 1,
            error_message: result.error,
            failed_at: retryable ? null : new Date().toISOString(),
          }).eq('id', row.id);
          if (result.status === 429) break; // back off
        } else {
          sent++;
          await supabase.from('news_subscriber_sends').update({
            status: 'sent', message_id: result.id ?? null, sent_at: new Date().toISOString(),
            attempts: (row.attempts ?? 0) + 1, error_message: null,
          }).eq('id', row.id);
          await supabase.from('news_subscribers').update({ last_sent_at: new Date().toISOString() }).eq('id', sub.id);
        }
        // throttle ~5/sec to stay well under Gmail caps
        await new Promise((r) => setTimeout(r, 200));
      }
      return json({ processed: pending.length, sent, failed });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    console.error('send-news-email error', err);
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
