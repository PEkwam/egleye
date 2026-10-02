import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Radar, RefreshCw, CalendarClock, CheckCircle2, Search, ArrowUpDown, Building2, Landmark, Gauge, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRegulatoryUpdates, REGULATOR_LABELS, type RegulatoryUpdate } from '@/hooks/useRegulatoryUpdates';

const IMPACT_STYLE: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-primary/10 text-primary',
  low: 'bg-muted text-muted-foreground',
};
const IMPACT_RAIL: Record<string, string> = {
  high: 'border-l-destructive',
  medium: 'border-l-primary',
  low: 'border-l-border',
};
const UNITS = ['Enterprise Life', 'Enterprise Insurance', 'Enterprise Trustees', 'Transitions', 'Enterprise Properties', 'Acacia Health', 'Group'];
const UNIT_KEYWORDS: Record<string, string[]> = {
  'Enterprise Life': ['enterprise life', 'life insurance', 'life assurance', 'life insurer', 'life policy', 'whole life', 'term life', 'endowment', 'universal life', 'group life', 'life business'],
  'Enterprise Insurance': ['enterprise insurance', 'non-life', 'nonlife', 'general insurance', 'motor insurance', 'property insurance', 'marine insurance', 'casualty', 'compulsory insurance'],
  'Enterprise Trustees': ['enterprise trustees', 'trustee', 'trustees', 'pension'],
  'Transitions': ['transitions', 'funeral'],
  'Enterprise Properties': ['enterprise properties', 'real estate', 'properties'],
  'Acacia Health': ['acacia', 'health insurance', 'acacia health', 'health cover'],
  'Group': ['enterprise group'],
};

const deadlineDays = (d: string | null | undefined) => {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
};

function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 flex items-center gap-1.5 mb-3">
      <Icon className="h-3.5 w-3.5 text-primary" />{children}
    </h3>
  );
}

