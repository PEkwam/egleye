import { Award, Target, Star, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { InsurerLogo } from '@/components/InsurerLogo';
import { RankingItem, MetricConfig } from './types';

interface RankingsTabProps {
  rankings: RankingItem[];
  metricsConfig: MetricConfig[];
  chartColors: string[];
  getMetricValue: (insurerId: string, key: string) => number | null;
}

export function RankingsTab({ rankings, metricsConfig, chartColors, getMetricValue }: RankingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {rankings.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-yellow-500/5 border-2 border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/30">
                <Award className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">Leader</span>
            </div>
            <p className="text-lg font-bold">{rankings[0]?.insurer.shortName || 'N/A'}</p>
            <p className="text-xs text-muted-foreground mt-1">{rankings[0]?.wins || 0} category wins</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-400/15 via-slate-300/10 to-gray-400/5 border-2 border-slate-400/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-slate-400 to-gray-500 shadow-lg shadow-slate-400/30">
                <Target className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase">Runner-up</span>
            </div>
            <p className="text-lg font-bold">{rankings[1]?.insurer.shortName || 'N/A'}</p>
            <p className="text-xs text-muted-foreground mt-1">{rankings[1]?.wins || 0} category wins</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-700/15 via-amber-600/10 to-orange-600/5 border-2 border-amber-700/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-700 to-orange-700 shadow-lg shadow-amber-700/30">
                <Star className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-500 uppercase">Third</span>
            </div>
            <p className="text-lg font-bold">{rankings[2]?.insurer.shortName || 'N/A'}</p>
            <p className="text-xs text-muted-foreground mt-1">{rankings[2]?.wins || 0} category wins</p>
          </div>
        </div>
      )}
      
      {/* Detailed Rankings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <h4 className="text-sm font-bold">Detailed Performance Rankings</h4>
        </div>
        
        <div className="grid gap-4">
          {rankings.map((ranking, idx) => (
            <div 
              key={ranking.insurer.id}
              className={`relative overflow-hidden p-5 rounded-2xl border-2 transition-all hover:shadow-lg ${
                idx === 0 
                  ? 'bg-gradient-to-br from-amber-50 via-yellow-50/50 to-orange-50/30 dark:from-amber-900/20 dark:via-yellow-900/10 dark:to-orange-900/5 border-amber-400/50 shadow-lg shadow-amber-500/10' 
                  : idx === 1
                  ? 'bg-gradient-to-br from-slate-50 via-gray-50/50 to-slate-100/30 dark:from-slate-800/30 dark:via-gray-800/20 dark:to-slate-900/10 border-slate-400/40'
                  : idx === 2
                  ? 'bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-yellow-50/20 dark:from-amber-900/15 dark:via-orange-900/10 dark:to-yellow-900/5 border-amber-600/30'
                  : 'bg-card border-border/40 hover:border-primary/30'
              }`}
            >
              {/* Position badge */}
              <div className={`absolute top-0 right-0 px-4 py-2 rounded-bl-2xl text-sm font-bold ${
                idx === 0 ? 'bg-amber-500 text-white' :
                idx === 1 ? 'bg-slate-400 text-white' :
                idx === 2 ? 'bg-amber-700 text-white' :
                'bg-secondary text-muted-foreground'
              }`}>
                #{idx + 1}
              </div>
              
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg ${
                  idx === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-amber-500/40' :
                  idx === 1 ? 'bg-gradient-to-br from-slate-300 to-gray-400 text-white shadow-slate-400/40' :
                  idx === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-amber-600/40' :
                  'bg-secondary text-muted-foreground'
                }`}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                </div>
                <InsurerLogo name={ranking.insurer.name} shortName={ranking.insurer.shortName} website={ranking.insurer.website} brandColor={ranking.insurer.brandColor} size="lg" />
                <div className="flex-1">
                  <h4 className="font-bold text-lg">{ranking.insurer.shortName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] bg-primary/5">
                      Score: {ranking.score}
                    </Badge>
                    {ranking.wins > 0 && (
                      <Badge className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                        <Star className="h-2.5 w-2.5 mr-0.5 fill-amber-500" />
                        {ranking.wins} wins
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Metric Scores */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {metricsConfig.slice(0, 4).map(({ key, label, format, icon: Icon }) => {
                  const value = getMetricValue(ranking.insurer.id, key);
                  return (
                    <div key={key} className="p-2.5 rounded-xl bg-secondary/50 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-medium truncate">{label}</span>
                      </div>
                      <span className="text-sm font-bold">{format(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
