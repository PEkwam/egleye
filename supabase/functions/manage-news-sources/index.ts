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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (action === 'list_sources') {
      const { data, error } = await supabase
        .from('news_sources')
        .select('*')
        .order('is_enabled', { ascending: false })
        .order('source_label');
      if (error) throw error;
      return new Response(JSON.stringify({ sources: data ?? [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list_runs') {
      const { data, error } = await supabase
        .from('news_crawl_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return new Response(JSON.stringify({ runs: data ?? [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    if (action === 'toggle') {
      const { id, is_enabled } = body;
      if (typeof id !== 'string' || typeof is_enabled !== 'boolean') {
        return new Response(JSON.stringify({ error: 'id and is_enabled required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { error } = await supabase
        .from('news_sources')
        .update({ is_enabled })
        .eq('id', id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'bulk_toggle') {
      const { ids, is_enabled } = body;
      if (!Array.isArray(ids) || typeof is_enabled !== 'boolean') {
        return new Response(JSON.stringify({ error: 'ids[] and is_enabled required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { error } = await supabase
        .from('news_sources')
        .update({ is_enabled })
        .in('id', ids);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, count: ids.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'add') {
      const { name, url, category, source_label, mode, is_local } = body;
      if (!name || !url || !source_label) {
        return new Response(JSON.stringify({ error: 'name, url, source_label required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data, error } = await supabase
        .from('news_sources')
        .insert({
          name: String(name).slice(0, 200),
          url: String(url).slice(0, 1000),
          category: String(category ?? 'general').slice(0, 64),
          source_label: String(source_label).slice(0, 120),
          mode: ['general', 'nic', 'pension'].includes(mode) ? mode : 'general',
          is_local: Boolean(is_local),
        })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, source: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      const { id } = body;
      if (typeof id !== 'string') {
        return new Response(JSON.stringify({ error: 'id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { error } = await supabase.from('news_sources').delete().eq('id', id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('manage-news-sources error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
