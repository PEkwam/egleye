import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RegulatoryUpdate {
  id: string;
  regulator: string;
  title: string;
  summary: string | null;
  source_url: string;
  source_name: string | null;
  published_at: string | null;
  impact_level: 'high' | 'medium' | 'low';
  business_impact: string | null;
  affected_units: string[];
  action_items: string[];
  deadline: string | null;
  analyzed_at: string | null;
}

export const REGULATOR_LABELS: Record<string, string> = {
  NIC: 'National Insurance Commission',
  BOG: 'Bank of Ghana',
  SEC: 'Securities & Exchange Commission',
  CSA: 'Cyber Security Authority',
  DPC: 'Data Protection Commission',
};

export function useRegulatoryUpdates(limit = 100) {
  return useQuery({
    queryKey: ['regulatory-updates', limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('regulatory_updates')
        .select('*')
        .not('analyzed_at', 'is', null)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as RegulatoryUpdate[];
    },
  });
}
