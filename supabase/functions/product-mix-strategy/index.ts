import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProductMixData {
  marketLeader: { name: string; premium: number; marketShare: number };
  insurerCount: number;
  productLeaders: Array<{ product: string; leader: string; value: number }>;
  diversificationScores: Array<{ name: string; score: number; count: number }>;
  gapsCount: number;
  totalCategories: number;
  correlationData: Array<{ name: string; marketShare: number; activeProducts: number }>;
  year: number;
  quarter: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productMixData } = await req.json() as { productMixData: ProductMixData };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a senior insurance strategy consultant specializing in the Ghanaian life insurance market. 
You provide deep, nuanced strategic analysis about product mix strategies, market positioning, and competitive dynamics.
Your insights should be:
- Highly specific to Ghana's insurance landscape
- Actionable for insurance executives
- Grounded in the data provided
- Forward-looking with strategic recommendations
Write in a professional but accessible tone. Use bullet points for clarity.`;

    const productLeadersSummary = productMixData.productLeaders
      .map(pl => `- ${pl.product}: Led by ${pl.leader} (GH₵${(pl.value / 1e6).toFixed(1)}M)`)
      .join('\n');

    const diversificationSummary = productMixData.diversificationScores
      .slice(0, 5)
      .map(d => `- ${d.name}: ${d.score}% diversification across ${d.count} products`)
      .join('\n');

    const correlationSummary = productMixData.correlationData
      .slice(0, 8)
      .map(c => `- ${c.name}: ${c.marketShare.toFixed(1)}% share, ${c.activeProducts} products`)
      .join('\n');

    const userPrompt = `Analyze the Ghana Life Insurance product mix data for Q${productMixData.quarter} ${productMixData.year}:

**Market Overview:**
- Market Leader: ${productMixData.marketLeader.name} (GH₵${(productMixData.marketLeader.premium / 1e6).toFixed(1)}M, ${productMixData.marketLeader.marketShare.toFixed(1)}% share)
- Total Active Insurers: ${productMixData.insurerCount}
- Product Categories with Activity: ${productMixData.totalCategories}
- Categories where market leader is NOT #1: ${productMixData.gapsCount}

**Product Category Leaders:**
${productLeadersSummary}

**Diversification Scores (higher = more balanced mix):**
${diversificationSummary}

**Market Share vs Product Breadth:**
${correlationSummary}

Provide a strategic analysis in this JSON format:
{
  "headline": "A compelling 8-word strategic headline",
  "executiveSummary": "3-4 sentences summarizing the key strategic takeaway about product mix and market positioning in Ghana's life insurance market",
  "marketLeaderAnalysis": {
    "strengths": ["strength 1", "strength 2"],
    "vulnerabilities": ["vulnerability 1", "vulnerability 2"],
    "recommendation": "One strategic recommendation for the market leader"
  },
  "challengerStrategy": {
    "insight": "2-3 sentences on how challengers can compete through product specialization",
    "opportunities": ["specific opportunity 1", "specific opportunity 2", "specific opportunity 3"]
  },
  "productMixInsights": [
    {"title": "short insight title", "detail": "1-2 sentence explanation with data reference"},
    {"title": "short insight title", "detail": "1-2 sentence explanation"},
    {"title": "short insight title", "detail": "1-2 sentence explanation"}
  ],
  "correlationVerdict": "2-3 sentences on whether diversification actually drives market share in Ghana, based on the data",
  "strategicRecommendations": [
    "Actionable recommendation 1 for the industry",
    "Actionable recommendation 2",
    "Actionable recommendation 3"
  ],
  "riskFactors": ["Risk 1 related to product concentration", "Risk 2"]
}`;

    console.log("Calling AI gateway for product mix strategy...");

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
          JSON.stringify({ error: "AI credits exhausted. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    console.log("AI strategy response received:", content.substring(0, 200));

    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      analysis = {
        headline: "Product Mix Strategy Shapes Market Dynamics",
        executiveSummary: "The Ghana life insurance market shows diverse product strategies among competitors. Market leadership is concentrated but not universal across product categories.",
        marketLeaderAnalysis: {
          strengths: ["Dominant market share position", "Strong premium volume"],
          vulnerabilities: ["Not leading in all product categories"],
          recommendation: "Strengthen presence in underperforming product segments"
        },
        challengerStrategy: {
          insight: "Niche specialization offers viable paths to competitive advantage.",
          opportunities: ["Focus on underserved product categories", "Build expertise in growing segments"]
        },
        productMixInsights: [
          { title: "Concentration Risk", detail: "Market relies heavily on a few dominant products" }
        ],
        correlationVerdict: "Product diversification shows mixed correlation with market share.",
        strategicRecommendations: ["Diversify product offerings strategically", "Monitor emerging product demand"],
        riskFactors: ["Over-concentration in few products", "Regulatory changes"]
      };
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Product mix strategy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
