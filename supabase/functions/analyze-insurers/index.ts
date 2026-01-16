import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InsurerData {
  id: string;
  name: string;
  grossPremium: number | null;
  marketShare: number | null;
  totalAssets: number | null;
  profitAfterTax: number | null;
  solvencyRatio: number | null;
  claimsRatio: number | null;
  expenseRatio: number | null;
  branches: number | null;
  employees: number | null;
  yearsInGhana: number | null;
}

interface RequestBody {
  insurers: InsurerData[];
  category: string;
  year: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { insurers, category, year }: RequestBody = await req.json();

    if (!insurers || insurers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No insurers provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build a detailed prompt with the insurer data based on category
    const isPension = category === 'pension';
    const isNonLife = category === 'nonlife' || category === 'motor';
    
    const insurerSummaries = insurers.map((insurer) => {
      const metrics: string[] = [];
      
      if (isPension) {
        // Pension-specific metrics
        if (insurer.grossPremium) metrics.push(`Assets Under Management (AUM): GH₵${(insurer.grossPremium / 1e6).toFixed(1)}M`);
        if (insurer.marketShare) metrics.push(`Market Share: ${insurer.marketShare.toFixed(1)}%`);
        if (insurer.profitAfterTax) metrics.push(`Investment Return: ${insurer.profitAfterTax.toFixed(1)}%`);
        if (insurer.expenseRatio) metrics.push(`Expense Ratio: ${insurer.expenseRatio.toFixed(1)}%`);
        if (insurer.employees) metrics.push(`Total Contributors: ${insurer.employees.toLocaleString()}`);
      } else if (isNonLife) {
        // Non-Life/Motor specific metrics
        if (insurer.grossPremium) metrics.push(`Insurance Service Revenue: GH₵${(insurer.grossPremium / 1e6).toFixed(1)}M`);
        if (insurer.marketShare) metrics.push(`Market Share: ${insurer.marketShare.toFixed(1)}%`);
        if (insurer.totalAssets) metrics.push(`Total Assets: GH₵${(insurer.totalAssets / 1e6).toFixed(1)}M`);
        if (insurer.profitAfterTax) metrics.push(`Profit After Tax: GH₵${(insurer.profitAfterTax / 1e6).toFixed(1)}M`);
        if (insurer.claimsRatio) metrics.push(`Claims Ratio: ${insurer.claimsRatio.toFixed(1)}%`);
        if (insurer.expenseRatio) metrics.push(`Expense Ratio: ${insurer.expenseRatio.toFixed(1)}%`);
      } else {
        // Life Insurance metrics
        if (insurer.grossPremium) metrics.push(`Gross Premium: GH₵${(insurer.grossPremium / 1e6).toFixed(1)}M`);
        if (insurer.marketShare) metrics.push(`Market Share: ${insurer.marketShare.toFixed(1)}%`);
        if (insurer.totalAssets) metrics.push(`Total Assets: GH₵${(insurer.totalAssets / 1e6).toFixed(1)}M`);
        if (insurer.profitAfterTax) metrics.push(`Profit After Tax: GH₵${(insurer.profitAfterTax / 1e6).toFixed(1)}M`);
        if (insurer.solvencyRatio) metrics.push(`Solvency Ratio: ${insurer.solvencyRatio.toFixed(1)}%`);
        if (insurer.claimsRatio) metrics.push(`Claims Ratio: ${insurer.claimsRatio.toFixed(1)}%`);
        if (insurer.expenseRatio) metrics.push(`Expense Ratio: ${insurer.expenseRatio.toFixed(1)}%`);
        if (insurer.branches) metrics.push(`Branches: ${insurer.branches}`);
        if (insurer.employees) metrics.push(`Employees: ${insurer.employees}`);
        if (insurer.yearsInGhana) metrics.push(`Years in Ghana: ${insurer.yearsInGhana}`);
      }
      
      return `${insurer.name}:\n${metrics.join('\n')}`;
    }).join('\n\n');

    const categoryLabel = category === 'life' ? 'Life Insurance' : 
                         category === 'nonlife' || category === 'motor' ? 'Non-Life/Motor Insurance' : 
                         category === 'pension' ? 'Pension Fund' : 'Insurance';
    
    const dataSource = category === 'pension' ? 'NPRA' : 'NIC';

    const systemPrompt = `You are an expert ${isPension ? 'pension fund' : 'insurance industry'} analyst specializing in the Ghanaian market. 
Analyze the provided ${categoryLabel} data from ${year} ${dataSource} reports and provide professional insights.

Your analysis should be:
1. Data-driven with specific numbers
2. Comparative across the selected ${isPension ? 'funds' : 'companies'}
3. Focused on ${isPension ? 'fund performance, growth, and contributor engagement' : 'market positioning, financial health, and growth potential'}
4. Written in clear, professional language suitable for executives

Format your response as a JSON object with the following structure:
{
  "summary": "A 2-3 sentence executive summary of the comparison",
  "insights": [
    "First key insight with specific data points",
    "Second key insight with comparative analysis",
    "Third key insight about ${isPension ? 'fund performance' : 'market positioning'}",
    "Fourth key insight about ${isPension ? 'growth trends' : 'financial health or efficiency'}"
  ],
  "leader": {
    "name": "Name of the leading ${isPension ? 'fund' : 'company'}",
    "reason": "Brief explanation of why they lead"
  },
  "risks": ["Key risk factor 1", "Key risk factor 2"],
  "opportunities": ["Opportunity 1", "Opportunity 2"]
}`;

    const userPrompt = `Analyze and compare these ${categoryLabel} ${isPension ? 'funds' : 'companies'} from Ghana's ${year} ${dataSource} report data:\n\n${insurerSummaries}\n\nProvide a comprehensive but concise analysis.`;

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
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate analysis" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    // Try to parse the JSON from the response
    let analysis;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      // If JSON parsing fails, return a structured response from the text
      analysis = {
        summary: content.slice(0, 300),
        insights: [content],
        leader: null,
        risks: [],
        opportunities: [],
      };
    }

    return new Response(
      JSON.stringify({ analysis }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-insurers:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
