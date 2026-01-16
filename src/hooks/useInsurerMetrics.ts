import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { InsuranceCategory } from '@/types/insurers';

export interface InsurerMetrics {
  id: string;
  insurer_id: string;
  insurer_name: string;
  category: InsuranceCategory;
  gross_premium: number | null;
  net_premium: number | null;
  total_assets: number | null;
  total_claims_paid: number | null;
  shareholders_funds: number | null;
  market_share: number | null;
  claims_ratio: number | null;
  expense_ratio: number | null;
  combined_ratio: number | null;
  solvency_ratio: number | null;
  customer_rating: number | null;
  branches: number | null;
  products_offered: number | null;
  employees: number | null;
  years_in_ghana: number | null;
  report_year: number;
  report_quarter: number | null;
  report_source: string | null;
  created_at: string;
  updated_at: string;
  // Product breakdown columns
  group_policies: number | null;
  term_premium: number | null;
  credit_life: number | null;
  whole_life: number | null;
  endowment: number | null;
  universal_life: number | null;
  investment_income: number | null;
  profit_after_tax: number | null;
}

export function useInsurerMetrics(category?: InsuranceCategory, year?: number, quarter?: number) {
  const queryClient = useQueryClient();
  const latestYear = year || new Date().getFullYear(); // Default to current year for quarterly data

  const { data: metrics = [], isLoading, refetch } = useQuery({
    queryKey: ['insurer-metrics', category, latestYear, quarter],
    queryFn: async () => {
      let query = supabase
        .from('insurer_metrics')
        .select('*')
        .eq('report_year', latestYear)
        .order('market_share', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      if (quarter) {
        query = query.eq('report_quarter', quarter);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching insurer metrics:', error);
        return [];
      }
      
      return data as InsurerMetrics[];
    },
  });

  // Get available report years
  const { data: availableYears = [] } = useQuery({
    queryKey: ['insurer-metrics-years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurer_metrics')
        .select('report_year')
        .order('report_year', { ascending: false });

      if (error) {
        console.error('Error fetching report years:', error);
        return [];
      }

      // Get unique years
      const years = [...new Set(data.map(d => d.report_year))];
      return years;
    },
  });

  // Get available quarters for the selected year
  const { data: availableQuarters = [] } = useQuery({
    queryKey: ['insurer-metrics-quarters', latestYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurer_metrics')
        .select('report_quarter')
        .eq('report_year', latestYear)
        .order('report_quarter', { ascending: false });

      if (error) {
        console.error('Error fetching report quarters:', error);
        return [];
      }

      // Get unique quarters
      const quarters = [...new Set(data.map(d => d.report_quarter).filter(q => q !== null))];
      return quarters as number[];
    },
  });

  // Real-time subscription for metric updates
  useEffect(() => {
    const channel = supabase
      .channel('insurer-metrics-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'insurer_metrics',
        },
        (payload) => {
          console.log('Real-time update received:', payload.eventType);
          // Invalidate all related queries when data changes
          queryClient.invalidateQueries({ queryKey: ['insurer-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['insurer-metrics-years'] });
          queryClient.invalidateQueries({ queryKey: ['insurer-metrics-quarters'] });
          queryClient.invalidateQueries({ queryKey: ['comparison-historical'] });
          queryClient.invalidateQueries({ queryKey: ['quarterly-data'] });
          queryClient.invalidateQueries({ queryKey: ['market-performance'] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time subscription active for insurer_metrics');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Get metrics for a specific insurer - match by normalized insurer name
  const getMetricsForInsurer = (insurerId: string): InsurerMetrics | undefined => {
    // First try exact insurer_id match
    let found = metrics.find(m => m.insurer_id === insurerId);
    if (found) return found;
    
    // Try matching by normalized insurer name (most reliable)
    const normalizedSearchId = insurerId.toLowerCase().replace(/-/g, ' ').replace(/_/g, ' ');
    found = metrics.find(m => {
      const normalizedName = m.insurer_name.toLowerCase();
      // Check if the search term is contained in the name or vice versa
      return normalizedName.includes(normalizedSearchId) || 
             normalizedSearchId.split(' ').every(word => normalizedName.includes(word));
    });
    if (found) return found;
    
    // Try prefix match on insurer_id (e.g., 'enterprise-life' matches 'enterprise-life-2025-q2')
    const baseId = insurerId.replace(/-\d{4}-q\d$/, '');
    found = metrics.find(m => {
      const dbBaseId = m.insurer_id.replace(/-\d{4}-q\d$/, '');
      return dbBaseId === baseId || m.insurer_id.startsWith(insurerId);
    });
    
    return found;
  };

  return {
    metrics,
    availableYears,
    availableQuarters,
    isLoading,
    refetch,
    getMetricsForInsurer,
  };
}

// Fallback metrics when no data available
export const fallbackMetrics: Omit<InsurerMetrics, 'id' | 'insurer_id' | 'insurer_name' | 'category' | 'report_year' | 'report_source' | 'created_at' | 'updated_at'> = {
  gross_premium: null,
  net_premium: null,
  total_assets: null,
  total_claims_paid: null,
  shareholders_funds: null,
  market_share: null,
  claims_ratio: null,
  expense_ratio: null,
  combined_ratio: null,
  solvency_ratio: null,
  customer_rating: null,
  branches: null,
  products_offered: null,
  employees: null,
  years_in_ghana: null,
  report_quarter: null,
  group_policies: null,
  term_premium: null,
  credit_life: null,
  whole_life: null,
  endowment: null,
  universal_life: null,
  investment_income: null,
  profit_after_tax: null,
};
