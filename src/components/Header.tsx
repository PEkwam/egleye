import { useState } from 'react';
import { Search, RefreshCw, Menu, X, Brain, ChevronRight, BarChart3, ChevronDown, Building2, Shield, Landmark, Newspaper, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { newsApi } from '@/lib/api/news';
import { toast } from 'sonner';
import type { NewsCategory } from '@/types/news';
import type { GhanaInsurer, InsuranceCategory } from '@/types/insurers';
import { CategoryDropdown } from './CategoryDropdown';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  activeCategory: NewsCategory | 'all';
  onCategoryChange: (category: NewsCategory | 'all') => void;
  onSearch: (query: string) => void;
  onInsurerSelect?: (insurer: GhanaInsurer) => void;
  activeInsuranceCategory?: InsuranceCategory | null;
}

// Enterprise Group subsidiaries with logos
const enterpriseSubsidiaries = [
  { id: 'enterprise-life', name: 'Enterprise Life Assurance', keywords: ['enterprise life'], logo: '/logos/enterprise-life.png' },
  { id: 'enterprise-insurance', name: 'Enterprise Insurance', keywords: ['enterprise insurance', 'eic'], logo: '/logos/enterprise-insurance-full.png' },
  { id: 'enterprise-trustees', name: 'Enterprise Trustees', keywords: ['enterprise trustees', 'etl'], logo: '/logos/enterprise-trustees-full.jpg' },
  { id: 'enterprise-properties', name: 'Enterprise Properties', keywords: ['enterprise properties'], logo: '/logos/enterprise-properties.png' },
  { id: 'transitions-funeral', name: 'Transitions Funeral Services', keywords: ['enterprise funeral', 'transitions ghana'], logo: '/logos/transitions-funeral.png' },
  { id: 'acacia-health', name: 'Acacia Health Insurance', keywords: ['acacia health', 'acacia insurance'], logo: '/logos/acacia-health.png' },
];

