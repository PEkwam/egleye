import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsArticle {
  title: string;
  description: string | null;
  content: string | null;
  source_url: string;
  source_name: string | null;
  image_url: string | null;
  category: string;
  is_featured: boolean;
  published_at: string;
}

// Ghana-specific keywords for filtering - COMPREHENSIVE
const DEFAULT_GHANA_KEYWORDS = [
  // Country & cities
  'ghana', 'accra', 'kumasi', 'tema', 'takoradi', 'cape coast',
  // Regulatory
  'nic', 'nicgh', 'national insurance commission', 'npra', 'national pensions',
  // Enterprise Group - Full coverage
  'enterprise group', 'enterprise life', 'enterprise insurance', 'eic', 'egl', 'etl',
  'acacia health', 'acacia insurance', 'enterprise trustees', 'enterprise properties',
  'enterprise funeral', 'transitions ghana', 'transitions funeral', 'funeral people',
  'enterprise life gambia', 'enterprise life nigeria', 'enterprise property',
  // Life Insurance Companies
  'sic insurance', 'sic life', 'sic ghana', 'starlife', 'star life', 'glico life', 'glico insurance',
  'prudential ghana', 'prudential life ghana', 'metropolitan life ghana', 'metropolitan insurance',
  'hollard ghana', 'hollard life', 'hollard insurance', 'old mutual ghana', 'old mutual life',
  'saham life ghana', 'saham ghana', 'beige assure', 'donewell life', 'donewell insurance',
  'vanguard life', 'vanguard assurance', 'quality life', 'quality insurance', 'activa life', 'activa insurance',
  // Non-Life Insurance Companies
  'allianz ghana', 'star assurance', 'phoenix insurance ghana', 'priority insurance ghana',
  'unique insurance ghana', 'millennium insurance ghana', 'regency alliance ghana',
  'loyalty insurance ghana', 'best assurance ghana',
  // Pension & Trustees
  'ssnit', 'social security ghana', 'pensions alliance trust', 'petra trust', 'axis pension',
  'negotiated benefits trust', 'dalex pensions', 'ecobank pensions', 'stanbic pensions',
  'first pension trust', 'metropolitan pensions',
  // Currency & local media
  'cedis', 'ghc', 'cedi', 'gna.org.gh', 'myjoyonline', 'graphic.com.gh', 'citinewsroom',
  'pulse.com.gh', 'peacefmonline', '3news.com', 'adomonline', 'classfmonline', 'ghanaweb',
  'ghanainsurancehub'
];

// BLOCKED DOMAINS - Classified ads, property listings, irrelevant sources
const BLOCKED_DOMAINS = [
  'jiji.com.gh', 'jiji.ng', 'jiji.co', 'tonaton.com', 'olx.com.gh',
  'meqasa.com', 'jumia.com.gh', 'ghanapropertycentre.com', 'propertypro.ng',
  'propertygh.com', 'realestate.com.gh', 'lamudi.com.gh', 'cars45.com.gh',
  'cheki.com.gh', 'carmudi.com.gh', 'facebook.com', 'twitter.com', 'instagram.com',
  'linkedin.com', 'youtube.com', 'tiktok.com', 'pinterest.com',
  'apps.apple.com', 'play.google.com', 'rwandajob.com', 'nigeriajob.com',
  'jobgurus.com', 'jobberman.com', 'glassdoor.com', 'indeed.com',
  'wikipedia.org', 'investopedia.com', 'quora.com', 'reddit.com',
];

// DEFAULT BLOCKED KEYWORDS - Irrelevant content (used as fallback)
const DEFAULT_BLOCKED_KEYWORDS = [
  // Classifieds and commerce
  'for sale', 'buy now', 'apartment for rent', 'house for sale', 'land for sale',
  'property for sale', 'car for sale', 'job vacancy', 'hiring', 'we are recruiting',
  'classified', 'buy and sell', 'second hand', 'used car', 'room for rent',
  'office space', 'warehouse for rent', 'shop for rent', 'furnished apartment',
  'job listing', 'career opportunity', 'vacancy', 'recruitment', 'cvs',
  'app store', 'google play', 'download app',
  // Foreign insurance (not Ghana)
  'nigerian banks', 'nigeria recapitalization', 'nigeria deadline', 'rwanda job', 
  'kenya insurance', 'south africa insurance', 'zambia insurance', 'tanzania insurance',
  'uganda orders', 'uganda shutdown', 'uganda election',
  // Non-insurance content
  'traffic lights', 'traffic junction', 'road accident', 'stonebwoy', 'afcon performance',
  'afcon match', 'black stars', 'parliament speaker', 'speaker of parliament',
  'assembly member', 'constituency', 'member of parliament', 'mp for',
  'election results', 'polling station', 'electoral commission',
  'fake party', 'political party', 'npp', 'ndc', 'cpp', 'pnp',
  'frimpong-boateng', 'frimpong boateng', 'congregation', 'graduation ceremony',
  'students graduate', 'university graduation', 'sim card restrictions',
  'internet shutdown', 'football', 'soccer match', 'celebrity', 'showbiz',
  'entertainment news', 'music video', 'new album', 'movie premiere',
];

