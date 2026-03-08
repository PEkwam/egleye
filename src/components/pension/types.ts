// Pension Dashboard Types - NPRA 2024 Annual Report

export interface FundCustodian {
  name: string;
  marketShare: number;
}

export interface AssetAllocationItem {
  name: string;
  value: number;
  fill: string;
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
  'hsl(155, 60%, 45%)',  // Mint
  'hsl(280, 60%, 50%)',  // Plum
];

// NPRA 2024 Annual Report - Verified Data (Pages 44-50)

// Fund Custodians Market Share - Table 1
export const FUND_CUSTODIANS_2024: FundCustodian[] = [
  { name: 'Prudential Bank', marketShare: 21.62 },
  { name: 'Standard Chartered', marketShare: 14.37 },
  { name: 'Cal Bank', marketShare: 13.09 },
  { name: 'Republic Bank', marketShare: 10.66 },
  { name: 'Stanbic Bank', marketShare: 10.24 },
  { name: 'Fidelity Bank', marketShare: 10.10 },
  { name: 'Ecobank', marketShare: 7.94 },
  { name: 'Zenith Bank', marketShare: 7.88 },
  { name: 'ADB Bank', marketShare: 1.61 },
  { name: 'Guaranty Trust Bank', marketShare: 1.23 },
  { name: 'GCB Bank', marketShare: 0.97 },
  { name: 'First Atlantic Bank', marketShare: 0.26 },
  { name: 'Consolidated Bank', marketShare: 0.03 },
];

// Asset Allocation - Figure 16 (percentages)
export const ASSET_ALLOCATION_2024: AssetAllocationItem[] = [
  { name: 'GoG Securities', value: 72.92, fill: CHART_COLORS[1] },
  { name: 'Bank & Market Securities', value: 8.63, fill: CHART_COLORS[0] },
  { name: 'Equities', value: 5.71, fill: CHART_COLORS[2] },
  { name: 'Collective Inv. Schemes', value: 3.51, fill: CHART_COLORS[3] },
  { name: 'Cash', value: 2.95, fill: CHART_COLORS[5] },
  { name: 'Corporate Debt', value: 1.31, fill: CHART_COLORS[7] },
  { name: 'Alternative Investments', value: 1.09, fill: CHART_COLORS[4] },
  { name: 'Local Gov. Securities', value: 0.93, fill: CHART_COLORS[6] },
];

// SSNIT Key Figures - Page 44
export const SSNIT_2024 = {
  totalAssets: 22_500_000_000,
  activeContributors: 2_007_411,
  activePensioners: 254_056,
  employers: 89_899,
  dependencyRatio: 8.06,
  contributionsReceived: 8_800_000_000,
  benefitsPaid: 6_500_000_000,
  minimumPension: 300,
  returnOnInvestment: 17.07,
};

// SSNIT Historical - Pages 47-50
export const SSNIT_HISTORICAL = {
  totalAssets: [
    { year: 2020, value: 22.02 },
    { year: 2021, value: 28.02 },
    { year: 2022, value: 35.3 },
    { year: 2023, value: 46.5 },
    { year: 2024, value: 63.88 },
  ],
  employers: [
    { year: 2020, value: 62_472 },
    { year: 2021, value: 75_978 },
    { year: 2022, value: 83_756 },
    { year: 2023, value: 88_640 },
    { year: 2024, value: 89_899 },
  ],
  dependencyRatio: [
    { year: 2020, value: 7.2 },
    { year: 2021, value: 7.7 },
    { year: 2022, value: 7.82 },
    { year: 2023, value: 7.8 },
    { year: 2024, value: 8.06 },
  ],
};

// Industry structure - Page 45
export const INDUSTRY_STRUCTURE_2024 = {
  corporateTrustees: 27,
  fundCustodians: 18,
  activeCustodians: 13,
  pensionFundManagers: 37,
  tier2Share: 28,
  tier3Share: 72,
  totalIndustryAUM: 63_880_000_000, // GH₵63.88bn
};
