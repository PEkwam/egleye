import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Known establishment years for Ghana insurers from NIC Annual Reports and public records
// Source: NIC Annual Reports 2022, 2023 - Corporate Information sections
// IDs match the insurer_id values in insurer_metrics table
const INSURER_ESTABLISHMENT_YEARS: Record<string, number> = {
  // Life Insurers - IDs from insurer_metrics table
  'enterprise': 1997,           // Enterprise Life Assurance Company Limited
  'sic': 1979,                  // SIC Life Insurance Company Limited
  'glico': 1991,                // Glico Life Insurance Company Limited
  'star': 1998,                 // StarLife Assurance Company Limited
  'oldmutualghana': 2007,       // Old Mutual Assurance Ghana Limited
  'prudentialghana': 2014,      // Prudential Life Insurance Ghana
  'metropolitanghana': 2007,    // Metropolitan Life Insurance Ghana Limited
  'quality': 1996,              // Quality Life Assurance Company Limited
  'sanlamallianzghana': 2019,   // SanlamAllianz Life Insurance Ghana Limited
  'first': 1996,                // First Insurance Company Limited
  'mi': 2019,                   // MiLife Insurance Company Limited
  'pinnacleghana': 2008,        // Pinnacle Life Insurance Ghana Limited
  'impactcompany': 2017,        // Impact Life Assurance Company
  'donewell': 2008,             // Donewell Life Insurance Company Limited
  'sanlamallainz': 2019,        // Sanlam Allainz Company Limited
};

// Non-Life Insurers establishment years (for nonlife_insurer_metrics table)
const NONLIFE_ESTABLISHMENT_YEARS: Record<string, number> = {
  'enterprise-insurance': 1924, // Enterprise Insurance Ltd - oldest in Ghana
  'sic-insurance': 1962,        // SIC Insurance PLC
  'glico-general': 1991,        // Glico General Insurance Ltd
  'star-assurance': 1983,       // Star Assurance Limited Company
  'vanguard-assurance': 1995,   // Vanguard Assurance Company Limited
  'hollard-insurance': 2010,    // Hollard Insurance Ghana Ltd
  'prime-insurance': 1987,      // Prime Insurance Company Limited
  'phoenix-insurance': 1970,    // Phoenix Insurance Company Limited
  'ghana-union': 1969,          // Ghana Union Assurance Ltd
  'unique-insurance': 1996,     // Unique Insurance Company Limited
  'quality-insurance': 1996,    // Quality Insurance Company Limited
  'millennium-insurance': 2000, // Millennium Insurance Company Limited
  'loyalty-insurance': 2011,    // Loyalty Insurance Company Limited
  'priority-insurance': 1999,   // Priority Insurance Ltd
  'provident-insurance': 1980,  // Provident Insurance Company Limited
  'donewell-insurance': 1992,   // Donewell Insurance Ltd
  'bedrock-insurance': 2012,    // Bedrock Insurance Company Limited
  'best-assurance': 2005,       // Best Assurance Company Limited
  'activa-insurance': 2008,     // Activa International Insurance Company-Ghana Limited
  'coronation-insurance': 2013, // Coronation Insurance Ghana Ltd
  'nsia-insurance': 2016,       // NSIA Insurance Company Limited
  'regency-nem': 2009,          // Regency Nem Insurance Ghana Limited
  'sanlam-allianz-general': 2019, // Sanlam Allianz General Insurance Ghana Ltd
  'serene-insurance': 2013,     // Serene Insurance Company
  'sunu-assurances': 2016,      // SUNU Assurances Ghana Ltd
  'imperial-general': 2015,     // Imperial General Assurance Company Limited
};

// Pension Trustees establishment years (for pension_fund_metrics table)
const PENSION_ESTABLISHMENT_YEARS: Record<string, number> = {
  'enterprise-trustees-t2': 2010,  // Enterprise Trustees Limited
  'enterprise-trustees-t3': 2010,  // Enterprise Trustees T3 Scheme
  'ssnit-tier1': 1972,             // Social Security & National Insurance Trust
  'glico-pensions-t2': 2010,       // GLICO Pensions Trustee Company
  'glico-pensions-t3': 2010,       // GLICO Personal Pension
  'metropolitan-pensions-t2': 2011, // Metropolitan Pensions Trust
  'old-mutual-pensions-t2': 2011,  // Old Mutual Pension Trust Ghana
  'petra-trust-t2': 2011,          // Petra Trust Company Limited
  'petra-trust-t3': 2011,          // Petra Provident Fund
  'pensions-alliance-t2': 2011,    // Pensions Alliance Trust Ghana
  'pat-t3': 2011,                  // PAT Personal Pension
  'axis-pension-t2': 2012,         // Axis Pension Trust
  'axis-pension-t3': 2012,         // Axis Personal Pension
  'first-pension-t2': 2012,        // First Pension Trust Ghana
  'negotiated-benefits-t2': 2012,  // Negotiated Benefits Trust Ghana
  'ecobank-pensions-t2': 2011,     // Ecobank Pension Custody Ghana
  'stanbic-pensions-t2': 2012,     // Stanbic IBTC Pension
  'dalex-pensions-t2': 2014,       // Dalex Swift Pensions
};

// Calculate years in Ghana from establishment year
function calculateYearsInGhana(establishmentYear: number): number {
  const currentYear = new Date().getFullYear();
  return currentYear - establishmentYear;
}

