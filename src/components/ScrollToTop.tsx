import { useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Disable the browser's automatic scroll restoration so reloads always
// start at the top instead of where the user previously scrolled.
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  // Use useLayoutEffect for synchronous scroll before paint
  useLayoutEffect(() => {
    // Always scroll to top on route change (except browser back/forward)
    if (navType !== 'POP') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname, navType]);

  // Also handle POP navigations and initial loads/refreshes
  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  }, [pathname, navType]);

  return null;
}