export function Header({ 
  activeCategory, 
  onCategoryChange, 
  onSearch,
  onInsurerSelect,
  activeInsuranceCategory 
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { siteName, siteTagline, logoUrl } = useSiteSettings();

  const handleInsurerSelect = (insurer: GhanaInsurer) => {
    onInsurerSelect?.(insurer);
    onSearch(insurer.keywords[0]);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await newsApi.triggerNewsCrawl();
      if (result.success) {
        toast.success('News feed updated!', {
          description: result.message,
        });
      } else {
        toast.error(result.message || 'Failed to refresh news');
      }
    } catch (error) {
      toast.error('Failed to refresh news feed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const isHome = location.pathname === '/';

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
      <div className="container mx-auto px-4">
        {/* Main Header Row */}
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img 
              src={logoUrl} 
              alt={siteName} 
              className="h-9 sm:h-10 w-auto object-contain"
            />
            <div className="hidden sm:block">
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {siteName}
              </span>
              <p className="text-[10px] text-muted-foreground -mt-0.5">{siteTagline}</p>
            </div>
          </Link>

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="hidden lg:flex items-center flex-1 max-w-lg">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search news, insurers, regulators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 h-10 bg-muted/50 border-0 rounded-full focus:bg-muted focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
          </form>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="sm"
              variant="ghost"
              className="h-9 px-3 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="ml-1.5 hidden xl:inline text-sm">Refresh</span>
            </Button>

            <Link to="/insurance-ai">
              <Button
                size="sm"
                className="h-9 px-4 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-purple-500/25"
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                <span className="text-sm font-medium">AI Insights</span>
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-10 w-10 rounded-full"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 pb-2.5 -mx-1 overflow-x-auto scrollbar-hide">
          {/* News Categories */}
          <button
            onClick={() => onCategoryChange('all')}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeCategory === 'all' && isHome
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            All News
          </button>

          <div className="w-px h-4 bg-border/60 mx-1" />

          {/* Regulators */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeCategory === 'regulator'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                Regulators
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60 p-2">
              <DropdownMenuItem 
                onClick={() => onCategoryChange('regulator')}
                className="rounded-lg p-2.5 cursor-pointer"
              >
                <img src="/logos/nic-ghana-logo.png" alt="NIC" className="h-8 w-8 rounded-lg object-contain bg-white p-1 mr-3" />
                <div>
                  <p className="font-semibold text-sm">NIC Ghana</p>
                  <p className="text-xs text-muted-foreground">National Insurance Commission</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
                <Link to="/npra-pensions" className="flex items-center">
                  <img src="/logos/npra-ghana-logo.png" alt="NPRA" className="h-8 w-8 rounded-lg object-contain bg-white p-1 mr-3" />
                  <div>
                    <p className="font-semibold text-sm">NPRA Ghana</p>
                    <p className="text-xs text-muted-foreground">Pensions Regulatory Authority</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Enterprise Group */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeCategory === 'enterprise_group'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Building2 className="h-3.5 w-3.5 text-amber-500" />
                Enterprise Group
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 p-2">
              <DropdownMenuItem 
                onClick={() => onCategoryChange('enterprise_group')}
                className="rounded-lg p-2.5 cursor-pointer font-medium"
              >
                <img src="/logos/enterprise-group.jpg" alt="Enterprise Group" className="h-8 w-8 rounded-lg mr-3 object-contain bg-[#8B1538] p-1" />
                <div>
                  <p className="font-semibold text-sm">All Enterprise News</p>
                  <p className="text-xs text-muted-foreground">View all subsidiaries</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5" />
              {enterpriseSubsidiaries.map((sub) => (
                <DropdownMenuItem 
                  key={sub.id}
                  onClick={() => onSearch(sub.keywords[0])}
                  className="rounded-lg p-2.5 cursor-pointer flex items-center gap-3"
                >
                  <img 
                    src={sub.logo} 
                    alt={sub.name} 
                    className="h-8 w-8 rounded-lg object-contain bg-white p-0.5 border border-border/30" 
                  />
                  <span className="text-sm font-medium">{sub.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-4 bg-border/60 mx-1" />

          {/* Insurance Categories */}
          <CategoryDropdown 
            category="life" 
            onInsurerSelect={handleInsurerSelect}
            isActive={activeInsuranceCategory === 'life'}
          />
          <CategoryDropdown 
            category="nonlife" 
            onInsurerSelect={handleInsurerSelect}
            isActive={activeInsuranceCategory === 'nonlife'}
          />
          <CategoryDropdown 
            category="pension" 
            onInsurerSelect={handleInsurerSelect}
            isActive={activeInsuranceCategory === 'pension'}
          />

          <div className="w-px h-4 bg-border/60 mx-1" />

          {/* Dashboards */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 hover:from-blue-500/20 hover:to-indigo-500/20 whitespace-nowrap">
                <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
                Dashboards
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 p-2">
              <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
                <Link to="/executive-dashboard" className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-rose-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Life Insurance</p>
                    <p className="text-xs text-muted-foreground">Market metrics</p>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
                <Link to="/nonlife-dashboard" className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Non-Life Insurance</p>
                    <p className="text-xs text-muted-foreground">Motor, property & more</p>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
                <Link to="/brokers-dashboard" className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Brokers</p>
                    <p className="text-xs text-muted-foreground">Performance data</p>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer">
                <Link to="/pension-dashboard" className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Landmark className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Pension Funds</p>
                    <p className="text-xs text-muted-foreground">NPRA metrics</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-background overflow-y-auto">
          <div className="p-4 space-y-5 pb-24">
            {/* Mobile Search */}
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search news, insurers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 h-12 bg-muted border-0 rounded-2xl text-base"
                />
              </div>
            </form>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  onCategoryChange('all');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${
                  activeCategory === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:border-primary/50'
                }`}
              >
                <Newspaper className="h-6 w-6" />
                <span className="text-sm font-medium">All News</span>
              </button>
              
              <button
                onClick={() => {
                  onCategoryChange('regulator');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${
                  activeCategory === 'regulator'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    : 'bg-card border-border hover:border-emerald-500/30'
                }`}
              >
                <Shield className="h-6 w-6" />
                <span className="text-sm font-medium">Regulators</span>
              </button>
            </div>

            {/* Regulators */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Regulators</h3>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/"
                  onClick={() => {
                    onCategoryChange('regulator');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                >
                  <img src="/logos/nic-ghana-logo.png" alt="NIC" className="h-10 w-10 object-contain rounded-lg bg-white p-1" />
                  <div>
                    <p className="font-medium text-sm">NIC</p>
                    <p className="text-xs text-muted-foreground">Insurance</p>
                  </div>
                </Link>
                
                <Link
                  to="/npra-pensions"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                >
                  <img src="/logos/npra-ghana-logo.png" alt="NPRA" className="h-10 w-10 object-contain rounded-lg bg-white p-1" />
                  <div>
                    <p className="font-medium text-sm">NPRA</p>
                    <p className="text-xs text-muted-foreground">Pensions</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Dashboards */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Dashboards</h3>
              <div className="space-y-2">
                <Link
                  to="/executive-dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20"
                >
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Life Insurance</p>
                    <p className="text-xs text-muted-foreground">Market analytics</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>

                <Link
                  to="/nonlife-dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/10 border border-primary/20"
                >
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Non-Life Insurance</p>
                    <p className="text-xs text-muted-foreground">Motor, property & more</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>

                <Link
                  to="/brokers-dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-500/20"
                >
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Insurance Brokers</p>
                    <p className="text-xs text-muted-foreground">Performance data</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>

                <Link
                  to="/pension-dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
                >
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Landmark className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Pension Funds</p>
                    <p className="text-xs text-muted-foreground">NPRA metrics</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                to="/insurance-ai"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium shadow-lg"
              >
                <Sparkles className="h-5 w-5" />
                <span>AI Insights</span>
              </Link>
              
              <Button
                onClick={() => {
                  handleRefresh();
                  setIsMobileMenuOpen(false);
                }}
                disabled={isRefreshing}
                variant="outline"
                className="h-12 rounded-xl"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
