import { useState } from 'react';
import { Search, RefreshCw, Menu, X, Brain, ChevronRight, BarChart3, ChevronDown, Building2, Shield, Landmark, Wallet, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { newsApi } from '@/lib/api/news';
import { toast } from 'sonner';
import type { NewsCategory } from '@/types/news';
import type { GhanaInsurer, InsuranceCategory } from '@/types/insurers';
import { CategoryDropdown } from './CategoryDropdown';
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

// Enterprise Group subsidiaries - Updated from https://myenterprisegroup.io/our-subsidiaries/
const enterpriseSubsidiaries = [
  { id: 'enterprise-life', name: 'Enterprise Life Assurance', keywords: ['enterprise life'] },
  { id: 'enterprise-insurance', name: 'Enterprise Insurance', keywords: ['enterprise insurance', 'eic'] },
  { id: 'enterprise-trustees', name: 'Enterprise Trustees', keywords: ['enterprise trustees', 'etl'] },
  { id: 'enterprise-properties', name: 'Enterprise Properties', keywords: ['enterprise properties'] },
  { id: 'transitions-ghana', name: 'Transitions Ghana', keywords: ['transitions ghana'] },
];

const baseCategories: { id: NewsCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All News' },
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

  const handleInsurerSelect = (insurer: GhanaInsurer) => {
    onInsurerSelect?.(insurer);
    // Also search for news about this insurer
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

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/enterprise-life-logo.png" 
              alt="Enterprise Life" 
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </Link>

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-8">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="search"
                placeholder="Search Ghana insurance news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 bg-secondary/50 border-0 rounded-xl focus:bg-secondary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-xl border-green-600/30 text-green-600 hover:bg-green-600/10 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline font-medium">Refresh</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-11 w-11 rounded-xl"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 pb-3 -mx-1">
          {baseCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              {cat.label}
            </button>
          ))}

          {/* Regulators Dropdown - NEW */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                  activeCategory === 'regulator'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
              >
                <Landmark className="h-4 w-4" />
                Regulators
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-card border border-border shadow-lg z-50">
              <DropdownMenuItem 
                onClick={() => onCategoryChange('regulator')}
                className="cursor-pointer"
              >
                <img src="/logos/nic-ghana-logo.png" alt="NIC" className="h-6 w-6 mr-2 object-contain" />
                <div>
                  <p className="font-medium">NIC - Insurance</p>
                  <p className="text-xs text-muted-foreground">National Insurance Commission</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/npra-pensions" className="flex items-center gap-2">
                  <img src="/logos/npra-ghana-logo.png" alt="NPRA" className="h-6 w-6 mr-2 object-contain" />
                  <div>
                    <p className="font-medium">NPRA - Pensions</p>
                    <p className="text-xs text-muted-foreground">National Pensions Regulatory Authority</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Enterprise Group Dropdown with Subsidiaries */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  activeCategory === 'enterprise_group'
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
              >
                <img 
                  src="/logos/enterprise-group-logo.jpg" 
                  alt="Enterprise Group" 
                  className="h-5 w-auto object-contain rounded"
                />
                Enterprise Group
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-card border border-border shadow-lg z-50">
              <DropdownMenuItem 
                onClick={() => onCategoryChange('enterprise_group')}
                className="cursor-pointer font-medium"
              >
                <img src="/logos/enterprise-group-logo.jpg" alt="Enterprise Group" className="h-5 w-auto mr-2 object-contain rounded" />
                All Enterprise News
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {enterpriseSubsidiaries.map((sub) => (
                <DropdownMenuItem 
                  key={sub.id}
                  onClick={() => {
                    onSearch(sub.keywords[0]);
                  }}
                  className="cursor-pointer"
                >
                  {sub.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Category Dropdowns with Insurers */}
          <div className="h-5 w-px bg-border/50 mx-1" />
          <CategoryDropdown 
            category="life" 
            onInsurerSelect={handleInsurerSelect}
            isActive={activeInsuranceCategory === 'life'}
          />
          <CategoryDropdown 
            category="motor" 
            onInsurerSelect={handleInsurerSelect}
            isActive={activeInsuranceCategory === 'motor'}
          />
          <CategoryDropdown 
            category="pension" 
            onInsurerSelect={handleInsurerSelect}
            isActive={activeInsuranceCategory === 'pension'}
          />
          
          <div className="h-5 w-px bg-border/50 mx-1" />

          {/* Dashboards Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:opacity-90">
                <BarChart3 className="h-4 w-4" />
                <span>Dashboards</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-card border border-border shadow-lg z-50">
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/executive-dashboard" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  Life Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/nonlife-dashboard" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-green-500" />
                  Non-Life Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/brokers-dashboard" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-purple-500" />
                  Brokers Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/pension-dashboard" className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-amber-500" />
                  Pension Dashboard
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="ml-auto">
            <Link
              to="/insurance-ai"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Brain className="h-4 w-4" />
              <span>AI Industry Tracker</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </nav>

        {/* Mobile Menu - Redesigned */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-16 z-40 bg-background/98 backdrop-blur-lg overflow-y-auto animate-fade-in">
            <div className="p-4 space-y-6 pb-24">
              {/* Search */}
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search Ghana insurance news..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-14 bg-secondary/50 border-0 rounded-2xl text-base"
                  />
                </div>
              </form>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    onCategoryChange('all');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all ${
                    activeCategory === 'all'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'bg-secondary/60 text-foreground hover:bg-secondary'
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
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all ${
                    activeCategory === 'regulator'
                      ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-lg'
                      : 'bg-secondary/60 text-foreground hover:bg-secondary'
                  }`}
                >
                  <Shield className="h-6 w-6" />
                  <span className="text-sm font-medium">NIC News</span>
                </button>
              </div>

              {/* Regulators Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Regulators</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/"
                    onClick={() => {
                      onCategoryChange('regulator');
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 shadow-sm"
                  >
                    <img src="/logos/nic-ghana-logo.png" alt="NIC" className="h-10 w-10 object-contain rounded-lg" />
                    <div>
                      <p className="font-medium text-sm">NIC</p>
                      <p className="text-xs text-muted-foreground">Insurance</p>
                    </div>
                  </Link>
                  
                  <Link
                    to="/npra-pensions"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 shadow-sm"
                  >
                    <img src="/logos/npra-ghana-logo.png" alt="NPRA" className="h-10 w-10 object-contain rounded-lg" />
                    <div>
                      <p className="font-medium text-sm">NPRA</p>
                      <p className="text-xs text-muted-foreground">Pensions</p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Insurance Categories */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Insurance Categories</h3>
                <div className="grid grid-cols-3 gap-2">
                  <CategoryDropdown 
                    category="life" 
                    onInsurerSelect={(insurer) => {
                      handleInsurerSelect(insurer);
                      setIsMobileMenuOpen(false);
                    }}
                    isActive={activeInsuranceCategory === 'life'}
                  />
                  <CategoryDropdown 
                    category="motor" 
                    onInsurerSelect={(insurer) => {
                      handleInsurerSelect(insurer);
                      setIsMobileMenuOpen(false);
                    }}
                    isActive={activeInsuranceCategory === 'motor'}
                  />
                  <CategoryDropdown 
                    category="pension" 
                    onInsurerSelect={(insurer) => {
                      handleInsurerSelect(insurer);
                      setIsMobileMenuOpen(false);
                    }}
                    isActive={activeInsuranceCategory === 'pension'}
                  />
                </div>
              </div>

              {/* Dashboards Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Dashboards</h3>
                <div className="space-y-2">
                  <Link
                    to="/executive-dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                  >
                    <div className="p-2 bg-white/20 rounded-lg">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Life Insurance</p>
                      <p className="text-xs text-white/80">Market analytics & metrics</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/60" />
                  </Link>

                  <Link
                    to="/nonlife-dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg"
                  >
                    <div className="p-2 bg-white/20 rounded-lg">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Non-Life Insurance</p>
                      <p className="text-xs text-white/80">Motor, property & more</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/60" />
                  </Link>

                  <Link
                    to="/brokers-dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg"
                  >
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Insurance Brokers</p>
                      <p className="text-xs text-white/80">Broker performance data</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/60" />
                  </Link>

                  <Link
                    to="/pension-dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                  >
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Pension Funds</p>
                      <p className="text-xs text-white/80">NPRA fund metrics</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/60" />
                  </Link>
                </div>
              </div>

              {/* AI & Refresh Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link
                  to="/insurance-ai"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 h-14 rounded-xl bg-muted text-foreground font-medium border border-border"
                >
                  <Brain className="h-5 w-5" />
                  <span>AI Tracker</span>
                </Link>
                
                <Button
                  onClick={() => {
                    handleRefresh();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isRefreshing}
                  variant="outline"
                  className="h-14 rounded-xl border-green-600/30 text-green-600 hover:bg-green-50"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