// DEFAULT INSURANCE-SPECIFIC KEYWORDS - Article must contain at least one (used as fallback)
const DEFAULT_INSURANCE_KEYWORDS = [
  // Core insurance terms
  'insurance', 'insurer', 'insurers', 'insured', 'assurance', 'underwriting', 'underwriter',
  'policy', 'policies', 'policyholder', 'premium', 'premiums', 'claims', 'claim',
  'coverage', 'indemnity', 'reinsurance', 'actuarial', 'actuary',
  // Life insurance
  'life insurance', 'life assurance', 'term life', 'whole life', 'endowment',
  'annuity', 'annuities', 'death benefit', 'beneficiary', 'surrender value',
  // Non-life / General insurance
  'motor insurance', 'car insurance', 'vehicle insurance', 'third party',
  'comprehensive cover', 'fire insurance', 'property insurance', 'marine insurance',
  'liability insurance', 'travel insurance', 'health insurance',
  // Pensions & related
  'pension', 'pensions', 'pensioner', 'retirement', 'ssnit', 'npra', 'trustee', 'trustees',
  'provident fund', 'gratuity', 'tier 1', 'tier 2', 'tier 3',
  // Regulatory
  'nic', 'national insurance commission', 'regulator', 'regulatory', 'solvency',
  'capital adequacy', 'risk-based capital', 'compliance', 'license', 'licensed',
  // Industry terms
  'broker', 'brokerage', 'agent', 'bancassurance', 'microinsurance',
  'claims ratio', 'loss ratio', 'expense ratio', 'combined ratio',
  // Ghana-specific insurers
  'enterprise life', 'enterprise insurance', 'enterprise group', 'enterprise trustees',
  'enterprise properties', 'enterprise property', 'enterprise funeral', 'transitions funeral',
  'funeral people', 'acacia health',
  'sic life', 'sic insurance', 'starlife', 'star life', 'star assurance',
  'glico', 'prudential', 'metropolitan life', 'hollard', 'old mutual',
  'allianz', 'petra trust', 'axis pension', 'dalex pension', 'pensions alliance',
  'quality life', 'vanguard assurance', 'donewell',
];

// ============ RSS FEEDS - LOCAL GHANA NEWS SOURCES ============

