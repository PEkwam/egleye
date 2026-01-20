import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { InsurerLogo } from '@/components/InsurerLogo';
import { type GhanaInsurer } from '@/types/insurers';
import { InsuranceType, DataAvailabilityItem } from './types';

interface InsurerSelectorProps {
  selectedInsurers: GhanaInsurer[];
  availableInsurers: GhanaInsurer[];
  insuranceType: InsuranceType;
  selectedYear: number | null;
  selectedQuarter: number;
  dataAvailability: DataAvailabilityItem[];
  onAddInsurer: (insurerId: string) => void;
  onRemoveInsurer: (insurerId: string) => void;
  getInsurerChartColors: string[];
}

export function InsurerSelector({
  selectedInsurers,
  availableInsurers,
  insuranceType,
  selectedYear,
  selectedQuarter,
  dataAvailability,
  onAddInsurer,
  onRemoveInsurer,
  getInsurerChartColors: CHART_COLORS,
}: InsurerSelectorProps) {
  // Check if insurer has data for selected period
  const checkHasData = (insurerId: string): boolean => {
    const availability = dataAvailability.find(d => d.insurer.id === insurerId);
    return availability?.hasData ?? false;
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Selected Insurers Chips */}
      {selectedInsurers.map((insurer, idx) => (
        <div 
          key={insurer.id} 
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl bg-card border-2 shadow-sm hover:shadow-md transition-shadow"
          style={{ borderColor: CHART_COLORS[idx] }}
        >
          <InsurerLogo 
            name={insurer.name} 
            shortName={insurer.shortName} 
            website={insurer.website}
            brandColor={insurer.brandColor}
            size="sm"
          />
          <span className="text-sm font-medium">{insurer.shortName}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive rounded-full"
            onClick={() => onRemoveInsurer(insurer.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      
      {/* Add Insurer Dropdown */}
      {selectedInsurers.length < 4 && (
        <Select onValueChange={onAddInsurer}>
          <SelectTrigger className="w-[180px] rounded-xl bg-card border-dashed border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-all">
            <Plus className="h-4 w-4 text-primary mr-2" />
            <SelectValue placeholder="Add company" />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-[300px]">
              {availableInsurers.map((insurer) => {
                const hasData = checkHasData(insurer.id);
                return (
                  <SelectItem 
                    key={insurer.id} 
                    value={insurer.id}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <InsurerLogo 
                        name={insurer.name} 
                        shortName={insurer.shortName} 
                        website={insurer.website}
                        brandColor={insurer.brandColor}
                        size="sm"
                      />
                      <span>{insurer.shortName}</span>
                      {hasData && (
                        <span className="text-xs text-primary ml-1">●</span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </ScrollArea>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
