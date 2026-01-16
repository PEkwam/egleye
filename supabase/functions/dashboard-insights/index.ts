import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InsurerData {
  name: string;
  premium: number;
  marketShare: number;
  profit?: number;
  claimsRatio?: number;
  expenseRatio?: number;
}

interface MetricsSummary {
  totalPremium: number;
  totalAssets: number;
  totalProfit: number;
  avgExpenseRatio: number;
  avgClaimsRatio: number;
  companiesCount: number;
  topInsurers: InsurerData[];
  category: string;
  year: number;
  quarter: number;
  totalClaims?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metricsSummary } = await req.json() as { metricsSummary: MetricsSummary };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const categoryLabel = metricsSummary.category === 'life' ? 'Life Insurance' 
      : metricsSummary.category === 'motor' ? 'Non-Life Insurance' 
      : metricsSummary.category === 'pension' ? 'Pension' : 'All Sectors';

    const formatCurrency = (value: number) => {
      if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(1)}M`;
      return `GH₵${value.toLocaleString()}`;
    };

    const systemPrompt = `You are an expert insurance industry analyst specializing in the Ghanaian insurance market. 
You provide concise, actionable executive insights based on quarterly NIC (National Insurance Commission) data.
Your analysis should be:
- Strategic and forward-looking
- Data-driven with specific numbers
- Focused on market leaders, emerging players, claims efficiency, and competitive dynamics
- Written for C-suite executives and investors`;

    // Identify market leader and emerging companies
    const marketLeader = metricsSummary.topInsurers[0];
    const topThree = metricsSummary.topInsurers.slice(0, 3);
    const topThreeShare = topThree.reduce((sum, ins) => sum + ins.marketShare, 0);
    const smallerPlayers = metricsSummary.topInsurers.slice(3);

    const userPrompt = `Analyze the Ghana ${categoryLabel} industry Q${metricsSummary.quarter} ${metricsSummary.year} data:

**Industry Overview:**
- Total Gross Premium: ${formatCurrency(metricsSummary.totalPremium)}
- Total Assets: ${formatCurrency(metricsSummary.totalAssets)}
- Total Profit: ${formatCurrency(metricsSummary.totalProfit)}
- Total Claims Paid: ${metricsSummary.totalClaims ? formatCurrency(metricsSummary.totalClaims) : 'N/A'}
- Average Expense Ratio: ${metricsSummary.avgExpenseRatio.toFixed(1)}%
- Average Claims Ratio: ${metricsSummary.avgClaimsRatio.toFixed(1)}%
- Number of Companies: ${metricsSummary.companiesCount}

**Market Leader:** ${marketLeader?.name || 'N/A'} with ${marketLeader?.marketShare.toFixed(1) || 0}% market share

**Top 3 Concentration:** ${topThreeShare.toFixed(1)}% of market

**Top Performers by Premium:**
${metricsSummary.topInsurers.map((ins, i) => `${i + 1}. ${ins.name}: ${formatCurrency(ins.premium)} (${ins.marketShare.toFixed(1)}% share)`).join('\n')}

Provide a JSON response with:
{
  "headline": "One powerful headline summarizing the quarter (max 10 words)",
  "summary": "2-3 sentence executive summary focusing on market dynamics",
  "marketLeader": {
    "name": "Company name",
    "insight": "1 sentence about market leader position and strategy"
  },
  "emergingPlayers": ["Company 1 showing growth", "Company 2 with notable performance"],
  "keyMetrics": [
    {"label": "metric name", "value": "formatted value", "trend": "up|down|stable", "insight": "brief insight"}
  ],
  "claimsAnalysis": "1-2 sentences analyzing claims efficiency and loss ratios",
  "opportunities": ["opportunity 1", "opportunity 2"],
  "risks": ["risk 1", "risk 2"],
  "recommendation": "One actionable strategic recommendation"
}`;

    console.log("Calling AI gateway for dashboard insights...");

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
          JSON.stringify({ error: "Payment required. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    console.log("AI response received:", content.substring(0, 200));

    // Parse JSON from the response
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
      // Fallback response
      analysis = {
        headline: "Ghana Insurance Industry Overview",
        summary: `The ${categoryLabel} sector shows ${metricsSummary.totalProfit >= 0 ? 'positive' : 'challenging'} performance in Q${metricsSummary.quarter} ${metricsSummary.year} with total premium of ${formatCurrency(metricsSummary.totalPremium)}.`,
        keyMetrics: [
          { label: "Total Premium", value: formatCurrency(metricsSummary.totalPremium), trend: "stable", insight: "Industry revenue" },
          { label: "Expense Ratio", value: `${metricsSummary.avgExpenseRatio.toFixed(1)}%`, trend: metricsSummary.avgExpenseRatio > 50 ? "up" : "stable", insight: "Cost efficiency" },
        ],
        opportunities: ["Digital transformation", "Underserved market segments"],
        risks: ["Rising claims costs", "Regulatory changes"],
        recommendation: "Focus on operational efficiency and digital capabilities.",
      };
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Dashboard insights error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
