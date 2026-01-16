import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InsurerData {
  insurer_id: string;
  name: string;
  short_name: string;
  website: string;
  brand_color: string;
}

// Try to fetch logo from various sources
async function fetchLogoFromSource(
  domain: string,
  source: 'clearbit' | 'google' | 'website'
): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  try {
    let url: string;
    
    switch (source) {
      case 'clearbit':
        url = `https://logo.clearbit.com/${domain}`;
        break;
      case 'google':
        url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        break;
      case 'website':
        // Try to fetch favicon directly from website
        url = `https://${domain}/favicon.ico`;
        break;
    }
    
    console.log(`Trying ${source}: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GhanaInsureWatch/1.0)',
      },
    });
    
    if (!response.ok) {
      console.log(`${source} failed: ${response.status}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/png';
    
    // Check if it's actually an image
    if (!contentType.includes('image')) {
      console.log(`${source} returned non-image: ${contentType}`);
      return null;
    }
    
    const data = await response.arrayBuffer();
    
    // Check if we got actual content (not empty or too small)
    if (data.byteLength < 100) {
      console.log(`${source} returned too small file: ${data.byteLength} bytes`);
      return null;
    }
    
    console.log(`${source} success: ${data.byteLength} bytes, ${contentType}`);
    return { data, contentType };
  } catch (error) {
    console.error(`Error fetching from ${source}:`, error);
    return null;
  }
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

// Get file extension from content type
function getExtension(contentType: string): string {
  if (contentType.includes('svg')) return 'svg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('ico')) return 'ico';
  return 'png'; // default
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all insurers
    const { data: insurers, error: fetchError } = await supabase
      .from('insurers')
      .select('insurer_id, name, short_name, website, brand_color')
      .eq('is_active', true);

    if (fetchError) {
      // If table is empty, use static data
      console.log('No insurers in database, using static list');
    }

    // Static insurer list as fallback
    const staticInsurers: InsurerData[] = [
      // Life insurers
      { insurer_id: 'enterprise-life', name: 'Enterprise Life Assurance Ltd', short_name: 'Enterprise Life', website: 'https://www.enterprisegroup.com.gh', brand_color: '#006633' },
      { insurer_id: 'starlife', name: 'StarLife Assurance Company Limited', short_name: 'StarLife', website: 'https://www.starlife.com.gh', brand_color: '#FFD700' },
      { insurer_id: 'glico-life', name: 'GLICO Life Insurance Ltd', short_name: 'GLICO Life', website: 'https://www.glicolife.com', brand_color: '#1E3A5F' },
      { insurer_id: 'prudential-life', name: 'Prudential Life Insurance Ghana', short_name: 'Prudential Life', website: 'https://www.prudential.com.gh', brand_color: '#ED1C24' },
      { insurer_id: 'sic-life', name: 'SIC Life Company Ltd', short_name: 'SIC Life', website: 'https://www.siclife-gh.com', brand_color: '#004A8F' },
      { insurer_id: 'hollard-life', name: 'Hollard Life Assurance Ghana Ltd', short_name: 'Hollard Life', website: 'https://www.hollard.com.gh', brand_color: '#E31837' },
      { insurer_id: 'old-mutual-life', name: 'Old Mutual Life Assurance Company (Ghana) Limited', short_name: 'Old Mutual Life', website: 'https://www.oldmutual.com.gh', brand_color: '#00594C' },
      // Motor insurers
      { insurer_id: 'enterprise-insurance', name: 'Enterprise Insurance Ltd', short_name: 'Enterprise Insurance', website: 'https://www.enterprisegroup.com.gh', brand_color: '#006633' },
      { insurer_id: 'sic-insurance', name: 'SIC Insurance PLC', short_name: 'SIC Insurance', website: 'https://www.sic-gh.com', brand_color: '#004A8F' },
      { insurer_id: 'hollard-insurance', name: 'Hollard Insurance Ghana Ltd', short_name: 'Hollard Insurance', website: 'https://www.hollard.com.gh', brand_color: '#E31837' },
      { insurer_id: 'star-assurance', name: 'Star Assurance Limited Company', short_name: 'Star Assurance', website: 'https://www.starassurance.com', brand_color: '#FFD700' },
      { insurer_id: 'glico-general', name: 'Glico General Insurance Ltd', short_name: 'Glico General', website: 'https://www.glicogeneral.com', brand_color: '#1E3A5F' },
      // Pension
      { insurer_id: 'enterprise-trustees', name: 'Enterprise Trustees Limited', short_name: 'Enterprise Trustees', website: 'https://www.enterprisetrustees.com.gh', brand_color: '#006633' },
      { insurer_id: 'ssnit', name: 'Social Security & National Insurance Trust', short_name: 'SSNIT', website: 'https://www.ssnit.org.gh', brand_color: '#0277BD' },
      { insurer_id: 'npra', name: 'National Pensions Regulatory Authority', short_name: 'NPRA', website: 'https://www.npra.gov.gh', brand_color: '#1976D2' },
    ];

    const insurersToProcess = insurers && insurers.length > 0 ? insurers : staticInsurers;
    
    console.log(`Processing ${insurersToProcess.length} insurers for logos`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [] as { insurer: string; status: string; source?: string }[],
    };

    for (const insurer of insurersToProcess) {
      results.processed++;
      const domain = extractDomain(insurer.website);
      
      console.log(`\nProcessing: ${insurer.short_name} (${domain})`);

      // Check if we already have a verified logo
      const { data: existingLogo } = await supabase
        .from('insurer_logos')
        .select('*')
        .eq('insurer_id', insurer.insurer_id)
        .eq('is_verified', true)
        .single();

      if (existingLogo) {
        // Check if logo was verified within last 7 days
        const lastChecked = new Date(existingLogo.last_checked_at);
        const daysSinceCheck = (Date.now() - lastChecked.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceCheck < 7) {
          console.log(`Skipping ${insurer.short_name} - verified ${daysSinceCheck.toFixed(1)} days ago`);
          results.skipped++;
          results.details.push({ insurer: insurer.short_name, status: 'skipped', source: existingLogo.source });
          continue;
        }
      }

      // Try sources in order: Clearbit > Website > Google
      let logoResult: { data: ArrayBuffer; contentType: string } | null = null;
      let source: 'clearbit' | 'google' | 'website' = 'clearbit';

      logoResult = await fetchLogoFromSource(domain, 'clearbit');
      if (!logoResult) {
        source = 'website';
        logoResult = await fetchLogoFromSource(domain, 'website');
      }
      if (!logoResult) {
        source = 'google';
        logoResult = await fetchLogoFromSource(domain, 'google');
      }

      if (!logoResult) {
        console.log(`No logo found for ${insurer.short_name}`);
        results.failed++;
        results.details.push({ insurer: insurer.short_name, status: 'no_logo_found' });
        continue;
      }

      // Upload to storage
      const extension = getExtension(logoResult.contentType);
      const filePath = `${insurer.insurer_id}.${extension}`;
      
      const { error: uploadError } = await supabase.storage
        .from('insurer-logos')
        .upload(filePath, logoResult.data, {
          contentType: logoResult.contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error(`Upload failed for ${insurer.short_name}:`, uploadError);
        results.failed++;
        results.details.push({ insurer: insurer.short_name, status: 'upload_failed' });
        continue;
      }

      // Get public URL
      const { data: publicUrl } = supabase.storage
        .from('insurer-logos')
        .getPublicUrl(filePath);

      // Upsert to insurer_logos table
      const { error: upsertError } = await supabase
        .from('insurer_logos')
        .upsert({
          insurer_id: insurer.insurer_id,
          logo_url: publicUrl.publicUrl,
          source,
          is_verified: true,
          last_checked_at: new Date().toISOString(),
        }, {
          onConflict: 'insurer_id,source',
        });

      if (upsertError) {
        console.error(`DB upsert failed for ${insurer.short_name}:`, upsertError);
        results.failed++;
        results.details.push({ insurer: insurer.short_name, status: 'db_update_failed' });
        continue;
      }

      // Update main insurers table if it exists
      await supabase
        .from('insurers')
        .update({ logo_url: publicUrl.publicUrl })
        .eq('insurer_id', insurer.insurer_id);

      console.log(`✓ ${insurer.short_name} logo saved from ${source}`);
      results.successful++;
      results.details.push({ insurer: insurer.short_name, status: 'success', source });

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\nLogo sync complete: ${results.successful}/${results.processed} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Logo sync complete: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`,
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in logo sync:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync logos',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
