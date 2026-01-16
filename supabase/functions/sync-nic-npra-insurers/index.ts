import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InsurerInfo {
  insurer_id: string;
  name: string;
  short_name: string;
  category: 'life' | 'motor' | 'pension';
  website: string;
  keywords: string[];
  brand_color: string;
  license_number?: string;
  license_status?: string;
}

// Complete and updated list of Ghana insurers from NIC and NPRA
// This serves as the master list - can be updated via scraping or manual updates
const NIC_LIFE_INSURERS: InsurerInfo[] = [
  { insurer_id: 'aster-life', name: 'Aster Life Ghana Limited', short_name: 'Aster Life', category: 'life', website: 'https://www.gnlifeassurance.com', keywords: ['aster life', 'gn life'], brand_color: '#27AE60' },
  { insurer_id: 'beige-assure', name: 'Beige Assure Company', short_name: 'Beige Assure', category: 'life', website: 'https://www.beigeassure.com', keywords: ['beige assure', 'beige'], brand_color: '#C4A35A' },
  { insurer_id: 'enterprise-life', name: 'Enterprise Life Assurance Ltd', short_name: 'Enterprise Life', category: 'life', website: 'https://www.enterprisegroup.com.gh', keywords: ['enterprise life', 'ela', 'enterprise assurance'], brand_color: '#006633' },
  { insurer_id: 'first-insurance', name: 'First Insurance Company Limited', short_name: 'First Insurance', category: 'life', website: 'https://www.firstinsurance.net', keywords: ['first insurance', 'first life'], brand_color: '#1565C0' },
  { insurer_id: 'glico-life', name: 'GLICO Life Insurance Ltd', short_name: 'GLICO Life', category: 'life', website: 'https://www.glicolife.com', keywords: ['glico life', 'glico'], brand_color: '#1E3A5F' },
  { insurer_id: 'hollard-life', name: 'Hollard Life Assurance Ghana Ltd', short_name: 'Hollard Life', category: 'life', website: 'https://www.hollard.com.gh', keywords: ['hollard life'], brand_color: '#E31837' },
  { insurer_id: 'impact-life', name: 'Impact Life Insurance Limited Company', short_name: 'Impact Life', category: 'life', website: 'https://www.impactlife.com.gh', keywords: ['impact life', 'impact insurance'], brand_color: '#D35400' },
  { insurer_id: 'metropolitan-life', name: 'Metropolitan Life Insurance Ghana Ltd', short_name: 'Metropolitan Life', category: 'life', website: 'https://www.metropolitan.com.gh', keywords: ['metropolitan', 'metlife ghana'], brand_color: '#003399' },
  { insurer_id: 'milife', name: 'MiLife Company Limited', short_name: 'MiLife', category: 'life', website: 'https://www.milifeghana.com', keywords: ['milife', 'mi life'], brand_color: '#FF6B35' },
  { insurer_id: 'old-mutual-life', name: 'Old Mutual Life Assurance Company (Ghana) Limited', short_name: 'Old Mutual Life', category: 'life', website: 'https://www.oldmutual.com.gh', keywords: ['old mutual', 'old mutual life'], brand_color: '#00594C' },
  { insurer_id: 'pinnacle-life', name: 'Pinnacle Life Insurance Company Limited', short_name: 'Pinnacle Life', category: 'life', website: 'https://www.pinnaclelife.com.gh', keywords: ['pinnacle life', 'donewell life'], brand_color: '#1B4F72' },
  { insurer_id: 'prudential-life', name: 'Prudential Life Insurance Ghana', short_name: 'Prudential Life', category: 'life', website: 'https://www.prudential.com.gh', keywords: ['prudential', 'prudential life'], brand_color: '#ED1C24' },
  { insurer_id: 'quality-life', name: 'Quality Life Assurance Company Limited', short_name: 'Quality Life', category: 'life', website: 'https://www.qlacgh.com', keywords: ['quality life', 'qlac'], brand_color: '#8E44AD' },
  { insurer_id: 'sanlam-allianz-life', name: 'Sanlam Allianz Life Insurance Ghana Ltd', short_name: 'Sanlam Allianz Life', category: 'life', website: 'https://www.gh.sanlam.com', keywords: ['sanlam allianz life', 'sanlam life'], brand_color: '#00A651' },
  { insurer_id: 'sic-life', name: 'SIC Life Company Ltd', short_name: 'SIC Life', category: 'life', website: 'https://www.siclife-gh.com', keywords: ['sic life', 'state insurance life'], brand_color: '#004A8F' },
  { insurer_id: 'starlife', name: 'StarLife Assurance Company Limited', short_name: 'StarLife', category: 'life', website: 'https://www.starlife.com.gh', keywords: ['starlife', 'star life'], brand_color: '#FFD700' },
  { insurer_id: 'vanguard-life', name: 'Vanguard Life Assurance Company Limited', short_name: 'Vanguard Life', category: 'life', website: 'https://www.vanguardlife.com', keywords: ['vanguard life', 'vanguard'], brand_color: '#2E86AB' },
];

