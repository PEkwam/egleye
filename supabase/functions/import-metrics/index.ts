import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
};

async function verifyAdminToken(token: string | null): Promise<boolean> {
  const secret = Deno.env.get('ADMIN_PASSWORD');
  if (!token || !secret || !token.startsWith('admin.')) return false;
  const parts = token.split('.');
  if (parts.length !== 4) return false;
  const [, expiresAtRaw, nonce, signature] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || !nonce || !signature) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${expiresAtRaw}.${nonce}`));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

const ALLOWED_TABLES = new Set([
  'insurer_metrics',
  'nonlife_insurer_metrics',
  'broker_metrics',
  'pension_fund_metrics',
]);

interface ImportRequest {
  action: 'upsert' | 'update' | 'delete' | 'deleteAll';
  table: string;
  rows?: Record<string, unknown>[];
  onConflict?: string;
  updates?: Record<string, unknown>;
  match?: Record<string, string | number>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  if (!(await verifyAdminToken(req.headers.get('x-admin-token')))) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: ImportRequest = await req.json();
    const { action, table, rows, onConflict, updates, match } = body;

    if (!table || !ALLOWED_TABLES.has(table)) {
      return json({ error: 'Invalid or disallowed table' }, 400);
    }

    if (action === 'upsert') {
      if (!Array.isArray(rows) || rows.length === 0) {
        return json({ error: 'rows must be a non-empty array' }, 400);
      }
      const { error } = await supabase
        .from(table)
        .upsert(rows, { onConflict: onConflict || 'id', ignoreDuplicates: false });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true, count: rows.length });
    }

    if (action === 'update') {
      if (!updates || !match || Object.keys(match).length === 0) {
        return json({ error: 'updates and match are required' }, 400);
      }
      let q = supabase.from(table).update(updates);
      for (const [col, val] of Object.entries(match)) q = q.eq(col, val);
      const { error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === 'delete') {
      if (!match || Object.keys(match).length === 0) {
        return json({ error: 'match is required' }, 400);
      }
      let q = supabase.from(table).delete();
      for (const [col, val] of Object.entries(match)) q = q.eq(col, val);
      const { error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === 'deleteAll') {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err: any) {
    console.error('import-metrics error:', err);
    return json({ error: err.message ?? 'Unknown error' }, 500);
  }
});
