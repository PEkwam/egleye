import { useState, useMemo } from 'react';
import { X, Check, Users, ChevronDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface InsurerSelectorProps {
  category: string;
  selectedYear: number;
  selectedQuarter: number;
  selectedInsurers: string[];
  onSelectionChange: (insurers: string[]) => void;
  maxSelection?: number;
}

export function InsurerSelector({
  category,
  selectedYear,
  selectedQuarter,
  selectedInsurers,
  onSelectionChange,
  maxSelection = 10,
}: InsurerSelectorProps) {
  const [open, setOpen] = useState(false);

  // Fetch all available insurers for the selected period
  const { data: availableInsurers = [] } = useQuery({
    queryKey: ['available-insurers', category, selectedYear, selectedQuarter],
    queryFn: async () => {
      let query = supabase
        .from('insurer_metrics')
        .select('insurer_id, insurer_name, gross_premium, market_share')
        .eq('report_year', selectedYear)
        .eq('report_quarter', selectedQuarter)
        .order('gross_premium', { ascending: false });

      if (category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching insurers:', error);
        return [];
      }

      return data.map((d) => ({
        id: d.insurer_id,
        name: d.insurer_name,
        premium: d.gross_premium,
        marketShare: d.market_share ? d.market_share * 100 : null, // Convert decimal to percentage
      }));
    },
  });

  const handleToggleInsurer = (insurerId: string) => {
    if (selectedInsurers.includes(insurerId)) {
      onSelectionChange(selectedInsurers.filter((id) => id !== insurerId));
    } else if (selectedInsurers.length < maxSelection) {
      onSelectionChange([...selectedInsurers, insurerId]);
    }
  };

  const handleSelectAll = () => {
    const allIds = availableInsurers.slice(0, maxSelection).map((i) => i.id);
    onSelectionChange(allIds);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const selectedNames = useMemo(() => {
    return selectedInsurers
      .map((id) => {
        const insurer = availableInsurers.find((i) => i.id === id);
        return insurer?.name?.split(' ')[0] || id;
      })
      .slice(0, 3);
  }, [selectedInsurers, availableInsurers]);

  const formatPremium = (value: number | null) => {
    if (!value) return '';
    if (value >= 1e9) return `GH₵${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `GH₵${(value / 1e6).toFixed(0)}M`;
    return `GH₵${value.toLocaleString()}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 h-9 min-w-[140px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {selectedInsurers.length === 0 ? (
              <span className="text-muted-foreground">All Insurers</span>
            ) : (
              <span className="truncate max-w-[100px]">
                {selectedNames.join(', ')}
                {selectedInsurers.length > 3 && ` +${selectedInsurers.length - 3}`}
              </span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="end">
        <div className="p-3 border-b border-border/50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Select Insurers</h4>
            <Badge variant="secondary" className="text-xs">
              {selectedInsurers.length}/{maxSelection}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={handleSelectAll}
              disabled={availableInsurers.length === 0}
            >
              <Users className="h-3 w-3 mr-1" />
              Select Top {Math.min(maxSelection, availableInsurers.length)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={handleClearAll}
              disabled={selectedInsurers.length === 0}
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-1">
            {availableInsurers.map((insurer, index) => {
              const isSelected = selectedInsurers.includes(insurer.id);
              const isDisabled = !isSelected && selectedInsurers.length >= maxSelection;

              return (
                <button
                  key={insurer.id}
                  onClick={() => handleToggleInsurer(insurer.id)}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/50 border border-transparent'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div
                    className={`flex items-center justify-center w-5 h-5 rounded border transition-colors ${
                      isSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/30'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{insurer.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>#{index + 1}</span>
                      <span>•</span>
                      <span>{formatPremium(insurer.premium)}</span>
                      {insurer.marketShare && (
                        <>
                          <span>•</span>
                          <span>{insurer.marketShare.toFixed(1)}%</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {availableInsurers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No insurers found for this period
              </div>
            )}
          </div>
        </ScrollArea>

        {selectedInsurers.length > 0 && (
          <div className="p-3 border-t border-border/50 bg-muted/30">
            <div className="flex flex-wrap gap-1">
              {selectedInsurers.slice(0, 5).map((id) => {
                const insurer = availableInsurers.find((i) => i.id === id);
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="text-xs gap-1 pr-1"
                  >
                    {insurer?.name?.split(' ')[0] || id}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleInsurer(id);
                      }}
                      className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                );
              })}
              {selectedInsurers.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedInsurers.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
