import { useState, useMemo, useEffect } from 'react';
import { X, Plus, Scale, TrendingUp, TrendingDown, Users, Shield, Star, Building2, Wallet, PieChart, Calendar, Award, BarChart3, Lightbulb, Minus, ChevronRight, Sparkles, Target, AlertTriangle, Zap, Loader2, Heart, Car, Landmark, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { allInsurers, categoryConfig, type GhanaInsurer, type InsuranceCategory } from '@/types/insurers';
import { useInsurerMetrics, fallbackMetrics, type InsurerMetrics } from '@/hooks/useInsurerMetrics';
import { usePensionMetrics } from '@/hooks/usePensionMetrics';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InsurerLogo } from '@/components/InsurerLogo';

interface AIAnalysis {
  summary: string;
  insights: string[];
  leader: { name: string; reason: string } | null;
  risks: string[];
  opportunities: string[];
}

// Default fallback colors if insurer doesn't have brand color
const FALLBACK_CHART_COLORS = [
  'hsl(145, 75%, 40%)',
  'hsl(221, 83%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(24, 95%, 53%)',
];

// Get chart colors from selected insurers' brand colors
const getInsurerChartColors = (insurers: GhanaInsurer[]): string[] => {
  return insurers.map((insurer, idx) => 
    insurer.brandColor || FALLBACK_CHART_COLORS[idx % FALLBACK_CHART_COLORS.length]
  );
};


function formatCurrency(value: number | null): string {
  if (value === null) return 'N/A';
  // Smart formatting: billions for large values, millions for smaller
  if (Math.abs(value) >= 1_000_000_000) {
    const inBillions = value / 1_000_000_000;
    return `₵${inBillions.toFixed(2)}B`;
  }
  const inMillions = value / 1_000_000;
  return `₵${inMillions.toFixed(1)}M`;
}

function formatPercent(value: number | null): string {
  if (value === null) return 'N/A';
  // Database stores as decimal (0.28 = 28%), convert to percentage display
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | null, suffix = ''): string {
  if (value === null) return 'N/A';
  return `${value}${suffix}`;
}