// LOCAL GHANA NEWS SOURCES - Direct RSS feeds (Primary source - no external API needed)
const LOCAL_GHANA_FEEDS = [
  // MyJoyOnline
  { url: 'https://www.myjoyonline.com/feed/', category: 'general', source: 'MyJoyOnline' },
  { url: 'https://www.myjoyonline.com/business/feed/', category: 'general', source: 'MyJoyOnline Business' },
  // Graphic Online
  { url: 'https://www.graphic.com.gh/feed', category: 'general', source: 'Graphic Online' },
  { url: 'https://www.graphic.com.gh/business/feed', category: 'general', source: 'Graphic Business' },
  // Citi Newsroom
  { url: 'https://citinewsroom.com/feed/', category: 'general', source: 'Citi Newsroom' },
  { url: 'https://citinewsroom.com/category/business/feed/', category: 'general', source: 'Citi Business' },
  // GhanaWeb
  { url: 'https://www.ghanaweb.com/GhanaHomePage/rss/rss.php', category: 'general', source: 'GhanaWeb' },
  { url: 'https://www.ghanaweb.com/GhanaHomePage/business/rss/rss.php', category: 'general', source: 'GhanaWeb Business' },
  // 3News / TV3 Ghana
  { url: 'https://3news.com/feed/', category: 'general', source: '3News' },
  // Modern Ghana
  { url: 'https://www.modernghana.com/rss/business.xml', category: 'general', source: 'Modern Ghana' },
  // B&FT Online
  { url: 'https://thebftonline.com/feed/', category: 'general', source: 'B&FT Online' },
  // Starr FM
  { url: 'https://starrfm.com.gh/feed/', category: 'general', source: 'Starr FM' },
  // Peace FM
  { url: 'https://www.peacefmonline.com/rss/rss.xml', category: 'general', source: 'Peace FM' },
  // Daily Graphic
  { url: 'https://www.graphic.com.gh/news/feed', category: 'general', source: 'Daily Graphic News' },
  // Pulse Ghana
  { url: 'https://www.pulse.com.gh/rss', category: 'general', source: 'Pulse Ghana' },
  // Ghana News Agency
  { url: 'https://www.gna.org.gh/feed/', category: 'general', source: 'Ghana News Agency' },
  // Adom Online
  { url: 'https://www.adomonline.com/feed/', category: 'general', source: 'Adom Online' },
  // Class FM
  { url: 'https://classfmonline.com/feed', category: 'general', source: 'Class FM' },
  // Ghana Business News
  { url: 'https://www.ghanabusinessnews.com/feed/', category: 'general', source: 'Ghana Business News' },
  // Ghana Insurance Hub - dedicated insurance portal
  { url: 'https://www.ghanainsurancehub.com/feed/', category: 'general', source: 'Ghana Insurance Hub' },
  { url: 'https://www.ghanainsurancehub.com/feed/rss/', category: 'general', source: 'Ghana Insurance Hub' },
];

