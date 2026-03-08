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
  distributionScore: number; // branches * employees proxy
}

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
  insurerProfiles: InsurerProfile[];
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

    const profiles = strategicData.insurerProfiles || [];
    const profilesSummary = profiles.length > 0
      ? profiles.slice(0, 10).map(p =>
          `- ${p.name}: ${p.branches} branches, ${p.employees} employees, ${p.yearsInGhana}yrs in Ghana, ${fmt(p.premium)} premium (${p.marketShare.toFixed(1)}% share)${p.parentGroup ? `, part of ${p.parentGroup}` : ''}${p.website ? `, website: ${p.website}` : ''}`
        ).join('\n')
      : 'No detailed profiles available';

    // Identify group affiliations
    const groupMap: Record<string, string[]> = {};
    profiles.forEach(p => {
      if (p.parentGroup) {
        if (!groupMap[p.parentGroup]) groupMap[p.parentGroup] = [];
        groupMap[p.parentGroup].push(p.name);
      }
    });
    const affiliationsSummary = Object.keys(groupMap).length > 0
      ? Object.entries(groupMap).map(([group, members]) => `- ${group}: ${members.join(', ')}`).join('\n')
      : 'No clear group affiliations detected';

    // Distribution leaders
    const distributionLeaders = [...profiles].sort((a, b) => b.distributionScore - a.distributionScore).slice(0, 5);
    const distributionSummary = distributionLeaders.length > 0
      ? distributionLeaders.map(d => `- ${d.name}: ${d.branches} branches, ${d.employees} employees (reach score: ${d.distributionScore})`).join('\n')
      : 'No distribution data available';

    // Experience leaders
    const experienceLeaders = [...profiles].sort((a, b) => b.yearsInGhana - a.yearsInGhana).slice(0, 5);
    const experienceSummary = experienceLeaders.length > 0
      ? experienceLeaders.map(e => `- ${e.name}: ${e.yearsInGhana} years in Ghana`).join('\n')
      : 'No experience data available';

    const systemPrompt = `You are an expert insurance strategist analyzing the Ghanaian life insurance market.
You provide sharp, data-backed answers to strategic questions about competitive positioning, distribution strategies, leadership approaches, group affiliations, and product mix.
Consider how distribution networks (branches, agents, bancassurance), corporate group affiliations (banking ties, conglomerate advantages), leadership tenure and experience, and market positioning strategies all interact to drive competitive advantage.
Be specific with numbers from the data. Be opinionated — take clear positions. Write for insurance executives.
Each answer should feel like consulting advice, not a textbook summary.`;

    const userPrompt = `Based on Q${strategicData.quarter} ${strategicData.year} Ghana Life Insurance data, answer these 7 strategic questions.

**Context:**
- Market Leader: ${strategicData.marketLeader.name} (${fmt(strategicData.marketLeader.premium)}, ${strategicData.marketLeader.marketShare.toFixed(1)}% share)
- ${strategicData.insurerCount} active insurers, ${strategicData.totalCategories} product categories
- Market leader leads ${strategicData.leaderDominanceCount}/${strategicData.totalCategories} categories (gaps in ${strategicData.gapsCount})

**Insurer Profiles (Distribution, Experience & Scale):**
${profilesSummary}

**Group Affiliations & Conglomerate Advantages:**
${affiliationsSummary}

**Distribution Network Leaders (by branch + employee reach):**
${distributionSummary}

**Market Experience Leaders:**
${experienceSummary}

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

Return a JSON object with exactly 7 questions. Each question has: question (string), summary (2-3 sentences), dataPoints (array of 3-5 specific data observations), implication (1 strategic takeaway sentence).

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
      "id": "distribution_advantage",
      "question": "How do distribution networks and branch reach drive competitive advantage?",
      "summary": "Analyze whether insurers with more branches and employees actually capture more market share, or if lean digital-first models are more effective...",
      "dataPoints": ["...", "..."],
      "implication": "..."
    },
    {
      "id": "group_affiliations",
      "question": "Which group affiliations and corporate backing give insurers an unfair advantage?",
      "summary": "Analyze how banking group ties, conglomerate ownership, and strategic partnerships translate into premium volume and distribution reach...",
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
      "id": "leadership_experience",
      "question": "Does market experience and leadership tenure correlate with market dominance?",
      "summary": "Analyze whether years in Ghana, institutional knowledge, and established brand trust translate into sustained competitive advantage or if newer entrants are disrupting...",
      "dataPoints": ["...", "..."],
      "implication": "..."
    },
    {
      "id": "overtaking_strategy",
      "question": "What is the most viable strategy for a challenger to overtake the market leader?",
      "summary": "Consider distribution expansion, product specialization, digital transformation, bancassurance partnerships, or aggressive pricing...",
      "dataPoints": ["...", "..."],
      "implication": "..."
    },
    {
      "id": "growth_opportunities",
      "question": "What underserved product categories and distribution gaps represent blue ocean opportunities?",
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
