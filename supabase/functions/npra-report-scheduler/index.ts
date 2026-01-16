import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NPRA_ANNUAL_REPORT_URL = 'https://www.npra.gov.gh/npra-publications/annual-report/';

// Check NPRA website for new annual reports
async function checkNPRAWebsite(firecrawlKey: string | undefined): Promise<{
  hasNewReport: boolean;
  reportYear: number | null;
  reportLinks: string[];
  lastChecked: string;
}> {
  const currentYear = new Date().getFullYear();
  
  // Try to scrape NPRA page with Firecrawl if available
  if (firecrawlKey) {
    try {
      console.log('Checking NPRA website with Firecrawl...');
      
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: NPRA_ANNUAL_REPORT_URL,
          formats: ['markdown', 'links'],
          onlyMainContent: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const links = data?.data?.links || [];
        const markdown = data?.data?.markdown || '';
        
        // Look for 2024 or current year annual reports
        const pdfLinks = links.filter((link: string) => 
          (link.includes('.pdf') || link.includes('annual')) &&
          (link.includes('2024') || link.includes('2025') || link.includes(currentYear.toString()))
        );
        
        // Check markdown content for report years
        const yearMatches = markdown.match(/20(2[4-9])\s*(Annual|Report)/gi);
        const hasRecentReport = yearMatches && yearMatches.length > 0;
        
        console.log(`Found ${pdfLinks.length} potential report links`);
        
        return {
          hasNewReport: pdfLinks.length > 0 || hasRecentReport,
          reportYear: hasRecentReport ? currentYear : (pdfLinks.length > 0 ? 2024 : null),
          reportLinks: pdfLinks.slice(0, 10),
          lastChecked: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('Firecrawl scrape error:', error);
    }
  }
  
  // Fallback: Direct fetch
  try {
    console.log('Checking NPRA website directly...');
    
    const response = await fetch(NPRA_ANNUAL_REPORT_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GhanaInsureWatch/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return {
        hasNewReport: false,
        reportYear: null,
        reportLinks: [],
        lastChecked: new Date().toISOString(),
      };
    }

    const html = await response.text();
    
    // Look for recent annual report links
    const linkPattern = /href="([^"]*(?:2024|2025)[^"]*(?:\.pdf|annual)[^"]*)"/gi;
    const matches = [...html.matchAll(linkPattern)];
    const reportLinks = matches.map(m => m[1]).slice(0, 10);
    
    // Check for 2024 or later reports
    const has2024OrLater = html.includes('2024') && 
      (html.toLowerCase().includes('annual report') || html.includes('.pdf'));

    return {
      hasNewReport: has2024OrLater || reportLinks.length > 0,
      reportYear: reportLinks.length > 0 ? 2024 : null,
      reportLinks,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Direct fetch error:', error);
    return {
      hasNewReport: false,
      reportYear: null,
      reportLinks: [],
      lastChecked: new Date().toISOString(),
    };
  }
}

// Get latest pension data in database
async function getLatestPensionData(supabase: any): Promise<{ year: number } | null> {
  const { data, error } = await supabase
    .from('pension_fund_metrics')
    .select('report_year')
    .order('report_year', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return { year: data[0].report_year };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const currentYear = new Date().getFullYear();
    
    // Get current data status
    const latestInDB = await getLatestPensionData(supabase);
    console.log(`Latest pension data in DB: ${latestInDB ? latestInDB.year : 'None'}`);

    // Check NPRA website for new reports
    const websiteCheck = await checkNPRAWebsite(firecrawlKey);
    console.log(`NPRA Website Check Result:`, JSON.stringify(websiteCheck));

    // Determine if we need updates (looking for 2024 onwards)
    const needsUpdate = !latestInDB || latestInDB.year < 2024 || 
      (websiteCheck.reportYear && websiteCheck.reportYear > (latestInDB?.year || 0));

    if (websiteCheck.hasNewReport && needsUpdate) {
      // Create a notification news article
      const { error: insertError } = await supabase
        .from('news_articles')
        .upsert({
          title: `NPRA ${websiteCheck.reportYear || currentYear} Annual Pension Report Available`,
          description: `The National Pensions Regulatory Authority has published their annual pension industry report. Updated pension fund data is now available for analysis.`,
          source_url: NPRA_ANNUAL_REPORT_URL,
          source_name: 'NPRA Ghana',
          category: 'pensions',
          is_featured: true,
          published_at: new Date().toISOString(),
        }, {
          onConflict: 'source_url',
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error('Error inserting news article:', insertError);
      } else {
        console.log('Created news article for new NPRA report');
      }
    }

    return new Response(
      JSON.stringify({
        status: websiteCheck.hasNewReport ? 'new_report_available' : 'up_to_date',
        message: websiteCheck.hasNewReport 
          ? `New NPRA annual report detected for ${websiteCheck.reportYear || 'recent year'}`
          : 'No new annual report detected',
        currentData: latestInDB,
        websiteCheck,
        actionRequired: websiteCheck.hasNewReport && needsUpdate
          ? 'Visit /data-admin to review and import pension data from the new report' 
          : null,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in NPRA report scheduler:', error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        status: 'error',
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
