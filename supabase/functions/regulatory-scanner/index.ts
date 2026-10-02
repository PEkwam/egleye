// Regulatory Horizon Scanner: pulls announcements from NIC, BoG, SEC, CSA and DPC
// via news feeds, stores them, and asks AI what each means for Enterprise Group.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const REGULATORS: Record<string, string> = {
  NIC: '"National Insurance Commission" Ghana',
  BOG: '"Bank of Ghana" directive OR policy OR guideline',
  SEC: '"Securities and Exchange Commission" Ghana',
  CSA: '"Cyber Security Authority" Ghana',
  DPC: '"Data Protection Commission" Ghana',
};
const MAX_AGE_DAYS = 45;
const MIN_SCAN_GAP_MS = 30 * 60 * 1000;

function decode(s: string) {
  return s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
const tag = (x: string, t: string) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? decode(m[1]) : ""; };

async function fetchRegulator(code: string, q: string) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}+when:${MAX_AGE_DAYS}d&hl=en-GH&gl=GH&ceid=GH:en`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 EGLEYE-RegScanner" } });
  if (!res.ok) throw new Error(`${code} feed HTTP ${res.status}`);
  const xml = await res.text();
  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 12).map((m) => {
    const it = m[1];
    const rawTitle = tag(it, "title");
    const source = tag(it, "source");
    const title = source && rawTitle.endsWith(` - ${source}`) ? rawTitle.slice(0, -(source.length + 3)) : rawTitle;
    const pub = tag(it, "pubDate");
    return { regulator: code, title, source_url: tag(it, "link"), source_name: source || null,
      published_at: pub ? new Date(pub).toISOString() : null };
  }).filter((a) => a.title && a.source_url && (!a.published_at || Date.parse(a.published_at) >= cutoff));
}

async function analyze(apiKey: string, item: { regulator: string; title: string; source_name: string | null }) {
  const prompt = `You are the chief compliance & strategy advisor to Enterprise Group Ghana (subsidiaries: Enterprise Life, Enterprise Insurance (non-life), Enterprise Trustees (pensions), Transitions (funeral), Enterprise Properties, Acacia Health).
Regulator: ${item.regulator}. Headline: "${item.title}" (source: ${item.source_name ?? "unknown"}).
Return ONLY a JSON object, no markdown, with keys:
"relevant": boolean (false if not a regulatory/policy matter affecting financial services),
"summary": one sentence plain-English summary,
"impact_level": "high" | "medium" | "low",
"business_impact": 2-3 sentences on what it means for Enterprise Group,
"affected_units": array from ["Enterprise Life","Enterprise Insurance","Enterprise Trustees","Transitions","Enterprise Properties","Acacia Health","Group"],
"action_items": array of up to 3 short recommended actions,
"deadline": string or null (any compliance date mentioned).`;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: "openai/gpt-6-astra", input: prompt, stream: true, store: false,
      reasoning: { effort: "low", summary: "auto" }, include: ["reasoning.encrypted_content"] }),
  });
  if (!res.ok || !res.body) { const e = new Error(`AI HTTP ${res.status}: ${await res.text()}`); (e as any).status = res.status; throw e; }
  let text = "", buf = "";
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const l of lines) {
      if (!l.startsWith("data:")) continue;
      try { const ev = JSON.parse(l.slice(5)); if (ev.type === "response.output_text.delta") text += ev.delta; } catch { /* skip */ }
    }
  }
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("AI returned no JSON");
  return JSON.parse(m[0]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const isCron = req.headers.get("x-cron-secret") === Deno.env.get("CRON_SECRET");

    // Throttle visitor-triggered scans to protect AI credits.
    if (!isCron) {
      const { data: last } = await supabase.from("regulatory_updates").select("created_at").order("created_at", { ascending: false }).limit(1);
      const { data: lastSetting } = await supabase.from("site_settings").select("setting_value").eq("setting_key", "regscan_last_run").maybeSingle();
      const lastRun = Math.max(Date.parse(lastSetting?.setting_value ?? "0") || 0, last?.[0] ? 0 : 0);
      if (Date.now() - lastRun < MIN_SCAN_GAP_MS) return json({ skipped: true, message: "Scanned recently — showing latest results." });
    }
    await supabase.from("site_settings").upsert(
      { setting_key: "regscan_last_run", setting_value: new Date().toISOString(), setting_type: "text", description: "Regulatory scanner last run" },
      { onConflict: "setting_key" });

    let inserted = 0; const errors: string[] = [];
    for (const [code, q] of Object.entries(REGULATORS)) {
      try {
        const items = await fetchRegulator(code, q);
        if (!items.length) continue;
        const { data } = await supabase.from("regulatory_updates").upsert(items, { onConflict: "source_url", ignoreDuplicates: true }).select("id");
        inserted += data?.length ?? 0;
      } catch (e) { errors.push(String(e)); }
      await new Promise((r) => setTimeout(r, 800));
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    let analyzed = 0, removed = 0;
    if (apiKey) {
      const { data: pending } = await supabase.from("regulatory_updates").select("id, regulator, title, source_name")
        .is("analyzed_at", null).order("published_at", { ascending: false }).limit(15);
      for (const p of pending ?? []) {
        try {
          const r = await analyze(apiKey, p);
          if (r.relevant === false) { await supabase.from("regulatory_updates").delete().eq("id", p.id); removed++; continue; }
          await supabase.from("regulatory_updates").update({
            summary: r.summary ?? null,
            impact_level: ["high", "medium", "low"].includes(r.impact_level) ? r.impact_level : "medium",
            business_impact: r.business_impact ?? null,
            affected_units: Array.isArray(r.affected_units) ? r.affected_units : [],
            action_items: Array.isArray(r.action_items) ? r.action_items.slice(0, 3) : [],
            deadline: r.deadline ?? null,
            analyzed_at: new Date().toISOString(),
          }).eq("id", p.id);
          analyzed++;
        } catch (e) {
          const s = (e as any).status;
          errors.push(String(e));
          if (s === 402 || s === 403 || s === 401) break; // credits/access — stop this run
        }
      }
    }
    return json({ inserted, analyzed, removed, errors });
  } catch (e) {
    console.error("regulatory-scanner error", e);
    return json({ error: e instanceof Error ? e.message : "Scan failed" }, 500);
  }
});
