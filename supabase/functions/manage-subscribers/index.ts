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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Admin token gate
  const adminToken = req.headers.get('x-admin-token');
  if (!adminToken) return json({ error: 'Missing admin token' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (action === 'list') {
      const { data, error } = await supabase
        .from('news_subscribers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json({ subscribers: data ?? [] });
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

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    console.error('manage-subscribers error', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return json({ error: message }, 500);
  }
});