const NIC_NONLIFE_INSURERS: InsurerInfo[] = [
  { insurer_id: 'activa-insurance', name: 'Activa International Insurance Company-Ghana Limited', short_name: 'Activa Insurance', category: 'motor', website: 'https://www.activa-ghana.com', keywords: ['activa insurance', 'activa'], brand_color: '#27AE60' },
  { insurer_id: 'bedrock-insurance', name: 'Bedrock Insurance Company Limited', short_name: 'Bedrock Insurance', category: 'motor', website: 'https://www.bedrockinsurancegh.com', keywords: ['bedrock insurance', 'bedrock'], brand_color: '#795548' },
  { insurer_id: 'best-assurance', name: 'Best Assurance Company Limited', short_name: 'Best Assurance', category: 'motor', website: 'https://www.bestassurance.com.gh', keywords: ['best assurance', 'best insurance'], brand_color: '#D35400' },
  { insurer_id: 'coronation-insurance', name: 'Coronation Insurance Ghana Ltd', short_name: 'Coronation Insurance', category: 'motor', website: 'https://www.wapic.com/gh', keywords: ['coronation', 'wapic'], brand_color: '#6A1B9A' },
  { insurer_id: 'donewell-insurance', name: 'Donewell Insurance Ltd', short_name: 'Donewell Insurance', category: 'motor', website: 'https://www.donewellinsurance.com', keywords: ['donewell insurance', 'donewell'], brand_color: '#1B4F72' },
  { insurer_id: 'enterprise-insurance', name: 'Enterprise Insurance Ltd', short_name: 'Enterprise Insurance', category: 'motor', website: 'https://www.enterprisegroup.com.gh', keywords: ['enterprise insurance', 'eic'], brand_color: '#006633' },
  { insurer_id: 'ghana-union', name: 'Ghana Union Assurance Ltd', short_name: 'Ghana Union', category: 'motor', website: 'https://www.ghanaunionassurancecompany.com', keywords: ['ghana union', 'gua'], brand_color: '#00695C' },
  { insurer_id: 'glico-general', name: 'Glico General Insurance Ltd', short_name: 'Glico General', category: 'motor', website: 'https://www.glicogeneral.com', keywords: ['glico general', 'glico insurance'], brand_color: '#1E3A5F' },
  { insurer_id: 'hollard-insurance', name: 'Hollard Insurance Ghana Ltd', short_name: 'Hollard Insurance', category: 'motor', website: 'https://www.hollard.com.gh', keywords: ['hollard', 'hollard insurance'], brand_color: '#E31837' },
  { insurer_id: 'imperial-general', name: 'Imperial General Assurance Company Limited', short_name: 'Imperial General', category: 'motor', website: 'https://www.imperialgeneral.com', keywords: ['imperial general', 'imperial'], brand_color: '#1976D2' },
  { insurer_id: 'loyalty-insurance', name: 'Loyalty Insurance Company Limited', short_name: 'Loyalty Insurance', category: 'motor', website: 'https://www.loyaltyinsurancegh.com', keywords: ['loyalty insurance', 'loyalty'], brand_color: '#2980B9' },
  { insurer_id: 'millennium-insurance', name: 'Millennium Insurance Company Limited', short_name: 'Millennium Insurance', category: 'motor', website: 'https://www.millenniuminsurance.com.gh', keywords: ['millennium insurance', 'millennium'], brand_color: '#16A085' },
  { insurer_id: 'nsia-insurance', name: 'NSIA Insurance Company Limited', short_name: 'NSIA Insurance', category: 'motor', website: 'https://www.nsiainsurance.com.gh', keywords: ['nsia insurance', 'nsia'], brand_color: '#E65100' },
  { insurer_id: 'phoenix-insurance', name: 'Phoenix Insurance Company Limited', short_name: 'Phoenix Insurance', category: 'motor', website: 'https://www.phoenixghana.com', keywords: ['phoenix insurance', 'phoenix'], brand_color: '#FF6600' },
  { insurer_id: 'prime-insurance', name: 'Prime Insurance Company Limited', short_name: 'Prime Insurance', category: 'motor', website: 'https://www.primeinsuranceghana.com', keywords: ['prime insurance', 'prime'], brand_color: '#4A148C' },
  { insurer_id: 'priority-insurance', name: 'Priority Insurance Ltd', short_name: 'Priority Insurance', category: 'motor', website: 'https://www.priorityinsurance.com.gh', keywords: ['priority insurance', 'priority'], brand_color: '#C0392B' },
  { insurer_id: 'provident-insurance', name: 'Provident Insurance Company Limited', short_name: 'Provident Insurance', category: 'motor', website: 'https://www.provident-gh.com', keywords: ['provident insurance', 'provident'], brand_color: '#00838F' },
  { insurer_id: 'quality-insurance', name: 'Quality Insurance Company Limited', short_name: 'Quality Insurance', category: 'motor', website: 'https://www.qicghana.com', keywords: ['quality insurance', 'qic'], brand_color: '#C62828' },
  { insurer_id: 'regency-nem', name: 'Regency Nem Insurance Ghana Limited', short_name: 'Regency NEM', category: 'motor', website: 'https://www.regencynem.com', keywords: ['regency nem', 'regency insurance'], brand_color: '#8B0000' },
  { insurer_id: 'sanlam-allianz-general', name: 'Sanlam Allianz General Insurance Ghana Ltd', short_name: 'Sanlam Allianz General', category: 'motor', website: 'https://www.gh.sanlam.com', keywords: ['sanlam allianz', 'sanlam general'], brand_color: '#003781' },
  { insurer_id: 'serene-insurance', name: 'Serene Insurance Company', short_name: 'Serene Insurance', category: 'motor', website: 'https://www.sereneinsurance.com', keywords: ['serene insurance'], brand_color: '#9B59B6' },
  { insurer_id: 'sic-insurance', name: 'SIC Insurance PLC', short_name: 'SIC Insurance', category: 'motor', website: 'https://www.sic-gh.com', keywords: ['sic insurance', 'state insurance'], brand_color: '#004A8F' },
  { insurer_id: 'star-assurance', name: 'Star Assurance Limited Company', short_name: 'Star Assurance', category: 'motor', website: 'https://www.starassurance.com', keywords: ['star assurance', 'star insurance'], brand_color: '#FFD700' },
  { insurer_id: 'sunu-assurances', name: 'SUNU Assurances Ghana Ltd', short_name: 'SUNU Assurances', category: 'motor', website: 'https://www.sunu-group.com', keywords: ['sunu', 'sunu assurances'], brand_color: '#FF5722' },
  { insurer_id: 'unique-insurance', name: 'Unique Insurance Company Limited', short_name: 'Unique Insurance', category: 'motor', website: 'https://www.uicghana.org', keywords: ['unique insurance', 'uic'], brand_color: '#16A085' },
  { insurer_id: 'vanguard-assurance', name: 'Vanguard Assurance Company Limited', short_name: 'Vanguard Assurance', category: 'motor', website: 'https://www.vanguardassurance.com', keywords: ['vanguard assurance', 'vanguard'], brand_color: '#2E86AB' },
];

