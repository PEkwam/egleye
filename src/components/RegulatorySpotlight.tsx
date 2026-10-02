import { Link } from 'react-router-dom';
import { Radar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRegulatoryUpdates } from '@/hooks/useRegulatoryUpdates';

export function RegulatorySpotlight() {
  const { data = [] } = useRegulatoryUpdates(20);
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
