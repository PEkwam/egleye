import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch recent articles from last 48 hours
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: articles, error: dbError } = await supabase
      .from("news_articles")
      .select("title, category, source_name, published_at, description")
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(20);

    if (dbError) throw dbError;

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({
          digest: null,
          message: "No recent articles to summarize",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build article summary for the AI
    const articleList = articles
      .map(
        (a, i) =>
          `${i + 1}. [${a.category}] "${a.title}" — ${a.source_name || "Unknown"} (${a.published_at ? new Date(a.published_at).toLocaleDateString() : "Recent"})`
      )
      .join("\n");

    const systemPrompt = `You are an expert insurance industry analyst covering Ghana's insurance market. Generate a concise daily news digest focusing STRICTLY on insurance-related content.

Rules:
- Write 3-5 bullet points summarizing ONLY insurance-related themes and developments
- Each bullet should be 1-2 sentences max
- Focus exclusively on: insurance regulation (NIC), life & non-life insurance, reinsurance, claims, premiums, solvency, pensions (NPRA/SSNIT), insurance company news, and insurance market trends
- IGNORE any articles about general politics, entertainment, sports, technology, or other non-insurance topics even if they appear in the article list
- Highlight regulatory changes, market movements, premium/claims trends, and notable insurer news
- Use professional but accessible language
- Include a one-line overall insurance market sentiment at the end (bullish/bearish/neutral with brief reasoning)
- Do NOT use markdown headers, just plain bullet points starting with •
- Keep total response under 300 words`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Here are the latest ${articles.length} Ghana insurance news articles from the past 48 hours:\n\n${articleList}\n\nGenerate a daily digest summary.`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const digestContent =
      aiData.choices?.[0]?.message?.content || "Unable to generate digest.";

    return new Response(
      JSON.stringify({
        digest: digestContent,
        articleCount: articles.length,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("news-digest error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
