import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  variant?: 'default' | 'card' | 'minimal';
}

export const CollapsibleSection = ({
  title,
  subtitle,
  icon: Icon,
  children,
  defaultOpen = true,
  badge,
  className,
  headerClassName,
  contentClassName,
  variant = 'default',
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const variantStyles = {
    default: {
      container: 'border border-border rounded-lg overflow-hidden',
      header: 'bg-muted/50 px-4 py-3',
      content: 'px-4 py-4',
    },
    card: {
      container: 'bg-card border border-border rounded-xl shadow-sm overflow-hidden',
      header: 'px-5 py-4 border-b border-border/50',
      content: 'p-5',
    },
    minimal: {
      container: '',
      header: 'py-2',
      content: 'pt-2',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn(styles.container, className)}>
      <CollapsibleTrigger asChild>
        <button 
          className={cn(
            'w-full flex items-center justify-between gap-3 text-left transition-colors hover:bg-muted/30',
            styles.header,
            headerClassName
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="shrink-0 p-2 rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{title}</h3>
                {badge}
              </div>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors">
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={cn(
          'animate-accordion-down',
          styles.content,
          contentClassName
        )}>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// Accordion-style group of collapsible sections
interface CollapsibleGroupProps {
  children: React.ReactNode;
  className?: string;
  allowMultiple?: boolean;
}

export const CollapsibleGroup = ({ 
  children, 
  className,
}: CollapsibleGroupProps) => {
  return (
    <div className={cn('space-y-3', className)}>
      {children}
    </div>
  );
};

// Quick toggle section for mobile
interface ToggleSectionProps {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const ToggleSection = ({
  title,
  count,
  children,
  defaultOpen = false,
  className,
}: ToggleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('border-b border-border/50 last:border-0', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-1 text-left"
      >
        <span className="font-medium text-sm">{title}</span>
        <div className="flex items-center gap-2">
          {count !== undefined && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              {count}
            </span>
          )}
          <ChevronDown 
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180'
            )} 
          />
        </div>
      </button>
      <div className={cn(
        'overflow-hidden transition-all duration-200',
        isOpen ? 'max-h-[2000px] opacity-100 pb-4' : 'max-h-0 opacity-0'
      )}>
        {children}
      </div>
    </div>
  );
};