const NPRA_PENSION_PROVIDERS: InsurerInfo[] = [
  { insurer_id: 'axis-pensions', name: 'Axis Pension Trust', short_name: 'Axis Pensions', category: 'pension', website: 'https://www.axispensiontrust.com', keywords: ['axis pension', 'axis trust'], brand_color: '#C62828' },
  { insurer_id: 'dalex-pensions', name: 'Dalex Finance & Pensions', short_name: 'Dalex Pensions', category: 'pension', website: 'https://www.dalexfinance.com', keywords: ['dalex pensions', 'dalex finance'], brand_color: '#E65100' },
  { insurer_id: 'ecobank-pensions', name: 'Ecobank Pension Custody Ghana', short_name: 'Ecobank Pensions', category: 'pension', website: 'https://www.ecobank.com', keywords: ['ecobank pensions', 'ecobank pension'], brand_color: '#003399' },
  { insurer_id: 'enterprise-trustees', name: 'Enterprise Trustees Limited', short_name: 'Enterprise Trustees', category: 'pension', website: 'https://www.enterprisetrustees.com.gh', keywords: ['enterprise trustees', 'etl', 'enterprise pension'], brand_color: '#006633' },
  { insurer_id: 'first-pension', name: 'First Pension Trust Ghana', short_name: 'First Pension', category: 'pension', website: 'https://www.firstpensiontrust.com', keywords: ['first pension', 'first pension trust'], brand_color: '#4A148C' },
  { insurer_id: 'glico-pensions', name: 'GLICO Pensions Trustee Company', short_name: 'GLICO Pensions', category: 'pension', website: 'https://www.glicopensions.com', keywords: ['glico pensions', 'glico pension'], brand_color: '#1E3A5F' },
  { insurer_id: 'metropolitan-pensions', name: 'Metropolitan Pensions Trust', short_name: 'Metropolitan Pensions', category: 'pension', website: 'https://www.metropolitan.com.gh', keywords: ['metropolitan pensions'], brand_color: '#00A651' },
  { insurer_id: 'npra', name: 'National Pensions Regulatory Authority', short_name: 'NPRA', category: 'pension', website: 'https://www.npra.gov.gh', keywords: ['npra', 'national pensions', 'pensions regulator'], brand_color: '#1976D2' },
  { insurer_id: 'negotiated-benefits', name: 'Negotiated Benefits Trust Ghana', short_name: 'NBT Ghana', category: 'pension', website: 'https://www.nbt.com.gh', keywords: ['negotiated benefits', 'nbt'], brand_color: '#00695C' },
  { insurer_id: 'old-mutual-pensions', name: 'Old Mutual Pension Trust Ghana', short_name: 'Old Mutual Pensions', category: 'pension', website: 'https://www.oldmutual.com.gh', keywords: ['old mutual pensions', 'old mutual pension'], brand_color: '#00594C' },
  { insurer_id: 'pensions-alliance', name: 'Pensions Alliance Trust Ghana', short_name: 'PAT Ghana', category: 'pension', website: 'https://www.pensionsalliance.com.gh', keywords: ['pensions alliance', 'pat', 'alliance trust'], brand_color: '#2E7D32' },
  { insurer_id: 'petra-trust', name: 'Petra Trust Company Limited', short_name: 'Petra Trust', category: 'pension', website: 'https://www.petratrust.com', keywords: ['petra trust', 'petra'], brand_color: '#6A1B9A' },
  { insurer_id: 'ssnit', name: 'Social Security & National Insurance Trust', short_name: 'SSNIT', category: 'pension', website: 'https://www.ssnit.org.gh', keywords: ['ssnit', 'social security'], brand_color: '#0277BD' },
  { insurer_id: 'stanbic-pensions', name: 'Stanbic Pension Managers Ghana', short_name: 'Stanbic Pensions', category: 'pension', website: 'https://www.stanbicbank.com.gh', keywords: ['stanbic pensions', 'stanbic pension'], brand_color: '#0033A0' },
  { insurer_id: 'united-pensions', name: 'United Pensions Trustees Ghana', short_name: 'United Pensions', category: 'pension', website: 'https://www.unitedpensions.com.gh', keywords: ['united pensions', 'unitrust'], brand_color: '#1565C0' },
];

