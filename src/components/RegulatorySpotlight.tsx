import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Radar, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRegulatoryUpdates } from '@/hooks/useRegulatoryUpdates';

export function RegulatorySpotlight() {
  const { data = [] } = useRegulatoryUpdates(20);
  const navigate = useNavigate();

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

  if (data.length === 0) return null;
  const top = [...data].sort((a, b) => (a.impact_level === 'high' ? -1 : 0) - (b.impact_level === 'high' ? -1 : 0)).slice(0, 3);

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold flex items-center gap-2"><Radar className="h-5 w-5 text-primary" />Regulatory Horizon</h2>
          <Link to="/regulatory-scanner" className="text-sm font-semibold text-primary inline-flex items-center">Open scanner<ChevronRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {top.map((u) => (
            <Link key={u.id} to="/regulatory-scanner" className="rounded-xl border border-border p-4 hover:bg-muted transition-colors block">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase mb-2">
                <span className="text-foreground">{u.regulator}</span>
                <span className={cn('px-1.5 py-0.5 rounded', u.impact_level === 'high' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground')}>{u.impact_level}</span>
              </div>
              <div className="font-bold text-sm text-card-foreground line-clamp-2">{u.title}</div>
              {u.business_impact && <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{u.business_impact}</p>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
