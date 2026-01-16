import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// NIC Report URLs to check
const NIC_REPORT_URLS = {
  life: 'https://nicgh.org/procurement-notices/market-matrix-report/',
  nonLife: 'https://nicgh.org/procurement-notices/market-matrix-report/',
  brokers: 'https://nicgh.org/procurement-notices/market-matrix-report/',
};

// Expected quarters based on current date
function getExpectedQuarter(): { year: number; quarter: number } {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  // Reports are typically released 1-2 months after quarter end
  // Q1 (Jan-Mar) -> Released May-Jun
  // Q2 (Apr-Jun) -> Released Aug-Sep
  // Q3 (Jul-Sep) -> Released Nov-Dec
  // Q4 (Oct-Dec) -> Released Feb-Mar next year
  
  if (currentMonth >= 2 && currentMonth <= 4) {
    return { year: currentYear - 1, quarter: 4 };
  } else if (currentMonth >= 5 && currentMonth <= 7) {
    return { year: currentYear, quarter: 1 };
  } else if (currentMonth >= 8 && currentMonth <= 10) {
    return { year: currentYear, quarter: 2 };
  } else {
    return { year: currentYear, quarter: 3 };
  }
}

async function checkNICPortal(): Promise<{
  hasNewReport: boolean;
  reportDetails: string | null;
  lastChecked: string;
}> {
  try {
    console.log('Checking NIC portal for new quarterly reports...');
    
    const response = await fetch(NIC_REPORT_URLS.life, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GhanaInsureWatch/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch NIC portal: ${response.status}`);
      return {
        hasNewReport: false,
        reportDetails: null,
        lastChecked: new Date().toISOString(),
      };
    }

    const html = await response.text();
    
    // Check for quarterly report links
    const expected = getExpectedQuarter();
    const quarterPatterns = [
      `Q${expected.quarter}.*${expected.year}`,
      `Quarter.*${expected.quarter}.*${expected.year}`,
      `${expected.year}.*Q${expected.quarter}`,
      `${expected.year}.*Quarter.*${expected.quarter}`,
    ];

    let hasNewReport = false;
    let reportDetails = null;

    for (const pattern of quarterPatterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(html)) {
        hasNewReport = true;
        reportDetails = `NIC ${expected.year} Q${expected.quarter} report detected`;
        console.log(`Found report matching pattern: ${pattern}`);
        break;
      }
    }

    // Also check for Excel/PDF download links
    const excelPattern = /href="([^"]*\.(xlsx|xls|pdf)[^"]*)"/gi;
    const matches = html.matchAll(excelPattern);
    const recentLinks: string[] = [];
    
    for (const match of matches) {
      if (match[1].toLowerCase().includes('market') || 
          match[1].toLowerCase().includes('quarter') ||
          match[1].toLowerCase().includes('life') ||
          match[1].toLowerCase().includes('non-life')) {
        recentLinks.push(match[1]);
      }
    }

    if (recentLinks.length > 0) {
      console.log(`Found ${recentLinks.length} potential report links`);
    }

    return {
      hasNewReport,
      reportDetails,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error checking NIC portal:', error);
    return {
      hasNewReport: false,
      reportDetails: null,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function getLatestDataInDB(supabase: any): Promise<{ year: number; quarter: number } | null> {
  const { data, error } = await supabase
    .from('insurer_metrics')
    .select('report_year, report_quarter')
    .order('report_year', { ascending: false })
    .order('report_quarter', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return {
    year: data[0].report_year,
    quarter: data[0].report_quarter,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current data status
    const latestInDB = await getLatestDataInDB(supabase);
    const expected = getExpectedQuarter();
    
    console.log(`Latest data in DB: ${latestInDB ? `${latestInDB.year} Q${latestInDB.quarter}` : 'None'}`);
    console.log(`Expected latest report: ${expected.year} Q${expected.quarter}`);

    // Check if we need new data
    const needsUpdate = !latestInDB || 
      latestInDB.year < expected.year || 
      (latestInDB.year === expected.year && latestInDB.quarter < expected.quarter);

    if (!needsUpdate) {
      console.log('Database is up to date with expected quarterly data');
      return new Response(
        JSON.stringify({
          status: 'up_to_date',
          message: 'Database already has the latest expected quarterly data',
          currentData: latestInDB,
          expectedData: expected,
          lastChecked: new Date().toISOString(),
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check NIC portal for new reports
    const portalCheck = await checkNICPortal();

    // Log the check result
    console.log(`NIC Portal Check Result: ${JSON.stringify(portalCheck)}`);

    // Create notification if new report detected
    if (portalCheck.hasNewReport) {
      // Insert a news article about the new report
      const { error: insertError } = await supabase
        .from('news_articles')
        .upsert({
          title: `NIC Releases ${expected.year} Q${expected.quarter} Insurance Market Report`,
          description: `The National Insurance Commission has released the quarterly market report for ${expected.year} Q${expected.quarter}. New industry data is now available for analysis.`,
          source_url: NIC_REPORT_URLS.life,
          source_name: 'NIC Ghana',
          category: 'regulator',
          is_featured: true,
          published_at: new Date().toISOString(),
        }, {
          onConflict: 'source_url',
          ignoreDuplicates: true,
        });

      if (insertError) {
        console.error('Error inserting news article:', insertError);
      } else {
        console.log('Created news article for new NIC report');
      }
    }

    return new Response(
      JSON.stringify({
        status: portalCheck.hasNewReport ? 'new_report_available' : 'checking',
        message: portalCheck.hasNewReport 
          ? `New NIC report detected: ${portalCheck.reportDetails}`
          : 'No new quarterly report detected yet',
        currentData: latestInDB,
        expectedData: expected,
        portalCheck,
        actionRequired: portalCheck.hasNewReport 
          ? 'Visit /data-admin to upload the new quarterly data' 
          : 'Will check again on next run',
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in NIC report scheduler:', error);
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