// Gmail-powered news alert sender.
// Actions:
//   - enqueue_article  { articleId }            (crawler service-role or admin token)
//   - process_queue    { limit?: number = 25 }  (crawler service-role or admin token)
//   - send_test        { email, articleId? }    (admin token)
//   - status                                    (admin token) -> returns connected gmail address + daily count

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

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

// Strip HTML tags (anchors, spans, etc.) that crawlers sometimes embed in
// description/summary fields. Without this, Outlook renders the raw markup
// (e.g. `<a href="...">`) as visible text in the email body.
function stripHtml(s: string): string {
  if (!s) return '';
  // Decode entities FIRST so that HTML-encoded markup (e.g. `&lt;a href=...&gt;`)
  // becomes real tags we can strip — otherwise the raw tags survive and render
  // as visible text in the email body. Run the strip + decode cycle twice to
  // also catch double-encoded fragments occasionally emitted by Google News RSS.
  let out = s;
  for (let i = 0; i < 2; i++) {
    out = decodeEntities(out)
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ');
  }
  return decodeEntities(out).replace(/\s+/g, ' ').trim();
}


interface Article {
  id: string;
  title: string;
  description: string | null;
  content?: string | null;
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

// Only these categories are ever considered for subscriber alerts.
// NOTE: "pensions" is deliberately excluded — subscribers do not want NPRA /
// pension coverage in their alerts.
const SUBSCRIBER_ALERT_CATEGORIES = new Set([
  'general',
  'enterprise_group',
  'regulator',
  'life_insurance',
  'nonlife',
  'claims',
]);

// Pension / NPRA content is excluded from subscriber alerts entirely, even if
// it was filed under another category.
const SUBSCRIBER_ALERT_PENSION_EXCLUSION: RegExp[] = [
  /\b(?:pension|pensions|pensioner|pensioners|npra|ssnit|provident\s+fund|tier\s+[123]|retirement\s+(?:scheme|fund|benefit)|national\s+pensions?\s+(?:regulatory\s+)?authority)\b/i,
];

// Article content MUST match at least one of these insurance patterns
// to be eligible for a subscriber alert. This is the strict enforcement layer.
const SUBSCRIBER_ALERT_PATTERNS: RegExp[] = [
  /\binsur(?:ance|er|ers|ed|ing)\b/, /\bassur(?:ance|er|ers)\b/,
  /\b(?:underwrit\w*|reinsur\w*|actuar\w*|solvency|policyholders?|indemnity)\b/,
  /\b(?:annuity|annuities|endowment|whole[\s-]?life|term[\s-]?life|microinsur\w*|bancassur\w*|takaful)\b/,
  /\bnational\s+insurance\s+commission\b/,
  /\b(?:enterprise\s+(?:life|insurance|group|trustees)|acacia\s+health|sic\s+(?:life|insurance)|star[\s-]?life|star\s+assurance|glico|hollard|old\s+mutual|prudential|allianz|vanguard\s+assurance|donewell|metropolitan\s+life)\b/,
];

// Negative filter: off-topic terms that disqualify an article even when a
// stray insurance keyword slips through (e.g. "car insurance" in a sports
// story). Keep this list to topics that are very unlikely to be legitimate
// insurance/regulator coverage.
const SUBSCRIBER_ALERT_HARD_BLOCKLIST: RegExp[] = [
  /\b(?:football|soccer|striker|midfielder|goalkeeper|premier\s+league|black\s+stars|afcon|world\s+cup|kotoko|hearts\s+of\s+oak|olympics|boxing|athletics)\b/i,
  /\b(?:movie|film|album|concert|celebrity|actor|actress|musician|stonebwoy|shatta\s+wale|sarkodie|showbiz|entertainment)\b/i,
  /\b(?:murder|armed\s+robbery|kidnapping|drug\s+trafficking|ponzi|fraud\s+suspect|court\s+case|remand)\b/i,
  /\b(?:galamsey|illegal\s+mining|cocoa\s+board|cocobod|fuel\s+price|petrol\s+price)\b/i,
  /\b(?:waec|bece|free\s+shs|university\s+admission|school\s+fees)\b/i,
  /\b(?:pastor|church|mosque|prayer\s+camp|bishop|imam)\b/i,
  /\b(?:crypto|bitcoin|forex\s+trading|stock\s+exchange|ipo\s+launch)\b/i,
  /\b(?:nigerian?\s+(?:banks?|insurance|market|senate)|kenya\s+insurance|south\s+africa\s+insurance|uganda|rwanda\s+job)\b/i,
];

// Political/government terms are contextual, not hard blockers: regulator and
// industry stories often mention bills, Parliament, ministers or elections.
// These terms only suppress weak articles with no category/title/body signal.
const SUBSCRIBER_ALERT_CONTEXT_BLOCKLIST: RegExp[] = [
  /\b(?:mp\s+for|constituency|political\s+party|assembly\s+member|electoral\s+commission)\b/i,
  /\b(?:npp|ndc)\b/i,
];

// These editorial categories are already insurance specific in the portal.
// A category-only pass still requires at least one real insurance signal.
const SUBSCRIBER_ALERT_TRUSTED_CATEGORY_ONLY = new Set([
  'enterprise_group',
  'regulator',
  'life_insurance',
  'nonlife',
  'claims',
]);

// Strong signals: if a title matches any of these, the article is clearly
// on-topic insurance content and passes without needing a body match.
// Deliberately excludes weak words such as "policy", "claim", "premium" and
// bare "nic" — they match plenty of government / general news.
const SUBSCRIBER_ALERT_STRONG_TITLE: RegExp[] = [
  /\binsur(?:ance|er|ers|ed)\b/i,
  /\bassur(?:ance|er)\b/i,
  /\breinsur\w*\b/i,
  /\b(?:underwrit\w*|actuar\w*|solvency|policyholders?|bancassur\w*|microinsur\w*|takaful)\b/i,
  /\bnational\s+insurance\s+commission\b/i,
  /\b(?:enterprise\s+(?:life|insurance|group|trustees)|acacia\s+health|sic\s+(?:life|insurance)|star[\s-]?life|star\s+assurance|glico|hollard|old\s+mutual|prudential|allianz|vanguard\s+assurance|donewell|metropolitan\s+life)\b/i,
];


function countMatches(text: string, patterns: RegExp[]): number {
  let n = 0;
  for (const re of patterns) if (re.test(text)) n++;
  return n;
}

/**
 * Strict gatekeeper for subscriber alerts. An article is eligible ONLY when:
 *   1. Its category is in the insurance/pension allow-list.
 *   2. It contains NO hard off-topic term (sports, showbiz, crypto, etc.).
 *   3. Its TITLE clearly signals insurance/pension  —  OR  —  the body carries
 *      at least TWO independent insurance/pension signals  —  OR  —  it belongs
 *      to an editorial category that is inherently insurance/pension-specific.
 * All rejections are logged with the reason so admins can audit.
 */
function isSubscriberAlertEligible(
  article: { id?: string; title?: string | null; description?: string | null; content?: string | null; category?: string | null },
): boolean {
  const id = article.id ?? '(no-id)';
  const category = String(article.category ?? '').toLowerCase();
  if (!SUBSCRIBER_ALERT_CATEGORIES.has(category)) {
    console.log(`[gatekeeper] reject ${id}: category "${category}" not in allow-list`);
    return false;
  }

  const title = String(article.title ?? '').toLowerCase();
  const body = `${article.description ?? ''} \n ${article.content ?? ''}`.toLowerCase();
  const haystack = `${title} \n ${body}`;
  if (!haystack.trim()) {
    console.log(`[gatekeeper] reject ${id}: empty content`);
    return false;
  }

  // Pension / NPRA content is never sent to subscribers.
  const pensionHit = SUBSCRIBER_ALERT_PENSION_EXCLUSION.find((re) => re.test(haystack));
  if (pensionHit) {
    console.log(`[gatekeeper] reject ${id}: pension/NPRA content excluded from subscriber alerts`);
    return false;
  }

  // Hard off-topic blocklist takes priority, but broad political words such as
  // "Parliament" are deliberately not hard blockers because NIC regulatory
  // updates frequently contain them.
  const blocked = SUBSCRIBER_ALERT_HARD_BLOCKLIST.find((re) => re.test(haystack));
  if (blocked) {
    console.log(`[gatekeeper] reject ${id}: hard blocklist hit ${blocked}`);
    return false;
  }

  // Every article must carry at least one real insurance signal, no exceptions.
  const bodySignals = countMatches(haystack, SUBSCRIBER_ALERT_PATTERNS);
  if (bodySignals === 0) {
    console.log(`[gatekeeper] reject ${id}: no insurance signal "${(article.title ?? '').slice(0, 80)}"`);
    return false;
  }

  // Strong title signal is sufficient.
  const strongTitle = SUBSCRIBER_ALERT_STRONG_TITLE.some((re) => re.test(title));
  if (strongTitle) return true;

  // Otherwise require multiple independent body signals.
  if (bodySignals >= 2) return true;

  // Category-only pass for categories curated as insurance domains, and only
  // when the article already carries an insurance signal (checked above).
  const contextBlocked = SUBSCRIBER_ALERT_CONTEXT_BLOCKLIST.find((re) => re.test(haystack));
  if (!contextBlocked && SUBSCRIBER_ALERT_TRUSTED_CATEGORY_ONLY.has(category)) return true;

  console.log(`[gatekeeper] reject ${id}: weak signal (title=no, body=${bodySignals}${contextBlocked ? `, context blocklist=${contextBlocked}` : ''}) "${(article.title ?? '').slice(0, 80)}"`);
  return false;
}

// ---------------------------------------------------------------------------
// Cross-source story deduplication.
// The same story is often syndicated by several outlets ("SIC Insurance posts
// strong 2025 results" from Google News, B&FT, Graphic ...). Subscribers must
// receive only the FIRST published version; later duplicates are skipped.
// ---------------------------------------------------------------------------
const STOPWORDS = new Set([
  'the','a','an','of','and','or','to','in','on','for','with','at','by','from','as','is','are','was','were','be','been',
  'its','it','this','that','these','those','after','over','into','amid','says','said','new','ghana','ghanas','ghanaian',
]);

function titleTokens(title: string): Set<string> {
  return new Set(
    String(title || '')
      .toLowerCase()
      .replace(/&[a-z#0-9]+;/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t)),
  );
}

/** Jaccard similarity between two article titles (0..1). */
function titleSimilarity(a: string, b: string): number {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

const DUPLICATE_THRESHOLD = 0.55;

function isDuplicateStory(title: string, seen: string[]): string | null {
  for (const prev of seen) {
    if (titleSimilarity(title, prev) >= DUPLICATE_THRESHOLD) return prev;
  }
  return null;
}

/** Titles of articles already delivered to a subscriber in the recent window. */
async function loadDeliveredTitles(
  supabase: any,
  subscriberIds: string[],
  days = 14,
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (subscriberIds.length === 0) return out;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data: sends } = await supabase
    .from('news_subscriber_sends')
    .select('subscriber_id, article_id')
    .in('subscriber_id', subscriberIds)
    .eq('status', 'sent')
    .gte('created_at', since);
  const artIds = [...new Set((sends ?? []).map((s: any) => s.article_id))];
  if (artIds.length === 0) return out;
  const { data: arts } = await supabase
    .from('news_articles')
    .select('id, title')
    .in('id', artIds);
  const titleMap = new Map((arts ?? []).map((a: any) => [a.id, a.title as string]));
  for (const s of sends ?? []) {
    const t = titleMap.get(s.article_id);
    if (!t) continue;
    const list = out.get(s.subscriber_id) ?? [];
    list.push(t);
    out.set(s.subscriber_id, list);
  }
  return out;
}


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
  const cleanDesc = article.description ? stripHtml(article.description) : '';
  const desc = cleanDesc ? escapeHtml(cleanDesc.slice(0, 320)) : '';
  const source = article.source_name ? escapeHtml(article.source_name) : '';
  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';
  const categoryLabel = CATEGORY_LABELS[article.category] || 'Insurance';
  const wordCount = (article.content || cleanDesc || '').split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  // Smarter preheader: pull the first complete sentence so the inbox preview
  // sells the story instead of showing a generic line.
  let preheaderText = '';
  if (cleanDesc) {
    const sentenceMatch = cleanDesc.match(/^(.{40,180}?[.!?])(\s|$)/);
    preheaderText = (sentenceMatch ? sentenceMatch[1] : cleanDesc.slice(0, 140)).trim();
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
    article.description ? stripHtml(article.description).slice(0, 400) : '',
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

// ---------- DB-backed SMTP profile ----------
type SmtpProfile = {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  reply_to: string | null;
};

let _smtpCache: { profile: SmtpProfile | null; loadedAt: number } | null = null;
async function loadActiveSmtp(): Promise<SmtpProfile | null> {
  if (_smtpCache && Date.now() - _smtpCache.loadedAt < 60_000) return _smtpCache.profile;
  const { data } = await supabase
    .from('email_connections')
    .select('id, host, port, secure, username, password, from_email, from_name, reply_to')
    .eq('is_active', true)
    .maybeSingle();
  _smtpCache = { profile: (data as SmtpProfile | null) ?? null, loadedAt: Date.now() };
  return _smtpCache.profile;
}

async function sendViaSmtp(p: SmtpProfile, opts: {
  to: string; subject: string; html: string; text: string; unsubUrl: string;
}): Promise<{ id?: string; error?: string; status: number }> {
  const client = new SMTPClient({
    connection: {
      hostname: p.host,
      port: Number(p.port),
      tls: !!p.secure,
      auth: { username: p.username, password: p.password },
    },
  });
  try {
    const result = await client.send({
      from: p.from_name ? `${p.from_name} <${p.from_email}>` : p.from_email,
      to: opts.to,
      replyTo: p.reply_to || undefined,
      subject: opts.subject,
      content: opts.text,
      html: opts.html,
      headers: {
        'List-Unsubscribe': `<${opts.unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    return { id: (result as any)?.messageId ?? undefined, status: 200 };
  } catch (e) {
    const msg = (e as Error).message || String(e);
    return { error: msg, status: /timeout|network|ECONN|getaddrinfo/i.test(msg) ? 503 : 500 };
  } finally {
    try { await client.close(); } catch { /* noop */ }
  }
}

/**
 * Unified send: prefers DB-backed SMTP profile (admin-managed),
 * falls back to legacy Gmail connector for backwards compatibility.
 */
async function sendMail(opts: {
  to: string; subject: string; html: string; text: string; unsubUrl: string;
  gmailFromAddress?: string; gmailFromName: string;
}): Promise<{ id?: string; error?: string; status: number; via: 'smtp' | 'gmail' }> {
  const smtp = await loadActiveSmtp();
  if (smtp) {
    const r = await sendViaSmtp(smtp, opts);
    return { ...r, via: 'smtp' };
  }
  const raw = await buildRawMessage({
    from: opts.gmailFromAddress,
    fromName: opts.gmailFromName,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    unsubUrl: opts.unsubUrl,
  });
  const r = await sendViaGmail(raw);
  return { ...r, via: 'gmail' };
}

// ---------- handler ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* noop */ }
  const action = String(body.action || '');

  const requiresAdmin = ['process_queue', 'send_test', 'status', 'backfill_recent', 'list_backfill_candidates', 'delete_article'].includes(action);
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
      const smtp = await loadActiveSmtp();
      if (smtp) {
        return json({
          connected: true,
          via: 'smtp',
          profile: { emailAddress: smtp.from_email },
          smtp: { host: smtp.host, port: smtp.port, secure: smtp.secure, username: smtp.username },
        });
      }
      const result = await getGmailProfile();
      const hasConnectorSecrets = !!Deno.env.get('LOVABLE_API_KEY') && !!Deno.env.get('GOOGLE_MAIL_API_KEY');
      return json({
        connected: hasConnectorSecrets,
        via: 'gmail',
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

      // Freshness guard: only email articles whose source published_at is
      // within the rolling window. Old re-surfaced stories are skipped.
      const pubAt = art?.published_at ? new Date(art.published_at).getTime() : 0;
      if (!pubAt || pubAt < minPublishedAtMs()) {
        console.log(`[enqueue_article] Skipping stale article ${articleId} (published_at=${art?.published_at})`);
        return json({ enqueued: 0, skipped: true, reason: 'stale_article' });
      }



      if (!isSubscriberAlertEligible(art ?? {})) {
        console.log(`[enqueue_article] Skipping non-alert article ${articleId} [${art?.category ?? 'unknown'}]: "${art?.title?.slice(0, 80)}"`);
        return json({ enqueued: 0, skipped: true, reason: 'not_eligible' });
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
      const result = await sendMail({
        to: email,
        subject: '[TEST] EGL EYE News Alert',
        html, text, unsubUrl,
        gmailFromAddress: profile?.emailAddress,
        gmailFromName: brand.siteName,
      });
      if (result.error) return json({ ok: false, error: result.error, via: result.via }, 502);
      return json({ ok: true, messageId: result.id, via: result.via });
    }

    if (action === 'process_queue') {
      const limit = Math.min(Math.max(Number(body.limit ?? 25), 1), 100);

      // Pull pending sends ordered newest-first so subscribers always get
      // the latest stories before older backlog items.
      const { data: pending, error: pErr } = await supabase
        .from('news_subscriber_sends')
        .select('id, subscriber_id, article_id, attempts')
        .eq('status', 'pending')
        .lt('attempts', 5)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (pErr) throw pErr;
      if (!pending || pending.length === 0) return json({ processed: 0, sent: 0, failed: 0 });

      const subIds = [...new Set(pending.map((r) => r.subscriber_id))];
      const artIds = [...new Set(pending.map((r) => r.article_id))];
      const [{ data: subs }, { data: arts }, brand, gmail, smtp] = await Promise.all([
        supabase.from('news_subscribers').select('id, email, name, is_active').in('id', subIds),
        supabase.from('news_articles').select('id, title, description, source_url, source_name, image_url, category, published_at, created_at').in('id', artIds),
        loadBrand(),
        getGmailProfile(),
        loadActiveSmtp(),
      ]);
      const subMap = new Map((subs ?? []).map((s: any) => [s.id, s]));
      const artMap = new Map((arts ?? []).map((a: any) => [a.id, a]));
      const hasConnectorSecrets = !!Deno.env.get('LOVABLE_API_KEY') && !!Deno.env.get('GOOGLE_MAIL_API_KEY');
      if (!smtp && !hasConnectorSecrets) return json({ error: 'No email connection configured. Add an SMTP profile in Site Settings.' }, 500);

      // Story-level dedup: titles already delivered to each subscriber recently.
      const deliveredTitles = await loadDeliveredTitles(supabase, subIds);

      // Process the earliest-published version of a story first, so the
      // original publication wins and syndicated copies get skipped.
      const queue = [...pending].sort((a, b) => {
        const pa = new Date((artMap.get(a.article_id) as any)?.published_at ?? 0).getTime();
        const pb = new Date((artMap.get(b.article_id) as any)?.published_at ?? 0).getTime();
        return pa - pb;
      });

      let sent = 0, failed = 0, duplicates = 0;
      for (const row of queue) {
        const sub = subMap.get(row.subscriber_id) as Subscriber & { is_active: boolean } | undefined;
        const art = artMap.get(row.article_id) as Article | undefined;

        if (!sub || !sub.is_active || !art) {
          await supabase.from('news_subscriber_sends').update({
            status: 'skipped', error_message: !sub ? 'subscriber missing' : !art ? 'article missing' : 'subscriber inactive',
            sent_at: new Date().toISOString(),
          }).eq('id', row.id);
          continue;
        }

        // Skip syndicated repeats: same story already sent to this subscriber
        // from another outlet within the last 14 days (or earlier in this run).
        const seen = deliveredTitles.get(sub.id) ?? [];
        const dupOf = isDuplicateStory(art.title, seen);
        if (dupOf) {
          duplicates++;
          await supabase.from('news_subscriber_sends').update({
            status: 'skipped',
            error_message: `duplicate story already sent: "${dupOf.slice(0, 120)}"`,
            sent_at: new Date().toISOString(),
          }).eq('id', row.id);
          continue;
        }

        // Belt-and-braces: re-run the strict insurance gatekeeper right before
        // dispatch so nothing off-topic ever leaves the system, even if it was
        // enqueued manually, via backfill, or before this rule was tightened.
        if (!isSubscriberAlertEligible(art as any)) {
          await supabase.from('news_subscriber_sends').update({
            status: 'skipped',
            error_message: 'blocked by insurance gatekeeper at send time',
            sent_at: new Date().toISOString(),
          }).eq('id', row.id);
          continue;
        }


        // Freshness guard: strictly require recent published_at.
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
        const result = await sendMail({
          to: sub.email,
          subject: 'EGL EYE News Alert',
          html, text, unsubUrl,
          gmailFromAddress: gmail.profile?.emailAddress,
          gmailFromName: brand.siteName,
        });

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

    if (action === 'backfill_recent') {
      // Scan recent articles within the freshness window and enqueue any
      // life-insurance items that were missed (e.g. before this filter was
      // tightened, or if the crawler's enqueue call failed). Returns counts.
      const sinceIso = new Date(minPublishedAtMs()).toISOString();
      const { data: recent, error: rErr } = await supabase
        .from('news_articles')
        .select('id, title, description, content, category, published_at')
        .gte('published_at', sinceIso)
        .order('published_at', { ascending: false })
        .limit(200);
      if (rErr) throw rErr;



      const eligible = (recent ?? []).filter((a) => isSubscriberAlertEligible(a));

      const { data: subs, error: sErr } = await supabase
        .from('news_subscribers')
        .select('id')
        .eq('is_active', true)
        .eq('frequency', 'instant');
      if (sErr) throw sErr;

      if (!subs?.length || !eligible.length) {
        return json({ scanned: recent?.length ?? 0, eligible: eligible.length, enqueued: 0 });
      }

      const articleIds = eligible.map((a) => a.id);
      const subscriberIds = subs.map((s) => s.id);

      // Guard: collect (subscriber_id, article_id) pairs that have ALREADY been
      // sent (or are queued) — both in the live sends table and the archive.
      // Prevents re-queueing an article a subscriber already received, even if
      // the original row has aged out into news_subscriber_sends_archive.
      const sentPairs = new Set<string>();
      const key = (sid: string, aid: string) => `${sid}::${aid}`;

      const [{ data: liveSent }, { data: archivedSent }] = await Promise.all([
        supabase
          .from('news_subscriber_sends')
          .select('subscriber_id, article_id')
          .in('article_id', articleIds)
          .in('subscriber_id', subscriberIds),
        supabase
          .from('news_subscriber_sends_archive')
          .select('subscriber_id, article_id')
          .in('article_id', articleIds)
          .in('subscriber_id', subscriberIds),
      ]);
      for (const r of liveSent ?? []) sentPairs.add(key(r.subscriber_id, r.article_id));
      for (const r of archivedSent ?? []) sentPairs.add(key(r.subscriber_id, r.article_id));

      const rows = eligible.flatMap((a) =>
        subs
          .filter((s) => !sentPairs.has(key(s.id, a.id)))
          .map((s) => ({ subscriber_id: s.id, article_id: a.id, status: 'pending' as const })),
      );

      if (!rows.length) {
        return json({
          scanned: recent?.length ?? 0,
          eligible: eligible.length,
          subscribers: subs.length,
          enqueued: 0,
          skipped_already_sent: sentPairs.size,
        });
      }

      const { error: iErr, count } = await supabase
        .from('news_subscriber_sends')
        .upsert(rows, { onConflict: 'subscriber_id,article_id', ignoreDuplicates: true, count: 'exact' });
      if (iErr) throw iErr;
      return json({
        scanned: recent?.length ?? 0,
        eligible: eligible.length,
        subscribers: subs.length,
        enqueued: count ?? 0,
        skipped_already_sent: sentPairs.size,
        titles: eligible.slice(0, 20).map((a) => a.title),
      });

    }

    if (action === 'list_backfill_candidates') {
      // Same eligibility rules as backfill_recent, but read-only: returns
      // the candidate articles + per-article queue stats so the admin can
      // choose to Send or Delete individually instead of bulk-enqueueing.
      const sinceIso = new Date(minPublishedAtMs()).toISOString();
      const { data: recent, error: rErr } = await supabase
        .from('news_articles')
        .select('id, title, description, content, category, published_at, source_name, source_url')
        .gte('published_at', sinceIso)
        .order('published_at', { ascending: false })
        .limit(200);
      if (rErr) throw rErr;

      const eligible = (recent ?? []).filter((a) => isSubscriberAlertEligible(a));

      const { data: subs } = await supabase
        .from('news_subscribers')
        .select('id')
        .eq('is_active', true)
        .eq('frequency', 'instant');
      const totalSubscribers = subs?.length ?? 0;
      const subIds = (subs ?? []).map((s) => s.id);
      const articleIds = eligible.map((a) => a.id);

      // Map of article_id -> count of subscribers who already have ANY row
      // (live or archived) for this article — those won't be queued again.
      const sentCount = new Map<string, Set<string>>();
      if (articleIds.length && subIds.length) {
        const [{ data: live }, { data: arch }] = await Promise.all([
          supabase.from('news_subscriber_sends')
            .select('article_id, subscriber_id')
            .in('article_id', articleIds).in('subscriber_id', subIds),
          supabase.from('news_subscriber_sends_archive')
            .select('article_id, subscriber_id')
            .in('article_id', articleIds).in('subscriber_id', subIds),
        ]);
        for (const r of [...(live ?? []), ...(arch ?? [])]) {
          const set = sentCount.get(r.article_id) ?? new Set<string>();
          set.add(r.subscriber_id);
          sentCount.set(r.article_id, set);
        }
      }

      const candidates = eligible.map((a) => {
        const already = sentCount.get(a.id)?.size ?? 0;
        return {
          id: a.id,
          title: a.title,
          source_name: a.source_name,
          source_url: a.source_url,
          category: a.category,
          published_at: a.published_at,
          total_subscribers: totalSubscribers,
          already_queued: already,
          remaining: Math.max(0, totalSubscribers - already),
        };
      });

      return json({ scanned: recent?.length ?? 0, total_subscribers: totalSubscribers, candidates });
    }

    if (action === 'delete_article') {
      const articleId = String(body.articleId || '');
      if (!articleId) return json({ error: 'Missing articleId' }, 400);
      const { error: dErr } = await supabase.from('news_articles').delete().eq('id', articleId);
      if (dErr) throw dErr;
      return json({ deleted: true, articleId });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    console.error('send-news-email error', err);
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
