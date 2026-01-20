import { TrendingUp, TrendingDown, Minus, Wallet, Building2, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';
import { InsurerLogo } from '@/components/InsurerLogo';
import { type GhanaInsurer } from '@/types/insurers';
import { InsuranceType } from './types';

interface TrendsTabProps {
  selectedInsurers: GhanaInsurer[];
  trendData: Array<Record<string, string | number>>;
  historicalData: any[];
  chartColors: string[];
  insuranceType: InsuranceType;
  selectedYear: number | null;
  selectedQuarter: number;
  findMatchingInsurerId: (record: any) => string | null;
}

export function TrendsTab({
  selectedInsurers,
  trendData,
  historicalData,
  chartColors,
  insuranceType,
  selectedYear,
  selectedQuarter,
  findMatchingInsurerId,
}: TrendsTabProps) {
  const premiumLabel = insuranceType === 'nonlife' 
    ? 'Premium Revenue' 
    : insuranceType === 'pension' 
    ? 'AUM' 
    : 'Gross Premium';

  return (
    <div className="space-y-6">
      {/* Historical Trend Line Chart */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-border/40">
        <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          {premiumLabel} Over Time (₵M)
        </h4>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => `₵${value.toFixed(0)}M`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`₵${value.toFixed(1)}M`, '']}
              />
              <Legend 
                formatter={(value) => selectedInsurers.find(i => i.id === value)?.shortName || value}
                wrapperStyle={{ paddingTop: '10px' }}
              />
              {selectedInsurers.map((insurer, idx) => (
                <Line
                  key={insurer.id}
                  type="monotone"
                  dataKey={insurer.id}
                  name={insurer.id}
                  stroke={chartColors[idx]}
                  strokeWidth={2}
                  dot={{ r: 4, fill: chartColors[idx] }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quarter-over-Quarter Performance Cards */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          Quarter-over-Quarter Performance
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          {selectedInsurers.map((insurer, idx) => {
            // Get current and previous quarter data
            const insurerHistory = historicalData
              .filter((d: any) => findMatchingInsurerId(d) === insurer.id)
              .sort((a: any, b: any) => 
                (b.report_year * 10 + (b.report_quarter || 0)) - (a.report_year * 10 + (a.report_quarter || 0))
              );
            
            const currentData = insurerHistory[0];
            const previousData = insurerHistory[1];
            
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
                  style={{ backgroundColor: chartColors[idx] }}
                />
                
                {/* Decorative element */}
                <div 
                  className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
                  style={{ backgroundColor: chartColors[idx] }}
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
    </div>
  );
}