function FilterList({ items, active, onPick }: { items: string[]; active: string; onPick: (v: string) => void }) {
  return (
    <div className="space-y-1">
      {items.map((v) => (
        <button
          key={v}
          onClick={() => onPick(v)}
          className={cn(
            'w-full text-left px-3 py-2 text-sm rounded-lg transition-colors truncate',
            active === v ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground/80 hover:bg-muted',
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function UpdateCard({ u }: { u: RegulatoryUpdate }) {
  const days = deadlineDays(u.deadline);
  const urgent = days !== null && days <= 14;
  return (
    <article className={cn('bg-card border border-border border-l-4 rounded-xl shadow-sm hover:shadow-md hover:border-border transition-all overflow-hidden', IMPACT_RAIL[u.impact_level] ?? 'border-l-border')}>
      <div className="p-5 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold">{REGULATOR_LABELS[u.regulator] ?? u.regulator}</span>
          <span className={cn('px-2 py-0.5 rounded-full font-bold uppercase tracking-wide text-[10px]', IMPACT_STYLE[u.impact_level])}>{u.impact_level} impact</span>
          {u.published_at && <span className="text-xs text-muted-foreground">· {formatDistanceToNow(new Date(u.published_at), { addSuffix: true })}</span>}
          {days !== null && (
            <span className={cn('ml-auto inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
              urgent ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground')}>
              <CalendarClock className="h-3.5 w-3.5" />
              {u.deadline}
              <span className="uppercase tracking-wide">
                {days < 0 ? '· overdue' : days === 0 ? '· due today' : days === 1 ? '· due tomorrow' : `· in ${days} days`}
              </span>
            </span>
          )}
        </div>
        <a href={u.source_url} target="_blank" rel="noopener noreferrer" className="group block">
          <h2 className="text-lg font-bold text-card-foreground group-hover:text-primary leading-snug">
            {u.title}<ExternalLink className="inline h-4 w-4 ml-1.5 opacity-50 group-hover:opacity-100 align-middle" />
          </h2>
        </a>
        {u.summary && <p className="text-sm text-muted-foreground leading-relaxed">{u.summary}</p>}
        {u.business_impact && (
          <div className="rounded-lg bg-primary/5 border-l-4 border-l-primary p-3">
            <div className="text-xs font-bold uppercase tracking-wide text-primary mb-1">What it means for Enterprise Group</div>
            <p className="text-sm text-foreground">{u.business_impact}</p>
          </div>
        )}
        {u.action_items.length > 0 && (
          <ul className="space-y-1.5">
            {u.action_items.map((a, i) => <li key={i} className="flex gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />{a}</li>)}
          </ul>
        )}
        {u.affected_units.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/60">
            {u.affected_units.map((a) => (
              <span key={a} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{a}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function RegulatoryScanner() {
  const { data = [], isLoading, refetch } = useRegulatoryUpdates();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [regulator, setRegulator] = useState('all');
  const [impact, setImpact] = useState('all');
  const [unit, setUnit] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'deadline'>('newest');
  const [scanning, setScanning] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = data.filter((u) =>
      (regulator === 'all' || u.regulator === regulator) &&
      (impact === 'all' || u.impact_level === impact) &&
      (unit === 'all' || u.affected_units.includes(unit)) &&
      (q === '' ||
        u.title.toLowerCase().includes(q) ||
        (u.summary ?? '').toLowerCase().includes(q) ||
        (u.business_impact ?? '').toLowerCase().includes(q) ||
        u.action_items.some((a) => a.toLowerCase().includes(q))));
    if (sort === 'deadline') {
      return [...rows].sort((a, b) => {
        const da = deadlineDays(a.deadline);
        const db = deadlineDays(b.deadline);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
    }
    return rows;
  }, [data, regulator, impact, unit, query, sort]);

  const stats = useMemo(() => ({
    total: data.length,
    high: data.filter((u) => u.impact_level === 'high').length,
    dueSoon: data.filter((u) => { const d = deadlineDays(u.deadline); return d !== null && d >= 0 && d <= 14; }).length,
    regulators: new Set(data.map((u) => u.regulator)).size,
  }), [data]);

  const hasFilters = regulator !== 'all' || impact !== 'all' || unit !== 'all' || query.trim() !== '';
  const reset = () => { setRegulator('all'); setImpact('all'); setUnit('all'); setQuery(''); setSort('newest'); };

  const scan = async () => {
    setScanning(true);
    const { data: r, error } = await supabase.functions.invoke('regulatory-scanner', { body: {} });
    setScanning(false);
    if (error) return toast({ title: 'Scan failed', description: error.message, variant: 'destructive' });
    toast({ title: r?.skipped ? 'Up to date' : 'Scan complete', description: r?.message ?? `${r?.analyzed ?? 0} new updates analysed.` });
    refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header activeCategory="all" onCategoryChange={(c) => navigate(c === 'all' ? '/' : `/?category=${c}`)} onSearch={(q) => navigate(`/?q=${encodeURIComponent(q)}`)} />
      <main className="container mx-auto px-4 py-6 sm:py-10 space-y-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Home</Link>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3"><Radar className="h-7 w-7 text-primary" />Regulatory Horizon Scanner</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">Announcements from NIC, Bank of Ghana, SEC, Cyber Security Authority and Data Protection Commission — with what each means for Enterprise Group.</p>
          </div>
          <button
            onClick={scan}
            disabled={scanning}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={cn('h-4 w-4', scanning && 'animate-spin')} />{scanning ? 'Scanning…' : 'Scan now'}
          </button>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['Tracked updates', stats.total, null],
            ['High impact', stats.high, 'text-destructive'],
            ['Due in 14 days', stats.dueSoon, 'text-destructive'],
            ['Regulators', stats.regulators, 'text-primary'],
          ].map(([label, value, valueClass]) => (
            <div key={label as string} className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className={cn('text-3xl font-bold mt-1', valueClass as string | null)}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Sidebar control panel */}
          <aside className="w-full lg:w-64 shrink-0 space-y-6">
            <div className="bg-card border border-border rounded-xl p-5 space-y-6 shadow-sm">
              <div>
                <SectionLabel icon={Landmark}>Regulator</SectionLabel>
                <FilterList items={['All regulators', ...Object.keys(REGULATOR_LABELS)]} active={regulator === 'all' ? 'All regulators' : regulator} onPick={(v) => setRegulator(v === 'All regulators' ? 'all' : v)} />
              </div>
              <div>
                <SectionLabel icon={Gauge}>Impact level</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {['all', 'high', 'medium', 'low'].map((i) => {
                    const count = i === 'all' ? data.length : data.filter((u) => u.impact_level === i).length;
                    return (
                      <button key={i} onClick={() => setImpact(i)}
                        className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                          impact === i ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted')}>
                        {i === 'all' ? 'Any impact' : `${i[0].toUpperCase()}${i.slice(1)}`}
                        <span className="ml-1.5 opacity-70">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <SectionLabel icon={Building2}>Business</SectionLabel>
                <FilterList items={['All businesses', ...UNITS]} active={unit === 'all' ? 'All businesses' : unit} onPick={(v) => setUnit(v === 'All businesses' ? 'all' : v)} />
              </div>
            </div>
          </aside>

          {/* Feed column */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-card border border-border rounded-xl p-2 shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search updates, impact notes, action items…"
                  className="w-full rounded-lg border-none bg-muted/50 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSort('newest')} className={cn('px-3 py-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors',
                  sort === 'newest' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground hover:bg-muted')}>
                  <ArrowUpDown className="h-3.5 w-3.5" />Newest first
                </button>
                <button onClick={() => setSort('deadline')} className={cn('px-3 py-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors',
                  sort === 'deadline' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground hover:bg-muted')}>
                  <CalendarClock className="h-3.5 w-3.5" />Deadline first
                </button>
                {hasFilters && (
                  <button onClick={reset} className="px-3 py-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap bg-muted/50 text-muted-foreground hover:bg-muted transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" />Reset
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {data.length} updates{sort === 'deadline' ? ' · sorted by deadline' : ''}
            </p>

            {isLoading ? (
              <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-xl bg-card border border-border animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
                <p className="text-muted-foreground">No regulatory updates match these filters yet.</p>
                {hasFilters && (
                  <button onClick={reset} className="mt-3 text-sm font-semibold text-primary hover:underline">Clear all filters</button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((u) => <UpdateCard key={u.id} u={u} />)}
              </div>
            )}

            <p className="text-xs text-muted-foreground pt-2">Business impact notes are AI-generated guidance — confirm with Compliance before acting.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
