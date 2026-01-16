import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PensionFundData {
  fund_id: string;
  fund_name: string;
  fund_type: string;
  fund_manager: string | null;
  trustee_name: string | null;
  report_year: number;
  report_quarter: number | null;
  aum: number | null;
  market_share: number | null;
  investment_return: number | null;
  total_contributors: number | null;
  total_contributions: number | null;
  total_benefits_paid: number | null;
  equity_allocation: number | null;
  fixed_income_allocation: number | null;
  money_market_allocation: number | null;
  report_source: string;
}

// Known pension funds from NPRA reports
const KNOWN_PENSION_FUNDS = [
  // Tier 1 - SSNIT
  { id: 'ssnit', name: 'SSNIT', type: 'Tier 1', manager: 'SSNIT' },
  
  // Tier 2 Schemes (OPS)
  { id: 'enterprise-trustees-t2', name: 'Enterprise Trustees Limited', type: 'Tier 2 OPS', manager: 'Enterprise Trustees' },
  { id: 'glico-pensions-t2', name: 'GLICO Pensions Trustee', type: 'Tier 2 OPS', manager: 'GLICO Pensions' },
  { id: 'pat-t2', name: 'Pensions Alliance Trust', type: 'Tier 2 OPS', manager: 'PAT' },
  { id: 'petra-trust-t2', name: 'Petra Trust Company', type: 'Tier 2 OPS', manager: 'Petra Trust' },
  { id: 'axis-pension-t2', name: 'Axis Pension Trust', type: 'Tier 2 OPS', manager: 'Axis Pensions' },
  { id: 'metropolitan-pensions-t2', name: 'Metropolitan Pensions Trust', type: 'Tier 2 OPS', manager: 'Metropolitan' },
  { id: 'old-mutual-pensions-t2', name: 'Old Mutual Pension Trust', type: 'Tier 2 OPS', manager: 'Old Mutual' },
  { id: 'ecobank-pensions-t2', name: 'Ecobank Pension Custody', type: 'Tier 2 OPS', manager: 'Ecobank' },
  { id: 'stanbic-pensions-t2', name: 'Stanbic IBTC Pension', type: 'Tier 2 OPS', manager: 'Stanbic' },
  { id: 'first-pension-t2', name: 'First Pension Trust', type: 'Tier 2 OPS', manager: 'First Pension' },
  { id: 'dalex-pensions-t2', name: 'Dalex Swift Pensions', type: 'Tier 2 OPS', manager: 'Dalex' },
  { id: 'negotiated-benefits-t2', name: 'Negotiated Benefits Trust', type: 'Tier 2 OPS', manager: 'NBT' },
  
  // Tier 3 Schemes (Provident/Personal Pension)
  { id: 'enterprise-trustees-t3', name: 'Enterprise Trustees T3 Scheme', type: 'Tier 3', manager: 'Enterprise Trustees' },
  { id: 'glico-pensions-t3', name: 'GLICO Personal Pension', type: 'Tier 3', manager: 'GLICO Pensions' },
  { id: 'pat-t3', name: 'PAT Personal Pension', type: 'Tier 3', manager: 'PAT' },
  { id: 'petra-trust-t3', name: 'Petra Provident Fund', type: 'Tier 3', manager: 'Petra Trust' },
  { id: 'axis-pension-t3', name: 'Axis Personal Pension', type: 'Tier 3', manager: 'Axis Pensions' },
];

// Scrape NPRA reports page using Firecrawl
async function scrapeNPRAReports(): Promise<any> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.log('Firecrawl API key not available');
    return null;
  }

  try {
    console.log('Scraping NPRA annual reports page...');
    
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.npra.gov.gh/npra-publications/annual-report/',
        formats: ['markdown', 'links'],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      console.error('Firecrawl scrape failed:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('NPRA page scraped successfully');
    return data;
  } catch (error) {
    console.error('Error scraping NPRA:', error);
    return null;
  }
}

