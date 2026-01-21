import { useState, useEffect } from 'react';
import { Plus, X, Search, Filter, Tag, Ban, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface NewsFiltersSectionProps {
  onTriggerCrawl?: (mode?: string) => void;
  isCrawling?: boolean;
}

export function NewsFiltersSection({ onTriggerCrawl, isCrawling }: NewsFiltersSectionProps) {
  const queryClient = useQueryClient();
  const [newIncludeKeyword, setNewIncludeKeyword] = useState('');
  const [newExcludeKeyword, setNewExcludeKeyword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Fetch include keywords from database
  const { data: includeKeywordsData } = useQuery({
    queryKey: ['news-include-keywords'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'news_include_keywords')
        .maybeSingle();
      
      if (error) throw error;
      return data?.setting_value?.split(',').map((k: string) => k.trim()).filter(Boolean) || [];
    },
  });

  // Fetch exclude keywords from database
  const { data: excludeKeywordsData } = useQuery({
    queryKey: ['news-exclude-keywords'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'news_exclude_keywords')
        .maybeSingle();
      
      if (error) throw error;
      return data?.setting_value?.split(',').map((k: string) => k.trim()).filter(Boolean) || [];
    },
  });

  const [includeKeywords, setIncludeKeywords] = useState<string[]>([]);
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([]);

  // Sync state with database
  useEffect(() => {
    if (includeKeywordsData) setIncludeKeywords(includeKeywordsData);
  }, [includeKeywordsData]);

  useEffect(() => {
    if (excludeKeywordsData) setExcludeKeywords(excludeKeywordsData);
  }, [excludeKeywordsData]);

  const saveKeywords = async (type: 'include' | 'exclude', keywords: string[]) => {
    setIsSaving(true);
    try {
      const settingKey = type === 'include' ? 'news_include_keywords' : 'news_exclude_keywords';
      const { error } = await supabase
        .from('site_settings')
        .update({ setting_value: keywords.join(',') })
        .eq('setting_key', settingKey);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: [`news-${type}-keywords`] });
      toast.success(`${type === 'include' ? 'Include' : 'Exclude'} keywords saved`);
    } catch (err) {
      console.error('Error saving keywords:', err);
      toast.error('Failed to save keywords');
    } finally {
      setIsSaving(false);
    }
  };

  const addIncludeKeyword = () => {
    const keyword = newIncludeKeyword.trim().toLowerCase();
    if (!keyword) return;
    if (includeKeywords.includes(keyword)) {
      toast.error('Keyword already exists');
      return;
    }
    const updated = [...includeKeywords, keyword];
    setIncludeKeywords(updated);
    saveKeywords('include', updated);
    setNewIncludeKeyword('');
  };

  const removeIncludeKeyword = (keyword: string) => {
    const updated = includeKeywords.filter(k => k !== keyword);
    setIncludeKeywords(updated);
    saveKeywords('include', updated);
  };

  const addExcludeKeyword = () => {
    const keyword = newExcludeKeyword.trim().toLowerCase();
    if (!keyword) return;
    if (excludeKeywords.includes(keyword)) {
      toast.error('Keyword already exists');
      return;
    }
    const updated = [...excludeKeywords, keyword];
    setExcludeKeywords(updated);
    saveKeywords('exclude', updated);
    setNewExcludeKeyword('');
  };

  const removeExcludeKeyword = (keyword: string) => {
    const updated = excludeKeywords.filter(k => k !== keyword);
    setExcludeKeywords(updated);
    saveKeywords('exclude', updated);
  };

  const handleSearchWithKeyword = () => {
    if (!newIncludeKeyword.trim()) return;
    addIncludeKeyword();
    // Optionally trigger crawl after adding
    if (onTriggerCrawl) {
      toast.info(`Added "${newIncludeKeyword}" - click "Crawl News" to search for matching articles`);
    }
  };

  const filteredIncludeKeywords = includeKeywords.filter(k => 
    k.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredExcludeKeywords = excludeKeywords.filter(k => 
    k.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Suggested keywords to add
  const suggestedKeywords = [
    'life insurance', 'non-life insurance', 'motor insurance', 'health insurance',
    'fire insurance', 'marine insurance', 'broker', 'underwriting', 'risk management',
    'insurance commission', 'regulation', 'compliance', 'solvency', 'capital adequacy'
  ].filter(k => !includeKeywords.includes(k));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          News Filters & Keywords
        </CardTitle>
        <CardDescription>
          Manage keywords to include or exclude from news search. Click on a keyword to add it and search for relevant news.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Search Filter */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter keywords..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="include" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="include" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Include ({includeKeywords.length})
            </TabsTrigger>
            <TabsTrigger value="exclude" className="flex items-center gap-2">
              <Ban className="h-4 w-4" />
              Exclude ({excludeKeywords.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="include" className="space-y-4">
            {/* Add Include Keyword */}
            <div className="flex gap-2">
              <Input
                placeholder="Add keyword to search for..."
                value={newIncludeKeyword}
                onChange={(e) => setNewIncludeKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchWithKeyword()}
                className="flex-1"
              />
              <Button 
                onClick={handleSearchWithKeyword} 
                disabled={isSaving || !newIncludeKeyword.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Suggested Keywords */}
            {suggestedKeywords.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Suggested:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedKeywords.slice(0, 8).map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                      onClick={() => {
                        const updated = [...includeKeywords, keyword];
                        setIncludeKeywords(updated);
                        saveKeywords('include', updated);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Include Keywords List */}
            <ScrollArea className="h-[200px]">
              <div className="flex flex-wrap gap-2">
                {filteredIncludeKeywords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No keywords found</p>
                ) : (
                  filteredIncludeKeywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="secondary"
                      className="group flex items-center gap-1 pr-1"
                    >
                      {keyword}
                      <button
                        onClick={() => removeIncludeKeyword(keyword)}
                        className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 opacity-50 group-hover:opacity-100 transition-opacity"
                        title="Remove keyword"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="exclude" className="space-y-4">
            {/* Add Exclude Keyword */}
            <div className="flex gap-2">
              <Input
                placeholder="Add keyword to block..."
                value={newExcludeKeyword}
                onChange={(e) => setNewExcludeKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addExcludeKeyword()}
                className="flex-1"
              />
              <Button 
                onClick={addExcludeKeyword} 
                disabled={isSaving || !newExcludeKeyword.trim()}
                size="sm"
                variant="destructive"
              >
                <Plus className="h-4 w-4 mr-1" />
                Block
              </Button>
            </div>

            <Separator />

            {/* Exclude Keywords List */}
            <ScrollArea className="h-[200px]">
              <div className="flex flex-wrap gap-2">
                {filteredExcludeKeywords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No blocked keywords found</p>
                ) : (
                  filteredExcludeKeywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="destructive"
                      className="group flex items-center gap-1 pr-1"
                    >
                      {keyword}
                      <button
                        onClick={() => removeExcludeKeyword(keyword)}
                        className="ml-1 p-0.5 rounded-full hover:bg-background/20 opacity-50 group-hover:opacity-100 transition-opacity"
                        title="Unblock keyword"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={() => onTriggerCrawl?.()} 
            disabled={isCrawling}
            className="flex-1 sm:flex-none"
          >
            {isCrawling ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Crawl News with Filters
          </Button>
          <p className="text-xs text-muted-foreground self-center">
            {includeKeywords.length} include filters • {excludeKeywords.length} blocked terms
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