// Attempt to scrape NIC for additional establishment info
async function scrapeNICEstablishmentData(): Promise<Record<string, number>> {
  const scrapedData: Record<string, number> = {};
  
  try {
    console.log('Attempting to scrape NIC licensed entities page...');
    
    // Try the NIC website for any additional data
    const response = await fetch('https://www.nicgh.org/licensed-entities/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });
    
    if (!response.ok) {
      console.log(`NIC website returned ${response.status}`);
      return scrapedData;
    }
    
    const html = await response.text();
    console.log(`Fetched ${html.length} bytes from NIC website`);
    
    // Try to find any year mentions near company names
    // Pattern: Look for "(established YYYY)" or "since YYYY" or "founded YYYY"
    const yearPatterns = [
      /([A-Za-z\s]+(?:Insurance|Assurance|Life)[^)]*)\s*\((?:est\.?|established|since|founded)\s*(\d{4})\)/gi,
      /([A-Za-z\s]+(?:Insurance|Assurance|Life)[^,]*),?\s*(?:established|since|founded)\s*(?:in\s*)?(\d{4})/gi,
    ];
    
    for (const pattern of yearPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const companyName = match[1].trim().toLowerCase();
        const year = parseInt(match[2], 10);
        
        if (year >= 1900 && year <= new Date().getFullYear()) {
          // Try to match to our insurer IDs
          for (const [id, _] of Object.entries(INSURER_ESTABLISHMENT_YEARS)) {
            if (companyName.includes(id.replace(/-/g, ' ')) || 
                companyName.includes(id.replace(/-/g, ''))) {
              scrapedData[id] = year;
              console.log(`Found establishment year for ${id}: ${year}`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error scraping NIC:', error);
  }
  
  return scrapedData;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting insurer years sync...');
    
    // Try to scrape for any new data (but handle SSL errors gracefully)
    let scrapedYears: Record<string, number> = {};
    try {
      scrapedYears = await scrapeNICEstablishmentData();
    } catch (e) {
      console.log('Scraping failed, using hardcoded data:', e);
    }
    
    // Merge scraped data with known data
    const allLifeYears = { ...INSURER_ESTABLISHMENT_YEARS, ...scrapedYears };
    
    const results = {
      life_updated: 0,
      nonlife_updated: 0,
      pension_updated: 0,
      skipped: 0,
      details: [] as { table: string; id: string; years_in_ghana: number }[],
    };
    
    // === UPDATE LIFE INSURERS (insurer_metrics table) ===
    console.log('Processing life insurers...');
    const { data: lifeMetrics } = await supabase
      .from('insurer_metrics')
      .select('id, insurer_id, years_in_ghana');
    
    for (const [insurerId, establishmentYear] of Object.entries(allLifeYears)) {
      const yearsInGhana = calculateYearsInGhana(establishmentYear);
      const found = lifeMetrics?.filter(m => m.insurer_id === insurerId) || [];
      
      if (found.length > 0) {
        const { error } = await supabase
          .from('insurer_metrics')
          .update({ years_in_ghana: yearsInGhana })
          .eq('insurer_id', insurerId);
        
        if (!error) {
          results.life_updated++;
          results.details.push({ table: 'insurer_metrics', id: insurerId, years_in_ghana: yearsInGhana });
          console.log(`Life: Updated ${insurerId} with ${yearsInGhana} years`);
        }
      }
    }
    
    // === UPDATE NON-LIFE INSURERS (nonlife_insurer_metrics table) ===
    console.log('Processing non-life insurers...');
    const { data: nonLifeMetrics } = await supabase
      .from('nonlife_insurer_metrics')
      .select('id, insurer_id, years_in_ghana');
    
    for (const [insurerId, establishmentYear] of Object.entries(NONLIFE_ESTABLISHMENT_YEARS)) {
      const yearsInGhana = calculateYearsInGhana(establishmentYear);
      const found = nonLifeMetrics?.filter(m => 
        m.insurer_id === insurerId || 
        m.insurer_id.toLowerCase().includes(insurerId.split('-')[0])
      ) || [];
      
      if (found.length > 0) {
        for (const record of found) {
          const { error } = await supabase
            .from('nonlife_insurer_metrics')
            .update({ years_in_ghana: yearsInGhana })
            .eq('id', record.id);
          
          if (!error) {
            results.nonlife_updated++;
            results.details.push({ table: 'nonlife_insurer_metrics', id: record.insurer_id, years_in_ghana: yearsInGhana });
          }
        }
        console.log(`Non-Life: Updated ${insurerId} with ${yearsInGhana} years`);
      }
    }
    
    // === UPDATE PENSION FUNDS (pension_fund_metrics table) ===
    console.log('Processing pension funds...');
    const { data: pensionMetrics } = await supabase
      .from('pension_fund_metrics')
      .select('id, fund_id, fund_name, years_in_ghana');
    
    for (const [fundId, establishmentYear] of Object.entries(PENSION_ESTABLISHMENT_YEARS)) {
      const yearsInGhana = calculateYearsInGhana(establishmentYear);
      const found = pensionMetrics?.filter(m => 
        m.fund_id === fundId || 
        m.fund_name.toLowerCase().includes(fundId.split('-')[0])
      ) || [];
      
      if (found.length > 0) {
        for (const record of found) {
          const { error } = await supabase
            .from('pension_fund_metrics')
            .update({ years_in_ghana: yearsInGhana })
            .eq('id', record.id);
          
          if (!error) {
            results.pension_updated++;
            results.details.push({ table: 'pension_fund_metrics', id: record.fund_id, years_in_ghana: yearsInGhana });
          }
        }
        console.log(`Pension: Updated ${fundId} with ${yearsInGhana} years`);
      }
    }
    
    console.log('Sync completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${results.life_updated} life, ${results.nonlife_updated} non-life, ${results.pension_updated} pension records with years_in_ghana`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scrape-insurer-years:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
