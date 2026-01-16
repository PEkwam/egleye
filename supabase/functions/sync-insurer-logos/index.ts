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

    // If no insurers in DB, return early with message
    if (!insurers || insurers.length === 0) {
      console.log('No insurers in database. Please sync insurers first.');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No insurers found in database. Please sync insurers first using the "Sync Insurers" button.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const insurersToProcess = insurers;

    
    console.log(`Processing ${insurersToProcess.length} insurers for logos`);
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

      // Check if we already have a manually uploaded logo (from storage)
      const { data: existingFiles } = await supabase.storage
        .from('insurer-logos')
        .list('', { search: insurer.insurer_id });
      
      const hasUploadedLogo = existingFiles && existingFiles.length > 0;
      
      if (hasUploadedLogo) {
        // Get the public URL of the existing uploaded logo
        const existingFile = existingFiles[0];
        const { data: publicUrl } = supabase.storage
          .from('insurer-logos')
          .getPublicUrl(existingFile.name);
        
        // Update the insurers table if needed
        await supabase
          .from('insurers')
          .update({ logo_url: publicUrl.publicUrl })
          .eq('insurer_id', insurer.insurer_id);
        
        console.log(`Skipping ${insurer.short_name} - using existing uploaded logo`);
        results.skipped++;
        results.details.push({ insurer: insurer.short_name, status: 'has_uploaded_logo', source: 'storage' });
        continue;
      }

      // Check if we already have a verified logo in insurer_logos table
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
          results.details.push({ insurer: insurer.short_name, status: 'recently_verified', source: existingLogo.source });
          continue;
        }
      }

      // Try sources in order: Clearbit > Website > Google
      let logoResult: { data: ArrayBuffer; contentType: string } | null = null;
      let source: 'clearbit' | 'google' | 'website' = 'clearbit';

      // Also try alternative domains for common corporate sites
      const domainsToTry = [domain];
      if (domain.includes('enterprisegroup')) {
        domainsToTry.push('enterpriselife.com.gh');
      }

      for (const tryDomain of domainsToTry) {
        logoResult = await fetchLogoFromSource(tryDomain, 'clearbit');
        if (logoResult) break;
        
        source = 'website';
        logoResult = await fetchLogoFromSource(tryDomain, 'website');
        if (logoResult) break;
        
        source = 'google';
        logoResult = await fetchLogoFromSource(tryDomain, 'google');
        if (logoResult) break;
      }

      if (!logoResult) {
        console.log(`No logo found for ${insurer.short_name} - manual upload required`);
        results.failed++;
        results.details.push({ insurer: insurer.short_name, status: 'no_logo_found_manual_upload_needed' });
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
    
    // Provide helpful message about manual uploads
    const failedInsurerNames = results.details
      .filter(d => d.status === 'no_logo_found_manual_upload_needed')
      .map(d => d.insurer)
      .slice(0, 5);
    
    let message = `Logo sync complete: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`;
    if (failedInsurerNames.length > 0) {
      message += `. Manual upload needed for: ${failedInsurerNames.join(', ')}${results.failed > 5 ? '...' : ''}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message,
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
