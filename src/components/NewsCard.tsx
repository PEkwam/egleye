import { ExternalLink, Clock, TrendingUp, Shield, CheckCircle2, Building2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { NewsArticle } from '@/types/news';
import { categoryLabels, categoryColors } from '@/types/news';
import { sanitizeText } from '@/lib/utils/text';

// Credibility badge configuration based on source
const sourceCredibility: Record<string, { level: 'official' | 'verified' | 'standard'; label: string; logo?: string }> = {
  'NIC': { level: 'official', label: 'NIC', logo: '/logos/nic-ghana-logo.png' },
  'National Insurance Commission': { level: 'official', label: 'NIC', logo: '/logos/nic-ghana-logo.png' },
  'NPRA': { level: 'official', label: 'NPRA', logo: '/logos/npra-ghana-logo.png' },
  'National Pensions Regulatory Authority': { level: 'official', label: 'NPRA', logo: '/logos/npra-ghana-logo.png' },
  'Bank of Ghana': { level: 'official', label: 'BoG' },
  'Ghana Business News': { level: 'verified', label: 'GBN' },
  'Graphic Online': { level: 'verified', label: 'Graphic' },
  'MyJoyOnline': { level: 'verified', label: 'MyJoy' },
  'Myjoyonline': { level: 'verified', label: 'MyJoy' },
  'Joy Online': { level: 'verified', label: 'MyJoy' },
  'Citi Newsroom': { level: 'verified', label: 'Citi' },
  'CitiFM': { level: 'verified', label: 'Citi' },
  'GhanaWeb': { level: 'verified', label: 'GhanaWeb' },
  'Enterprise Group': { level: 'verified', label: 'Enterprise', logo: '/logos/enterprise-group-logo.jpg' },
  'Enterprise Life': { level: 'verified', label: 'Enterprise', logo: '/logos/enterprise-life-logo.png' },
  'Daily Graphic': { level: 'verified', label: 'Graphic' },
  'Modern Ghana': { level: 'verified', label: 'ModernGH' },
  'Pulse Ghana': { level: 'verified', label: 'Pulse' },
  'B&FT Online': { level: 'verified', label: 'B&FT' },
  'Business & Financial Times': { level: 'verified', label: 'B&FT' },
  'Starr FM': { level: 'verified', label: 'Starr' },
  'Peace FM': { level: 'verified', label: 'Peace' },
  '3News': { level: 'verified', label: '3News' },
};

const getCredibilityBadge = (sourceName: string | null): { level: 'official' | 'verified' | 'standard'; label: string; logo?: string } => {
  if (!sourceName) return { level: 'standard' as const, label: 'News' };
  
  // Check for exact match first
  const exactMatch = sourceCredibility[sourceName];
  if (exactMatch) return exactMatch;
  
  // Check for partial matches
  for (const [key, value] of Object.entries(sourceCredibility)) {
    if (sourceName.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Use the source name itself as label (shortened)
  const shortName = sourceName.split(/[\s-]/).slice(0, 2).join(' ');
  return { level: 'standard' as const, label: shortName.length > 12 ? shortName.slice(0, 10) + '...' : shortName };
};

const CredibilityBadge = ({ sourceName }: { sourceName: string | null }) => {
  const badge = getCredibilityBadge(sourceName);
  if (!badge) return null;
  
  const styles = {
    official: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    verified: 'bg-green-500/10 text-green-600 border-green-500/30',
    standard: 'bg-muted text-muted-foreground border-border/50',
  };
  
  const icons = {
    official: <Shield className="h-3 w-3" />,
    verified: <CheckCircle2 className="h-3 w-3" />,
    standard: <Building2 className="h-3 w-3" />,
  };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md border ${styles[badge.level]}`}>
      {badge.logo ? (
        <img src={badge.logo} alt={badge.label} className="h-3 w-3 rounded-sm object-contain" />
      ) : (
        icons[badge.level]
      )}
      {badge.label}
    </span>
  );
};

interface NewsCardProps {
  article: NewsArticle;
  variant?: 'default' | 'compact' | 'featured';
}

export function NewsCard({ article, variant = 'default' }: NewsCardProps) {
  const publishedDate = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true })
    : 'Recently';

  const wordCount = (article.content || article.description || '').split(' ').length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  if (variant === 'compact') {
    return (
      <a
        href={article.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex gap-4 p-4 glass-effect rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
      >
        {article.image_url && (
          <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-secondary">
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-md ${categoryColors[article.category]}`}>
              {categoryLabels[article.category]}
            </span>
            <CredibilityBadge sourceName={article.source_name} />
            <span className="text-[10px] text-muted-foreground">{readingTime} min</span>
          </div>
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors font-display">
            {article.title}
          </h3>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{publishedDate}</span>
          </div>
        </div>
      </a>
    );
  }

  if (variant === 'featured') {
    return (
      <a
        href={article.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block h-[320px] sm:h-[400px] md:h-[500px] rounded-2xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10" />
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 hero-gradient opacity-80" />
        )}
        
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">
          <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
            <TrendingUp className="h-5 w-5 md:h-7 md:w-7 text-white" />
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 z-20">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 flex-wrap">
            {article.is_featured && <span className="featured-badge text-[10px] md:text-xs">Featured</span>}
            <span className={`px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wide rounded-lg shadow-md ${categoryColors[article.category]}`}>
              {categoryLabels[article.category]}
            </span>
            <CredibilityBadge sourceName={article.source_name} />
            <span className="hidden sm:inline-flex px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-medium rounded-lg bg-white/10 backdrop-blur-sm text-white">
              {readingTime} min read
            </span>
          </div>
          
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white font-display mb-2 md:mb-4 group-hover:text-accent transition-colors leading-tight line-clamp-3 md:line-clamp-none">
            {article.title}
          </h2>
          
          {article.description && (
            <p className="hidden sm:block text-sm md:text-lg text-white/80 line-clamp-2 mb-3 md:mb-5 max-w-3xl">{sanitizeText(article.description)}</p>
          )}
          
          <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-white/70">
            <div className="flex items-center gap-1.5 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
              <Clock className="h-3 w-3 md:h-4 md:w-4" />
              <span className="truncate max-w-[80px] sm:max-w-none">{publishedDate}</span>
            </div>
            {article.source_name && (
              <span className="hidden xs:inline-flex px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-white/10 backdrop-blur-sm truncate max-w-[100px] md:max-w-none">{article.source_name}</span>
            )}
            <div className="ml-auto hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="text-white font-medium">Read Article</span>
              <ExternalLink className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      </a>
    );
  }

  return (
    <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="group news-card flex flex-col h-full">
      <div className="relative h-48 overflow-hidden bg-secondary">
        {article.image_url ? (
          <img src={article.image_url} alt={article.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full hero-gradient opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg shadow-md ${categoryColors[article.category]}`}>
            {categoryLabels[article.category]}
          </span>
          <CredibilityBadge sourceName={article.source_name} />
        </div>
        <div className="absolute top-4 right-4">
          <span className="px-2 py-1 text-[10px] font-medium rounded-md bg-black/40 backdrop-blur-sm text-white">{readingTime} min</span>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-lg font-semibold font-display text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-3">
          {article.title}
        </h3>
        {article.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 flex-1 mb-4">{sanitizeText(article.description)}</p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            <span>{publishedDate}</span>
          </div>
          {article.source_name && <span className="truncate max-w-[120px] font-medium">{article.source_name}</span>}
        </div>
      </div>
    </a>
  );
}