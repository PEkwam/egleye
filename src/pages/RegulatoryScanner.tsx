import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Radar, RefreshCw, CalendarClock, CheckCircle2, Search, ArrowUpDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRegulatoryUpdates, REGULATOR_LABELS } from '@/hooks/useRegulatoryUpdates';

const IMPACT_STYLE: Record<string, string> = {
  high: 'bg-destructive text-destructive-foreground',
  medium: 'bg-primary/15 text-primary border border-primary/30',
  low: 'bg-muted text-muted-foreground',
};
const UNITS = ['Enterprise Life', 'Enterprise Insurance', 'Enterprise Trustees', 'Transitions', 'Enterprise Properties', 'Acacia Health', 'Group'];

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

  const deadlineDays = (d: string | null | undefined) => {
    if (!d) return null;
    const t = new Date(d).getTime();
    if (isNaN(t)) return null;
    return Math.ceil((t - Date.now()) / 86400000);
  };

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

  const counts = useMemo(() => ({
    high: data.filter((u) => u.impact_level === 'high').length,
    deadlines: data.filter((u) => u.deadline).length,
  }), [data]);

  const scan = async () => {
    setScanning(true);
    const { data: r, error } = await supabase.functions.invoke('regulatory-scanner', { body: {} });
    setScanning(false);
    if (error) return toast({ title: 'Scan failed', description: error.message, variant: 'destructive' });
    toast({ title: r?.skipped ? 'Up to date' : 'Scan complete', description: r?.message ?? `${r?.analyzed ?? 0} new updates analysed.` });
    refetch();
  };

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap',
      active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted')}>{children}</button>
  );

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
          <Button onClick={scan} disabled={scanning} variant="outline" className="gap-2"><RefreshCw className={cn('h-4 w-4', scanning && 'animate-spin')} />{scanning ? 'Scanning…' : 'Scan now'}</Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[['Tracked updates', data.length], ['High impact', counts.high], ['With deadlines', counts.deadlines]].map(([l, v]) => (
            <Card key={l as string}><CardContent className="p-4"><div className="text-2xl font-bold">{v}</div><div className="text-xs text-muted-foreground">{l}</div></CardContent></Card>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search updates, impact notes, action items…"
                className="w-full rounded-full border border-border bg-card pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSort('newest')} className={cn('px-3 py-2 rounded-full text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap',
                sort === 'newest' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted')}>
                <ArrowUpDown className="h-3.5 w-3.5" />Newest first
              </button>
              <button onClick={() => setSort('deadline')} className={cn('px-3 py-2 rounded-full text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap',
                sort === 'deadline' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted')}>
                <CalendarClock className="h-3.5 w-3.5" />Deadline first
              </button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip active={regulator === 'all'} onClick={() => setRegulator('all')}>All regulators</Chip>
            {Object.keys(REGULATOR_LABELS).map((r) => <Chip key={r} active={regulator === r} onClick={() => setRegulator(r)}>{r}</Chip>)}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all', 'high', 'medium', 'low'].map((i) => <Chip key={i} active={impact === i} onClick={() => setImpact(i)}>{i === 'all' ? 'Any impact' : `${i[0].toUpperCase()}${i.slice(1)} impact`}</Chip>)}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip active={unit === 'all'} onClick={() => setUnit('all')}>All businesses</Chip>
            {UNITS.map((u) => <Chip key={u} active={unit === u} onClick={() => setUnit(u)}>{u}</Chip>)}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">No regulatory updates match these filters yet.</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((u) => (
              <Card key={u.id} className="overflow-hidden">
                <CardContent className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline" className="font-bold" title={REGULATOR_LABELS[u.regulator]}>{u.regulator}</Badge>
                    <span className={cn('px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide text-[10px]', IMPACT_STYLE[u.impact_level])}>{u.impact_level} impact</span>
                    {u.published_at && <span className="text-muted-foreground">{formatDistanceToNow(new Date(u.published_at), { addSuffix: true })}</span>}
                    {u.source_name && <span className="text-muted-foreground">· {u.source_name}</span>}
                  </div>
                  <a href={u.source_url} target="_blank" rel="noopener noreferrer" className="group block">
                    <h2 className="text-lg font-bold text-card-foreground group-hover:text-primary leading-snug">{u.title}<ExternalLink className="inline h-4 w-4 ml-1 opacity-60" /></h2>
                  </a>
                  {u.summary && <p className="text-sm text-muted-foreground">{u.summary}</p>}
                  {u.business_impact && (
                    <div className="rounded-lg bg-primary/5 border-l-4 border-primary p-3">
                      <div className="text-xs font-bold uppercase tracking-wide text-primary mb-1">What it means for Enterprise Group</div>
                      <p className="text-sm text-foreground">{u.business_impact}</p>
                    </div>
                  )}
                  {u.action_items.length > 0 && (
                    <ul className="space-y-1">
                      {u.action_items.map((a, i) => <li key={i} className="flex gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />{a}</li>)}
                    </ul>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {u.affected_units.map((a) => <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>)}
                    {(() => {
                      if (!u.deadline) return null;
                      const days = deadlineDays(u.deadline);
                      const urgent = days !== null && days <= 14;
                      return (
                        <span className={cn('ml-auto inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                          urgent ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground')}>
                          <CalendarClock className="h-3.5 w-3.5" />
                          {u.deadline}
                          {days !== null && (
                            <span className="uppercase tracking-wide">
                              {days < 0 ? '· overdue' : days === 0 ? '· due today' : days === 1 ? '· due tomorrow' : `· in ${days} days`}
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Business impact notes are AI-generated guidance — confirm with Compliance before acting.</p>
      </main>
      <Footer />
    </div>
  );
}
