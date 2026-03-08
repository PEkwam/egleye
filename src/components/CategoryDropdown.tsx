import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InsurerLogo } from '@/components/InsurerLogo';
import type { GhanaInsurer, InsuranceCategory } from '@/types/insurers';
import { categoryConfig, lifeInsurers, nonlifeInsurers, pensionProviders } from '@/types/insurers';

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

export function CategoryDropdown({ category, onInsurerSelect, isActive }: CategoryDropdownProps) {
  const config = categoryConfig[category];
  const insurers = insurersByCategory[category];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
            isActive
              ? `bg-gradient-to-r ${config.color} text-white shadow-sm`
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <span>{config.icon}</span>
          {config.label}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-1">
        <ScrollArea className="max-h-80">
          {insurers.map((insurer) => (
            <DropdownMenuItem
              key={insurer.id}
              onClick={() => onInsurerSelect(insurer)}
              className="rounded-lg p-2 cursor-pointer flex items-center gap-2.5"
            >
              <InsurerLogo insurer={insurer} size="sm" />
              <span className="text-sm font-medium truncate">{insurer.shortName}</span>
            </DropdownMenuItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
