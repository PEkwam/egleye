import { ChevronDown, Heart, Car, Landmark, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { InsurerLogo } from '@/components/InsurerLogo';
import type { GhanaInsurer, InsuranceCategory } from '@/types/insurers';
import { categoryConfig, lifeInsurers, nonlifeInsurers, pensionProviders } from '@/types/insurers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CategoryDropdownProps {
  category: InsuranceCategory;
  onInsurerSelect: (insurer: GhanaInsurer) => void;
  isActive?: boolean;
}

const insurersByCategory: Record<InsuranceCategory, GhanaInsurer[]> = {
  life: lifeInsurers,
  nonlife: nonlifeInsurers,
  pension: pensionProviders,
};

const categoryIcons: Record<InsuranceCategory, React.ReactNode> = {
  life: <Heart className="h-4 w-4" />,
  nonlife: <Car className="h-4 w-4" />,
  pension: <Landmark className="h-4 w-4" />,
};

export function CategoryDropdown({ category, onInsurerSelect, isActive }: CategoryDropdownProps) {
  const config = categoryConfig[category];
  const staticInsurers = insurersByCategory[category];
  const CategoryIcon = categoryIcons[category];
  
  // Fetch logos from database
  const { data: dbInsurers = [] } = useQuery({
    queryKey: ['insurers-logos', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurers')
        .select('insurer_id, logo_url')
        .not('logo_url', 'is', null);
      if (error) return [];
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  // Merge static data with database logos
  const insurers = staticInsurers.map(insurer => {
    const dbInsurer = dbInsurers.find(db => db.insurer_id === insurer.id);
    return {
      ...insurer,
      logoUrl: dbInsurer?.logo_url || undefined,
    };
  });
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
            isActive
              ? `bg-gradient-to-r ${config.color} text-white shadow-md`
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
          }`}
        >
          {CategoryIcon}
          <span className="hidden lg:inline">{config.label}</span>
          <span className="lg:hidden">{category === 'life' ? 'Life' : category === 'nonlife' ? 'Non-Life' : 'Pension'}</span>
          <ChevronDown className={`h-3.5 w-3.5 opacity-70 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-[340px] bg-card border border-border/80 rounded-2xl shadow-2xl z-[100] p-2"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider py-3 px-2">
          <div className={`p-1.5 rounded-lg bg-gradient-to-r ${config.color}`}>
            <span className="text-white">{CategoryIcon}</span>
          </div>
          <span className="flex-1">
            {category === 'life' && 'Life Insurance Companies'}
            {category === 'nonlife' && 'Non-Life Insurance Companies'}
            {category === 'pension' && 'Pension & Trustees'}
          </span>
          <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-[11px] font-semibold">
            {insurers.length}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-2" />
        
        <ScrollArea className="h-[420px] pr-2">
          <div className="space-y-1">
            {insurers.map((insurer, index) => (
              <DropdownMenuItem
                key={insurer.id}
                onClick={() => onInsurerSelect(insurer)}
                className="dropdown-item-modern group"
                style={{ 
                  animationDelay: `${index * 30}ms`,
                }}
              >
                <InsurerLogo 
                  name={insurer.name} 
                  shortName={insurer.shortName} 
                  logoUrl={insurer.logoUrl}
                  website={insurer.website} 
                  brandColor={insurer.brandColor} 
                  size="sm" 
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {insurer.shortName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{insurer.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full shadow-inner flex-shrink-0 ring-2 ring-white/50"
                    style={{ backgroundColor: insurer.brandColor }}
                    title={insurer.brandColor}
                  />
                  <a
                    href={insurer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all flex-shrink-0 group/link"
                    title="Visit website"
                  >
                    <Globe className="h-4 w-4 group-hover/link:scale-110 transition-transform" />
                  </a>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        </ScrollArea>
        
        <DropdownMenuSeparator className="my-2" />
        <div className="px-2 py-2 text-center">
          <p className="text-[10px] text-muted-foreground">
            Licensed by NIC Ghana • Click to filter news
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}