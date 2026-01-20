import { Star } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type GhanaInsurer } from '@/types/insurers';
import { MetricConfig } from './types';

interface ComparisonTableProps {
  metricsConfig: MetricConfig[];
  selectedInsurers: GhanaInsurer[];
  chartColors: string[];
  getMetricValue: (insurerId: string, key: string) => number | null;
  getBestValue: (metricKey: string, highlight: 'max' | 'min') => number | null;
}

export function ComparisonTable({
  metricsConfig,
  selectedInsurers,
  chartColors,
  getMetricValue,
  getBestValue,
}: ComparisonTableProps) {
  return (
    <ScrollArea className="h-[300px] rounded-xl border border-border/40">
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow className="border-b border-border/40">
            <TableHead className="w-[180px] bg-secondary/30 font-semibold">Metric</TableHead>
            {selectedInsurers.map((insurer, idx) => (
              <TableHead 
                key={insurer.id} 
                className="text-center bg-secondary/30"
                style={{ borderTop: `3px solid ${chartColors[idx]}` }}
              >
                <div className="flex flex-col items-center gap-1 py-2">
                  <span className="font-semibold text-xs">{insurer.shortName}</span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {metricsConfig.map(({ key, label, icon: Icon, format, highlight }) => {
            const bestValue = getBestValue(key, highlight);
            return (
              <TableRow key={key} className="border-b border-border/30 hover:bg-secondary/20">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{label}</span>
                  </div>
                </TableCell>
                {selectedInsurers.map((insurer) => {
                  const value = getMetricValue(insurer.id, key);
                  const isBest = bestValue !== null && value === bestValue && selectedInsurers.length > 1;
                  return (
                    <TableCell 
                      key={insurer.id} 
                      className="text-center"
                    >
                      <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                        value === null
                          ? 'text-muted-foreground'
                          : isBest 
                          ? 'bg-primary/10 text-primary font-semibold' 
                          : ''
                      }`}>
                        <span className="text-base font-bold">
                          {format(value)}
                        </span>
                        {isBest && <Star className="h-3 w-3 fill-primary ml-1" />}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
