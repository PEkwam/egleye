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
// NOTE: This is a fallback list. The crawler also pulls insurer names + keywords
// from the `insurers` DB table at runtime via `loadDbKeywords()` so renames
// and additions made via the admin tool flow through automatically.
const DEFAULT_GHANA_KEYWORDS = [
  // Country & cities
  'ghana', 'accra', 'kumasi', 'tema', 'takoradi', 'cape coast',
  // Regulatory
  'nic', 'nicgh', 'national insurance commission', 'npra', 'national pensions',
  // Currency & local media
  'cedis', 'ghc', 'cedi', 'gna.org.gh', 'myjoyonline', 'graphic.com.gh', 'citinewsroom',
  'pulse.com.gh', 'peacefmonline', '3news.com', 'adomonline', 'classfmonline', 'ghanaweb',
  'ghanainsurancehub'
];

// Loaded from `insurers` table on each invocation so admin renames are picked
// up without redeploying this function.
let DB_INSURER_KEYWORDS: string[] = [];

async function loadDbKeywords(supabase: any): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('insurers')
      .select('name, short_name, keywords')
      .eq('is_active', true);
    if (error) throw error;
    const set = new Set<string>();
    for (const row of data ?? []) {
      if (row.name) set.add(String(row.name).toLowerCase());
      if (row.short_name) set.add(String(row.short_name).toLowerCase());
      for (const kw of row.keywords ?? []) {
        if (kw) set.add(String(kw).toLowerCase());
      }
    }
    DB_INSURER_KEYWORDS = Array.from(set);
    console.log(`Loaded ${DB_INSURER_KEYWORDS.length} insurer keywords from DB`);
  } catch (e) {
    console.warn('Failed to load insurer keywords from DB, using defaults only:', e);
    DB_INSURER_KEYWORDS = [];
  }
}

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
  'nigeria insurance', 'nigerian insurance', 'south african insurance',
  'kenyan insurance', 'tanzanian insurance', 'zimbabwe insurance',
  // Non-insurance content - Expanded
  'traffic lights', 'traffic junction', 'road accident', 'car crash', 'fatal crash',
  'stonebwoy', 'shatta wale', 'sarkodie', 'kuami eugene', 'afcon performance',
  'afcon match', 'black stars', 'parliament speaker', 'speaker of parliament',
  'assembly member', 'constituency', 'member of parliament', 'mp for',
  'election results', 'polling station', 'electoral commission',
  'fake party', 'political party', 'npp ', 'ndc ', 'cpp ', 'pnp ',
  'frimpong-boateng', 'frimpong boateng', 'congregation', 'graduation ceremony',
  'students graduate', 'university graduation', 'sim card restrictions',
  'internet shutdown', 'football', 'soccer match', 'celebrity', 'showbiz',
  'entertainment news', 'music video', 'new album', 'movie premiere',
  'big brother', 'reality show', 'dating show', 'cooking show',
  // Sports
  'ghana premier league', 'hearts of oak', 'asante kotoko', 'olympics',
  'world cup qualifier', 'africa cup', 'champions league',
  // Crime / courts (unless insurance fraud)
  'murder suspect', 'armed robbery', 'kidnapping', 'drug trafficking',
  'ritual killing', 'cybercrime', 'ponzi scheme',
  // Health / covid (generic, not insurance)
  'covid vaccine', 'malaria outbreak', 'cholera outbreak',
  // Real estate / construction (not insurance)
  'affordable housing', 'real estate developer', 'building permit',
  'construction project', 'housing deficit',
  // Religion
  'pastor arrested', 'church building', 'mosque construction', 'prayer camp',
  // Education (generic)
  'university admission', 'school fees', 'free shs', 'waec results', 'bece results',
  // Agriculture / farming (generic)
  'cocoa production', 'cocoa board', 'planting for food', 'farm input',
  // Mining / oil (unless insurance related)
  'illegal mining', 'galamsey', 'oil production', 'petroleum commission',
  // Venture capital / private equity (not insurance)
  'venture capital', 'startup funding', 'angel investor', 'seed funding',
  'hackathon', 'tech startup', 'incubator', 'accelerator programme',
  // Awards / ceremonies (generic)
  'best company of the year', 'excellence awards', 'wins award', 'adjudged best',
  'inaugurates branch', 'opens new branch', 'maiden edition',
  // Generic finance that isn't insurance
  'stock exchange', 'forex trading', 'cryptocurrency', 'bitcoin', 'mobile money fraud',
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
  'glico', 'prudential', 'emple life', 'hollard', 'old mutual',
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
  if (DEFAULT_GHANA_KEYWORDS.some(keyword => lowerText.includes(keyword))) return true;
  return DB_INSURER_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

