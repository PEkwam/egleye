import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  BarChart3,
  Building2,
  Landmark,
  Newspaper,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Settings,
  Bell,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from 'next-themes';

/**
 * Global ⌘K / Ctrl+K command palette for fast navigation.
 * Mount once near the app root.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search dashboards, news, settings… (⌘K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Dashboards">
          <CommandItem onSelect={() => go('/executive-dashboard')}>
            <TrendingUp className="text-rose-500" />
            <span>Life Insurance Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/nonlife-dashboard')}>
            <BarChart3 className="text-emerald-500" />
            <span>Non-Life Insurance Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/brokers-dashboard')}>
            <Users className="text-purple-500" />
            <span>Brokers Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/pension-dashboard')}>
            <Landmark className="text-amber-500" />
            <span>Pension Funds Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/npra-pensions')}>
            <Shield className="text-emerald-500" />
            <span>NPRA Pensions</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="News">
          <CommandItem onSelect={() => go('/?category=all')}>
            <Newspaper />
            <span>All News</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/?category=regulator')}>
            <Shield className="text-sky-500" />
            <span>Regulator News (NIC)</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/?category=enterprise_group')}>
            <Building2 className="text-amber-500" />
            <span>Enterprise Group</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/?category=pensions')}>
            <Landmark className="text-amber-500" />
            <span>Pension News</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Tools">
          <CommandItem onSelect={() => go('/insurance-ai')}>
            <Sparkles className="text-violet-500" />
            <span>AI Insights Portal</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/admin-login')}>
            <Settings />
            <span>Admin Console</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Preferences">
          <CommandItem
            onSelect={() => {
              setTheme(theme === 'dark' ? 'light' : 'dark');
              setOpen(false);
            }}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
            <span>Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              window.dispatchEvent(new Event('open-desktop-alerts'));
            }}
          >
            <Bell />
            <span>Enable Desktop Alerts</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
