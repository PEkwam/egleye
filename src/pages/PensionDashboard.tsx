import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Landmark, ExternalLink, 
  BarChart3, PieChart, Shield, Building2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Footer } from '@/components/Footer';
import { usePensionMetrics } from '@/hooks/usePensionMetrics';
import { DashboardNavigation } from '@/components/DashboardNavigation';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { 
  SSNITSection, 
  PrivatePensionSection, 
  IndustryOverview, 
  FundDetailsTable 
} from '@/components/pension';

export default function PensionDashboard() {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<number | 'all'>('all');
  const [selectedFundType, setSelectedFundType] = useState<string>('all');
  
  const { metrics, availableYears, availableQuarters, isLoading } = usePensionMetrics(
    selectedFundType !== 'all' ? selectedFundType : undefined,
    selectedYear || undefined,
    selectedQuarter === 'all' ? 'all' : selectedQuarter
  );

  // Set default year to highest available
  useEffect(() => {
    if (availableYears.length > 0 && selectedYear === null) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Set default quarter to latest available
  useEffect(() => {
    if (availableQuarters.length > 0 && selectedQuarter === 'all') {
      setSelectedQuarter(availableQuarters[availableQuarters.length - 1]); // sorted asc, pick last
    }
  }, [availableQuarters, selectedQuarter]);

  // Scroll to top when filters change
  useEffect(() => {
    if (selectedYear !== null) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [selectedYear, selectedQuarter]);

  if (isLoading) {
    return <DashboardSkeleton variant="pension" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Link to="/" className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Back</span>
              </Link>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shrink-0">
                  <Landmark className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-lg font-bold truncate">Pension Dashboard</h1>
                  <p className="text-xs text-muted-foreground hidden md:block">NPRA Ghana • {selectedYear || 2024}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
              <DashboardNavigation />
              
              <Select value={selectedFundType} onValueChange={setSelectedFundType}>
                <SelectTrigger className="w-[90px] sm:w-[120px] h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Fund Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Tier 1">Tier 1</SelectItem>
                  <SelectItem value="Tier 2">Tier 2</SelectItem>
                  <SelectItem value="Tier 3">Tier 3</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedYear?.toString() || ''} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[70px] sm:w-[90px] h-8 sm:h-9 text-xs sm:text-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.length > 0 ? (
                    availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))
                  ) : (
                    [2024, 2023].map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select 
                value={selectedQuarter?.toString() || 'all'} 
                onValueChange={(v) => setSelectedQuarter(v === 'all' ? 'all' : Number(v))}
              >
                <SelectTrigger className="w-[60px] sm:w-[80px] h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Qtr" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {availableQuarters.length > 0 ? (
                    availableQuarters.map(q => (
                      <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>
                    ))
                  ) : (
                    [1, 2, 3, 4].map(q => (
                      <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="sm"
                className="gap-1.5 hidden sm:flex h-9"
                asChild
              >
                <a href="https://www.npra.gov.gh/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  NPRA
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="ssnit" className="gap-1.5">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">SSNIT</span>
            </TabsTrigger>
            <TabsTrigger value="private" className="gap-1.5">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Private</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-1.5">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Details</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <IndustryOverview metrics={metrics} selectedYear={selectedYear} />
          </TabsContent>

          {/* SSNIT Tab */}
          <TabsContent value="ssnit" className="space-y-6">
            <SSNITSection metrics={metrics} />
          </TabsContent>

          {/* Private Pension Tab */}
          <TabsContent value="private" className="space-y-6">
            <PrivatePensionSection metrics={metrics} />
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            {metrics.length > 0 ? (
              <FundDetailsTable metrics={metrics} />
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <Landmark className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Pension Data Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Pension fund metrics will appear here once data is uploaded via the Pension Data Manager.
                  </p>
                  <Button variant="outline" asChild>
                    <Link to="/data-admin">
                      Go to Data Admin
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Data Source Attribution */}
        <div className="text-center py-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Data sourced from the National Pensions Regulatory Authority (NPRA) 2024 Annual Report
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Badge variant="outline" className="text-xs">
              <img 
                src="/logos/npra-ghana-logo.png" 
                alt="NPRA" 
                className="h-3 w-3 mr-1" 
              />
              NPRA Ghana
            </Badge>
            <a 
              href="https://www.npra.gov.gh/publications/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View Publications
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
