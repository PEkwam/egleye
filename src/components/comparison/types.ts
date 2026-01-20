import { type GhanaInsurer, type InsuranceCategory } from '@/types/insurers';
import { type InsurerMetrics } from '@/hooks/useInsurerMetrics';
import { LucideIcon } from 'lucide-react';

export type InsuranceType = 'life' | 'nonlife' | 'pension';

export interface AIAnalysis {
  summary: string;
  insights: string[];
  leader: { name: string; reason: string } | null;
  risks: string[];
  opportunities: string[];
}

export interface MetricConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  format: (value: number | null) => string;
  highlight: 'max' | 'min';
  unit: string;
}

export interface DataAvailabilityItem {
  insurer: GhanaInsurer;
  hasData: boolean;
  latestQuarter: string | null;
}

export interface RankingItem {
  insurer: GhanaInsurer;
  score: number;
  wins: number;
}

// Default fallback colors if insurer doesn't have brand color
export const FALLBACK_CHART_COLORS = [
  'hsl(145, 75%, 40%)',
  'hsl(221, 83%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(24, 95%, 53%)',
];

// Get chart colors from selected insurers' brand colors
export const getInsurerChartColors = (insurers: GhanaInsurer[]): string[] => {
  return insurers.map((insurer, idx) => 
    insurer.brandColor || FALLBACK_CHART_COLORS[idx % FALLBACK_CHART_COLORS.length]
  );
};
