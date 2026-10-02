import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Radar, ChevronRight, AlertTriangle, CalendarClock, CheckCircle2, ChevronDown, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRegulatoryUpdates, type RegulatoryUpdate } from '@/hooks/useRegulatoryUpdates';

const IMPACT_CHIP: Record<string, string> = {
  high: 'bg-destructive text-destructive-foreground',
  medium: 'bg-primary/15 text-primary border border-primary/30',
  low: 'bg-muted text-muted-foreground',
};

const deadlineDays = (d: string | null | undefined) => {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
};

const rankUpdate = (u: RegulatoryUpdate) => {
  const d = deadlineDays(u.deadline);
  return (u.impact_level === 'high' ? 0 : u.impact_level === 'medium' ? 1 : 2) * 1000 + (d === null ? 999 : Math.max(0, d));
};

function DeadlineChip({ deadline }: { deadline: string | null }) {
  const days = deadlineDays(deadline);
  if (!deadline || days === null) return null;
  const urgent = days <= 14;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full',
      urgent ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground')}>
      <CalendarClock className="h-3 w-3" />
      {days < 0 ? 'Overdue' : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `In ${days} days`}
    </span>
  );
}

export function RegulatorySpotlight() {
  const { data = [] } = useRegulatoryUpdates(20);
  const navigate = useNavigate();
  const [impact, setImpact] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // High-impact alerts: notify once when a fresh high-impact update appears.
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  useEffect(() => {
    const high = data.filter((u) => u.impact_level === 'high');
    if (!initializedRef.current) {
      high.forEach((u) => seenRef.current.add(u.id));
      initializedRef.current = true;
      return;
    }
    const fresh = high.filter((u) => !seenRef.current.has(u.id));
    fresh.forEach((u) => seenRef.current.add(u.id));
    if (fresh.length === 0) return;
    const latest = fresh[0];
    toast.custom(
      (id) => (
        <div className="bg-background border border-border/60 rounded-xl shadow-2xl p-3.5 backdrop-blur-xl ring-1 ring-destructive/20 w-full max-w-[380px]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-destructive">
              <AlertTriangle className="h-3 w-3" /> High-impact regulatory update
            </span>
            <span className="text-[10px] text-muted-foreground truncate">· {latest.regulator}</span>
          </div>
          <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">{latest.title}</p>
          {latest.business_impact && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{latest.business_impact}</p>
          )}
          <button
            type="button"
            onClick={() => {
              navigate('/regulatory-scanner');
              toast.dismiss(id);
            }}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Open Regulatory Horizon <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      ),
      { duration: 12000, position: 'top-right' },
    );
  }, [data, navigate]);

  const stats = useMemo(() => ({
    total: data.length,
    high: data.filter((u) => u.impact_level === 'high').length,
    dueSoon: data.filter((u) => {
      const d = deadlineDays(u.deadline);
      return d !== null && d >= 0 && d <= 14;
    }).length,
  }), [data]);

  const lastAnalyzed = useMemo(() => {
    const dates = data.map((u) => (u.analyzed_at ? new Date(u.analyzed_at).getTime() : NaN)).filter((t) => !isNaN(t));
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates));
  }, [data]);

  const top = useMemo(() => {
    const rows = impact === 'all' ? data : data.filter((u) => u.impact_level === impact);
    return [...rows].sort((a, b) => rankUpdate(a) - rankUpdate(b)).slice(0, 3);
  }, [data, impact]);

  if (data.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2 className="text-xl font-extrabold flex items-center gap-2"><Radar className="h-5 w-5 text-primary" />Regulatory Horizon</h2>
          <Link to="/regulatory-scanner" className="text-sm font-semibold text-primary inline-flex items-center shrink-0">Open scanner<ChevronRight className="h-4 w-4" /></Link>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Live monitoring of NIC, Bank of Ghana, SEC, Cyber Security Authority and Data Protection Commission announcements — and what each one means for Enterprise Group.
        </p>

        {/* Live stats */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            {stats.total} tracked
          </div>
          {stats.high > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 text-destructive px-3 py-1 text-xs font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              {stats.high} high impact
            </div>
          )}
          {stats.dueSoon > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 text-destructive px-3 py-1 text-xs font-semibold">
              <CalendarClock className="h-3.5 w-3.5" />
              {stats.dueSoon} deadline{stats.dueSoon > 1 ? 's' : ''} within 14 days
            </div>
          )}
          {lastAnalyzed && (
            <span className="text-xs text-muted-foreground ml-auto">
              Updated {formatDistanceToNow(lastAnalyzed, { addSuffix: true })} · auto-scans every 6 hours
            </span>
          )}
        </div>

        {/* Impact filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {(['all', 'high', 'medium', 'low'] as const).map((i) => {
            const count = i === 'all' ? data.length : data.filter((u) => u.impact_level === i).length;
            if (i !== 'all' && count === 0) return null;
            return (
              <button
                key={i}
                onClick={() => { setImpact(i); setExpandedId(null); }}
                className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap',
                  impact === i ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted')}
              >
                {i === 'all' ? 'All updates' : `${i[0].toUpperCase()}${i.slice(1)} impact`}
                <span className="ml-1.5 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No {impact} impact updates right now.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {top.map((u) => {
              const expanded = expandedId === u.id;
              return (
                <div key={u.id} className={cn('rounded-xl border border-border p-4 transition-colors', expanded ? 'bg-muted/60' : 'hover:bg-muted')}>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase mb-2">
                    <span className="text-foreground">{u.regulator}</span>
                    <span className={cn('px-1.5 py-0.5 rounded', IMPACT_CHIP[u.impact_level])}>{u.impact_level}</span>
                    {u.published_at && (
                      <span className="text-muted-foreground normal-case font-semibold">
                        {formatDistanceToNow(new Date(u.published_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <a href={u.source_url} target="_blank" rel="noopener noreferrer" className="font-bold text-sm text-card-foreground line-clamp-2 hover:text-primary leading-snug block">
                    {u.title}
                  </a>
                  {u.business_impact && (
                    <p className={cn('text-xs text-muted-foreground mt-2', expanded ? '' : 'line-clamp-3')}>{u.business_impact}</p>
                  )}
                  {expanded && u.action_items.length > 0 && (
                    <ul className="space-y-1 mt-2">
                      {u.action_items.map((a, i) => (
                        <li key={i} className="flex gap-2 text-xs text-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />{a}
                        </li>
                      ))}
                    </ul>
                  )}
                  {expanded && u.affected_units.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {u.affected_units.map((a) => (
                        <span key={a} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">{a}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <DeadlineChip deadline={u.deadline} />
                    {u.action_items.length > 0 && (
                      <button
                        onClick={() => setExpandedId(expanded ? null : u.id)}
                        className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        {expanded ? 'Hide actions' : `${u.action_items.length} action${u.action_items.length > 1 ? 's' : ''}`}
                        <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
          <span className="text-xs text-muted-foreground">Business impact notes are AI-generated guidance — confirm with Compliance before acting.</span>
          <Link to="/regulatory-scanner" className="text-xs font-semibold text-primary inline-flex items-center shrink-0">
            View all {stats.total} announcements<ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