// Try to scrape NIC website for updated insurer list
async function scrapeNICInsurers(): Promise<{ life: string[]; nonlife: string[] } | null> {
  try {
    console.log('Attempting to scrape NIC website...');
    
    // Try to fetch the NIC licensed insurers page
    const response = await fetch('https://www.nicgh.org/licensed-entities/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GhanaInsureWatch/1.0)',
      },
    });
    
    if (!response.ok) {
      console.log(`NIC website returned ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Extract insurer names from HTML (basic parsing)
    const lifeMatch = html.match(/life\s*insurance[^<]*<[^>]*>([\s\S]*?)<\/(?:table|div|section)/i);
    const nonlifeMatch = html.match(/non-life|general\s*insurance[^<]*<[^>]*>([\s\S]*?)<\/(?:table|div|section)/i);
    
    // This is a simplified extraction - in production, you'd use a proper HTML parser
    const extractNames = (section: string | null): string[] => {
      if (!section) return [];
      const names: string[] = [];
      const nameRegex = /(?:company|ltd|limited|assurance|insurance)[^<]{0,50}/gi;
      const matches = section.match(nameRegex);
      if (matches) {
        matches.forEach(m => {
          const cleaned = m.trim().replace(/[<>]/g, '');
          if (cleaned.length > 5) names.push(cleaned);
        });
      }
      return names;
    };
    
    return {
      life: extractNames(lifeMatch?.[1] || null),
      nonlife: extractNames(nonlifeMatch?.[1] || null),
    };
  } catch (error) {
    console.error('Error scraping NIC:', error);
    return null;
  }
}

// Try to scrape NPRA website for pension trustees
async function scrapeNPRATrustees(): Promise<string[] | null> {
  try {
    console.log('Attempting to scrape NPRA website...');
    
    const response = await fetch('https://www.npra.gov.gh/licensed-corporate-trustees/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GhanaInsureWatch/1.0)',
      },
    });
    
    if (!response.ok) {
      console.log(`NPRA website returned ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Extract trustee names
    const trusteeNames: string[] = [];
    const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
    
    if (tableMatch) {
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const rows = tableMatch[1].match(rowRegex) || [];
      
      rows.forEach(row => {
        const cellMatch = row.match(/<td[^>]*>([^<]+)<\/td>/i);
        if (cellMatch && cellMatch[1].length > 3) {
          trusteeNames.push(cellMatch[1].trim());
        }
      });
    }
    
    return trusteeNames.length > 0 ? trusteeNames : null;
  } catch (error) {
    console.error('Error scraping NPRA:', error);
    return null;
  }
}

