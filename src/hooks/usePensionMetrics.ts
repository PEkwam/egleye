import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PensionFundMetric {
  id: string;
  fund_name: string;
  fund_id: string;
  fund_type: string;
  trustee_name: string | null;
  fund_manager: string | null;
  aum: number | null;
  aum_previous: number | null;
  aum_growth_rate: number | null;
  total_contributors: number | null;
  active_contributors: number | null;
  new_contributors: number | null;
  total_contributions: number | null;
  employer_contributions: number | null;
  employee_contributions: number | null;
  voluntary_contributions: number | null;
  investment_return: number | null;
  benchmark_return: number | null;
  net_asset_value: number | null;
  unit_price: number | null;
  equity_allocation: number | null;
  fixed_income_allocation: number | null;
  money_market_allocation: number | null;
  alternative_investments: number | null;
  total_benefits_paid: number | null;
  lump_sum_payments: number | null;
  pension_payments: number | null;
  expense_ratio: number | null;
  admin_expense_ratio: number | null;
  investment_expense_ratio: number | null;
  market_share: number | null;
  rank_by_aum: number | null;
  report_year: number;
  report_quarter: number | null;
  report_source: string | null;
  created_at: string;
  updated_at: string;
}

export function usePensionMetrics(
  fundType?: string,
  year?: number,
  quarter?: number | 'all' | null
) {
  // First, get the latest available year from the database
  const { data: latestAvailableYear } = useQuery({
    queryKey: ['pension-metrics-latest-year'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pension_fund_metrics')
        .select('report_year')
        .order('report_year', { ascending: false })
        .limit(1);
      
      if (error || !data || data.length === 0) {
        return new Date().getFullYear();
      }
      
      return data[0].report_year;
    },
  });

  const effectiveYear = year || latestAvailableYear;

  const { data: metrics = [], isLoading, error } = useQuery({
    queryKey: ['pension-fund-metrics', fundType, effectiveYear, quarter],
    queryFn: async () => {
      let query = supabase
        .from('pension_fund_metrics')
        .select('*')
        .order('aum', { ascending: false, nullsFirst: false });

      if (fundType && fundType !== 'all') {
        query = query.eq('fund_type', fundType);
      }
      if (effectiveYear) {
        query = query.eq('report_year', effectiveYear);
      }
      // Only filter by quarter if a specific quarter is selected (not 'all' or null)
      // This allows annual data (where report_quarter is null) to show when quarter filter is 'all'
      if (quarter && quarter !== 'all') {
        // Include both the specific quarter AND annual data (null quarter)
        query = query.or(`report_quarter.eq.${quarter},report_quarter.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PensionFundMetric[];
    },
    enabled: !!effectiveYear,
  });

  // Get available years
  const { data: availableYears = [] } = useQuery({
    queryKey: ['pension-available-years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pension_fund_metrics')
        .select('report_year')
        .order('report_year', { ascending: false });

      if (error) throw error;
      
      const years = [...new Set(data.map(d => d.report_year))];
      return years;
    },
  });

  // Get available quarters for selected year
  const { data: availableQuarters = [] } = useQuery({
    queryKey: ['pension-available-quarters', year],
    queryFn: async () => {
      let query = supabase
        .from('pension_fund_metrics')
        .select('report_quarter');

      if (year) {
        query = query.eq('report_year', year);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const quarters = [...new Set(data.map(d => d.report_quarter).filter(Boolean))] as number[];
      return quarters.sort((a, b) => a - b);
    },
    enabled: !!year,
  });

  return {
    metrics,
    availableYears,
    availableQuarters,
    isLoading,
    error,
  };
}

export function usePensionFundTypes() {
  const { data: fundTypes = [] } = useQuery({
    queryKey: ['pension-fund-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pension_fund_metrics')
        .select('fund_type');

      if (error) throw error;
      
      const types = [...new Set(data.map(d => d.fund_type))];
      return types;
    },
  });

  return fundTypes;
}