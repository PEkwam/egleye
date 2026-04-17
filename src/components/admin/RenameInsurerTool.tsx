import { useState, useMemo } from 'react';
import { Edit3, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface InsurerRow {
  insurer_id: string;
  name: string;
  short_name: string;
  website: string | null;
  brand_color: string | null;
  category: string;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function RenameInsurerTool() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [newId, setNewId] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const { data: insurers = [], isLoading } = useQuery({
    queryKey: ['rename-insurer-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurers')
        .select('insurer_id, name, short_name, website, brand_color, category')
        .order('name');
      if (error) throw error;
      return data as InsurerRow[];
    },
  });

  const selected = useMemo(
    () => insurers.find((i) => i.insurer_id === selectedId),
    [insurers, selectedId]
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const ins = insurers.find((i) => i.insurer_id === id);
    if (ins) {
      setNewName(ins.name);
      setNewShortName(ins.short_name);
      setNewId(ins.insurer_id);
      setNewWebsite(ins.website ?? '');
    }
  };

  const handleAutoSlug = () => {
    if (newShortName) setNewId(slugify(newShortName));
  };

  const canSubmit =
    selected &&
    newName.trim().length > 0 &&
    newShortName.trim().length > 0 &&
    newId.trim().length > 0 &&
    /^[a-z0-9-]+$/.test(newId);

  const hasChanges =
    selected &&
    (selected.name !== newName.trim() ||
      selected.short_name !== newShortName.trim() ||
      selected.insurer_id !== newId.trim() ||
      (selected.website ?? '') !== newWebsite.trim());

  const performRename = async () => {
    if (!selected) return;
    setIsRunning(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('rename-insurer', {
        body: {
          oldInsurerId: selected.insurer_id,
          newInsurerId: newId.trim(),
          newName: newName.trim(),
          newShortName: newShortName.trim(),
          newWebsite: newWebsite.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setLastResult(data);
      toast.success(`Renamed to "${newName.trim()}" across all tables`);
      queryClient.invalidateQueries({ queryKey: ['rename-insurer-list'] });
      queryClient.invalidateQueries({ queryKey: ['insurer-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['insurers'] });
      setSelectedId(newId.trim());
    } catch (err: any) {
      console.error('Rename error:', err);
      toast.error(err.message ?? 'Failed to rename insurer');
    } finally {
      setIsRunning(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5 text-primary" />
          Rename Insurer
        </CardTitle>
        <CardDescription>
          Rename an insurer across all tables (insurers, metrics, mappings, logos, news) in one click.
          Changes propagate to dashboards immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Select insurer to rename</Label>
          <Select value={selectedId} onValueChange={handleSelect} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? 'Loading…' : 'Choose an insurer…'} />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {insurers.map((ins) => (
                <SelectItem key={ins.insurer_id} value={ins.insurer_id}>
                  <span className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                      {ins.category}
                    </span>
                    {ins.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selected && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label>New full name *</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Emple Life Insurance Ghana LTD"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label>New short name *</Label>
                <Input
                  value={newShortName}
                  onChange={(e) => setNewShortName(e.target.value)}
                  placeholder="e.g. Emple Life"
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label>New insurer ID (slug) *</Label>
                <div className="flex gap-2">
                  <Input
                    value={newId}
                    onChange={(e) => setNewId(e.target.value.toLowerCase())}
                    placeholder="e.g. emple-life"
                    maxLength={80}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAutoSlug}>
                    Auto
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Lowercase letters, numbers, hyphens only.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  placeholder="https://…"
                  maxLength={255}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  This will update the following tables:
                </p>
                <p className="text-amber-800 dark:text-amber-300">
                  insurers · insurer_metrics · nonlife_insurer_metrics · insurer_id_mappings ·
                  insurer_logos · news_articles (title/description/content)
                </p>
                <p className="text-amber-800 dark:text-amber-300">
                  Note: hard-coded references in <code>src/types/insurers.ts</code> and edge functions
                  must still be updated manually in code.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleSelect(selected.insurer_id)}
                disabled={!hasChanges || isRunning}
              >
                Reset
              </Button>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!canSubmit || !hasChanges || isRunning}
              >
                {isRunning ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Renaming…</>
                ) : (
                  <><Edit3 className="h-4 w-4 mr-2" />Rename Across All Tables</>
                )}
              </Button>
            </div>
          </>
        )}

        {lastResult?.success && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
            <p className="flex items-center gap-2 font-medium text-emerald-900 dark:text-emerald-200">
              <Check className="h-4 w-4" /> Rename complete
            </p>
            <p className="text-emerald-800 dark:text-emerald-300">
              {lastResult.from?.name} → {lastResult.to?.name}
            </p>
            <ul className="text-emerald-800 dark:text-emerald-300 mt-1 space-y-0.5">
              {Object.entries(lastResult.updated || {}).map(([table, count]) => (
                <li key={table}>
                  <code>{table}</code>: {String(count)} row{count === 1 ? '' : 's'}
                </li>
              ))}
            </ul>
          </div>
        )}

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm rename</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>This will permanently rename across the database:</p>
                  <div className="p-2 rounded bg-muted">
                    <p><span className="text-muted-foreground">From:</span> {selected?.name}</p>
                    <p><span className="text-muted-foreground">To:</span> {newName}</p>
                    <p><span className="text-muted-foreground">New ID:</span> <code>{newId}</code></p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This action cannot be undone automatically.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRunning}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={performRename} disabled={isRunning}>
                {isRunning ? 'Renaming…' : 'Yes, rename'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
