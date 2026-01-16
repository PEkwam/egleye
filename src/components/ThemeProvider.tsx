import { useEffect, ReactNode } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { colorTheme } = useSiteSettings();

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes first
    root.classList.remove('theme-enterprise-group', 'theme-enterprise-life');
    
    // Apply the correct theme class
    if (colorTheme === 'enterprise_group') {
      root.classList.add('theme-enterprise-group');
    }
    // enterprise_life is the default, no class needed
  }, [colorTheme]);

  return <>{children}</>;
}
