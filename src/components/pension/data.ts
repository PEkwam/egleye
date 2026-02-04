// NPRA 2024 Annual Report Data - Pages 44-55
import { 
  SSNITMetrics, 
  SSNITHistoricalData, 
  PrivatePensionMetrics,
  CorporateTrustee,
  FundCustodian,
  AssetAllocation,
  CHART_COLORS 
} from './types';

// SSNIT (BNSSS) Metrics - Page 44
export const SSNIT_2024: SSNITMetrics = {
  totalAssets: 22500000000, // GH₵22.5bn
  activeContributors: 2007411,
  activePensioners: 254056,
  dependencyRatio: 8.06, // 1:8.06 (contributors per pensioner)
  contributionsReceived: 8800000000, // GH₵8.8bn
  benefitsPaid: 6500000000, // GH₵6.5bn
  minimumPension: 300, // GH₵300.00
  returnOnInvestment: 17.07, // 17.07%
  employers: 89899,
};

// SSNIT Historical Data - Pages 47-48
export const SSNIT_HISTORICAL: SSNITHistoricalData = {
  contributors: [
    { year: 2020, value: 1633505 },
    { year: 2021, value: 1734168 },
    { year: 2022, value: 1843833 },
    { year: 2023, value: 1951494 },
    { year: 2024, value: 2007411 },
  ],
  assets: [
    { year: 2020, value: 22.02 },
    { year: 2021, value: 28.02 },
    { year: 2022, value: 35.3 },
    { year: 2023, value: 46.5 },
    { year: 2024, value: 63.88 },
  ],
  pensioners: [
    { year: 2020, value: 227407 },
    { year: 2021, value: 225768 },
    { year: 2022, value: 235762 },
    { year: 2023, value: 244830 },
    { year: 2024, value: 254056 },
  ],
  employers: [
    { year: 2020, value: 62472 },
    { year: 2021, value: 75978 },
    { year: 2022, value: 83756 },
    { year: 2023, value: 88640 },
    { year: 2024, value: 89899 },
  ],
  dependencyRatio: [
    { year: 2020, value: 7.2 },
    { year: 2021, value: 7.7 },
    { year: 2022, value: 7.82 },
    { year: 2023, value: 7.8 },
    { year: 2024, value: 8.06 },
  ],
};

// Private Pension Metrics - Page 45
export const PRIVATE_PENSION_2024: PrivatePensionMetrics = {
  totalAssets: 63880000000, // GH₵63.88bn
  corporateTrustees: 23,
  fundCustodians: 18,
  individualTrustees: 818,
  pensionFundManagers: 37,
  registeredSchemes: 218,
  benefitsPaid: 1300000000, // GH₵1.3bn
  tier2Share: 28, // 28% - Page 50
  tier3Share: 72, // 72% - Page 50
};

// Corporate Trustees by AUM - Master Trust Schemes
export const CORPORATE_TRUSTEES: CorporateTrustee[] = [
  { name: 'Enterprise Trustees', aum: 3.98, marketShare: 22.23, masterTrustAum: 2.1, personalPensionAum: 0.9, providentFundAum: 0.98 },
  { name: 'GLICO Pensions', aum: 3.22, marketShare: 18.01, masterTrustAum: 1.7, personalPensionAum: 0.8, providentFundAum: 0.72 },
  { name: 'Pensions Alliance Trust', aum: 2.69, marketShare: 15.01, masterTrustAum: 1.5, personalPensionAum: 0.7, providentFundAum: 0.49 },
  { name: 'Petra Trust', aum: 2.15, marketShare: 12.01, masterTrustAum: 1.2, personalPensionAum: 0.5, providentFundAum: 0.45 },
  { name: 'Axis Pension Trust', aum: 1.79, marketShare: 10.01, masterTrustAum: 1.0, personalPensionAum: 0.4, providentFundAum: 0.39 },
  { name: 'Metropolitan Pensions', aum: 1.43, marketShare: 8.01, masterTrustAum: 0.8, personalPensionAum: 0.3, providentFundAum: 0.33 },
  { name: 'Old Mutual Pensions', aum: 1.08, marketShare: 6.00, masterTrustAum: 0.6, personalPensionAum: 0.25, providentFundAum: 0.23 },
  { name: 'Negotiated Benefits Trust', aum: 0.72, marketShare: 4.01, masterTrustAum: 0.4, personalPensionAum: 0.2, providentFundAum: 0.12 },
  { name: 'Others', aum: 0.84, marketShare: 4.71, masterTrustAum: 0.5, personalPensionAum: 0.2, providentFundAum: 0.14 },
];

// Fund Custodians Market Share - Page 50+
export const FUND_CUSTODIANS: FundCustodian[] = [
  { name: 'Stanbic Bank', marketShare: 28.5, aum: 18.21 },
  { name: 'Standard Chartered', marketShare: 22.3, aum: 14.25 },
  { name: 'Ecobank Ghana', marketShare: 18.7, aum: 11.95 },
  { name: 'GCB Bank', marketShare: 12.4, aum: 7.92 },
  { name: 'Fidelity Bank', marketShare: 8.9, aum: 5.69 },
  { name: 'Cal Bank', marketShare: 5.1, aum: 3.26 },
  { name: 'Others', marketShare: 4.1, aum: 2.60 },
];

// Asset Allocation of Private Pension Funds
export const ASSET_ALLOCATION: AssetAllocation[] = [
  { name: 'Government Securities', value: 48.5, fill: CHART_COLORS[1] },
  { name: 'Listed Equities', value: 18.2, fill: CHART_COLORS[2] },
  { name: 'Corporate Bonds', value: 12.8, fill: CHART_COLORS[0] },
  { name: 'Bank Deposits', value: 10.5, fill: CHART_COLORS[3] },
  { name: 'Alternative Investments', value: 5.2, fill: CHART_COLORS[4] },
  { name: 'Cash & Others', value: 4.8, fill: CHART_COLORS[5] },
];

// SSNIT Asset Allocation
export const SSNIT_ASSET_ALLOCATION: AssetAllocation[] = [
  { name: 'Fixed Income', value: 52, fill: CHART_COLORS[1] },
  { name: 'Equity', value: 28, fill: CHART_COLORS[2] },
  { name: 'Money Market', value: 12, fill: CHART_COLORS[0] },
  { name: 'Alternative Investments', value: 5, fill: CHART_COLORS[3] },
  { name: 'Others', value: 3, fill: CHART_COLORS[5] },
];

// Private Pension Tier Split
export const TIER_SPLIT = [
  { name: 'Tier 2 (Occupational)', value: 28, fill: CHART_COLORS[1] },
  { name: 'Tier 3 (Voluntary)', value: 72, fill: CHART_COLORS[2] },
];

// Growth rates for industry metrics
export const INDUSTRY_GROWTH = {
  aumGrowth: 37.4, // YoY
  contributorGrowth: 2.9,
  benefitsGrowth: 18.5,
};
