import { useState } from 'react';
import { Filter, X, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { NewsCategory } from '@/types/news';
import { categoryLabels, categoryColors } from '@/types/news';

interface NewsFilterBarProps {
  activeCategory: NewsCategory | 'all';
  onCategoryChange: (category: NewsCategory | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  articleCount: number;
}

const categories: (NewsCategory | 'all')[] = [
  'all', 'general', 'enterprise_group', 'regulator', 'life_insurance', 'nonlife', 'pensions', 'claims'
];

const categoryAllLabels: Record<string, string> = {
  all: 'All News',
  ...categoryLabels,
};

export function NewsFilterBar({ activeCategory, onCategoryChange, searchQuery, onSearchChange, articleCount }: NewsFilterBarProps) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
        {/* Search row */}
        {showSearch && (
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search insurance news..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-10 md:h-9 text-base md:text-sm"
                autoFocus
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close search"
              className="h-10 w-10 md:h-9 md:w-9 flex-shrink-0"
              onClick={() => { setShowSearch(false); onSearchChange(''); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Category pills + search toggle */}
        <div className="flex items-center gap-2">
          {/* Scrollable pills with edge fades to hint at overflow */}
          <div className="relative flex-1 min-w-0">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategoryChange(cat)}
                  aria-pressed={activeCategory === cat}
                  className={`px-3.5 min-h-9 md:min-h-0 md:py-1.5 inline-flex items-center text-xs font-medium rounded-full whitespace-nowrap transition-all active:scale-95 ${
                    activeCategory === cat
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                  }`}
                >
                  {categoryAllLabels[cat]}
                </button>
              ))}
            </div>
            {/* Right fade to hint that more pills exist off-screen */}
            <div className="md:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent" />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!showSearch && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search news"
                className="h-10 w-10 md:h-9 md:w-9"
                onClick={() => setShowSearch(true)}
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
              {articleCount}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
