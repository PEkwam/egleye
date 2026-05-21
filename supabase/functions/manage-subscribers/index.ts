import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Admin token gate
  const adminToken = req.headers.get('x-admin-token');
  if (!(await verifyAdminToken(adminToken))) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (action === 'list') {
      const { data: subscribers, error } = await supabase
        .from('news_subscribers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Per-subscriber send stats
      const { data: stats } = await supabase
        .from('news_subscriber_sends')
        .select('subscriber_id, status');

      const statsMap = new Map<string, { sent: number; pending: number; failed: number }>();
      (stats ?? []).forEach((row: { subscriber_id: string; status: string }) => {
        const cur = statsMap.get(row.subscriber_id) ?? { sent: 0, pending: 0, failed: 0 };
        if (row.status === 'sent') cur.sent += 1;
        else if (row.status === 'pending') cur.pending += 1;
        else if (row.status === 'failed') cur.failed += 1;
        statsMap.set(row.subscriber_id, cur);
      });

      const enriched = (subscribers ?? []).map((s) => ({
        ...s,
        send_stats: statsMap.get(s.id) ?? { sent: 0, pending: 0, failed: 0 },
      }));

      return json({ subscribers: enriched });
    }

    if (action === 'create') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const name = body.name ? String(body.name).trim().slice(0, 100) : null;
      const frequency = body.frequency === 'daily' ? 'daily' : 'instant';
      if (!isEmail(email)) return json({ error: 'Invalid email' }, 400);
      if (email.length > 255) return json({ error: 'Email too long' }, 400);

      const { data, error } = await supabase
        .from('news_subscribers')
        .insert({ email, name, frequency, is_active: true })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') return json({ error: 'Email already subscribed' }, 409);
        throw error;
      }
      return json({ subscriber: data });
    }

    if (action === 'update') {
      const id = String(body.id ?? '');
      if (!id) return json({ error: 'Missing id' }, 400);
      const update: Record<string, unknown> = {};
      if (typeof body.is_active === 'boolean') update.is_active = body.is_active;
      if (body.frequency === 'instant' || body.frequency === 'daily') update.frequency = body.frequency;
      if (typeof body.name === 'string') update.name = body.name.trim().slice(0, 100) || null;
      if (typeof body.email === 'string') {
        const e = body.email.trim().toLowerCase();
        if (!isEmail(e)) return json({ error: 'Invalid email' }, 400);
        update.email = e;
      }
      if (Object.keys(update).length === 0) return json({ error: 'Nothing to update' }, 400);

      const { data, error } = await supabase
        .from('news_subscribers')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return json({ subscriber: data });
    }

    if (action === 'delete') {
      const id = String(body.id ?? '');
      if (!id) return json({ error: 'Missing id' }, 400);
      const { error } = await supabase.from('news_subscribers').delete().eq('id', id);
      if (error) throw error;
      return json({ success: true });
    }

    // ---- New: per-subscriber unread reset ----
    // Removes all send records for the subscriber so every existing article
    // becomes "unread" again and will be re-queued on the next send cycle.
    if (action === 'reset_unread') {
      const id = String(body.id ?? '');
      if (!id) return json({ error: 'Missing id' }, 400);
      const { error, count } = await supabase
        .from('news_subscriber_sends')
        .delete({ count: 'exact' })
        .eq('subscriber_id', id);
      if (error) throw error;
      return json({ success: true, cleared: count ?? 0 });
    }

    // ---- New: mark all current articles as already-sent (skip backlog) ----
    if (action === 'mark_caught_up') {
      const id = String(body.id ?? '');
      if (!id) return json({ error: 'Missing id' }, 400);

      const { data: articles, error: artErr } = await supabase
        .from('news_articles')
        .select('id');
      if (artErr) throw artErr;

      if (!articles || articles.length === 0) return json({ success: true, marked: 0 });

      const rows = articles.map((a: { id: string }) => ({
        subscriber_id: id,
        article_id: a.id,
        status: 'skipped',
        sent_at: new Date().toISOString(),
      }));

      const { error: insErr } = await supabase
        .from('news_subscriber_sends')
        .upsert(rows, { onConflict: 'subscriber_id,article_id', ignoreDuplicates: true });
      if (insErr) throw insErr;
      return json({ success: true, marked: rows.length });
    }

    // ---- New: list send attempts (for delivery dashboard) ----
    if (action === 'list_sends') {
      const limit = Math.min(Number(body.limit ?? 100), 500);
      const offset = Math.max(Number(body.offset ?? 0), 0);
      const status = body.status as string | undefined;

      let query = supabase
        .from('news_subscriber_sends')
        .select(
          'id, status, attempts, error_message, queued_at, sent_at, failed_at, created_at, updated_at, subscriber_id, article_id'
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status && ['pending', 'sent', 'failed', 'skipped'].includes(status)) {
        query = query.eq('status', status);
      }

      const { data: sends, error } = await query;
      if (error) throw error;

      // Hydrate subscriber + article info
      const subIds = Array.from(new Set((sends ?? []).map((s) => s.subscriber_id)));
      const artIds = Array.from(new Set((sends ?? []).map((s) => s.article_id)));

      const [{ data: subs }, { data: arts }] = await Promise.all([
        subIds.length
          ? supabase.from('news_subscribers').select('id, email, name').in('id', subIds)
          : Promise.resolve({ data: [] }),
        artIds.length
          ? supabase.from('news_articles').select('id, title, source_name').in('id', artIds)
          : Promise.resolve({ data: [] }),
      ]);

      const subMap = new Map((subs ?? []).map((s: { id: string }) => [s.id, s]));
      const artMap = new Map((arts ?? []).map((a: { id: string }) => [a.id, a]));

      const enriched = (sends ?? []).map((row) => ({
        ...row,
        subscriber: subMap.get(row.subscriber_id) ?? null,
        article: artMap.get(row.article_id) ?? null,
      }));

      // Aggregate counters across all rows (not just the page)
      const { data: counts } = await supabase
        .from('news_subscriber_sends')
        .select('status');
      const totals = { pending: 0, sent: 0, failed: 0, skipped: 0 };
      (counts ?? []).forEach((c: { status: string }) => {
        if (c.status in totals) totals[c.status as keyof typeof totals] += 1;
      });

      // Total matching rows for pagination
      let countQuery = supabase.from('news_subscriber_sends').select('*', { count: 'exact', head: true });
      if (status && ['pending', 'sent', 'failed', 'skipped'].includes(status)) {
        countQuery = countQuery.eq('status', status);
      }
      const { count: totalCount } = await countQuery;

      return json({ sends: enriched, totals, totalCount: totalCount ?? 0 });
    }

    // ---- New: retry a failed send (resets to pending) ----
    if (action === 'retry_send') {
      const id = String(body.id ?? '');
      if (!id) return json({ error: 'Missing id' }, 400);
      const { data, error } = await supabase
        .from('news_subscriber_sends')
        .update({
          status: 'pending',
          error_message: null,
          failed_at: null,
        })
        .eq('id', id)
        .eq('status', 'failed')
        .select()
        .single();
      if (error) throw error;
      return json({ send: data });
    }

    // ---- New: bulk-retry all failed sends ----
    if (action === 'retry_all_failed') {
      const { error, count } = await supabase
        .from('news_subscriber_sends')
        .update({ status: 'pending', error_message: null, failed_at: null }, { count: 'exact' })
        .eq('status', 'failed');
      if (error) throw error;
      return json({ success: true, retried: count ?? 0 });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    console.error('manage-subscribers error', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return json({ error: message }, 500);
  }
});