// Parse pension data from scraped content
function parsePensionData(markdown: string, links: string[]): PensionFundData[] {
  const pensionData: PensionFundData[] = [];
  const currentYear = new Date().getFullYear();
  
  // Extract years from report links
  const yearPattern = /(\d{4})/g;
  const reportYears = new Set<number>();
  
  links.forEach(link => {
    const matches = link.match(yearPattern);
    if (matches) {
      matches.forEach(match => {
        const year = parseInt(match);
        if (year >= 2018 && year <= currentYear) {
          reportYears.add(year);
        }
      });
    }
  });

  console.log(`Found reports for years: ${Array.from(reportYears).join(', ')}`);

  // Generate sample data structure based on known pension funds
  // In production, this would parse actual PDF data
  KNOWN_PENSION_FUNDS.forEach(fund => {
    reportYears.forEach(year => {
      // Generate quarterly data for each year
      [1, 2, 3, 4].forEach(quarter => {
        if (year === currentYear && quarter > Math.ceil((new Date().getMonth() + 1) / 3)) {
          return; // Skip future quarters
        }

        pensionData.push({
          fund_id: `${fund.id}-${year}-q${quarter}`,
          fund_name: fund.name,
          fund_type: fund.type,
          fund_manager: fund.manager,
          trustee_name: fund.manager,
          report_year: year,
          report_quarter: quarter,
          aum: null, // Would be extracted from actual reports
          market_share: null,
          investment_return: null,
          total_contributors: null,
          total_contributions: null,
          total_benefits_paid: null,
          equity_allocation: null,
          fixed_income_allocation: null,
          money_market_allocation: null,
          report_source: 'https://www.npra.gov.gh/npra-publications/annual-report/',
        });
      });
    });
  });

  return pensionData;
}

// Search for NPRA pension news and data
async function searchNPRANews(): Promise<any[]> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    return [];
  }

  const searchQueries = [
    'NPRA Ghana pension fund AUM assets 2024',
    'Ghana tier 2 pension scheme contributors',
    'NPRA annual report pension statistics',
    'Ghana pension fund returns performance',
  ];

  const allResults: any[] = [];

  for (const query of searchQueries) {
    try {
      console.log(`Searching: ${query}`);
      
      const response = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: 5,
          lang: 'en',
          country: 'GH',
          scrapeOptions: {
            formats: ['markdown'],
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          allResults.push(...data.data);
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Search error for "${query}":`, error);
    }
  }

  return allResults;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting NPRA data scrape...');

    // Scrape NPRA reports page
    const npraData = await scrapeNPRAReports();
    
    // Search for additional NPRA news
    const newsResults = await searchNPRANews();

    let reportLinks: string[] = [];
    let markdown = '';

    if (npraData?.success && npraData?.data) {
      markdown = npraData.data.markdown || '';
      reportLinks = npraData.data.links || [];
      console.log(`Found ${reportLinks.length} links on NPRA page`);
    }

    // Parse pension fund structure
    const pensionFundStructure = parsePensionData(markdown, reportLinks);
    console.log(`Parsed ${pensionFundStructure.length} pension fund records`);

    // Store report links for reference
    const reportData = {
      scraped_at: new Date().toISOString(),
      source: 'https://www.npra.gov.gh/npra-publications/annual-report/',
      report_links: reportLinks.filter(link => 
        link.includes('annual') || link.includes('report') || link.includes('.pdf')
      ),
      fund_structure: KNOWN_PENSION_FUNDS,
      news_items: newsResults.length,
    };

    // Insert news articles found about NPRA/pensions
    const newsArticles = newsResults
      .filter(item => item.title && item.url)
      .map(item => ({
        title: item.title?.slice(0, 500) || 'NPRA Pension News',
        description: item.description?.slice(0, 500) || null,
        content: item.markdown || null,
        source_url: item.url,
        source_name: 'NPRA/Firecrawl',
        image_url: null,
        category: 'pensions',
        is_featured: false,
        published_at: new Date().toISOString(),
      }));

    if (newsArticles.length > 0) {
      const { error: insertError } = await supabase
        .from('news_articles')
        .upsert(newsArticles, {
          onConflict: 'source_url',
          ignoreDuplicates: true,
        });

      if (insertError) {
        console.error('Error inserting news:', insertError);
      } else {
        console.log(`Inserted ${newsArticles.length} pension news articles`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scraped NPRA data successfully`,
        data: {
          reportLinks: reportLinks.length,
          newsArticles: newsArticles.length,
          fundStructure: KNOWN_PENSION_FUNDS.length,
          reportData,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping NPRA:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape NPRA data',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
