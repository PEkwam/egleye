import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InsurerProfile {
  name: string;
  branches: number;
  employees: number;
  yearsInGhana: number;
  premium: number;
  marketShare: number;
  website: string;
  parentGroup: string;
  distributionScore: number;
}

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
  insurerProfiles: InsurerProfile[];
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

    const profiles = productMixData.insurerProfiles || [];

    // Build strategic context from profiles
    const profileContext = profiles.length > 0
      ? profiles.slice(0, 10).map(p =>
          `- ${p.name}: ${p.branches} branches, ${p.employees} employees, ${p.yearsInGhana}yrs experience, GH₵${(p.premium / 1e6).toFixed(1)}M premium${p.parentGroup ? ` (${p.parentGroup} group)` : ''}${p.website ? `, ${p.website}` : ''}`
        ).join('\n')
      : '';

    const groupMap: Record<string, string[]> = {};
    profiles.forEach(p => {
      if (p.parentGroup) {
        if (!groupMap[p.parentGroup]) groupMap[p.parentGroup] = [];
        groupMap[p.parentGroup].push(p.name);
      }
    });

    const systemPrompt = `You are a senior insurance strategy consultant specializing in the Ghanaian life insurance market. 
You provide deep, nuanced strategic analysis about product mix strategies, competitive positioning, distribution networks, corporate group advantages, and leadership approaches.
Consider how distribution reach (branches, agents, bancassurance), group affiliations (banking, conglomerate), market experience, and leadership strategies interact to shape competitive dynamics.
Your insights should be:
- Highly specific to Ghana's insurance landscape
- Actionable for insurance executives
- Grounded in the data provided
- Forward-looking with strategic recommendations on distribution, partnerships, and positioning
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

**Insurer Profiles (Distribution, Experience & Group Affiliations):**
${profileContext || 'No detailed profiles available'}

**Corporate Group Affiliations:**
${Object.keys(groupMap).length > 0 ? Object.entries(groupMap).map(([g, m]) => `- ${g}: ${m.join(', ')}`).join('\n') : 'No group affiliations detected'}

**Product Category Leaders:**
${productLeadersSummary}

**Diversification Scores (higher = more balanced mix):**
${diversificationSummary}

**Market Share vs Product Breadth:**
${correlationSummary}

Provide a strategic analysis in this JSON format:
{
  "headline": "A compelling 8-word strategic headline",
  "executiveSummary": "3-4 sentences summarizing the key strategic takeaway about product mix, distribution strategy, and competitive positioning in Ghana's life insurance market",
  "marketLeaderAnalysis": {
    "strengths": ["strength 1 (consider distribution, group backing, experience)", "strength 2"],
    "vulnerabilities": ["vulnerability 1 (distribution gaps, product gaps, challenger threats)", "vulnerability 2"],
    "recommendation": "One strategic recommendation considering distribution, partnerships, or leadership approach"
  },
  "challengerStrategy": {
    "insight": "2-3 sentences on how challengers can compete through distribution innovation, bancassurance partnerships, digital channels, group affiliations, or product specialization",
    "opportunities": ["specific opportunity with distribution/partnership angle", "specific opportunity 2", "specific opportunity 3"]
  },
  "productMixInsights": [
    {"title": "short insight title", "detail": "1-2 sentence explanation referencing distribution reach or group advantage"},
    {"title": "short insight title", "detail": "1-2 sentence explanation"},
    {"title": "short insight title", "detail": "1-2 sentence explanation"}
  ],
  "correlationVerdict": "2-3 sentences on how distribution networks, group affiliations, and product diversification interact to drive or hinder market share in Ghana",
  "strategicRecommendations": [
    "Actionable recommendation on distribution or partnership strategy",
    "Actionable recommendation on product positioning",
    "Actionable recommendation on competitive approach (leadership, digital, bancassurance)"
  ],
  "riskFactors": ["Risk related to distribution or competitive dynamics", "Risk related to group concentration or regulatory"]
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
        headline: "Distribution and Affiliations Shape Market Dynamics",
        executiveSummary: "The Ghana life insurance market shows diverse competitive strategies. Distribution networks and group affiliations play critical roles alongside product mix in determining market position.",
        marketLeaderAnalysis: {
          strengths: ["Dominant market share position", "Strong distribution network"],
          vulnerabilities: ["Not leading in all product categories"],
          recommendation: "Strengthen presence in underperforming segments through distribution partnerships"
        },
        challengerStrategy: {
          insight: "Niche specialization and strategic partnerships offer viable paths to competitive advantage.",
          opportunities: ["Focus on underserved product categories", "Leverage bancassurance partnerships", "Invest in digital distribution"]
        },
        productMixInsights: [
          { title: "Distribution Drives Volume", detail: "Insurers with wider branch networks tend to capture more premium volume" }
        ],
        correlationVerdict: "Distribution reach and group backing show stronger correlation with market share than product diversification alone.",
        strategicRecommendations: ["Diversify distribution channels", "Pursue strategic bancassurance partnerships", "Monitor emerging digital channels"],
        riskFactors: ["Over-reliance on traditional distribution", "Regulatory changes to bancassurance"]
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
