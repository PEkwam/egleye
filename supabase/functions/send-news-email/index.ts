// Gmail-powered news alert sender.
// Actions:
//   - enqueue_article  { articleId }            (crawler service-role or admin token)
//   - process_queue    { limit?: number = 25 }  (crawler service-role or admin token)
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
// Subscribers only receive FRESH news. Rolling window: anything older than
// the last 7 days (or with no published_at at all) is treated as stale.
const FRESHNESS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
function minPublishedAtMs(): number {
  return Date.now() - FRESHNESS_WINDOW_MS;
}

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

function isServiceRoleCall(req: Request): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return !!serviceKey && bearer === serviceKey;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rdquo;/g, '”')
    .replace(/&ldquo;/g, '“')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function escapeHtml(s: string): string {
  if (!s) return '';
  return decodeEntities(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
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

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Ghana Insurance',
  enterprise_group: 'Enterprise Group',
  regulator: 'NIC Regulator',
  claims: 'Claims',
  life_insurance: 'Life Insurance',
  nonlife: 'Non-Life Insurance',
  pensions: 'NPRA Pensions',
};

function withUtm(url: string, campaign = 'news_alert'): string {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'newsletter');
    u.searchParams.set('utm_medium', 'email');
    u.searchParams.set('utm_campaign', campaign);
    return u.toString();
  } catch {
    return url;
  }
}

function buildHtml(article: Article, subscriber: Subscriber, brand: SiteBrand, unsubUrl: string): string {
  const articleUrl = withUtm(`${SITE_URL}/article/${article.id}`);
  const portalUrl = withUtm(SITE_URL, 'news_alert_footer');
  const firstName = subscriber.name ? subscriber.name.split(' ')[0] : '';
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hello,';
  const desc = article.description ? escapeHtml(article.description.slice(0, 320)) : '';
  const source = article.source_name ? escapeHtml(article.source_name) : '';
  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';
  const categoryLabel = CATEGORY_LABELS[article.category] || 'Insurance';
  const wordCount = (article.content || article.description || '').split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  // Smarter preheader: pull the first complete sentence so the inbox preview
  // sells the story instead of showing a generic line.
  const rawDesc = (article.description || '').trim();
  let preheaderText = '';
  if (rawDesc) {
    const sentenceMatch = rawDesc.match(/^(.{40,180}?[.!?])(\s|$)/);
    preheaderText = (sentenceMatch ? sentenceMatch[1] : rawDesc.slice(0, 140)).trim();
  } else {
    preheaderText = `${categoryLabel} update from ${brand.siteName}`;
  }
  const preheader = escapeHtml(preheaderText);

  // Hero: real image when available; otherwise a branded gradient block
  // showing the category label so the layout never feels thin.
  // Retina: many CMS images expose a width query (?w=) or WordPress
  // -600x{H} suffix. We synthesize a 1200px variant for srcset and let
  // mail clients on hi-DPI displays pick the sharper source.
  const heroSrc = escapeHtml(article.image_url ?? '');
  const heroSrc2x = article.image_url
    ? escapeHtml(
        article.image_url
          .replace(/([?&])w=\d+/i, '$1w=1200')
          .replace(/-\d{3,4}x\d{3,4}(\.(jpe?g|png|webp))/i, '-1200x800$1'),
      )
    : '';
  const hero = article.image_url
    ? `<a href="${escapeHtml(articleUrl)}" style="display:block;text-decoration:none">
         <img src="${heroSrc}" srcset="${heroSrc} 1x, ${heroSrc2x} 2x" alt="" width="600" style="width:100%;max-width:600px;height:auto;display:block;border:0;border-top-left-radius:14px;border-top-right-radius:14px"/>
       </a>`
    : `<a href="${escapeHtml(articleUrl)}" style="display:block;text-decoration:none">
         <div style="background:linear-gradient(135deg, ${brand.primary} 0%, ${brand.primary}cc 60%, #0f172a 100%);border-top-left-radius:14px;border-top-right-radius:14px;padding:56px 28px;text-align:center">
           <div style="font-size:11px;font-weight:700;letter-spacing:.14em;color:rgba(255,255,255,.78);text-transform:uppercase;margin-bottom:10px">${escapeHtml(categoryLabel)}</div>
           <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-.01em">${escapeHtml(brand.siteName)} News Alert</div>
         </div>
       </a>`;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(article.title)}</title>
