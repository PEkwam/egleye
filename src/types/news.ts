export type NewsCategory = 'general' | 'enterprise_group' | 'regulator' | 'claims' | 'life_insurance' | 'motor' | 'pensions';

// Specific insurers for filtering
export type GhanaInsurer = 'sic' | 'starlife' | 'hollard' | 'allianz' | 'enterprise' | 'glico' | 'prudential';

export interface NewsArticle {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  source_url: string;
  source_name: string | null;
  image_url: string | null;
  category: NewsCategory;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export const categoryLabels: Record<NewsCategory, string> = {
  general: 'Ghana Insurance',
  enterprise_group: 'Enterprise Group',
  regulator: 'NIC Regulator',
  claims: 'Claims',
  life_insurance: 'Life Insurance',
  motor: 'Motor Insurance',
  pensions: 'NPRA Pensions',
};

export const categoryColors: Record<NewsCategory, string> = {
  general: 'category-general',
  enterprise_group: 'category-enterprise',
  regulator: 'category-regulator',
  claims: 'category-claims',
  life_insurance: 'category-life',
  motor: 'category-motor',
  pensions: 'category-pensions',
};

// Ghana insurers for filtering
export const ghanaInsurers: { id: GhanaInsurer; label: string; keywords: string[] }[] = [
  { id: 'enterprise', label: 'Enterprise Group', keywords: ['enterprise', 'egl', 'eic', 'etl', 'transitions ghana'] },
  { id: 'sic', label: 'SIC Insurance', keywords: ['sic', 'state insurance'] },
  { id: 'starlife', label: 'StarLife', keywords: ['starlife', 'star life'] },
  { id: 'hollard', label: 'Hollard', keywords: ['hollard'] },
  { id: 'allianz', label: 'Allianz Ghana', keywords: ['allianz'] },
  { id: 'glico', label: 'GLICO', keywords: ['glico'] },
  { id: 'prudential', label: 'Prudential Life', keywords: ['prudential'] },
];
