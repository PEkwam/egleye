// Admin-only management for the SMTP email connection profile that powers
// subscriber emails. Replaces hard-coded Gmail connector secrets with a
// DB-backed config the admin can edit and verify from the UI.
//
// Actions (POST JSON):
//   - get               -> returns the active profile (password masked)
//   - list              -> returns all profiles (passwords masked)
//   - save  { profile } -> upsert by id; if profile.is_active=true, deactivates others
//   - test  { profile? | id? } -> attempts SMTP login (no email sent)
//   - send_test { to, id? }    -> sends a real test email via active/selected profile
//   - delete { id }     -> removes a profile

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-admin-token',
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

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

type Profile = {
  id?: string;
  label: string;
  provider: 'gmail' | 'outlook' | 'sendgrid' | 'mailgun' | 'smtp';
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from_email: string;
  from_name?: string;
  reply_to?: string | null;
  is_active?: boolean;
};

function maskPassword<T extends { password?: string }>(row: T): T {
  if (!row) return row;
  return { ...row, password: row.password ? '••••••••' : '' };
}

function validate(p: Partial<Profile>): string | null {
  if (!p.label?.trim()) return 'Label is required';
  if (!p.provider) return 'Provider is required';
  if (!p.host?.trim()) return 'SMTP host is required';
  if (!p.port || p.port < 1 || p.port > 65535) return 'Port must be between 1 and 65535';
  if (!p.username?.trim()) return 'Username is required';
  if (!p.from_email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.from_email)) return 'A valid From email is required';
  if (p.reply_to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.reply_to)) return 'Reply-to must be a valid email';
  return null;
}

async function smtpLogin(p: Profile): Promise<void> {
  const client = new SMTPClient({
    connection: {
      hostname: p.host,
      port: Number(p.port),
      tls: !!p.secure, // implicit TLS when true (e.g. port 465); STARTTLS auto-negotiated otherwise
      auth: { username: p.username, password: p.password },
    },
  });
  // denomailer connects lazily; force a NOOP-style interaction by closing immediately
  // after a connect attempt. Close will resolve once the handshake completed.
  await client.close();
}

async function smtpSend(p: Profile, to: string, subject: string, html: string, text: string): Promise<void> {
  const client = new SMTPClient({
    connection: {
      hostname: p.host,
      port: Number(p.port),
      tls: !!p.secure,
      auth: { username: p.username, password: p.password },
    },
  });
  try {
    await client.send({
      from: p.from_name ? `${p.from_name} <${p.from_email}>` : p.from_email,
      to,
      replyTo: p.reply_to || undefined,
      subject,
      content: text,
      html,
    });
  } finally {
    await client.close();
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (!(await verifyAdminToken(req.headers.get('x-admin-token')))) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* noop */ }
  const action = String(body.action || '');

  try {
    if (action === 'list') {
      const { data, error } = await supabase
        .from('email_connections')
        .select('*')
        .order('is_active', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return json({ profiles: (data ?? []).map(maskPassword) });
    }

    if (action === 'get') {
      const { data } = await supabase
        .from('email_connections')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      return json({ profile: data ? maskPassword(data) : null });
    }

    if (action === 'save') {
      const incoming = body.profile as Profile;
      const err = validate(incoming);
      if (err) return json({ error: err }, 400);

      // If password is the mask sentinel, keep existing password
      let password = incoming.password;
      if (incoming.id && (!password || password === '••••••••')) {
        const { data: existing } = await supabase
          .from('email_connections').select('password').eq('id', incoming.id).maybeSingle();
        password = existing?.password ?? '';
      }
      if (!password) return json({ error: 'Password is required' }, 400);

      const row = {
        id: incoming.id,
        label: incoming.label.trim(),
        provider: incoming.provider,
        host: incoming.host.trim(),
        port: Number(incoming.port),
        secure: !!incoming.secure,
        username: incoming.username.trim(),
        password,
        from_email: incoming.from_email.trim(),
        from_name: (incoming.from_name ?? '').trim(),
        reply_to: incoming.reply_to?.trim() || null,
        is_active: incoming.is_active ?? true,
      };

      // If activating this one, deactivate others first to honor unique-active index
      if (row.is_active) {
        await supabase.from('email_connections').update({ is_active: false }).neq('id', row.id ?? '00000000-0000-0000-0000-000000000000');
      }

      const { data, error } = row.id
        ? await supabase.from('email_connections').update(row).eq('id', row.id).select().single()
        : await supabase.from('email_connections').insert(row).select().single();
      if (error) throw error;
      return json({ profile: maskPassword(data) });
    }

    if (action === 'delete') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'Missing id' }, 400);
      const { error } = await supabase.from('email_connections').delete().eq('id', id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === 'test') {
      // If profile sent inline, use it directly (allows test before save)
      let p: Profile | null = body.profile as Profile;
      if (p && (!p.password || p.password === '••••••••') && p.id) {
        const { data } = await supabase.from('email_connections').select('*').eq('id', p.id).maybeSingle();
        if (data) p = { ...p, password: data.password };
      }
      if (!p && body.id) {
        const { data } = await supabase.from('email_connections').select('*').eq('id', String(body.id)).maybeSingle();
        p = data as Profile | null;
      }
      if (!p) return json({ error: 'No profile provided' }, 400);

      const err = validate(p);
      if (err) return json({ error: err }, 400);

      try {
        await smtpLogin(p);
        if (p.id) {
          await supabase.from('email_connections').update({
            last_verified_at: new Date().toISOString(),
            last_error: null,
          }).eq('id', p.id);
        }
        return json({ ok: true, message: `Connected to ${p.host}:${p.port} as ${p.username}` });
      } catch (e) {
        const message = (e as Error).message || String(e);
        if (p.id) {
          await supabase.from('email_connections').update({ last_error: message }).eq('id', p.id);
        }
        return json({ ok: false, error: message }, 400);
      }
    }

    if (action === 'send_test') {
      const to = String(body.to || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: 'Valid recipient email required' }, 400);

      let q = supabase.from('email_connections').select('*');
      q = body.id ? q.eq('id', String(body.id)) : q.eq('is_active', true);
      const { data: p } = await q.maybeSingle();
      if (!p) return json({ error: 'No connection profile available' }, 400);

      const subject = 'Test email from your portal';
      const html = `<div style="font-family:Arial,sans-serif;color:#111">
        <h2>SMTP test successful ✅</h2>
        <p>This message was sent via <strong>${p.label}</strong> (${p.provider.toUpperCase()}) using <code>${p.host}:${p.port}</code>.</p>
        <p>If you received it, your email connection is working.</p>
      </div>`;
      const text = `SMTP test successful. Sent via ${p.label} (${p.provider}) using ${p.host}:${p.port}.`;
      try {
        await smtpSend(p as Profile, to, subject, html, text);
        await supabase.from('email_connections').update({
          last_verified_at: new Date().toISOString(),
          last_error: null,
        }).eq('id', p.id);
        return json({ ok: true, message: `Test email sent to ${to}` });
      } catch (e) {
        const message = (e as Error).message || String(e);
        await supabase.from('email_connections').update({ last_error: message }).eq('id', p.id);
        return json({ ok: false, error: message }, 400);
      }
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, 500);
  }
});
