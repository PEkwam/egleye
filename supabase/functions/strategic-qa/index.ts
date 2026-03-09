import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface StrategicQAData {
  year: number;
  quarter: number;
  marketLeader: { name: string; premium: number; marketShare: number };
  insurerCount: number;
  productLeaders: Array<{ product: string; leader: string; value: number; marketLeaderValue: number }>;
  gapsCount: number;
  leaderDominanceCount: number;
  totalCategories: number;
  nicheSpecialists: Array<{ insurer: string; product: string; value: number }>;
  diversificationTop5: Array<{ name: string; score: number; count: number }>;
  correlationTop5: Array<{ name: string; marketShare: number; activeProducts: number }>;
  underservedProducts: Array<{ product: string; activeInsurers: number; totalPremium: number }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { strategicData } = await req.json() as { strategicData: StrategicQAData };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const fmt = (v: number) => {
      if (v >= 1e9) return `GH₵${(v / 1e9).toFixed(1)}B`;
      if (v >= 1e6) return `GH₵${(v / 1e6).toFixed(1)}M`;
      if (v >= 1e3) return `GH₵${(v / 1e3).toFixed(0)}K`;
      return `GH₵${v.toLocaleString()}`;
    };

    const systemPrompt = `You are an expert insurance strategist analyzing the Ghanaian life insurance market.
You provide sharp, data-backed answers to strategic questions about product mix and market positioning.
Be specific with numbers from the data. Be opinionated — take clear positions. Write for insurance executives.
Each answer should feel like consulting advice, not a textbook summary.`;

    const userPrompt = `Based on Q${strategicData.quarter} ${strategicData.year} Ghana Life Insurance data, answer these 5 strategic questions.

**Context:**
- Market Leader: ${strategicData.marketLeader.name} (${fmt(strategicData.marketLeader.premium)}, ${strategicData.marketLeader.marketShare.toFixed(1)}% share)
- ${strategicData.insurerCount} active insurers, ${strategicData.totalCategories} product categories
- Market leader leads ${strategicData.leaderDominanceCount}/${strategicData.totalCategories} categories (gaps in ${strategicData.gapsCount})

**Product Category Leaders:**
${strategicData.productLeaders.map(pl => `- ${pl.product}: ${pl.leader} (${fmt(pl.value)}) vs market leader's ${fmt(pl.marketLeaderValue)}`).join('\n')}

**Niche Specialists (beat market leader):**
${strategicData.nicheSpecialists.length > 0 ? strategicData.nicheSpecialists.map(ns => `- ${ns.insurer} leads ${ns.product} (${fmt(ns.value)})`).join('\n') : 'None - market leader dominates all'}

**Diversification Rankings:**
${strategicData.diversificationTop5.map(d => `- ${d.name}: ${d.score}% across ${d.count} products`).join('\n')}

**Market Share vs Product Breadth:**
${strategicData.correlationTop5.map(c => `- ${c.name}: ${c.marketShare.toFixed(1)}% share, ${c.activeProducts} products`).join('\n')}

**Underserved Products (fewest competitors):**
${strategicData.underservedProducts.map(u => `- ${u.product}: ${u.activeInsurers} insurers, ${fmt(u.totalPremium)} total`).join('\n')}

Return a JSON object with exactly 5 questions. Each question has: question (string), summary (2-3 sentences), dataPoints (array of 3-5 specific data observations), implication (1 strategic takeaway sentence).

{
  "questions": [
    {
      "id": "leader_gaps",
      "question": "Why doesn't ${strategicData.marketLeader.name} lead in every product category?",
      "summary": "...",
      "dataPoints": ["...", "..."],
      "implication": "..."
    },
    {
      "id": "niche_specialists",
      "question": "Which insurers are beating the market leader through specialization?",
      "summary": "...",
      "dataPoints": ["...", "..."],
      "implication": "..."
    },
    {
      "id": "diversification_correlation",
      "question": "Does product diversification actually drive market share in Ghana?",
      "summary": "...",
      "dataPoints": ["...", "..."],
      "implication": "..."
    },
    {
      "id": "most_diversified",
      "question": "Who has the most balanced product portfolio and does it pay off?",
      "summary": "...",
      "dataPoints": ["...", "..."],
      "implication": "..."
    },
    {
      "id": "growth_opportunities",
      "question": "What underserved product categories represent blue ocean opportunities?",
      "summary": "...",
      "dataPoints": ["...", "..."],
      "implication": "..."
    }
  ]
}`;

    console.log("Calling AI gateway for strategic Q&A...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      result = {
        questions: [
          {
            id: "leader_gaps",
            question: `Why doesn't ${strategicData.marketLeader.name} lead in every category?`,
            summary: `${strategicData.marketLeader.name} leads overall but has gaps in ${strategicData.gapsCount} product categories. Market leadership is built on volume concentration, not universal dominance.`,
            dataPoints: [`Leads ${strategicData.leaderDominanceCount}/${strategicData.totalCategories} categories`],
            implication: "Niche specialists can compete effectively by focusing on specific product categories.",
          }
        ]
      };
    }

    return new Response(JSON.stringify({ analysis: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Strategic Q&A error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
