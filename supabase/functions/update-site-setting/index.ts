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

const ALLOWED_KEYS = new Set([
  'site_name',
  'site_tagline',
  'logo_url',
  'color_theme',
  'news_include_keywords',
  'news_exclude_keywords',
  'vapid_public_key',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!(await verifyAdminToken(req.headers.get('x-admin-token')))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { key, value } = await req.json();
    if (!key || !ALLOWED_KEYS.has(key)) {
      return new Response(JSON.stringify({ error: 'Invalid setting key' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabase
      .from('site_settings')
      .upsert({ setting_key: key, setting_value: value, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