function isBlockedDomain(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return BLOCKED_DOMAINS.some(domain => lowerUrl.includes(domain));
}

function isBlockedContent(text: string, excludeKeywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return excludeKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

// Article should be about insurance/pensions - STRICT: require 2+ keyword matches
// unless from a dedicated insurance source
function isInsuranceRelated(text: string, includeKeywords: string[], sourceName: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Dedicated insurance sources get a pass with 1 keyword
  const trustedInsuranceSources = [
    'ghana insurance hub', 'africa insurance pulse', 'atlas magazine',
    'nic ghana', 'npra', 'ghana reinsurance', 'african insurance org',
  ];
  const isTrustedSource = trustedInsuranceSources.some(s => sourceName.toLowerCase().includes(s));
  const minKeywords = isTrustedSource ? 1 : 2;
  
  const matchCount = includeKeywords.filter(keyword => lowerText.includes(keyword.toLowerCase())).length;
  return matchCount >= minKeywords;
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
      // Requires 2+ keyword matches for general sources, 1+ for trusted insurance sources
      if (!isInsuranceRelated(fullText, includeKeywords, sourceName)) {
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
): Promise<{ articles: NewsArticle[]; status: 'ok' | 'error'; error?: string }> {
  try {
    console.log(`Fetching RSS: ${feedUrl.slice(0, 80)}...`);
    
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GhanaInsuranceNewsBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      const msg = `HTTP ${response.status}`;
      console.error(`RSS fetch failed for ${sourceName}: ${msg}`);
      return { articles: [], status: 'error', error: msg };
    }

    const xml = await response.text();
    const articles = parseRSS(xml, category, sourceName, includeKeywords, excludeKeywords);
    return { articles, status: 'ok' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching RSS from ${sourceName}:`, msg);
    return { articles: [], status: 'error', error: msg };
  }
}

// --- Fuzzy title matching helpers (for smarter dedupe) ---
function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'the','a','an','and','or','of','for','to','in','on','at','by','with','from',
  'is','are','was','were','be','been','as','that','this','it','its','has','have',
  'will','can','new','says','said','ghana','ghanas','ghanaian'
]);

function tokenSet(t: string): Set<string> {
  return new Set(
    normalizeTitle(t).split(' ').filter(w => w.length > 2 && !STOPWORDS.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// --- OpenGraph image fallback ---
async function fetchOgImage(pageUrl: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(pageUrl, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GhanaInsuranceNewsBot/1.0)',
        'Accept': 'text/html,*/*',
      },
      redirect: 'follow',
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < 120_000) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      total += value.length;
    }
    try { await reader.cancel(); } catch { /* noop */ }
    const merged = chunks.reduce((acc, c) => {
      const m = new Uint8Array(acc.length + c.length); m.set(acc); m.set(c, acc.length); return m;
    }, new Uint8Array());
    const html = new TextDecoder().decode(merged);
    const og = html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
      || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (!og) return null;
    let url = og[1].trim();
    if (url.startsWith('//')) url = 'https:' + url;
    else if (url.startsWith('/')) {
      try { url = new URL(url, pageUrl).toString(); } catch { /* noop */ }
    }
    return url || null;
  } catch {
    return null;
  }
}

// --- AI relevance + category classifier (Lovable AI Gateway) ---
type AiVerdict = { keep: boolean; category: string };
async function classifyWithAI(articles: NewsArticle[]): Promise<AiVerdict[] | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey || articles.length === 0) return null;
  try {
    const items = articles.map((a, i) => ({
      i,
      title: (a.title || '').slice(0, 200),
      desc: (a.description || '').slice(0, 280),
      source: a.source_name || '',
    }));
    const sys = `You classify Ghana insurance / pension news. Return STRICT JSON:
{"results":[{"i":number,"keep":boolean,"category":"general"|"enterprise_group"|"regulator"|"life_insurance"|"nonlife"|"pensions"|"claims"}]}
keep=true ONLY if the article is genuinely about Ghana insurance, reinsurance, pensions, NIC, NPRA, SSNIT, insurers, brokers, claims, or related regulation. Otherwise keep=false. Pick the most specific category.`;
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: JSON.stringify(items) },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) { console.warn('AI classify failed', res.status); return null; }
    const data = await res.json();
    const txt = data?.choices?.[0]?.message?.content;
    if (!txt) return null;
    const parsed = JSON.parse(txt);
    const out: AiVerdict[] = articles.map(() => ({ keep: true, category: 'general' }));
    for (const r of parsed.results ?? []) {
      if (typeof r.i === 'number' && r.i >= 0 && r.i < articles.length) {
        out[r.i] = { keep: !!r.keep, category: String(r.category || 'general') };
      }
    }
    return out;
  } catch (e) {
    console.warn('AI classify error', e);
    return null;
  }
}

// --- Smart backoff helpers ---
function computeBackoffMs(consecutiveErrors: number): number {
  // 0 err -> 0; 1 -> 30m, 2 -> 1h, 3 -> 2h, 4 -> 4h, max 6h
  if (consecutiveErrors <= 0) return 0;
  const mins = Math.min(30 * Math.pow(2, consecutiveErrors - 1), 360);
  return mins * 60_000;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Read body (optional) for trigger metadata
  let triggerSource = 'manual';
  try {
    if (req.method === 'POST') {
      const body = await req.json().catch(() => null);
      if (body?.source) triggerSource = String(body.source).slice(0, 64);
    }
  } catch { /* noop */ }

  // Check mode from query params
  const url = new URL(req.url);
  const nicOnly = url.searchParams.get('nic_only') === 'true';
  const pensionOnly = url.searchParams.get('pension_only') === 'true';
  const modeLabel = nicOnly ? 'nic' : pensionOnly ? 'pension' : 'general';

  // Start crawl run record
  let runId: string | null = null;
  try {
    const { data: runRow } = await supabase
      .from('news_crawl_runs')
      .insert({ trigger_source: triggerSource, mode: modeLabel, status: 'running' })
      .select('id')
      .single();
    runId = runRow?.id ?? null;
  } catch (e) {
    console.warn('Failed to create crawl run row:', e);
  }

  let articlesFetched = 0;
  let articlesKept = 0;
  let articlesInserted = 0;
  let duplicatesSkipped = 0;
  let errors = 0;
  let sourcesRun = 0;

  try {
    const { includeKeywords, excludeKeywords } = await fetchDynamicKeywords(supabase);
    await loadDbKeywords(supabase);

    console.log(`Starting crawl. Mode=${modeLabel} Trigger=${triggerSource}`);

    // Load active sources from DB, honoring smart backoff via next_eligible_at
    type SourceRow = { id: string; url: string; category: string; source_label: string; mode: string; consecutive_errors: number; next_eligible_at: string | null };
    const nowIso = new Date().toISOString();
    const { data: dbSources } = await supabase
      .from('news_sources')
      .select('id, url, category, source_label, mode, consecutive_errors, next_eligible_at')
      .eq('is_enabled', true)
      .or(`next_eligible_at.is.null,next_eligible_at.lte.${nowIso}`);

    let feedsToProcess: SourceRow[] = (dbSources ?? []).filter((s) => {
      if (nicOnly) return s.mode === 'nic';
      if (pensionOnly) return s.mode === 'pension';
      return true;
    });

    if (feedsToProcess.length === 0) {
      console.warn('No DB sources available — falling back to hard-coded feed list');
      const fallback = nicOnly ? NIC_RSS_FEEDS
        : pensionOnly ? PENSION_RSS_FEEDS
        : [...LOCAL_GHANA_FEEDS, ...GOOGLE_NEWS_RSS_FEEDS, ...PENSION_RSS_FEEDS];
      feedsToProcess = fallback.map((f) => ({ id: '', url: f.url, category: f.category, source_label: f.source, mode: 'general', consecutive_errors: 0, next_eligible_at: null }));
    }

    sourcesRun = feedsToProcess.length;

    // Process feeds in batches and track per-source stats
    const allArticles: NewsArticle[] = [];
    const batchSize = 5;
    for (let i = 0; i < feedsToProcess.length; i += batchSize) {
      const batch = feedsToProcess.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((feed) => fetchRSSFeed(feed.url, feed.category, feed.source_label, includeKeywords, excludeKeywords))
      );
      // Update per-source rows + accumulate
      for (let j = 0; j < batch.length; j++) {
        const feed = batch[j];
        const res = results[j];
        const found = res.articles.length;
        articlesFetched += found;
        if (res.status === 'error') errors++;
        allArticles.push(...res.articles);

        if (feed.id) {
          try {
            // Read current total (no rpc available, simple update)
            const { data: cur } = await supabase
              .from('news_sources')
              .select('articles_found_total')
              .eq('id', feed.id)
              .single();
            const prevTotal = cur?.articles_found_total ?? 0;
            await supabase
              .from('news_sources')
              .update({
                last_run_at: new Date().toISOString(),
                last_status: res.status === 'ok' ? 'ok' : 'error',
                last_error: res.error ?? null,
                last_articles_found: found,
                articles_found_total: prevTotal + found,
              })
              .eq('id', feed.id);
          } catch (e) {
            console.warn('Failed to update news_sources row', feed.id, e);
          }
        }
      }
      if (i + batchSize < feedsToProcess.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`RSS feeds found: ${allArticles.length} articles`);

    // --- Smarter dedupe ---
    // 1. Exact URL dedupe (within batch)
    const seenUrls = new Set<string>();
    let batchUniques: NewsArticle[] = [];
    for (const a of allArticles) {
      if (seenUrls.has(a.source_url)) continue;
      seenUrls.add(a.source_url);
      batchUniques.push(a);
    }

    // 2. Fuzzy title dedupe within batch (Jaccard >= 0.7)
    const keptInBatch: NewsArticle[] = [];
    const keptTokens: Set<string>[] = [];
    for (const a of batchUniques) {
      const toks = tokenSet(a.title);
      let isDup = false;
      for (const k of keptTokens) {
        if (jaccard(toks, k) >= 0.7) { isDup = true; break; }
      }
      if (!isDup) {
        keptInBatch.push(a);
        keptTokens.push(toks);
      } else {
        duplicatesSkipped++;
      }
    }

    // 3. Fuzzy title dedupe vs articles already in DB (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentDb } = await supabase
      .from('news_articles')
      .select('title')
      .gte('published_at', sevenDaysAgo)
      .limit(1000);
    const recentTokens: Set<string>[] = (recentDb ?? []).map((r: any) => tokenSet(r.title));

    const finalArticles: NewsArticle[] = [];
    for (const a of keptInBatch) {
      const toks = tokenSet(a.title);
      let isDup = false;
      for (const r of recentTokens) {
        if (jaccard(toks, r) >= 0.85) { isDup = true; break; }
      }
      if (!isDup) {
        finalArticles.push(a);
      } else {
        duplicatesSkipped++;
      }
    }

    articlesKept = finalArticles.length;
    console.log(`Articles after dedupe: ${articlesKept} (skipped ${duplicatesSkipped} duplicates)`);

    let insertedArticles: any[] = [];
    if (finalArticles.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('news_articles')
        .upsert(finalArticles, {
          onConflict: 'source_url',
          ignoreDuplicates: true,
        })
        .select();

      if (insertError) {
        console.error('Error inserting articles:', insertError);
        errors++;
      } else {
        insertedArticles = inserted ?? [];
        articlesInserted = insertedArticles.length;
        console.log(`Inserted ${articlesInserted} articles`);
      }
    }

    // Fan out push notifications for newly inserted articles (cap to 5)
    try {
      for (const art of insertedArticles.slice(0, 5)) {
        await supabase.functions.invoke('web-push', {
          body: { action: 'send_article', articleId: art.id, audience: 'all' },
        });
      }
    } catch (pushErr) {
      console.error('web-push fan-out failed', pushErr);
    }

    // Enqueue email alerts (cap to 5)
    try {
      for (const art of insertedArticles.slice(0, 5)) {
        await supabase.functions.invoke('send-news-email', {
          body: { action: 'enqueue_article', articleId: art.id },
          headers: { Authorization: `Bearer ${supabaseServiceKey}` },
        });
      }
    } catch (emailErr) {
      console.error('send-news-email enqueue failed', emailErr);
    }

    // Process the email queue
    try {
      await supabase.functions.invoke('send-news-email', {
        body: { action: 'process_queue', limit: 100 },
        headers: { Authorization: `Bearer ${supabaseServiceKey}` },
      });
    } catch (emailProcessErr) {
      console.error('send-news-email process_queue failed', emailProcessErr);
    }

    // Finalize run record
    if (runId) {
      await supabase.from('news_crawl_runs').update({
        finished_at: new Date().toISOString(),
        sources_run: sourcesRun,
        articles_fetched: articlesFetched,
        articles_kept: articlesKept,
        articles_inserted: articlesInserted,
        duplicates_skipped: duplicatesSkipped,
        errors,
        status: 'completed',
      }).eq('id', runId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Portal successfully refreshed',
        runId,
        mode: modeLabel,
        sourcesRun,
        articlesFetched,
        articlesKept,
        articlesInserted,
        duplicatesSkipped,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in Ghana news crawl:', error);
    const msg = error instanceof Error ? error.message : 'Failed to crawl news';
    if (runId) {
      await supabase.from('news_crawl_runs').update({
        finished_at: new Date().toISOString(),
        sources_run: sourcesRun,
        articles_fetched: articlesFetched,
        articles_kept: articlesKept,
        articles_inserted: articlesInserted,
        duplicates_skipped: duplicatesSkipped,
        errors: errors + 1,
        status: 'failed',
        error_message: msg,
      }).eq('id', runId);
    }
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
