/**
 * Route prefetching map — when the user hovers a nav link we kick off the
 * dynamic import early so the chunk is ready by the time they click.
 * Each entry mirrors the lazy() calls in src/App.tsx.
 */
const prefetchMap: Record<string, () => Promise<unknown>> = {
  '/insurance-ai': () => import('@/pages/InsuranceAI'),
  '/executive-dashboard': () => import('@/pages/ExecutiveDashboard'),
  '/nonlife-dashboard': () => import('@/pages/NonLifeDashboard'),
  '/brokers-dashboard': () => import('@/pages/BrokersDashboard'),
  '/npra-pensions': () => import('@/pages/NPRAPensions'),
  '/pension-dashboard': () => import('@/pages/PensionDashboard'),
};

const prefetched = new Set<string>();

export function prefetchRoute(path: string) {
  if (prefetched.has(path)) return;
  const importer = prefetchMap[path];
  if (!importer) return;
  prefetched.add(path);
  // Fire and forget — failures are harmless, the real navigation will retry.
  importer().catch(() => prefetched.delete(path));
}
