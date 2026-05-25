import { useEffect } from 'react';
import { prefetchRoute } from '@/lib/routePrefetch';

/**
 * Global hover prefetcher — listens once at document level and prefetches the
 * route chunk for any internal <a href="/..."> when the user hovers it.
 * Cheap, automatic, and avoids touching every Link in the codebase.
 */
export function RoutePrefetcher() {
  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href^="/"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('//')) return;
      prefetchRoute(href.split('?')[0].split('#')[0]);
    };
    document.addEventListener('mouseover', handler, { passive: true });
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mouseover', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  return null;
}
