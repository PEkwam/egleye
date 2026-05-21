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

interface RenameRequest {
  oldInsurerId?: string;
  oldName?: string;
  newInsurerId: string;
  newName: string;
  newShortName: string;
  newWebsite?: string;
  newKeywords?: string[];
  newBrandColor?: string;
  newLogoUrl?: string;
  newEstablishedYear?: number | null;
  newCategory?: 'life' | 'nonlife' | 'pension';
  isActive?: boolean;
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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: RenameRequest = await req.json();
    const { oldInsurerId, oldName, newInsurerId, newName, newShortName, newWebsite, newKeywords, newBrandColor, newLogoUrl, newEstablishedYear, newCategory, isActive } = body;

    if (!newInsurerId || !newName || !newShortName) {
      return new Response(
        JSON.stringify({ error: 'newInsurerId, newName and newShortName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!oldInsurerId && !oldName) {
      return new Response(
        JSON.stringify({ error: 'Either oldInsurerId or oldName must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find target record
    let targetQuery = supabase.from('insurers').select('*');
    if (oldInsurerId) targetQuery = targetQuery.eq('insurer_id', oldInsurerId);
    else targetQuery = targetQuery.ilike('name', `%${oldName}%`);

    const { data: targets, error: findErr } = await targetQuery;
    if (findErr) throw findErr;
    if (!targets || targets.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No insurer found matching the criteria' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (targets.length > 1) {
      return new Response(
        JSON.stringify({ error: `Multiple insurers found (${targets.length}). Please use the exact insurer ID.`, matches: targets.map((t: any) => ({ id: t.insurer_id, name: t.name })) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const target = targets[0];
    const fromId = target.insurer_id;
    const fromName = target.name;
    const results: Record<string, number> = {};

    // 1. Update insurers table
    const insurerUpdate: any = {
      insurer_id: newInsurerId,
      name: newName,
      short_name: newShortName,
    };
    if (newWebsite) insurerUpdate.website = newWebsite;
    if (newKeywords && newKeywords.length > 0) insurerUpdate.keywords = newKeywords;
    if (newBrandColor) insurerUpdate.brand_color = newBrandColor;
    if (newLogoUrl !== undefined) insurerUpdate.logo_url = newLogoUrl || null;
    if (newEstablishedYear !== undefined) insurerUpdate.established_year = newEstablishedYear;
    if (newCategory) insurerUpdate.category = newCategory;
    if (isActive !== undefined) insurerUpdate.is_active = isActive;

    const { error: e1, count: c1 } = await supabase
      .from('insurers')
      .update(insurerUpdate, { count: 'exact' })
      .eq('insurer_id', fromId);
    if (e1) throw new Error(`insurers: ${e1.message}`);
    results.insurers = c1 ?? 0;

    // 2. Update insurer_metrics
    const { error: e2, count: c2 } = await supabase
      .from('insurer_metrics')
      .update({ insurer_id: newInsurerId, insurer_name: newName }, { count: 'exact' })
      .eq('insurer_id', fromId);
    if (e2) throw new Error(`insurer_metrics: ${e2.message}`);
    results.insurer_metrics = c2 ?? 0;

    // Also catch metrics linked only by name
    const { error: e2b, count: c2b } = await supabase
      .from('insurer_metrics')
      .update({ insurer_id: newInsurerId, insurer_name: newName }, { count: 'exact' })
      .ilike('insurer_name', fromName);
    if (e2b) throw new Error(`insurer_metrics(name): ${e2b.message}`);
    results.insurer_metrics_by_name = c2b ?? 0;

    // 3. Update nonlife_insurer_metrics
    const { error: e3, count: c3 } = await supabase
      .from('nonlife_insurer_metrics')
      .update({ insurer_id: newInsurerId, insurer_name: newName }, { count: 'exact' })
      .eq('insurer_id', fromId);
    if (e3) throw new Error(`nonlife_insurer_metrics: ${e3.message}`);
    results.nonlife_insurer_metrics = c3 ?? 0;

    const { error: e3b, count: c3b } = await supabase
      .from('nonlife_insurer_metrics')
      .update({ insurer_id: newInsurerId, insurer_name: newName }, { count: 'exact' })
      .ilike('insurer_name', fromName);
    if (e3b) throw new Error(`nonlife_insurer_metrics(name): ${e3b.message}`);
    results.nonlife_insurer_metrics_by_name = c3b ?? 0;

    // 4. Update insurer_id_mappings
    const { error: e4, count: c4 } = await supabase
      .from('insurer_id_mappings')
      .update({
        frontend_id: newInsurerId,
        db_insurer_id: newInsurerId,
        db_insurer_name: newName,
      }, { count: 'exact' })
      .or(`frontend_id.eq.${fromId},db_insurer_id.eq.${fromId}`);
    if (e4) throw new Error(`insurer_id_mappings: ${e4.message}`);
    results.insurer_id_mappings = c4 ?? 0;

    // 5. Update insurer_logos
    const { error: e5, count: c5 } = await supabase
      .from('insurer_logos')
      .update({ insurer_id: newInsurerId }, { count: 'exact' })
      .eq('insurer_id', fromId);
    if (e5) throw new Error(`insurer_logos: ${e5.message}`);
    results.insurer_logos = c5 ?? 0;

    // 6. Update news_articles (title/description/content)
    const { data: newsRows, error: newsFindErr } = await supabase
      .from('news_articles')
      .select('id, title, description, content')
      .or(`title.ilike.%${fromName}%,description.ilike.%${fromName}%,content.ilike.%${fromName}%`);
    if (newsFindErr) throw new Error(`news_articles find: ${newsFindErr.message}`);

    let newsUpdated = 0;
    if (newsRows && newsRows.length > 0) {
      for (const row of newsRows) {
        const updates: any = {};
        const replace = (s: string | null) =>
          s ? s.split(fromName).join(newName) : s;
        if (row.title?.includes(fromName)) updates.title = replace(row.title);
        if (row.description?.includes(fromName)) updates.description = replace(row.description);
        if (row.content?.includes(fromName)) updates.content = replace(row.content);
        if (Object.keys(updates).length > 0) {
          const { error: upErr } = await supabase
            .from('news_articles')
            .update(updates)
            .eq('id', row.id);
          if (!upErr) newsUpdated++;
        }
      }
    }
    results.news_articles = newsUpdated;

    return new Response(
      JSON.stringify({
        success: true,
        from: { insurer_id: fromId, name: fromName },
        to: { insurer_id: newInsurerId, name: newName, short_name: newShortName },
        updated: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('rename-insurer error:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
