import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Keywords that indicate non-insurance content that slipped through
const NON_INSURANCE_INDICATORS = [
  // Politics
  'member of parliament', 'mp for', 'constituency', 'election results', 'polling station',
  'electoral commission', 'political party', 'npp ', 'ndc ', 'speaker of parliament',
  // Entertainment
  'stonebwoy', 'shatta wale', 'sarkodie', 'movie premiere', 'music video', 'new album',
  'celebrity', 'showbiz', 'entertainment news', 'big brother', 'reality show',
  // Sports
  'black stars', 'afcon', 'ghana premier league', 'football match', 'soccer',
  'olympics', 'world cup qualifier',
  // Classifieds
  'for sale', 'buy now', 'apartment for rent', 'house for sale', 'land for sale',
  'job vacancy', 'hiring', 'we are recruiting', 'job listing', 'career opportunity',
  // Foreign (non-Ghana)
  'nigerian banks', 'nigeria recapitalization', 'kenya insurance', 'south africa insurance',
  'uganda orders', 'uganda shutdown', 'rwanda job',
  // Irrelevant
  'traffic lights', 'traffic junction', 'road accident', 'graduation ceremony',
  'sim card restrictions', 'internet shutdown',
];

// Insurance keywords - articles must contain at least one
const INSURANCE_KEYWORDS = [
  'insurance', 'insurer', 'assurance', 'underwriting', 'premium', 'claims', 'claim',
  'coverage', 'indemnity', 'reinsurance', 'actuarial', 'policyholder', 'policy',
  'life insurance', 'motor insurance', 'health insurance', 'pension', 'pensions',
  'ssnit', 'npra', 'nic', 'national insurance commission', 'trustee',
  'enterprise life', 'enterprise insurance', 'enterprise group', 'enterprise trustees',
  'starlife', 'glico', 'prudential', 'hollard', 'sic insurance', 'old mutual',
  'allianz', 'star assurance', 'broker', 'bancassurance', 'microinsurance',
  'solvency', 'claims ratio', 'loss ratio', 'risk-based capital',
];

function isNonInsurance(title: string, description: string | null): boolean {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  // Check if it contains non-insurance indicators
  const hasNonInsurance = NON_INSURANCE_INDICATORS.some(k => text.includes(k));
  if (!hasNonInsurance) return false;
  
  // Even if it has non-insurance indicators, keep it if it's strongly insurance-related
  const insuranceScore = INSURANCE_KEYWORDS.filter(k => text.includes(k)).length;
  return insuranceScore < 2; // Need at least 2 insurance keywords to override
}

function hasCorruptedContent(title: string, description: string | null): boolean {
  const text = `${title} ${description || ''}`;
  // Check for raw HTML entities or tags in visible content
  const hasRawHtml = /&lt;[a-z]/i.test(text) || /&amp;lt;/i.test(text);
  const hasRawUrl = /href=["']?https?:\/\//i.test(text);
  return hasRawHtml || hasRawUrl;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch dynamic exclude keywords from settings
    const { data: settings } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'news_exclude_keywords')
      .maybeSingle();

    const extraExcludes = settings?.setting_value
      ? settings.setting_value.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean)
      : [];

    const allExcludes = [...NON_INSURANCE_INDICATORS, ...extraExcludes];

    // Fetch all articles in batches
    let deletedCount = 0;
    let cleanedCount = 0;
    let offset = 0;
    const batchSize = 500;

    while (true) {
      const { data: articles, error } = await supabase
        .from('news_articles')
        .select('id, title, description')
        .range(offset, offset + batchSize - 1)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching articles:', error);
        break;
      }

      if (!articles || articles.length === 0) break;

      const idsToDelete: string[] = [];

      for (const article of articles) {
        const text = `${article.title} ${article.description || ''}`.toLowerCase();
        
        // Check against all exclude keywords
        const isExcluded = allExcludes.some(k => text.includes(k));
        const insuranceScore = INSURANCE_KEYWORDS.filter(k => text.includes(k)).length;
        
        // Delete if excluded and not strongly insurance-related
        if (isExcluded && insuranceScore < 2) {
          idsToDelete.push(article.id);
          continue;
        }

        // Delete if has no insurance keywords at all
        if (insuranceScore === 0) {
          idsToDelete.push(article.id);
          continue;
        }

        // Delete if content is corrupted (raw HTML)
        if (hasCorruptedContent(article.title, article.description)) {
          idsToDelete.push(article.id);
          continue;
        }
      }

      if (idsToDelete.length > 0) {
        // Delete in sub-batches of 100
        for (let i = 0; i < idsToDelete.length; i += 100) {
          const batch = idsToDelete.slice(i, i + 100);
          const { error: deleteError } = await supabase
            .from('news_articles')
            .delete()
            .in('id', batch);

          if (deleteError) {
            console.error('Error deleting articles:', deleteError);
          } else {
            deletedCount += batch.length;
          }
        }
      }

      cleanedCount += articles.length;
      
      if (articles.length < batchSize) break;
      offset += batchSize;
    }

    console.log(`News cleanup complete: scanned ${cleanedCount}, deleted ${deletedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned ${deletedCount} non-insurance articles from ${cleanedCount} total`,
        scanned: cleanedCount,
        deleted: deletedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in news cleanup:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clean news',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
