// Shared insurance/pension keyword filter used across the portal to ensure
// only insurance-related news ever appears on screen or in emails.
export const INSURANCE_TERMS: string[] = [
  'insurance', 'insurer', 'insured', 'assurance', 'underwrit', 'policyholder',
  'premium', 'claims', 'reinsurance', 'actuar', 'annuity', 'annuities',
  'bancassurance', 'microinsurance', 'broker', 'brokerage',
  'pension', 'pensions', 'retirement', 'ssnit', 'npra', 'trustee',
  'provident fund', 'gratuity', 'tier 1', 'tier 2', 'tier 3',
  'nic', 'national insurance commission', 'solvency',
  // Local insurer/brand names
  'enterprise life', 'enterprise group', 'enterprise insurance', 'enterprise trustees',
  'acacia health', 'sic life', 'sic insurance', 'starlife', 'star assurance',
  'glico', 'hollard', 'old mutual', 'allianz', 'prudential', 'vanguard assurance',
  'donewell', 'metropolitan life',
];

export function isInsuranceRelated(...parts: Array<string | null | undefined>): boolean {
  const haystack = parts.filter(Boolean).join(' ').toLowerCase();
  if (!haystack) return false;
  return INSURANCE_TERMS.some((kw) => haystack.includes(kw));
}

export function filterInsuranceArticles<T extends { title?: string | null; description?: string | null; content?: string | null; category?: string | null }>(
  articles: T[],
): T[] {
  return articles.filter((a) => isInsuranceRelated(a.title, a.description, a.content, a.category));
}
