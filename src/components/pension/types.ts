// Pension Dashboard Types - Aligned with NPRA 2024 Annual Report

export interface SSNITMetrics {
  totalAssets: number;
  activeContributors: number;
  activePensioners: number;
  dependencyRatio: number;
  contributionsReceived: number;
  benefitsPaid: number;
  minimumPension: number;
  returnOnInvestment: number;
  employers: number;
}

export interface HistoricalData {
  year: number;
  value: number;
}

export interface SSNITHistoricalData {
  contributors: HistoricalData[];
  assets: HistoricalData[];
  pensioners: HistoricalData[];
  employers: HistoricalData[];
  dependencyRatio: HistoricalData[];
}

export interface PrivatePensionMetrics {
  totalAssets: number;
  corporateTrustees: number;
  fundCustodians: number;
  individualTrustees: number;
  pensionFundManagers: number;
  registeredSchemes: number;
  benefitsPaid: number;
  tier2Share: number;
  tier3Share: number;
}

export interface CorporateTrustee {
  name: string;
  aum: number;
  marketShare: number;
  masterTrustAum?: number;
  personalPensionAum?: number;
  providentFundAum?: number;
}

export interface FundCustodian {
  name: string;
  marketShare: number;
  aum: number;
}

export interface AssetAllocation {
  name: string;
  value: number;
  fill: string;
}

export interface PensionSummaryCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  borderColor: string;
  textColor: string;
}

export const CHART_COLORS = [
  'hsl(45, 93%, 47%)',   // Amber
  'hsl(221, 83%, 53%)',  // Blue
  'hsl(142, 76%, 36%)',  // Green
  'hsl(262, 83%, 58%)',  // Purple
  'hsl(0, 84%, 60%)',    // Red
  'hsl(173, 80%, 40%)',  // Teal
  'hsl(291, 64%, 42%)',  // Violet
  'hsl(24, 95%, 53%)',   // Orange
  'hsl(330, 81%, 60%)',  // Pink
  'hsl(195, 74%, 47%)',  // Cyan
];