<style>
  /* Dark mode — supported in Apple Mail, iOS Mail, Outlook.com,
     and partially in Gmail (web/Android). Falls back gracefully. */
  @media (prefers-color-scheme: dark) {
    body, .eg-bg { background:#0b0f14 !important; }
    .eg-card { background:#11161d !important; box-shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.5) !important; }
    .eg-footer-card { background:#11161d !important; border-color:#1f2933 !important; }
    .eg-title a { color:#f8fafc !important; }
    .eg-greeting, .eg-excerpt { color:#cbd5e1 !important; }
    .eg-greeting strong { color:#f1f5f9 !important; }
    .eg-meta { color:#94a3b8 !important; }
    .eg-meta strong { color:#cbd5e1 !important; }
    .eg-footer-card strong { color:#f1f5f9 !important; }
    .eg-footer-card td { color:#cbd5e1 !important; }
    .eg-tagline-strong { color:#f1f5f9 !important; }
    .eg-fineprint { color:#64748b !important; }
    .eg-fineprint a { color:#94a3b8 !important; }
    .eg-brand { color:#ffffff !important; }
    .eg-alert-tag { color:#64748b !important; }
  }
  [data-ogsc] .eg-bg { background:#0b0f14 !important; }
  [data-ogsc] .eg-card { background:#11161d !important; }
  [data-ogsc] .eg-title a { color:#f8fafc !important; }
  [data-ogsc] .eg-greeting, [data-ogsc] .eg-excerpt { color:#cbd5e1 !important; }
  [data-ogsc] .eg-meta { color:#94a3b8 !important; }
</style>
</head>
<body class="eg-bg" style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#111827;-webkit-font-smoothing:antialiased">
<div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="eg-bg" style="background:#f3f4f6">
  <tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">

      <tr><td style="padding:0 4px 18px 4px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="eg-brand" style="font-size:14px;font-weight:700;letter-spacing:.04em;color:${brand.primary};text-transform:uppercase">${escapeHtml(brand.siteName)}</td>
            <td class="eg-alert-tag" align="right" style="font-size:11px;color:#9ca3af;letter-spacing:.08em;text-transform:uppercase">News Alert</td>
          </tr>
        </table>
      </td></tr>

      <tr><td class="eg-greeting" style="padding:0 4px 14px 4px;font-size:14px;color:#374151;line-height:1.55">
        ${greeting} this just landed in your <strong class="eg-tagline-strong" style="color:#111827">${escapeHtml(brand.tagline)}</strong> feed.
      </td></tr>

      <tr><td class="eg-card" style="background:#ffffff;border-radius:14px;box-shadow:0 1px 2px rgba(17,24,39,.04),0 8px 24px rgba(17,24,39,.06);overflow:hidden">
        ${hero}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:28px 28px 8px 28px">
            <span style="display:inline-block;background:${brand.primary};color:#ffffff;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:5px 10px;border-radius:999px">${escapeHtml(categoryLabel)}</span>
          </td></tr>
          <tr><td class="eg-title" style="padding:14px 28px 0 28px">
            <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.22;font-weight:700;color:#0f172a;letter-spacing:-.01em">
              <a href="${escapeHtml(articleUrl)}" style="color:#0f172a;text-decoration:none">${escapeHtml(article.title)}</a>
            </h1>
          </td></tr>
          <tr><td class="eg-meta" style="padding:12px 28px 0 28px;font-size:12px;color:#6b7280;line-height:1.5">
            ${source ? `<strong style="color:#374151">${source}</strong>` : ''}${source && date ? ' &middot; ' : ''}${date ? escapeHtml(date) : ''}${(source || date) ? ' &middot; ' : ''}${readingTime} min read
          </td></tr>
          ${desc ? `<tr><td style="padding:18px 28px 0 28px">
            <p class="eg-excerpt" style="margin:0;font-size:15px;line-height:1.65;color:#334155">${desc}&hellip;</p>
          </td></tr>` : ''}
          <tr><td style="padding:24px 28px 28px 28px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="border-radius:10px;background:${brand.primary}">
                <a href="${escapeHtml(articleUrl)}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">Read full article &rarr;</a>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:18px 4px 0 4px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="eg-footer-card" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px">
          <tr><td style="padding:16px 18px;font-size:13px;color:#4b5563;line-height:1.5">
            <strong style="color:#111827">Want more?</strong> Browse the full insurance &amp; pensions feed on
            <a href="${escapeHtml(portalUrl)}" style="color:${brand.primary};text-decoration:none;font-weight:600">${escapeHtml(brand.siteName)}</a>.
          </td></tr>
        </table>
      </td></tr>

      <tr><td class="eg-fineprint" style="padding:22px 12px 8px 12px;text-align:center;font-size:11px;color:#9ca3af;line-height:1.7">
        <strong style="color:#6b7280;font-weight:600">Why am I getting this?</strong> You subscribed to ${escapeHtml(brand.siteName)} alerts${firstName ? ` as ${escapeHtml(firstName)}` : ''} — we only send when fresh ${escapeHtml(brand.tagline)} news lands.<br>
        <a href="${escapeHtml(unsubUrl)}" style="color:#6b7280;text-decoration:underline">Unsubscribe in one click</a>
        &nbsp;&middot;&nbsp;
        <a href="${escapeHtml(portalUrl)}" style="color:#6b7280;text-decoration:underline">Visit portal</a>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

function buildPlain(article: Article, brand: SiteBrand, unsubUrl: string): string {
  const url = withUtm(`${SITE_URL}/article/${article.id}`);
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
    const internalQueueProcessor = action === 'process_queue' && isServiceRoleCall(req);
    if (!internalQueueProcessor && !(await verifyAdminToken(token))) {
      return json({ error: 'Unauthorized' }, 401);
    }
  }

  // enqueue_article is internal: require service-role bearer OR a valid admin token
  if (action === 'enqueue_article') {
    const hasServiceRole = isServiceRoleCall(req);
    const hasAdmin = await verifyAdminToken(req.headers.get('x-admin-token'));
    if (!hasServiceRole && !hasAdmin) {
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

      // Safety net: only insurance/pension-related articles get emailed to subscribers.
      // The crawler also filters, but this guards against TEST/manual inserts and drift.
      const { data: art, error: aErr } = await supabase
        .from('news_articles')
        .select('title, description, content, category, published_at')
        .eq('id', articleId)
        .single();
      if (aErr) throw aErr;

      // Freshness guard: never email articles older than the rolling window.
      const pubAt = art?.published_at ? new Date(art.published_at).getTime() : 0;
      if (!pubAt || pubAt < minPublishedAtMs()) {
        console.log(`[enqueue_article] Skipping stale article ${articleId} (published_at=${art?.published_at})`);
        return json({ enqueued: 0, skipped: true, reason: 'stale_article' });
      }

      const haystack = `${art?.title ?? ''} ${art?.description ?? ''} ${art?.content ?? ''}`.toLowerCase();
      const INSURANCE_TERMS = [
        'insurance', 'insurer', 'insured', 'assurance', 'underwrit', 'policyholder',
        'premium', 'claims', 'reinsurance', 'actuar', 'annuity', 'annuities',
        'bancassurance', 'microinsurance', 'broker', 'brokerage',
        'pension', 'pensions', 'retirement', 'ssnit', 'npra', 'trustee',
        'provident fund', 'gratuity', 'tier 1', 'tier 2', 'tier 3',
        'nic', 'national insurance commission', 'solvency',
        // Local insurer/brand names
        'enterprise life', 'enterprise group', 'enterprise insurance', 'enterprise trustees',
        'acacia health', 'sic life', 'sic insurance', 'starlife', 'star assurance',
        'glico', 'hollard', 'old mutual', 'allianz', 'prudential', 'vanguard assurance',
        'donewell', 'metropolitan life',
      ];
      const isInsuranceRelated = INSURANCE_TERMS.some((kw) => haystack.includes(kw));
      if (!isInsuranceRelated) {
        console.log(`[enqueue_article] Skipping non-insurance article ${articleId}: "${art?.title?.slice(0, 80)}"`);
        return json({ enqueued: 0, skipped: true, reason: 'not_insurance_related' });
      }

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

        // Freshness guard: never email stale articles, even if already queued.
        const pubAtMs = art.published_at ? new Date(art.published_at).getTime() : 0;
        if (!pubAtMs || pubAtMs < minPublishedAtMs()) {
          await supabase.from('news_subscriber_sends').update({
            status: 'skipped', error_message: 'stale article (outside freshness window)',
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