function formatRating(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(1)}/5`;
}

interface InsurerComparisonProps {
  trigger?: React.ReactNode;
}

type InsuranceType = 'life' | 'nonlife' | 'pension';

export function InsurerComparison({ trigger }: InsurerComparisonProps) {
  const [open, setOpen] = useState(false);
  const [insuranceType, setInsuranceType] = useState<InsuranceType>('life');
  const [selectedCategory, setSelectedCategory] = useState<InsuranceCategory>('life');
  const [selectedInsurers, setSelectedInsurers] = useState<GhanaInsurer[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [previousInsuranceType, setPreviousInsuranceType] = useState<InsuranceType>('life');

  // Get chart colors from selected insurers' brand colors
  const CHART_COLORS = useMemo(() => 
    getInsurerChartColors(selectedInsurers),
    [selectedInsurers]
  );
  const { metrics, availableYears, availableQuarters, isLoading, getMetricsForInsurer } = useInsurerMetrics(selectedCategory, selectedYear || undefined, selectedQuarter);

  // Fetch pension fund metrics
  const { metrics: pensionMetrics, availableYears: pensionYears } = usePensionMetrics(
    'all',
    selectedYear || undefined,
    'all'
  );

  // Fetch ID mappings from database
  const { data: idMappings = [] } = useQuery({
    queryKey: ['insurer-id-mappings', insuranceType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurer_id_mappings')
        .select('*')
        .eq('category', insuranceType)
        .eq('is_active', true);
      if (error) return [];
      return data || [];
    },
  });

  // Helper to get DB ID from frontend ID using mappings
  const getDbId = (frontendId: string): { insurerId?: string; fundId?: string } => {
    const mapping = idMappings.find(m => m.frontend_id === frontendId);
    if (mapping) {
      return {
        insurerId: mapping.db_insurer_id || undefined,
        fundId: mapping.db_fund_id || undefined,
      };
    }
    return {};
  };

  // Fetch available non-life years from DB
  const { data: nonLifeYears = [] } = useQuery({
    queryKey: ['nonlife-available-years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nonlife_insurer_metrics')
        .select('report_year')
        .order('report_year', { ascending: false });
      if (error || !data) return [];
      return [...new Set(data.map(d => d.report_year))];
    },
    enabled: insuranceType === 'nonlife',
  });

  // Fetch non-life insurance metrics
  const { data: nonLifeMetrics = [], isLoading: isLoadingNonLife } = useQuery({
    queryKey: ['nonlife-comparison-metrics', selectedYear, selectedQuarter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nonlife_insurer_metrics')
        .select('*')
        .eq('report_year', selectedYear)
        .eq('report_quarter', selectedQuarter);
      if (error) return [];
      return data || [];
    },
    enabled: insuranceType === 'nonlife' && !!selectedYear,
  });

  // Set default year to max available year with Q1 data
  useEffect(() => {
    if (selectedYear === null) {
      if (insuranceType === 'life' && availableYears.length > 0) {
        // Get max year
        const maxYear = Math.max(...availableYears);
        setSelectedYear(maxYear);
      } else if (insuranceType === 'nonlife' && nonLifeYears.length > 0) {
        const maxYear = Math.max(...nonLifeYears);
        setSelectedYear(maxYear);
      } else if (insuranceType === 'pension' && pensionYears.length > 0) {
        const maxYear = Math.max(...pensionYears);
        setSelectedYear(maxYear);
      }
    }
  }, [availableYears, pensionYears, nonLifeYears, insuranceType, selectedYear]);

  // Fetch historical data for trend comparison - use DB ID mappings first
  const { data: historicalData = [] } = useQuery({
    queryKey: ['comparison-historical', insuranceType, selectedCategory, selectedInsurers.map(i => i.id), idMappings.length],
    queryFn: async () => {
      if (selectedInsurers.length === 0) return [];
      
      // Get DB IDs from mappings
      const dbInsurerIds = selectedInsurers
        .map(i => idMappings.find(m => m.frontend_id === i.id)?.db_insurer_id)
        .filter(Boolean) as string[];
      const dbFundIds = selectedInsurers
        .map(i => idMappings.find(m => m.frontend_id === i.id)?.db_fund_id)
        .filter(Boolean) as string[];
      
      // Get keywords and names for fallback matching
      const insurerKeywords = selectedInsurers.flatMap(i => i.keywords.map(k => k.toLowerCase()));
      const insurerShortNames = selectedInsurers.map(i => i.shortName.toLowerCase().split(' ')[0]);
      
      if (insuranceType === 'nonlife') {
        const { data, error } = await supabase
          .from('nonlife_insurer_metrics')
          .select('*')
          .order('report_year', { ascending: true })
          .order('report_quarter', { ascending: true });
        if (error) return [];
        
        // Filter using DB IDs first, then fallback to name matching
        return (data || []).filter(d => {
          // Check DB ID match first
          if (dbInsurerIds.includes(d.insurer_id)) return true;
          // Fallback to name matching
          const nameLower = d.insurer_name.toLowerCase();
          return insurerKeywords.some(k => nameLower.includes(k)) ||
                 insurerShortNames.some(s => nameLower.includes(s));
        });
      }
      
      if (insuranceType === 'pension') {
        const { data, error } = await supabase
          .from('pension_fund_metrics')
          .select('*')
          .order('report_year', { ascending: true })
          .order('report_quarter', { ascending: true });
        if (error) return [];
        
        return (data || []).filter(d => {
          // Check DB ID match first
          if (dbFundIds.includes(d.fund_id)) return true;
          // Fallback to name matching
          const nameLower = d.fund_name.toLowerCase();
          return insurerKeywords.some(k => nameLower.includes(k)) ||
                 insurerShortNames.some(s => nameLower.includes(s));
        });
      }
      
      // Life insurance - use DB ID mappings for proper matching
      const dbIdsToQuery = dbInsurerIds.length > 0 
        ? dbInsurerIds 
        : selectedInsurers.map(i => i.id); // Fallback to frontend IDs if no mappings
        
      const { data, error } = await supabase
        .from('insurer_metrics')
        .select('*')
        .eq('category', selectedCategory)
        .in('insurer_id', dbIdsToQuery)
        .order('report_year', { ascending: true })
        .order('report_quarter', { ascending: true });
      
      if (error) return [];
      return data || [];
    },
    enabled: selectedInsurers.length > 0 && idMappings.length > 0,
  });

  // Handle insurance type toggle and reset AI analysis
  const handleInsuranceTypeChange = (type: InsuranceType) => {
    if (type !== insuranceType) {
      setPreviousInsuranceType(insuranceType);
      setInsuranceType(type);
      setSelectedInsurers([]);
      setSelectedYear(null);
      setSelectedQuarter(1);
      // Reset AI analysis when switching types
      aiAnalysisMutation.reset();
      
      if (type === 'life') {
        setSelectedCategory('life');
      } else if (type === 'nonlife') {
        setSelectedCategory('nonlife');
      } else {
        setSelectedCategory('pension');
      }
    }
  };

  // Re-trigger AI analysis when insurance type changes and we're on insights tab
  useEffect(() => {
    if (activeTab === 'insights' && insuranceType !== previousInsuranceType && selectedInsurers.length >= 2) {
      // Reset and re-trigger after type change
      aiAnalysisMutation.reset();
      setTimeout(() => {
        aiAnalysisMutation.mutate();
      }, 100);
      setPreviousInsuranceType(insuranceType);
    }
  }, [insuranceType, activeTab, selectedInsurers.length]);

  const filteredInsurers = useMemo(() => {
    return allInsurers.filter(i => i.category === selectedCategory);
  }, [selectedCategory]);

  const availableInsurers = useMemo(() => {
    const selectedIds = new Set(selectedInsurers.map(i => i.id));
    return filteredInsurers.filter(i => !selectedIds.has(i.id));
  }, [filteredInsurers, selectedInsurers]);

  const handleAddInsurer = (insurerId: string) => {
    const insurer = allInsurers.find(i => i.id === insurerId);
    if (insurer && selectedInsurers.length < 4) {
      setSelectedInsurers(prev => [...prev, insurer]);
    }
  };

  const handleRemoveInsurer = (insurerId: string) => {
    setSelectedInsurers(prev => prev.filter(i => i.id !== insurerId));
  };

  const handleCategoryChange = (category: InsuranceCategory) => {
    setSelectedCategory(category);
    setSelectedInsurers([]);
  };

  // Define metrics to display with formatters - category-specific
  const metricsConfig = useMemo(() => {
    if (insuranceType === 'nonlife') {
      return [
        { key: 'market_share', label: 'Market Share', icon: PieChart, format: formatPercent, highlight: 'max' as const, unit: '%' },
        { key: 'insurance_service_revenue', label: 'Premium Revenue', icon: Wallet, format: formatCurrency, highlight: 'max' as const, unit: '₵M' },
        { key: 'total_assets', label: 'Total Assets', icon: Building2, format: formatCurrency, highlight: 'max' as const, unit: '₵M' },
        { key: 'claims_ratio', label: 'Claims Ratio', icon: Shield, format: formatPercent, highlight: 'min' as const, unit: '%' },
        { key: 'expense_ratio', label: 'Expense Ratio', icon: TrendingDown, format: formatPercent, highlight: 'min' as const, unit: '%' },
        { key: 'profit_after_tax', label: 'Profit After Tax', icon: TrendingUp, format: formatCurrency, highlight: 'max' as const, unit: '₵M' },
        { key: 'years_in_ghana', label: 'Years in Ghana', icon: Calendar, format: (v: number | null) => v ? `${v} years` : 'N/A', highlight: 'max' as const, unit: 'years' },
      ];
    } else if (insuranceType === 'pension') {
      return [
        { key: 'market_share', label: 'Market Share', icon: PieChart, format: formatPercent, highlight: 'max' as const, unit: '%' },
        { key: 'aum', label: 'AUM', icon: Wallet, format: formatCurrency, highlight: 'max' as const, unit: '₵M' },
        { key: 'total_contributions', label: 'Total Contributions', icon: Building2, format: formatCurrency, highlight: 'max' as const, unit: '₵M' },
        { key: 'investment_return', label: 'Investment Return', icon: TrendingUp, format: formatPercent, highlight: 'max' as const, unit: '%' },
        { key: 'expense_ratio', label: 'Expense Ratio', icon: Shield, format: formatPercent, highlight: 'min' as const, unit: '%' },
        { key: 'total_contributors', label: 'Total Contributors', icon: Users, format: (v: number | null) => v ? v.toLocaleString() : 'N/A', highlight: 'max' as const, unit: '' },
        { key: 'years_in_ghana', label: 'Years in Ghana', icon: Calendar, format: (v: number | null) => v ? `${v} years` : 'N/A', highlight: 'max' as const, unit: 'years' },
      ];
    }
    // Life insurance (default)
    return [
      { key: 'market_share', label: 'Market Share', icon: PieChart, format: formatPercent, highlight: 'max' as const, unit: '%' },
      { key: 'gross_premium', label: 'Gross Premium', icon: Wallet, format: formatCurrency, highlight: 'max' as const, unit: '₵M' },
      { key: 'total_assets', label: 'Total Assets', icon: Building2, format: formatCurrency, highlight: 'max' as const, unit: '₵M' },
      { key: 'csm', label: 'CSM', icon: Shield, format: formatCurrency, highlight: 'max' as const, unit: '₵M' },
      { key: 'profit_after_tax', label: 'Profit After Tax', icon: TrendingUp, format: formatCurrency, highlight: 'max' as const, unit: '₵M' },
      { key: 'years_in_ghana', label: 'Years in Ghana', icon: Calendar, format: (v: number | null) => v ? `${v} years` : 'N/A', highlight: 'max' as const, unit: 'years' },
    ];
  }, [insuranceType]);

  // Helper to find matching record using DB mappings first, then fallback to name similarity
  const findMatchingRecord = <T extends { insurer_name?: string; insurer_id?: string; fund_name?: string; fund_id?: string }>(
    records: T[],
    insurer: GhanaInsurer
  ): T | undefined => {
    if (!records || records.length === 0) return undefined;
    
    // First try using DB ID mappings
    const dbIds = getDbId(insurer.id);
    
    if (dbIds.insurerId && records[0] && 'insurer_id' in records[0]) {
      const mappedMatch = records.find(r => r.insurer_id === dbIds.insurerId);
      if (mappedMatch) return mappedMatch;
    }
    
    if (dbIds.fundId && records[0] && 'fund_id' in records[0]) {
      const mappedMatch = records.find(r => r.fund_id === dbIds.fundId);
      if (mappedMatch) return mappedMatch;
    }
    
    // Then try exact frontend ID match
    if (records[0] && 'insurer_id' in records[0]) {
      const exactMatch = records.find(r => r.insurer_id === insurer.id);
      if (exactMatch) return exactMatch;
    }
    if (records[0] && 'fund_id' in records[0]) {
      const exactMatch = records.find(r => r.fund_id === insurer.id);
      if (exactMatch) return exactMatch;
    }
    
    // Fallback to name-based matching using keywords and name similarity
    const insurerNameLower = insurer.name.toLowerCase();
    const insurerShortNameLower = insurer.shortName.toLowerCase();
    const keywords = insurer.keywords.map(k => k.toLowerCase());
    
    return records.find(r => {
      const recordName = ((r as any).insurer_name || (r as any).fund_name || '').toLowerCase();
      
      // Check if record name contains any keyword
      if (keywords.some(keyword => recordName.includes(keyword))) return true;
      
      // Check if record name contains short name
      if (recordName.includes(insurerShortNameLower.split(' ')[0])) return true;
      
      // Check if insurer name contains record name's first word
      const recordFirstWord = recordName.split(' ')[0];
      if (recordFirstWord && insurerNameLower.includes(recordFirstWord)) return true;
      
      return false;
    });
  };

  // Get metric value based on insurance type
  const getMetricValue = (insurerId: string, key: string): number | null => {
    const insurer = selectedInsurers.find(i => i.id === insurerId);
    if (!insurer) return null;

    if (insuranceType === 'nonlife') {
      const nonLifeData = findMatchingRecord(nonLifeMetrics, insurer);
      if (nonLifeData) {
        return nonLifeData[key as keyof typeof nonLifeData] as number | null;
      }
      return null;
    } else if (insuranceType === 'pension') {
      const pensionData = findMatchingRecord(pensionMetrics, insurer);
      if (pensionData) {
        return pensionData[key as keyof typeof pensionData] as number | null;
      }
      return null;
    }
    // Life insurance
    const dbMetrics = getMetricsForInsurer(insurerId);
    if (dbMetrics) {
      return dbMetrics[key as keyof InsurerMetrics] as number | null;
    }
    return null;
  };

  const getBestValue = (metricKey: string, highlight: 'max' | 'min') => {
    if (selectedInsurers.length === 0) return null;
    const values = selectedInsurers
      .map(i => getMetricValue(i.id, metricKey))
      .filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return highlight === 'max' ? Math.max(...values) : Math.min(...values);
  };

  // Generate rankings - category-specific metrics
  const rankings = useMemo(() => {
    if (selectedInsurers.length === 0) return [];
    
    // Use category-specific ranking metrics
    let rankingMetrics: string[];
    if (insuranceType === 'nonlife') {
      rankingMetrics = ['insurance_service_revenue', 'market_share', 'total_assets', 'profit_after_tax'];
    } else if (insuranceType === 'pension') {
      rankingMetrics = ['aum', 'market_share', 'total_contributions', 'investment_return'];
    } else {
      rankingMetrics = ['gross_premium', 'market_share', 'total_assets', 'profit_after_tax'];
    }
    
    const scores: Record<string, { total: number; wins: number }> = {};
    
    selectedInsurers.forEach(insurer => {
      scores[insurer.id] = { total: 0, wins: 0 };
    });

    rankingMetrics.forEach(metric => {
      const values = selectedInsurers.map(i => ({
        id: i.id,
        value: getMetricValue(i.id, metric) || 0,
      })).sort((a, b) => b.value - a.value);
      
      values.forEach((v, idx) => {
        scores[v.id].total += selectedInsurers.length - idx;
        if (idx === 0) scores[v.id].wins++;
      });
    });

    return Object.entries(scores)
      .map(([id, score]) => ({
        insurer: selectedInsurers.find(i => i.id === id)!,
        score: score.total,
        wins: score.wins,
      }))
      .sort((a, b) => b.score - a.score);
  }, [selectedInsurers, metrics, nonLifeMetrics, pensionMetrics, insuranceType]);

  // Generate radar chart data - category-specific metrics
  const radarData = useMemo(() => {
    const normalizeValue = (value: number | null, max: number) => {
      if (value === null || max === 0) return 0;
      return Math.min(100, (value / max) * 100);
    };

    // Define metrics based on insurance type
    let radarMetrics: { key: string; label: string }[];
    if (insuranceType === 'nonlife') {
      radarMetrics = [
        { key: 'market_share', label: 'Market Share' },
        { key: 'insurance_service_revenue', label: 'Premium' },
        { key: 'total_assets', label: 'Assets' },
        { key: 'profit_after_tax', label: 'Profit' },
      ];
    } else if (insuranceType === 'pension') {
      radarMetrics = [
        { key: 'market_share', label: 'Market Share' },
        { key: 'aum', label: 'AUM' },
        { key: 'total_contributions', label: 'Contributions' },
        { key: 'investment_return', label: 'Returns' },
      ];
    } else {
      radarMetrics = [
        { key: 'market_share', label: 'Market Share' },
        { key: 'gross_premium', label: 'Premium' },
        { key: 'total_assets', label: 'Assets' },
        { key: 'profit_after_tax', label: 'Profit' },
      ];
    }

    const maxValues: Record<string, number> = {};
    radarMetrics.forEach(({ key }) => {
      const values = selectedInsurers.map(i => Math.abs(getMetricValue(i.id, key) || 0));
      maxValues[key] = Math.max(...values, 1);
    });

    return radarMetrics.map(({ key, label }) => ({
      subject: label,
      ...Object.fromEntries(selectedInsurers.map(i => [i.id, normalizeValue(Math.abs(getMetricValue(i.id, key) || 0), maxValues[key])])),
    }));
  }, [selectedInsurers, insuranceType, nonLifeMetrics, pensionMetrics]);

  // Generate bar chart comparison data - category-specific
  const barChartData = useMemo(() => {
    if (insuranceType === 'nonlife') {
      return selectedInsurers.map(insurer => ({
        name: insurer.shortName.split(' ')[0],
        'Premium Revenue (₵M)': (getMetricValue(insurer.id, 'insurance_service_revenue') || 0) / 1_000_000,
        'Total Assets (₵M)': (getMetricValue(insurer.id, 'total_assets') || 0) / 1_000_000,
        'Profit (₵M)': (getMetricValue(insurer.id, 'profit_after_tax') || 0) / 1_000_000,
      }));
    } else if (insuranceType === 'pension') {
      return selectedInsurers.map(insurer => ({
        name: insurer.shortName.split(' ')[0],
        'AUM (₵M)': (getMetricValue(insurer.id, 'aum') || 0) / 1_000_000,
        'Contributions (₵M)': (getMetricValue(insurer.id, 'total_contributions') || 0) / 1_000_000,
        'Return (%)': (getMetricValue(insurer.id, 'investment_return') || 0) * 100,
      }));
    }
    return selectedInsurers.map(insurer => ({
      name: insurer.shortName.split(' ')[0],
      'Gross Premium (₵M)': (getMetricValue(insurer.id, 'gross_premium') || 0) / 1_000_000,
      'Total Assets (₵M)': (getMetricValue(insurer.id, 'total_assets') || 0) / 1_000_000,
      'Profit (₵M)': (getMetricValue(insurer.id, 'profit_after_tax') || 0) / 1_000_000,
    }));
  }, [selectedInsurers, insuranceType, nonLifeMetrics, pensionMetrics]);

  // Helper to find matching insurer for historical data record
  const findMatchingInsurerId = (record: any): string | null => {
    for (const insurer of selectedInsurers) {
      const dbIds = getDbId(insurer.id);
      const recordId = record.insurer_id || record.fund_id;
      const recordName = (record.insurer_name || record.fund_name || '').toLowerCase();
      
      // Check DB ID match first
      if (dbIds.insurerId && dbIds.insurerId === recordId) return insurer.id;
      if (dbIds.fundId && dbIds.fundId === recordId) return insurer.id;
      
      // Check exact ID match
      if (recordId === insurer.id) return insurer.id;
      
      // Check name-based match
      const keywords = insurer.keywords.map(k => k.toLowerCase());
      const shortNameFirst = insurer.shortName.toLowerCase().split(' ')[0];
      
      if (keywords.some(k => recordName.includes(k))) return insurer.id;
      if (recordName.includes(shortNameFirst)) return insurer.id;
    }
    return null;
  };

  // Generate trend data - map historical records to selected insurers using proper matching
  const trendData = useMemo(() => {
    const periods = new Map<string, Record<string, number | string>>();
    
    historicalData.forEach((d: any) => {
      const matchedInsurerId = findMatchingInsurerId(d);
      if (!matchedInsurerId) return;
      
      const periodLabel = `Q${d.report_quarter || 4}'${String(d.report_year).slice(2)}`;
      const periodKey = `${d.report_year}-${d.report_quarter || 4}`; // For sorting
      
      if (!periods.has(periodKey)) {
        periods.set(periodKey, { period: periodLabel });
      }
      const periodData = periods.get(periodKey)!;
      
      // Use the frontend insurer ID as key for chart rendering
      const value = d.gross_premium || d.insurance_service_revenue || d.aum || 0;
      periodData[matchedInsurerId] = value / 1e6;
    });

    return Array.from(periods.entries())
      .sort(([a], [b]) => a.localeCompare(b)) // Sort by year-quarter key
      .map(([, data]) => data)
      .slice(-8);
  }, [historicalData, selectedInsurers, idMappings]);

  // Data availability indicator - check which insurers have data for selected period
  const dataAvailability = useMemo(() => {
    return selectedInsurers.map(insurer => {
      let hasData = false;
      let latestQuarter: string | null = null;
      
      if (insuranceType === 'life') {
        const record = findMatchingRecord(metrics, insurer);
        hasData = !!record && record.report_year === selectedYear && record.report_quarter === selectedQuarter;
        // Find latest available quarter for this insurer
        const dbId = getDbId(insurer.id);
        const insurerRecords = metrics.filter(m => 
          m.insurer_id === dbId || 
          m.insurer_id === insurer.id ||
          m.insurer_name?.toLowerCase().includes(insurer.shortName.toLowerCase())
        );
        if (insurerRecords.length > 0) {
          const latest = insurerRecords.sort((a, b) => 
            (b.report_year * 10 + (b.report_quarter || 0)) - (a.report_year * 10 + (a.report_quarter || 0))
          )[0];
          latestQuarter = `Q${latest.report_quarter} ${latest.report_year}`;
        }
      } else if (insuranceType === 'nonlife') {
        const record = findMatchingRecord(nonLifeMetrics, insurer);
        hasData = !!record && record.report_year === selectedYear && record.report_quarter === selectedQuarter;
        const insurerRecords = nonLifeMetrics.filter(m => 
          m.insurer_name?.toLowerCase().includes(insurer.shortName.toLowerCase()) ||
          m.insurer_id === insurer.id
        );
        if (insurerRecords.length > 0) {
          const latest = insurerRecords.sort((a, b) => 
            (b.report_year * 10 + (b.report_quarter || 0)) - (a.report_year * 10 + (a.report_quarter || 0))
          )[0];
          latestQuarter = `Q${latest.report_quarter} ${latest.report_year}`;
        }
      } else {
        const record = findMatchingRecord(pensionMetrics, insurer);
        hasData = !!record && record.report_year === selectedYear && record.report_quarter === selectedQuarter;
        const insurerRecords = pensionMetrics.filter(m => 
          m.fund_name?.toLowerCase().includes(insurer.shortName.toLowerCase()) ||
          m.fund_id === insurer.id
        );
        if (insurerRecords.length > 0) {
          const latest = insurerRecords.sort((a, b) => 
            (b.report_year * 10 + (b.report_quarter || 0)) - (a.report_year * 10 + (a.report_quarter || 0))
          )[0];
          latestQuarter = `Q${latest.report_quarter} ${latest.report_year}`;
        }
      }
      
      return { insurer, hasData, latestQuarter };
    });
  }, [selectedInsurers, metrics, nonLifeMetrics, pensionMetrics, selectedYear, selectedQuarter, insuranceType, idMappings]);

  // AI Analysis mutation - adapts to insurance type
  const aiAnalysisMutation = useMutation({
    mutationFn: async () => {
      let insurerData;
      
      if (insuranceType === 'pension') {
        // Get pension-specific data using findMatchingRecord
        insurerData = selectedInsurers.map(insurer => {
          const pensionData = findMatchingRecord(pensionMetrics, insurer);
          return {
            id: insurer.id,
            name: insurer.shortName,
            grossPremium: pensionData?.aum || null,
            marketShare: pensionData?.market_share || null,
            totalAssets: pensionData?.aum || null,
            profitAfterTax: pensionData?.investment_return || null,
            solvencyRatio: null,
            claimsRatio: null,
            expenseRatio: pensionData?.expense_ratio || null,
            branches: null,
            employees: pensionData?.total_contributors || null,
            yearsInGhana: null,
          };
        });
      } else if (insuranceType === 'nonlife') {
        // Get non-life specific data using findMatchingRecord
        insurerData = selectedInsurers.map(insurer => {
          const nonLifeData = findMatchingRecord(nonLifeMetrics, insurer);
          return {
            id: insurer.id,
            name: insurer.shortName,
            grossPremium: nonLifeData?.insurance_service_revenue || null,
            marketShare: nonLifeData?.market_share || null,
            totalAssets: nonLifeData?.total_assets || null,
            profitAfterTax: nonLifeData?.profit_after_tax || null,
            solvencyRatio: null,
            claimsRatio: nonLifeData?.claims_ratio || null,
            expenseRatio: nonLifeData?.expense_ratio || null,
            branches: null,
            employees: null,
            yearsInGhana: null,
          };
        });
      } else {
        // Life insurance data
        insurerData = selectedInsurers.map(insurer => ({
          id: insurer.id,
          name: insurer.shortName,
          grossPremium: getMetricValue(insurer.id, 'gross_premium'),
          marketShare: getMetricValue(insurer.id, 'market_share'),
          totalAssets: getMetricValue(insurer.id, 'total_assets'),
          profitAfterTax: getMetricValue(insurer.id, 'profit_after_tax'),
          solvencyRatio: getMetricValue(insurer.id, 'solvency_ratio'),
          claimsRatio: getMetricValue(insurer.id, 'csm'),
          expenseRatio: getMetricValue(insurer.id, 'expense_ratio'),
          branches: getMetricValue(insurer.id, 'branches'),
          employees: getMetricValue(insurer.id, 'employees'),
          yearsInGhana: getMetricValue(insurer.id, 'years_in_ghana'),
        }));
      }

      const { data, error } = await supabase.functions.invoke('analyze-insurers', {
        body: { insurers: insurerData, category: insuranceType, year: selectedYear }
      });

      if (error) throw error;
      return data.analysis as AIAnalysis;
    },
    onError: (error: Error) => {
      console.error('AI analysis error:', error);
      toast.error('Failed to generate analysis. Please try again.');
    },
  });

  // Trigger AI analysis when switching to insights tab with selected insurers
  useEffect(() => {
    if (activeTab === 'insights' && selectedInsurers.length >= 2 && !aiAnalysisMutation.data && !aiAnalysisMutation.isPending) {
      aiAnalysisMutation.mutate();
    }
  }, [activeTab, selectedInsurers.length]);

  const years = useMemo(() => {
    if (insuranceType === 'pension') {
      return pensionYears.length > 0 ? pensionYears : [2024, 2023];
    }
    return availableYears.length > 0 ? availableYears : [2025, 2024, 2023];
  }, [insuranceType, availableYears, pensionYears]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 rounded-lg border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Insight</span>
            <span className="sm:hidden">Insight</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-secondary/30">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="font-semibold">Compare Insurance Companies</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                Comprehensive analysis from NIC Reports
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedYear?.toString() || ''} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[90px] rounded-lg bg-card border-border/40">
                  <Calendar className="h-4 w-4 mr-1" />
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {insuranceType !== 'pension' && (
                <Select value={selectedQuarter.toString()} onValueChange={(v) => setSelectedQuarter(parseInt(v))}>
                  <SelectTrigger className="w-[70px] rounded-lg bg-card border-border/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((q) => (
                      <SelectItem key={q} value={q.toString()}>
                        Q{q}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Insurance Type Toggle */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border/40">
            <span className="text-sm font-medium text-muted-foreground">Insurance Type:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleInsuranceTypeChange('life')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  insuranceType === 'life'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Heart className="h-4 w-4" />
                Life Insurance
              </button>
              <button
                onClick={() => handleInsuranceTypeChange('nonlife')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  insuranceType === 'nonlife'
                    ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-sm'
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Car className="h-4 w-4" />
                Non-Life Insurance
              </button>
              <button
                onClick={() => handleInsuranceTypeChange('pension')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  insuranceType === 'pension'
                    ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-sm'
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Landmark className="h-4 w-4" />
                Pensions
              </button>
            </div>
          </div>

          {/* Non-Life Insurers Header */}
          {insuranceType === 'nonlife' && (
            <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                  Non-Life Insurers ({selectedYear} Data)
                </span>
                <span className="text-sm font-medium text-muted-foreground">Q{selectedQuarter}</span>
              </div>
            </div>
          )}

          {/* Pension Funds Header */}
          {insuranceType === 'pension' && (
            <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                  Pension Funds ({selectedYear} Data)
                </span>
                <span className="text-sm font-medium text-muted-foreground">Q{selectedQuarter}</span>
              </div>
            </div>
          )}

          {/* Life Insurance Header */}
          {insuranceType === 'life' && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-primary">
                  Life Insurers ({selectedYear} Data)
                </span>
                <span className="text-sm font-medium text-muted-foreground">Q{selectedQuarter}</span>
              </div>
            </div>
          )}

          {/* Selected Insurers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Selected Companies ({selectedInsurers.length}/4)
              </h3>
              {selectedInsurers.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedInsurers([])}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3">
              {selectedInsurers.map((insurer, idx) => (
                <div 
                  key={insurer.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/50 shadow-sm"
                  style={{ borderLeftColor: CHART_COLORS[idx], borderLeftWidth: '3px' }}
                >
                  <InsurerLogo name={insurer.name} shortName={insurer.shortName} website={insurer.website} brandColor={insurer.brandColor} size="md" />
                  <span className="text-sm font-medium">{insurer.shortName}</span>
                  <button
                    onClick={() => handleRemoveInsurer(insurer.id)}
                    className="ml-1 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              
              {selectedInsurers.length < 4 && availableInsurers.length > 0 && (
                <Select onValueChange={handleAddInsurer}>
                  <SelectTrigger className="w-[200px] rounded-lg border-dashed bg-secondary/30">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Plus className="h-4 w-4" />
                      <span>Add Company</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[200px]">
                      {availableInsurers.map((insurer) => {
                        const hasData = !!getMetricsForInsurer(insurer.id);
                        return (
                          <SelectItem key={insurer.id} value={insurer.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: insurer.brandColor }}
                              />
                              <span>{insurer.shortName}</span>
                              {hasData && (
                                <span className="text-xs text-primary ml-1">●</span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Data Availability Indicator */}
          {selectedInsurers.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground">
                  Data Availability for Q{selectedQuarter} {selectedYear}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {dataAvailability.map(({ insurer, hasData, latestQuarter }) => (
                  <div 
                    key={insurer.id}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                      hasData 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {hasData ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    <span className="font-medium">{insurer.shortName}</span>
                    {!hasData && latestQuarter && (
                      <span className="opacity-70">• Latest: {latestQuarter}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Tabs */}
          {selectedInsurers.length > 0 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="bg-secondary/50 p-1 rounded-lg">
                <TabsTrigger value="overview" className="gap-2 rounded-md">
                  <BarChart3 className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="rankings" className="gap-2 rounded-md">
                  <Award className="h-4 w-4" />
                  Rankings
                </TabsTrigger>
                <TabsTrigger value="trends" className="gap-2 rounded-md">
                  <TrendingUp className="h-4 w-4" />
                  Trends
                </TabsTrigger>
                <TabsTrigger value="insights" className="gap-2 rounded-md">
                  <Lightbulb className="h-4 w-4" />
                  Insights
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Visual Charts */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Radar Chart */}
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-border/40">
                    <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      Performance Comparison
                    </h4>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                          {selectedInsurers.map((insurer, idx) => (
                            <Radar
                              key={insurer.id}
                              name={insurer.shortName}
                              dataKey={insurer.id}
                              stroke={CHART_COLORS[idx]}
                              fill={CHART_COLORS[idx]}
                              fillOpacity={0.2}
                              strokeWidth={2}
                            />
                          ))}
                          <Legend 
                            formatter={(value) => selectedInsurers.find(i => i.id === value)?.shortName || value}
                            wrapperStyle={{ paddingTop: '10px' }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-border/40">
                    <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      Key Metrics Comparison
                    </h4>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} />
                          {insuranceType === 'nonlife' ? (
                            <>
                              <Bar dataKey="Premium Revenue (₵M)" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Total Assets (₵M)" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Profit (₵M)" fill={CHART_COLORS[2] || 'hsl(262, 83%, 58%)'} radius={[4, 4, 0, 0]} />
                            </>
                          ) : insuranceType === 'pension' ? (
                            <>
                              <Bar dataKey="AUM (₵M)" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Contributions (₵M)" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Return (%)" fill={CHART_COLORS[2] || 'hsl(262, 83%, 58%)'} radius={[4, 4, 0, 0]} />
                            </>
                          ) : (
                            <>
                              <Bar dataKey="Gross Premium (₵M)" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Total Assets (₵M)" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Profit (₵M)" fill={CHART_COLORS[2] || 'hsl(262, 83%, 58%)'} radius={[4, 4, 0, 0]} />
                            </>
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Metrics Table */}
                <ScrollArea className="h-[300px] rounded-xl border border-border/40">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow className="border-b border-border/40">
                        <TableHead className="w-[180px] bg-secondary/30 font-semibold">Metric</TableHead>
                        {selectedInsurers.map((insurer, idx) => (
                          <TableHead 
                            key={insurer.id} 
                            className="text-center bg-secondary/30"
                            style={{ borderTop: `3px solid ${CHART_COLORS[idx]}` }}
                          >
                            <div className="flex flex-col items-center gap-1 py-2">
                              <span className="font-semibold text-xs">{insurer.shortName}</span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metricsConfig.map(({ key, label, icon: Icon, format, highlight }) => {
                        const bestValue = getBestValue(key, highlight);
                        return (
                          <TableRow key={key} className="border-b border-border/30 hover:bg-secondary/20">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span>{label}</span>
                              </div>
                            </TableCell>
                            {selectedInsurers.map((insurer) => {
                              const value = getMetricValue(insurer.id, key);
                              const isBest = bestValue !== null && value === bestValue && selectedInsurers.length > 1;
                              return (
                                <TableCell 
                                  key={insurer.id} 
                                  className="text-center"
                                >
                                  <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                                    value === null
                                      ? 'text-muted-foreground'
                                      : isBest 
                                      ? 'bg-primary/10 text-primary font-semibold' 
                                      : ''
                                  }`}>
                                    <span className="text-base font-bold">
                                      {format(value)}
                                    </span>
                                    {isBest && <Star className="h-3 w-3 fill-primary ml-1" />}
                                  </div>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              {/* Rankings Tab */}
              <TabsContent value="rankings" className="space-y-6">
                {/* Summary Stats */}
                {rankings.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-yellow-500/5 border-2 border-amber-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/30">
                          <Award className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">Leader</span>
                      </div>
                      <p className="text-lg font-bold">{rankings[0]?.insurer.shortName || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rankings[0]?.wins || 0} category wins</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-400/15 via-slate-300/10 to-gray-400/5 border-2 border-slate-400/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-slate-400 to-gray-500 shadow-lg shadow-slate-400/30">
                          <Target className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase">Runner-up</span>
                      </div>
                      <p className="text-lg font-bold">{rankings[1]?.insurer.shortName || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rankings[1]?.wins || 0} category wins</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-700/15 via-amber-600/10 to-orange-600/5 border-2 border-amber-700/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-700 to-orange-700 shadow-lg shadow-amber-700/30">
                          <Star className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-amber-800 dark:text-amber-500 uppercase">Third</span>
                      </div>
                      <p className="text-lg font-bold">{rankings[2]?.insurer.shortName || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rankings[2]?.wins || 0} category wins</p>
                    </div>
                  </div>
                )}
                
                {/* Detailed Rankings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="text-sm font-bold">Detailed Performance Rankings</h4>
                  </div>
                  
                  <div className="grid gap-4">
                    {rankings.map((ranking, idx) => (
                      <div 
                        key={ranking.insurer.id}
                        className={`relative overflow-hidden p-5 rounded-2xl border-2 transition-all hover:shadow-lg ${
                          idx === 0 
                            ? 'bg-gradient-to-br from-amber-50 via-yellow-50/50 to-orange-50/30 dark:from-amber-900/20 dark:via-yellow-900/10 dark:to-orange-900/5 border-amber-400/50 shadow-lg shadow-amber-500/10' 
                            : idx === 1
                            ? 'bg-gradient-to-br from-slate-50 via-gray-50/50 to-slate-100/30 dark:from-slate-800/30 dark:via-gray-800/20 dark:to-slate-900/10 border-slate-400/40'
                            : idx === 2
                            ? 'bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-yellow-50/20 dark:from-amber-900/15 dark:via-orange-900/10 dark:to-yellow-900/5 border-amber-600/30'
                            : 'bg-card border-border/40 hover:border-primary/30'
                        }`}
                      >
                        {/* Position badge */}
                        <div className={`absolute top-0 right-0 px-4 py-2 rounded-bl-2xl text-sm font-bold ${
                          idx === 0 ? 'bg-amber-500 text-white' :
                          idx === 1 ? 'bg-slate-400 text-white' :
                          idx === 2 ? 'bg-amber-700 text-white' :
                          'bg-secondary text-muted-foreground'
                        }`}>
                          #{idx + 1}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg ${
                            idx === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-amber-500/40' :
                            idx === 1 ? 'bg-gradient-to-br from-slate-300 to-gray-400 text-white shadow-slate-400/40' :
                            idx === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-amber-600/40' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </div>
                          <InsurerLogo name={ranking.insurer.name} shortName={ranking.insurer.shortName} website={ranking.insurer.website} brandColor={ranking.insurer.brandColor} size="lg" />
                          <div className="flex-1">
                            <h4 className="font-bold text-lg">{ranking.insurer.shortName}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] bg-primary/5">
                                Score: {ranking.score}
                              </Badge>
                              {ranking.wins > 0 && (
                                <Badge variant="outline" className="gap-1 text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                  <Award className="h-2.5 w-2.5" />
                                  {ranking.wins} {ranking.wins === 1 ? 'Win' : 'Wins'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Metric highlights - category-specific */}
                        <div className="mt-5 grid grid-cols-4 gap-3">
                          {(insuranceType === 'nonlife' 
                            ? ['insurance_service_revenue', 'market_share', 'total_assets', 'profit_after_tax']
                            : insuranceType === 'pension'
                            ? ['aum', 'market_share', 'total_contributions', 'investment_return']
                            : ['gross_premium', 'market_share', 'total_assets', 'profit_after_tax']
                          ).map(metric => {
                            const value = getMetricValue(ranking.insurer.id, metric);
                            const isBest = getBestValue(metric, 'max') === value;
                            const labels: Record<string, string> = {
                              gross_premium: 'Premium',
                              insurance_service_revenue: 'Revenue',
                              aum: 'AUM',
                              market_share: 'Market Share',
                              total_assets: 'Assets',
                              total_contributions: 'Contributions',
                              profit_after_tax: 'Profit',
                              investment_return: 'Returns',
                            };
                            const colors: Record<string, string> = {
                              gross_premium: 'emerald',
                              insurance_service_revenue: 'emerald',
                              aum: 'emerald',
                              market_share: 'blue',
                              total_assets: 'purple',
                              total_contributions: 'purple',
                              profit_after_tax: 'amber',
                              investment_return: 'amber',
                            };
                            const color = colors[metric];
                            const isPercentMetric = ['market_share', 'investment_return'].includes(metric);
                            return (
                              <div 
                                key={metric} 
                                className={`p-3 rounded-xl text-center transition-all ${
                                  isBest 
                                    ? `bg-${color}-500/15 border border-${color}-500/30 shadow-sm` 
                                    : 'bg-secondary/50 border border-transparent'
                                }`}
                              >
                                <p className="text-[10px] text-muted-foreground uppercase font-medium">{labels[metric]}</p>
                                <p className={`text-sm font-bold mt-1 ${isBest ? 'text-primary' : ''}`}>
                                  {isPercentMetric ? formatPercent(value) : formatCurrency(value)}
                                </p>
                                {isBest && (
                                  <div className="flex items-center justify-center gap-1 mt-1.5">
                                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">BEST</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {rankings.length === 0 && (
                    <div className="p-8 rounded-xl bg-secondary/30 border border-dashed border-border/50 flex flex-col items-center justify-center text-center">
                      <Award className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="font-medium text-muted-foreground">No rankings available</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Select at least 2 insurers to see rankings</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Trends Tab */}
              <TabsContent value="trends" className="space-y-6">
                {/* Premium Growth Chart */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/30 dark:from-slate-900 dark:via-slate-900/50 dark:to-emerald-900/10 border-2 border-emerald-500/20 shadow-lg">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold">Premium Growth Over Time</h4>
                        <p className="text-xs text-muted-foreground">Quarterly performance comparison</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                      {trendData.length} Quarters
                    </Badge>
                  </div>
                  {trendData.length > 0 ? (
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                          <XAxis 
                            dataKey="period" 
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                            tickFormatter={(v) => `₵${v}M`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '12px',
                              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
                            }}
                            formatter={(value: number, name: string) => [
                              `₵${value.toFixed(1)}M`,
                              selectedInsurers.find(i => i.id === name)?.shortName || name
                            ]}
                          />
                          <Legend 
                            formatter={(value) => selectedInsurers.find(i => i.id === value)?.shortName || value}
                            wrapperStyle={{ paddingTop: '15px' }}
                          />
                          {selectedInsurers.map((insurer, idx) => (
                            <Bar
                              key={insurer.id}
                              dataKey={insurer.id}
                              fill={CHART_COLORS[idx]}
                              radius={[6, 6, 0, 0]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[320px] flex flex-col items-center justify-center text-muted-foreground bg-secondary/30 rounded-xl">
                      <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
                      <p className="font-medium">No historical trend data available</p>
                      <p className="text-xs mt-1">Select insurers to view their performance trends</p>
                    </div>
                  )}
                </div>

                {/* Quarterly Performance Cards */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="text-sm font-bold">Quarter-over-Quarter Performance</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedInsurers.map((insurer, idx) => {
                      // Use proper matching to filter historical data for this insurer
                      const insurerTrend = historicalData.filter((d: any) => {
                        const matchedId = findMatchingInsurerId(d);
                        return matchedId === insurer.id;
                      }).sort((a: any, b: any) => {
                          const aKey = a.report_year * 10 + (a.report_quarter || 0);
                          const bKey = b.report_year * 10 + (b.report_quarter || 0);
                          return bKey - aKey;
                        });
                      
                      // Find data for the SELECTED year/quarter, not the latest
                      const currentData = insurerTrend.find((d: any) => 
                        d.report_year === selectedYear && d.report_quarter === selectedQuarter
                      ) as any;
                      
                      // Find previous quarter data for comparison
                      const getPreviousQuarter = (year: number, quarter: number) => {
                        if (quarter === 1) return { year: year - 1, quarter: 4 };
                        return { year, quarter: quarter - 1 };
                      };
                      const prevPeriod = getPreviousQuarter(selectedYear || 2024, selectedQuarter);
                      const previousData = insurerTrend.find((d: any) => 
                        d.report_year === prevPeriod.year && d.report_quarter === prevPeriod.quarter
                      ) as any;
                      
                      const latestPremium = (currentData as any)?.gross_premium || (currentData as any)?.insurance_service_revenue || (currentData as any)?.aum || 0;
                      const previousPremium = (previousData as any)?.gross_premium || (previousData as any)?.insurance_service_revenue || (previousData as any)?.aum || 0;
                      const premiumChange = previousPremium ? ((latestPremium - previousPremium) / previousPremium) * 100 : 0;
                      
                      const latestAssets = (currentData as any)?.total_assets || (currentData as any)?.aum || 0;
                      const previousAssets = (previousData as any)?.total_assets || (previousData as any)?.aum || 0;
                      const assetsChange = previousAssets ? ((latestAssets - previousAssets) / previousAssets) * 100 : 0;
                      
                      const latestProfit = (currentData as any)?.profit_after_tax || (currentData as any)?.investment_return || 0;
                      const previousProfit = (previousData as any)?.profit_after_tax || (previousData as any)?.investment_return || 0;
                      const profitChange = previousProfit ? ((latestProfit - previousProfit) / Math.abs(previousProfit)) * 100 : 0;
                      
                      return (
                        <div 
                          key={insurer.id}
                          className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-card via-card to-secondary/30 border-2 border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
                        >
                          {/* Color accent bar */}
                          <div 
                            className="absolute top-0 left-0 right-0 h-1.5"
                            style={{ backgroundColor: CHART_COLORS[idx] }}
                          />
                          
                          {/* Decorative element */}
                          <div 
                            className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
                            style={{ backgroundColor: CHART_COLORS[idx] }}
                          />
                          
                          <div className="relative">
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-4">
                              <InsurerLogo name={insurer.name} shortName={insurer.shortName} website={insurer.website} brandColor={insurer.brandColor} size="md" />
                              <div className="flex-1">
                                <h5 className="font-bold text-base">{insurer.shortName}</h5>
                                <p className="text-xs text-muted-foreground">
                                  {currentData ? `Q${selectedQuarter} ${selectedYear}` : 'No data'}
                                </p>
                              </div>
                              <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                                premiumChange > 0 
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                                  : premiumChange < 0 
                                  ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                                  : 'bg-secondary text-muted-foreground'
                              }`}>
                                {premiumChange > 0 ? '+' : ''}{premiumChange.toFixed(1)}%
                              </div>
                            </div>
                            
                            {/* Metrics Grid */}
                            <div className="grid grid-cols-3 gap-3">
                              {/* Premium */}
                              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Wallet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 uppercase">Premium</span>
                                </div>
                                <p className="text-sm font-bold">₵{(latestPremium / 1e6).toFixed(0)}M</p>
                                <div className={`flex items-center gap-0.5 text-[10px] mt-1 ${
                                  premiumChange > 0 ? 'text-emerald-600' : premiumChange < 0 ? 'text-red-500' : 'text-muted-foreground'
                                }`}>
                                  {premiumChange > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : 
                                   premiumChange < 0 ? <TrendingDown className="h-2.5 w-2.5" /> : 
                                   <Minus className="h-2.5 w-2.5" />}
                                  <span>{Math.abs(premiumChange).toFixed(1)}%</span>
                                </div>
                              </div>
                              
                              {/* Assets */}
                              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                  <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400 uppercase">Assets</span>
                                </div>
                                <p className="text-sm font-bold">₵{(latestAssets / 1e6).toFixed(0)}M</p>
                                <div className={`flex items-center gap-0.5 text-[10px] mt-1 ${
                                  assetsChange > 0 ? 'text-emerald-600' : assetsChange < 0 ? 'text-red-500' : 'text-muted-foreground'
                                }`}>
                                  {assetsChange > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : 
                                   assetsChange < 0 ? <TrendingDown className="h-2.5 w-2.5" /> : 
                                   <Minus className="h-2.5 w-2.5" />}
                                  <span>{Math.abs(assetsChange).toFixed(1)}%</span>
                                </div>
                              </div>
                              
                              {/* Profit */}
                              <div className={`p-3 rounded-xl ${latestProfit >= 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'} border`}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <TrendingUp className={`h-3.5 w-3.5 ${latestProfit >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`} />
                                  <span className={`text-[10px] font-medium uppercase ${latestProfit >= 0 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'}`}>Profit</span>
                                </div>
                                <p className="text-sm font-bold">₵{(latestProfit / 1e6).toFixed(0)}M</p>
                                <div className={`flex items-center gap-0.5 text-[10px] mt-1 ${
                                  profitChange > 0 ? 'text-emerald-600' : profitChange < 0 ? 'text-red-500' : 'text-muted-foreground'
                                }`}>
                                  {profitChange > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : 
                                   profitChange < 0 ? <TrendingDown className="h-2.5 w-2.5" /> : 
                                   <Minus className="h-2.5 w-2.5" />}
                                  <span>{Math.abs(profitChange).toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {selectedInsurers.length === 0 && (
                    <div className="p-8 rounded-xl bg-secondary/30 border border-dashed border-border/50 flex flex-col items-center justify-center text-center">
                      <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="font-medium text-muted-foreground">No insurers selected</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Add companies above to compare their quarterly performance</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Insights Tab */}
              <TabsContent value="insights" className="space-y-4">
                {aiAnalysisMutation.isPending ? (
                  <div className="p-8 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 flex flex-col items-center justify-center">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                      <div className="relative p-4 rounded-full bg-primary/10">
                        <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                      </div>
                    </div>
                    <h4 className="font-semibold text-lg mb-1">Generating AI Analysis</h4>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                      Analyzing {selectedInsurers.length} insurers across {metricsConfig.length} metrics...
                    </p>
                  </div>
                ) : aiAnalysisMutation.data ? (
                  <>
                    {/* Executive Summary */}
                    <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">AI Executive Summary</h4>
                          <p className="text-sm text-muted-foreground">Powered by advanced AI analysis</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => aiAnalysisMutation.mutate()}
                          className="gap-1 text-xs"
                        >
                          <Loader2 className={`h-3 w-3 ${aiAnalysisMutation.isPending ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>
                      <p className="text-sm leading-relaxed">{aiAnalysisMutation.data.summary}</p>
                    </div>

                    {/* Market Leader */}
                    {aiAnalysisMutation.data.leader && (
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                            <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                              Market Leader: {aiAnalysisMutation.data.leader.name}
                            </h4>
                            <p className="text-sm text-amber-700 dark:text-amber-300">{aiAnalysisMutation.data.leader.reason}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Key Insights */}
                    <div className="space-y-3">
                      <h5 className="text-sm font-semibold flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        Key Insights
                      </h5>
                      {aiAnalysisMutation.data.insights.map((insight, idx) => (
                        <div 
                          key={idx}
                          className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border/40"
                        >
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <p className="text-sm">{insight}</p>
                        </div>
                      ))}
                    </div>

                    {/* Risks & Opportunities */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {aiAnalysisMutation.data.risks.length > 0 && (
                        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                          <h5 className="text-sm font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2 mb-3">
                            <AlertTriangle className="h-4 w-4" />
                            Risk Factors
                          </h5>
                          <ul className="space-y-2">
                            {aiAnalysisMutation.data.risks.map((risk, idx) => (
                              <li key={idx} className="text-sm text-rose-600 dark:text-rose-300 flex items-start gap-2">
                                <span className="text-rose-400 mt-1">•</span>
                                {risk}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiAnalysisMutation.data.opportunities.length > 0 && (
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                          <h5 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 mb-3">
                            <Zap className="h-4 w-4" />
                            Opportunities
                          </h5>
                          <ul className="space-y-2">
                            {aiAnalysisMutation.data.opportunities.map((opp, idx) => (
                              <li key={idx} className="text-sm text-emerald-600 dark:text-emerald-300 flex items-start gap-2">
                                <span className="text-emerald-400 mt-1">•</span>
                                {opp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Lightbulb className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">AI-Powered Analysis</h4>
                        <p className="text-sm text-muted-foreground">Get expert insights from comparing the selected insurers</p>
                      </div>
                    </div>
                    
                    {selectedInsurers.length < 2 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        Select at least 2 insurers to generate AI-powered comparative analysis.
                      </p>
                    ) : (
                      <Button 
                        onClick={() => aiAnalysisMutation.mutate()} 
                        className="w-full gap-2"
                        disabled={aiAnalysisMutation.isPending}
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate AI Analysis
                      </Button>
                    )}
                  </div>
                )}

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-card border border-border/40 text-center">
                    <p className="text-2xl font-bold text-primary">{selectedInsurers.length}</p>
                    <p className="text-xs text-muted-foreground">Companies Compared</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/40 text-center">
                    <p className="text-2xl font-bold text-primary">{metricsConfig.length}</p>
                    <p className="text-xs text-muted-foreground">Metrics Analyzed</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/40 text-center">
                    <p className="text-2xl font-bold text-primary">{historicalData.length}</p>
                    <p className="text-xs text-muted-foreground">Data Points</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-center border border-dashed border-border/50 rounded-xl bg-secondary/10">
              <Scale className="h-16 w-16 text-muted-foreground/30 mb-6" />
              <h3 className="text-xl font-semibold mb-2">Select Companies to Compare</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Choose up to 4 insurance companies from the {categoryConfig[selectedCategory].label.toLowerCase()} category to see detailed analysis with charts, rankings, trends, and AI-powered insights.
              </p>
              {metrics.length > 0 && (
                <Badge variant="outline" className="mt-4 gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  {metrics.length} companies with available data
                </Badge>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}