// Detect name changes by comparing existing vs new data
function detectNameChanges(
  existing: { insurer_id: string; name: string }[],
  updated: InsurerInfo[]
): { insurer_id: string; old_name: string; new_name: string }[] {
  const changes: { insurer_id: string; old_name: string; new_name: string }[] = [];
  
  for (const updatedInsurer of updated) {
    const existingInsurer = existing.find(e => e.insurer_id === updatedInsurer.insurer_id);
    if (existingInsurer && existingInsurer.name !== updatedInsurer.name) {
      changes.push({
        insurer_id: updatedInsurer.insurer_id,
        old_name: existingInsurer.name,
        new_name: updatedInsurer.name,
      });
    }
  }
  
  return changes;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting NIC/NPRA insurer sync...');

    const results = {
      scraped: {
        nic_life: null as string[] | null,
        nic_nonlife: null as string[] | null,
        npra: null as string[] | null,
      },
      existing_count: 0,
      updated_count: 0,
      inserted_count: 0,
      name_changes: [] as { insurer_id: string; old_name: string; new_name: string }[],
      new_insurers: [] as string[],
    };

    // Try to scrape websites (may fail, that's ok)
    const nicData = await scrapeNICInsurers();
    const npraData = await scrapeNPRATrustees();
    
    if (nicData) {
      results.scraped.nic_life = nicData.life;
      results.scraped.nic_nonlife = nicData.nonlife;
      console.log(`Scraped ${nicData.life.length} life, ${nicData.nonlife.length} non-life from NIC`);
    }
    
    if (npraData) {
      results.scraped.npra = npraData;
      console.log(`Scraped ${npraData.length} trustees from NPRA`);
    }

    // Get existing insurers
    const { data: existingInsurers } = await supabase
      .from('insurers')
      .select('insurer_id, name');

    results.existing_count = existingInsurers?.length || 0;

    // Combine all master data
    const allInsurers = [...NIC_LIFE_INSURERS, ...NIC_NONLIFE_INSURERS, ...NPRA_PENSION_PROVIDERS];
    
    // Detect name changes
    if (existingInsurers && existingInsurers.length > 0) {
      results.name_changes = detectNameChanges(existingInsurers, allInsurers);
      
      for (const change of results.name_changes) {
        console.log(`Name change detected: ${change.old_name} -> ${change.new_name}`);
      }
    }

    // Upsert all insurers
    for (const insurer of allInsurers) {
      const { data: existing } = await supabase
        .from('insurers')
        .select('id')
        .eq('insurer_id', insurer.insurer_id)
        .single();

      const { error } = await supabase
        .from('insurers')
        .upsert({
          insurer_id: insurer.insurer_id,
          name: insurer.name,
          short_name: insurer.short_name,
          category: insurer.category,
          website: insurer.website,
          keywords: insurer.keywords,
          brand_color: insurer.brand_color,
          license_status: 'active',
          last_verified_at: new Date().toISOString(),
        }, {
          onConflict: 'insurer_id',
        });

      if (error) {
        console.error(`Error upserting ${insurer.short_name}:`, error);
      } else if (!existing) {
        results.new_insurers.push(insurer.short_name);
        results.inserted_count++;
      } else {
        results.updated_count++;
      }
    }

    console.log(`Sync complete: ${results.inserted_count} new, ${results.updated_count} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Insurer sync complete: ${results.inserted_count} new, ${results.updated_count} updated, ${results.name_changes.length} name changes detected`,
        ...results,
        total_master_list: allInsurers.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in insurer sync:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync insurers',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