// GOOGLE NEWS RSS FEEDS - Insurance-specific searches (No API key required!)
const GOOGLE_NEWS_RSS_FEEDS = [
  // General Ghana Insurance
  { url: 'https://news.google.com/rss/search?q=ghana+insurance&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=ghana+life+insurance&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=ghana+insurance+industry&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Google News' },
  // Specific Companies
  { url: 'https://news.google.com/rss/search?q=Enterprise+Life+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'enterprise_group', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Enterprise+Insurance+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'enterprise_group', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Enterprise+Group+Ghana+insurance&hl=en-GH&gl=GH&ceid=GH:en', category: 'enterprise_group', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Enterprise+Trustees+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'enterprise_group', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Acacia+Health+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'enterprise_group', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Enterprise+Properties+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'enterprise_group', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Transitions+Funeral+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'enterprise_group', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=SIC+Insurance+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Starlife+Insurance+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=GLICO+Ghana+insurance&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Prudential+Life+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Hollard+Insurance+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Old+Mutual+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Star+Assurance+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Metropolitan+Life+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Google News' },
  // Regulator news
  { url: 'https://news.google.com/rss/search?q=National+Insurance+Commission+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'regulator', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=NIC+Ghana+insurance&hl=en-GH&gl=GH&ceid=GH:en', category: 'regulator', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=site:nicgh.org&hl=en-GH&gl=GH&ceid=GH:en', category: 'regulator', source: 'NIC Ghana' },
  { url: 'https://news.google.com/rss/search?q=ghana+insurance+regulation&hl=en-GH&gl=GH&ceid=GH:en', category: 'regulator', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=ghana+insurance+circular+directive&hl=en-GH&gl=GH&ceid=GH:en', category: 'regulator', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=ghana+insurance+license+compliance&hl=en-GH&gl=GH&ceid=GH:en', category: 'regulator', source: 'Google News' },
  // Ghana Insurance Hub via Google News
  { url: 'https://news.google.com/rss/search?q=site:ghanainsurancehub.com&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Ghana Insurance Hub' },
  // Africa Insurance Pulse - Ghana only
  { url: 'https://news.google.com/rss/search?q=site:africainsurancepulse.com+ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Africa Insurance Pulse' },
  // Ghana Re
  { url: 'https://news.google.com/rss/search?q=site:ghanare.com&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Ghana Reinsurance' },
  // Atlas Magazine - Ghana insurance
  { url: 'https://news.google.com/rss/search?q=site:atlas-mag.net+ghana+insurance&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Atlas Magazine' },
  // Accra Street Journal insurance/risk
  { url: 'https://news.google.com/rss/search?q=site:accrastreetjournal.com+insurance&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Accra Street Journal' },
  // News Ghana insurance coverage
  { url: 'https://news.google.com/rss/search?q=site:newsghana.com.gh+insurance&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'News Ghana' },
  // African Insurance Organisation - Ghana
  { url: 'https://news.google.com/rss/search?q=site:african-insurance.org+ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'African Insurance Org' },
  // Reinsurance & broader industry - Ghana focused
  { url: 'https://news.google.com/rss/search?q=ghana+reinsurance+industry&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=ghana+insurance+broker+agent&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=ghana+microinsurance+bancassurance&hl=en-GH&gl=GH&ceid=GH:en', category: 'general', source: 'Google News' },
];

// NIC-specific RSS feeds (for nic_only mode)
const NIC_RSS_FEEDS = [
  { url: 'https://news.google.com/rss/search?q=National+Insurance+Commission+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'regulator', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=NIC+Ghana+insurance&hl=en-GH&gl=GH&ceid=GH:en', category: 'regulator', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=site:nicgh.org&hl=en-GH&gl=GH&ceid=GH:en', category: 'regulator', source: 'NIC Ghana' },
  { url: 'https://news.google.com/rss/search?q=ghana+insurance+regulation&hl=en-GH&gl=GH&ceid=GH:en', category: 'regulator', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=ghana+insurance+circular+directive&hl=en-GH&gl=GH&ceid=GH:en', category: 'regulator', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=ghana+insurance+license+compliance&hl=en-GH&gl=GH&ceid=GH:en', category: 'regulator', source: 'Google News' },
];

// Pension-specific RSS feeds
const PENSION_RSS_FEEDS = [
  { url: 'https://news.google.com/rss/search?q=ghana+pension+NPRA&hl=en-GH&gl=GH&ceid=GH:en', category: 'pensions', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=SSNIT+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'pensions', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Ghana+pension+fund&hl=en-GH&gl=GH&ceid=GH:en', category: 'pensions', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Ghana+pension+regulator+NPRA&hl=en-GH&gl=GH&ceid=GH:en', category: 'pensions', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=National+Pensions+Regulatory+Authority+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'pensions', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=site:npra.gov.gh&hl=en-GH&gl=GH&ceid=GH:en', category: 'pensions', source: 'NPRA' },
  { url: 'https://news.google.com/rss/search?q=Ghana+tier+2+pension&hl=en-GH&gl=GH&ceid=GH:en', category: 'pensions', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Ghana+tier+3+pension+provident&hl=en-GH&gl=GH&ceid=GH:en', category: 'pensions', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Enterprise+Trustees+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'pensions', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=GLICO+Pensions+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'pensions', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Pensions+Alliance+Trust+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'pensions', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Petra+Trust+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'pensions', source: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=Axis+Pension+Trust+Ghana&hl=en-GH&gl=GH&ceid=GH:en', category: 'pensions', source: 'Google News' },
];

// Fetch dynamic keywords from database
async function fetchDynamicKeywords(supabaseClient: any): Promise<{
  includeKeywords: string[];
  excludeKeywords: string[];
}> {
  try {
    const { data: settings, error } = await supabaseClient
      .from('site_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['news_include_keywords', 'news_exclude_keywords']);

    if (error) {
      console.error('Error fetching keywords from database:', error);
      return {
        includeKeywords: DEFAULT_INSURANCE_KEYWORDS,
        excludeKeywords: DEFAULT_BLOCKED_KEYWORDS,
      };
    }

    const settingsArray = settings as Array<{ setting_key: string; setting_value: string | null }> || [];
    const includeRow = settingsArray.find(s => s.setting_key === 'news_include_keywords');
    const excludeRow = settingsArray.find(s => s.setting_key === 'news_exclude_keywords');

    const includeKeywords = includeRow?.setting_value
      ? includeRow.setting_value.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean)
      : DEFAULT_INSURANCE_KEYWORDS;

    const excludeKeywords = excludeRow?.setting_value
      ? excludeRow.setting_value.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean)
      : DEFAULT_BLOCKED_KEYWORDS;

    console.log(`Loaded ${includeKeywords.length} include keywords and ${excludeKeywords.length} exclude keywords from database`);

    return { includeKeywords, excludeKeywords };
  } catch (err) {
    console.error('Error loading keywords:', err);
    return {
      includeKeywords: DEFAULT_INSURANCE_KEYWORDS,
      excludeKeywords: DEFAULT_BLOCKED_KEYWORDS,
    };
  }
}

function isGhanaRelevant(text: string): boolean {
  const lowerText = text.toLowerCase();
  return DEFAULT_GHANA_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

function isBlockedDomain(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return BLOCKED_DOMAINS.some(domain => lowerUrl.includes(domain));
}

function isBlockedContent(text: string, excludeKeywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return excludeKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

// Article should be about insurance/pensions
function isInsuranceRelated(text: string, includeKeywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return includeKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function isRegulatorNews(text: string): boolean {
  const lowerText = text.toLowerCase();
  const hasRegulatorTerm = lowerText.includes('national insurance commission') ||
         (lowerText.includes('nic') && lowerText.includes('insurance')) ||
         lowerText.includes('nicgh') ||
         (lowerText.includes('regulator') && lowerText.includes('insurance')) ||
         (lowerText.includes('circular') && lowerText.includes('insurance')) ||
         (lowerText.includes('directive') && lowerText.includes('insurance')) ||
         (lowerText.includes('compliance') && lowerText.includes('insurance')) ||
         (lowerText.includes('license') && lowerText.includes('insurance'));
  
  return hasRegulatorTerm;
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'Unknown Source';
  }
}

// Parse RSS XML using regex
function parseRSS(
  xml: string, 
  defaultCategory: string, 
  sourceName: string,
  includeKeywords: string[],
  excludeKeywords: string[]
): NewsArticle[] {
  const articles: NewsArticle[] = [];
  
  try {
    // Extract items using regex
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = xml.match(itemRegex) || [];

    items.slice(0, 15).forEach((item) => {
      // Extract title
      const titleMatch = item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';

      // Extract link
      const linkMatch = item.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const link = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';

      // Extract description
      const descMatch = item.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      let description = descMatch ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
      // Remove HTML tags from description
      description = description.replace(/<[^>]*>/g, '').slice(0, 500);

      // Extract pubDate
      const pubDateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();

      // Extract image (media:content or enclosure)
      const imageMatch = item.match(/url=["']([^"']+\.(jpg|jpeg|png|gif|webp)[^"']*)/i);
      const imageUrl = imageMatch ? imageMatch[1] : null;

      if (!title || !link) return;

      const fullText = `${title} ${description}`;
      
      // BLOCK classified ads and property sites
      if (isBlockedDomain(link)) {
        console.log(`Blocking classified/property site: ${link.slice(0, 50)}...`);
        return;
      }

      // BLOCK irrelevant content using dynamic exclude keywords
      if (isBlockedContent(fullText, excludeKeywords)) {
        console.log(`Blocking irrelevant content: ${title.slice(0, 50)}...`);
        return;
      }
      
      // STRICT: Must be insurance/pension related using dynamic include keywords
      if (!isInsuranceRelated(fullText, includeKeywords)) {
        console.log(`Skipping non-insurance article: ${title.slice(0, 50)}...`);
        return;
      }
      
      // STRICT Ghana filtering
      if (!isGhanaRelevant(fullText)) {
        console.log(`Skipping non-Ghana article: ${title.slice(0, 50)}...`);
        return;
      }

      // Determine category based on content
      let category = defaultCategory;
      const lowerText = fullText.toLowerCase();
      
      // Pension news takes priority
      if (lowerText.includes('pension') || lowerText.includes('pensioner') || 
          lowerText.includes('ssnit') || lowerText.includes('npra') ||
          lowerText.includes('tier 2') || lowerText.includes('tier 3') ||
          lowerText.includes('provident fund')) {
        category = 'pensions';
      }
      // Enterprise Group news
      else if (lowerText.includes('enterprise life') || lowerText.includes('enterprise insurance') ||
               lowerText.includes('enterprise group') || lowerText.includes('enterprise trustees') ||
               lowerText.includes('enterprise properties') || lowerText.includes('enterprise property') ||
               lowerText.includes('acacia health') || lowerText.includes('transitions funeral') ||
               lowerText.includes('funeral people') || lowerText.includes('transitions ghana') ||
               lowerText.includes('enterprise funeral')) {
        category = 'enterprise_group';
      }
      // Regulator news
      else if (isRegulatorNews(fullText)) {
        category = 'regulator';
      }

      // Format pubDate
      let formattedDate: string;
      try {
        const parsedDate = new Date(pubDate);
        formattedDate = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
      } catch {
        formattedDate = new Date().toISOString();
      }

      // Determine source name
      const finalSourceName = sourceName || extractDomain(link);

      articles.push({
        title: title.slice(0, 500),
        description: description || null,
        content: null,
        source_url: link,
        source_name: finalSourceName,
        image_url: imageUrl,
        category,
        is_featured: false,
        published_at: formattedDate,
      });
    });
  } catch (parseError) {
    console.error('Error parsing RSS:', parseError);
  }

  return articles;
}

async function fetchRSSFeed(
  feedUrl: string, 
  category: string, 
  sourceName: string,
  includeKeywords: string[],
  excludeKeywords: string[]
): Promise<NewsArticle[]> {
  try {
    console.log(`Fetching RSS: ${feedUrl.slice(0, 80)}...`);
    
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GhanaInsuranceNewsBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      console.error(`RSS fetch failed for ${sourceName}: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    return parseRSS(xml, category, sourceName, includeKeywords, excludeKeywords);
  } catch (error) {
    console.error(`Error fetching RSS from ${sourceName}:`, error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch dynamic keywords from database
    const { includeKeywords, excludeKeywords } = await fetchDynamicKeywords(supabase);

    // Check mode from query params
    const url = new URL(req.url);
    const nicOnly = url.searchParams.get('nic_only') === 'true';
    const pensionOnly = url.searchParams.get('pension_only') === 'true';

    console.log(`Starting Ghana insurance news crawl... Mode: ${nicOnly ? 'NIC-only' : pensionOnly ? 'Pension-only' : 'Full'} (RSS-only)`);
    console.log(`Using ${includeKeywords.length} include keywords and ${excludeKeywords.length} exclude keywords`);

    const allArticles: NewsArticle[] = [];
    let feedsToProcess: typeof LOCAL_GHANA_FEEDS = [];

    if (nicOnly) {
      feedsToProcess = NIC_RSS_FEEDS;
    } else if (pensionOnly) {
      feedsToProcess = PENSION_RSS_FEEDS;
    } else {
      // Full mode: All local Ghana feeds + Google News RSS feeds + Pension feeds
      feedsToProcess = [...LOCAL_GHANA_FEEDS, ...GOOGLE_NEWS_RSS_FEEDS, ...PENSION_RSS_FEEDS];
    }

    // Process RSS feeds in batches
    const batchSize = 5;
    for (let i = 0; i < feedsToProcess.length; i += batchSize) {
      const batch = feedsToProcess.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(feed => fetchRSSFeed(feed.url, feed.category, feed.source, includeKeywords, excludeKeywords))
      );
      results.forEach(articles => allArticles.push(...articles));
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < feedsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`RSS feeds found: ${allArticles.length} articles`);

    // Deduplicate by title similarity
    const seenTitles = new Set<string>();
    const uniqueArticles = allArticles.filter(article => {
      const normalizedTitle = article.title.toLowerCase().slice(0, 50);
      if (seenTitles.has(normalizedTitle)) {
        return false;
      }
      seenTitles.add(normalizedTitle);
      return true;
    });

    console.log(`Unique articles after deduplication: ${uniqueArticles.length}`);

    if (uniqueArticles.length > 0) {
      // Insert articles, ignoring duplicates (based on source_url unique constraint)
      const { data: inserted, error: insertError } = await supabase
        .from('news_articles')
        .upsert(uniqueArticles, {
          onConflict: 'source_url',
          ignoreDuplicates: true,
        })
        .select();

      if (insertError) {
        console.error('Error inserting articles:', insertError);
      } else {
        console.log(`Inserted/updated ${inserted?.length || 0} articles`);
      }
    }

    const modeLabel = nicOnly ? 'NIC-only' : pensionOnly ? 'Pension-only' : 'Full';
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Portal Successfully refreshed`,
        articlesFound: uniqueArticles.length,
        feedsProcessed: feedsToProcess.length,
        mode: modeLabel,
        sources: 'RSS only (Local Ghana feeds + Google News RSS)',
        filters: {
          includeKeywords: includeKeywords.length,
          excludeKeywords: excludeKeywords.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in Ghana news crawl:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to crawl news',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
