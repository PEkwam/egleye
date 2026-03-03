import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Upload, Database, RefreshCw, FileSpreadsheet, Check, AlertTriangle, 
  FileUp, X, Trash2, Newspaper, Building2, Landmark, Image, ImagePlus,
  BarChart3, Settings, Users, TrendingUp, Shield, Zap, Calendar, Globe, Type, Save
} from 'lucide-react';
import { NewsFiltersSection } from '@/components/admin/NewsFiltersSection';
import { PensionDataManager } from '@/components/admin/PensionDataManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useInsurerMetrics } from '@/hooks/useInsurerMetrics';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

// Life insurance fields
interface ParsedLifeInsurer {
  insurer_name: string;
  gross_premium?: number;
  total_assets?: number;
  market_share?: number;
  expense_ratio?: number;
  claims_ratio?: number;
  profit_after_tax?: number;
  investment_income?: number;
  total_claims_paid?: number;
  group_policies?: number;
  term_premium?: number;
  credit_life?: number;
  whole_life?: number;
  endowment?: number;
  universal_life?: number;
  csm?: number;
}

// Non-Life insurance fields
interface ParsedNonLifeInsurer {
  insurer_name: string;
  insurance_service_revenue?: number;
  motor_comprehensive?: number;
  motor_third_party?: number;
  motor_third_party_fire_theft?: number;
  motor_others?: number;
  fire_property_private?: number;
  fire_property_commercial?: number;
  accident_public_liability?: number;
  accident_professional_indemnity?: number;
  accident_travel?: number;
  accident_personal?: number;
  accident_others?: number;
  workman_compensation?: number;
  marine_cargo?: number;
  marine_hull?: number;
  aviation?: number;
  engineering?: number;
  engineering_others?: number;
  agriculture_weather?: number;
  agriculture_area?: number;
  agriculture_poultry?: number;
  agriculture_others?: number;
  microinsurance?: number;
  bonds?: number;
  profit_after_tax?: number;
  total_assets?: number;
  market_share?: number;
  claims_ratio?: number;
  expense_ratio?: number;
  investment_income?: number;
  total_incurred_claims?: number;
  insurance_service_results?: number;
  non_attributable_expenses?: number;
  total_liabilities?: number;
}

type ParsedInsurer = ParsedLifeInsurer | ParsedNonLifeInsurer;

// File upload validation constants
const ALLOWED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'];
const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif'];
const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_EXCEL_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const validateImageFile = (file: File): string | null => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return `Invalid file type ".${ext}". Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`;
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return `Invalid MIME type "${file.type}". Only image files are allowed.`;
  }
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: 5MB.`;
  }
  return null;
};

const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
};

// Broker data fields
interface ParsedBroker {
  broker_name: string;
  commission_income?: number;
  general_admin_expenses?: number;
  operational_results?: number;
  total_investments_income?: number;
  profit_loss_after_tax?: number;
  market_share?: number;
}

interface SheetData {
  sheetName: string;
  quarter: number | null;
  year: number;
  insurers: ParsedInsurer[];
  selected: boolean;
  dataType: 'life' | 'nonlife';
}

interface BrokerSheetData {
  sheetName: string;
  quarter: number | null;
  year: number;
  brokers: ParsedBroker[];
  selected: boolean;
}

type AdminSection = 'overview' | 'news' | 'insurers' | 'brokers' | 'pension' | 'settings';

// Site Settings Section Component
const SiteSettingsSection = () => {
  const { settings, siteName, siteTagline, logoUrl, colorTheme, updateSetting, isUpdating } = useSiteSettings();
  const [editName, setEditName] = useState(siteName);
  const [editTagline, setEditTagline] = useState(siteTagline);
  const [editLogoUrl, setEditLogoUrl] = useState(logoUrl);
  const [editTheme, setEditTheme] = useState(colorTheme);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Sync state when settings load
  useState(() => {
    setEditName(siteName);
    setEditTagline(siteTagline);
    setEditLogoUrl(logoUrl);
    setEditTheme(colorTheme);
  });

  const handleSaveSettings = async () => {
    try {
      if (editName !== siteName) {
        updateSetting({ key: 'site_name', value: editName });
      }
      if (editTagline !== siteTagline) {
        updateSetting({ key: 'site_tagline', value: editTagline });
      }
      if (editLogoUrl !== logoUrl) {
        updateSetting({ key: 'logo_url', value: editLogoUrl });
      }
      if (editTheme !== colorTheme) {
        updateSetting({ key: 'color_theme', value: editTheme });
      }
      toast.success('Site settings saved!');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const filePath = `site-logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('insurer-logos')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('insurer-logos')
        .getPublicUrl(filePath);

      setEditLogoUrl(urlData.publicUrl);
      updateSetting({ key: 'logo_url', value: urlData.publicUrl });
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
      if (logoFileRef.current) logoFileRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-cyan-500" />
          Site Settings
        </CardTitle>
        <CardDescription>Configure your portal's branding and appearance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Theme Selector */}
        <div className="space-y-3">
          <Label>Color Theme</Label>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <button
              onClick={() => setEditTheme('enterprise_life')}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                editTheme === 'enterprise_life' 
                  ? 'border-emerald-500 bg-emerald-500/10' 
                  : 'border-border hover:border-emerald-500/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <img src="/logos/enterprise-life.png" alt="Enterprise Life" className="h-10 w-10 rounded-lg object-contain bg-emerald-600 p-1" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Enterprise Life</p>
                  <p className="text-xs text-muted-foreground">Green theme</p>
                </div>
              </div>
              {editTheme === 'enterprise_life' && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                </div>
              )}
            </button>
            <button
              onClick={() => setEditTheme('enterprise_group')}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                editTheme === 'enterprise_group' 
                  ? 'border-rose-700 bg-rose-700/10' 
                  : 'border-border hover:border-rose-700/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <img src="/logos/enterprise-group.jpg" alt="Enterprise Group" className="h-10 w-10 rounded-lg object-contain bg-[#8B1538] p-1" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Enterprise Group</p>
                  <p className="text-xs text-muted-foreground">Maroon theme</p>
                </div>
              </div>
              {editTheme === 'enterprise_group' && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-rose-700" />
                </div>
              )}
            </button>
          </div>
        </div>

        <Separator />

        {/* Logo Preview & Upload */}
        <div className="space-y-3">
          <Label>Site Logo</Label>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
              {editLogoUrl ? (
                <img src={editLogoUrl} alt="Site Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <Image className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={logoFileRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => logoFileRef.current?.click()}
                disabled={isUploadingLogo}
                className="border-cyan-500/30 hover:bg-cyan-500/10"
              >
                {isUploadingLogo ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                ) : (
                  <><ImagePlus className="h-4 w-4 mr-2" />Upload New Logo</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">Recommended: PNG or SVG, 200x200px</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Site Name */}
        <div className="space-y-2">
          <Label htmlFor="site-name">
            <Type className="h-4 w-4 inline mr-2" />
            Site Name
          </Label>
          <Input
            id="site-name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="e.g., InsuraWatch"
            className="max-w-md"
          />
          <p className="text-xs text-muted-foreground">This appears next to the logo in the header</p>
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <Label htmlFor="site-tagline">Tagline</Label>
          <Input
            id="site-tagline"
            value={editTagline}
            onChange={(e) => setEditTagline(e.target.value)}
            placeholder="e.g., Ghana Insurance Intelligence"
            className="max-w-md"
          />
          <p className="text-xs text-muted-foreground">Shown below the site name on desktop</p>
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={isUpdating}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
          >
            {isUpdating ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Save Settings</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const DataAdmin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [isCleaningNews, setIsCleaningNews] = useState(false);
  const [isCrawlingNews, setIsCrawlingNews] = useState(false);
  const [isSyncingInsurers, setIsSyncingInsurers] = useState(false);
  const [isSyncingLogos, setIsSyncingLogos] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'life' | 'nonlife'>('life');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [jsonData, setJsonData] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [parsedSheets, setParsedSheets] = useState<SheetData[]>([]);
  // Broker states
  const [brokerUploadedFileName, setBrokerUploadedFileName] = useState<string | null>(null);
  const [parsedBrokerSheets, setParsedBrokerSheets] = useState<BrokerSheetData[]>([]);
  const [isParsingBrokerExcel, setIsParsingBrokerExcel] = useState(false);
  const [isBrokerSubmitting, setIsBrokerSubmitting] = useState(false);
  // Pension states
  const [isImportingPension, setIsImportingPension] = useState(false);
  const [pensionImportYear, setPensionImportYear] = useState('2024');
  const [pensionUploadedFileName, setPensionUploadedFileName] = useState<string | null>(null);
  const [isParsingPensionFile, setIsParsingPensionFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const brokerFileInputRef = useRef<HTMLInputElement>(null);
  const pensionFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  // Logo upload states
  const [isUploadingLogos, setIsUploadingLogos] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState<{ uploaded: number; total: number } | null>(null);
  // Clear database states
  const [isClearingLife, setIsClearingLife] = useState(false);
  const [isClearingNonLife, setIsClearingNonLife] = useState(false);
  const [isClearingPension, setIsClearingPension] = useState(false);
  const [isClearingBrokers, setIsClearingBrokers] = useState(false);
  const [isSyncingYears, setIsSyncingYears] = useState(false);

  // Session inactivity timeout (5 minutes)
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000;
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      toast.warning('Session expired due to inactivity');
      navigate('/');
    }, INACTIVITY_TIMEOUT);
  }, [navigate]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetInactivityTimer]);

  const { metrics, refetch } = useInsurerMetrics();
  
  // Fetch ALL life metrics for status display (not just current year/quarter)
  const { data: allLifeMetrics = [], refetch: refetchAllLife } = useQuery({
    queryKey: ['all-life-metrics-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurer_metrics')
        .select('report_year, report_quarter');
      if (error) throw error;
      return data || [];
    },
  });
  
  // Fetch insurers for logo upload
  const { data: insurers = [] } = useQuery({
    queryKey: ['insurers-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurers')
        .select('insurer_id, name, short_name, logo_url, brand_color')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch Non-Life metrics for status display
  const { data: nonlifeMetrics = [] } = useQuery({
    queryKey: ['nonlife-metrics-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nonlife_insurer_metrics')
        .select('report_year, report_quarter');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch Broker metrics for status display
  const { data: brokerMetrics = [], refetch: refetchBrokers } = useQuery({
    queryKey: ['broker-metrics-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broker_metrics')
        .select('report_year, report_quarter');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch Pension metrics for status display
  const { data: pensionMetrics = [], refetch: refetchPension } = useQuery({
    queryKey: ['pension-metrics-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pension_fund_metrics')
        .select('fund_id, fund_name, fund_type, report_year, aum');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch news count
  const { data: newsCount = 0 } = useQuery({
    queryKey: ['news-count-admin'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('news_articles')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // News crawl handler
  const handleCrawlNews = async (mode?: 'nic_only' | 'pension_only') => {
    setIsCrawlingNews(true);
    try {
      const queryParams = mode ? `?${mode}=true` : '';
      const { data, error } = await supabase.functions.invoke('crawl-insurance-news' + queryParams);
      
      if (error) throw error;
      
      toast.success(data.message || `Crawled ${data.articlesFound || 0} articles`);
      queryClient.invalidateQueries({ queryKey: ['news-articles'] });
      queryClient.invalidateQueries({ queryKey: ['news-count-admin'] });
    } catch (err) {
      console.error('News crawl error:', err);
      toast.error('Failed to crawl news');
    } finally {
      setIsCrawlingNews(false);
    }
  };

  // Sync insurers handler
  const handleSyncInsurers = async () => {
    setIsSyncingInsurers(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-nic-npra-insurers');
      
      if (error) throw error;
      
      toast.success(data.message || 'Insurers synced successfully');
      queryClient.invalidateQueries({ queryKey: ['insurers-admin'] });
    } catch (err) {
      console.error('Insurer sync error:', err);
      toast.error('Failed to sync insurers');
    } finally {
      setIsSyncingInsurers(false);
    }
  };

  // Sync logos handler
  const handleSyncLogos = async () => {
    setIsSyncingLogos(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-insurer-logos');
      
      if (error) throw error;
      
      toast.success(data.message || 'Logos synced successfully');
      queryClient.invalidateQueries({ queryKey: ['insurers-admin'] });
    } catch (err) {
      console.error('Logo sync error:', err);
      toast.error('Failed to sync logos');
    } finally {
      setIsSyncingLogos(false);
    }
  };

  // Sync years in Ghana handler
  const handleSyncYears = async () => {
    setIsSyncingYears(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-insurer-years');
      
      if (error) throw error;
      
      toast.success(data.message || 'Years in Ghana synced successfully');
      queryClient.invalidateQueries({ queryKey: ['insurer-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['nonlife-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['pension-fund-metrics'] });
    } catch (err) {
      console.error('Years sync error:', err);
      toast.error('Failed to sync years in Ghana');
    } finally {
      setIsSyncingYears(false);
    }
  };

  // Logo matching helper functions below
  
  // Normalize a string for comparison
  const normalizeString = (str: string): string => {
    return str.toLowerCase()
      .replace(/[-_]/g, ' ')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  // Find best matching insurer for a filename - STRICT matching only
  const findBestMatch = (fileName: string, insurersList: typeof insurers): typeof insurers[0] | null => {
    if (!insurersList || insurersList.length === 0) return null;
    
    const normalizedFileName = normalizeString(fileName);
    const fileWords = normalizedFileName.split(' ').filter(w => w.length > 1);
    const fileClean = normalizedFileName.replace(/\s/g, '');
    
    // First pass: look for EXACT or NEAR-EXACT matches only
    for (const insurer of insurersList) {
      const insurerId = insurer.insurer_id.toLowerCase();
      const idClean = insurerId.replace(/[^a-z0-9]/g, '');
      const shortNameLower = insurer.short_name.toLowerCase();
      const shortNameClean = normalizeString(insurer.short_name).replace(/\s/g, '');
      const nameLower = insurer.name.toLowerCase();
      
      // Exact match on insurer_id (e.g., "acacia-health" or "acaciahealth")
      if (fileClean === idClean || normalizedFileName === insurerId.replace(/-/g, ' ')) {
        return insurer;
      }
      
      // Exact match on short_name (e.g., "acacia health" or "acaciahealth")
      if (fileClean === shortNameClean || normalizedFileName === shortNameLower) {
        return insurer;
      }
      
      // File contains the FULL insurer_id or short_name
      if (fileClean.includes(idClean) && idClean.length >= 6) {
        return insurer;
      }
      if (fileClean.includes(shortNameClean) && shortNameClean.length >= 6) {
        return insurer;
      }
    }
    
    // Second pass: match on primary identifier (first part of hyphenated id)
    // BUT require minimum 4 chars AND exact word match
    for (const insurer of insurersList) {
      const idParts = insurer.insurer_id.split('-');
      const idPrimary = idParts[0].toLowerCase(); // e.g., "acacia" from "acacia-health"
      
      // Skip if primary is too short (avoid false positives like "nic")
      if (idPrimary.length < 4) continue;
      
      // Check if any file word EXACTLY matches the primary id
      for (const word of fileWords) {
        if (word === idPrimary) {
          return insurer;
        }
      }
      
      // Check if filename starts with the primary id
      if (fileClean.startsWith(idPrimary) && idPrimary.length >= 5) {
        return insurer;
      }
    }
    
    // Third pass: fuzzy matching with stricter thresholds
    let bestMatch: typeof insurers[0] | null = null;
    let bestScore = 0;
    const MIN_SCORE_THRESHOLD = 100; // Must score at least this much
    
    for (const insurer of insurersList) {
      const insurerId = insurer.insurer_id.toLowerCase();
      const shortNameClean = normalizeString(insurer.short_name).replace(/\s/g, '');
      const idClean = insurerId.replace(/[^a-z0-9]/g, '');
      
      let score = 0;
      
      // Score based on how much of the insurer id is contained in filename
      if (fileClean.includes(idClean.slice(0, Math.min(6, idClean.length))) && idClean.length >= 6) {
        score = 80 + idClean.length;
      }
      
      // Score based on how much of short name is in filename
      if (fileClean.includes(shortNameClean.slice(0, Math.min(6, shortNameClean.length))) && shortNameClean.length >= 6) {
        score = Math.max(score, 70 + shortNameClean.length);
      }
      
      if (score > bestScore && score >= MIN_SCORE_THRESHOLD) {
        bestScore = score;
        bestMatch = insurer;
      }
    }
    
    return bestMatch;
  };

  // Handle bulk logo upload with improved matching
  const handleBulkLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingLogos(true);
    setLogoUploadProgress({ uploaded: 0, total: files.length });

    let successCount = 0;
    const failedFiles: string[] = [];
    const matchedFiles: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate each file
      const validationError = validateImageFile(file);
      if (validationError) {
        failedFiles.push(`${file.name} (${validationError})`);
        setLogoUploadProgress({ uploaded: i + 1, total: files.length });
        continue;
      }

      const fileName = file.name.toLowerCase().replace(/\.[^.]+$/, ''); // Remove extension
      
      // Use the improved matching function
      const matchedInsurer = findBestMatch(fileName, insurers);

      if (matchedInsurer) {
        try {
          const fileExt = file.name.split('.').pop()?.toLowerCase();
          const filePath = `${sanitizeFilename(matchedInsurer.insurer_id)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('insurer-logos')
            .upload(filePath, file, { upsert: true });
          
          if (uploadError) {
            failedFiles.push(`${file.name} (upload error: ${uploadError.message})`);
          } else {
            const { data: urlData } = supabase.storage
              .from('insurer-logos')
              .getPublicUrl(filePath);
            
            await supabase
              .from('insurers')
              .update({ logo_url: urlData.publicUrl })
              .eq('insurer_id', matchedInsurer.insurer_id);
            
            successCount++;
            matchedFiles.push(`${file.name} → ${matchedInsurer.short_name}`);
          }
        } catch (err) {
          failedFiles.push(`${file.name} (error)`);
        }
      } else {
        // Provide hint about available insurers for unmatched files
        failedFiles.push(`${file.name} (no match - try renaming to match: ${insurers.slice(0, 3).map(i => i.short_name).join(', ')}...)`);
      }

      setLogoUploadProgress({ uploaded: i + 1, total: files.length });
    }

    setIsUploadingLogos(false);
    setLogoUploadProgress(null);
    
    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = '';
    }

    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} logos: ${matchedFiles.join(', ')}`, { duration: 8000 });
      queryClient.invalidateQueries({ queryKey: ['insurers-admin'] });
      queryClient.invalidateQueries({ queryKey: ['insurers-logos'] });
    }
    if (failedFiles.length > 0) {
      toast.error(`Failed: ${failedFiles.join(', ')}`, { duration: 10000 });
    }
  };

  // Import pension data from NPRA PDF
  const handleImportPensionData = async () => {
    setIsImportingPension(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-npra-pdf', {
        body: { year: parseInt(pensionImportYear) }
      });
      
      if (error) throw error;
      
      toast.success(data.message || `Imported ${data.data?.fundsImported || 0} pension fund records`);
      refetchPension();
      queryClient.invalidateQueries({ queryKey: ['pension-fund-metrics'] });
    } catch (err) {
      console.error('Pension import error:', err);
      toast.error('Failed to import pension data');
    } finally {
      setIsImportingPension(false);
    }
  };

  // Handle pension file upload
  const handlePensionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPensionUploadedFileName(file.name);
    setIsParsingPensionFile(true);

    try {
      const fileType = file.name.toLowerCase();
      
      if (fileType.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        
        const { data, error } = await supabase.functions.invoke('parse-npra-pdf', {
          body: { 
            year: parseInt(pensionImportYear),
            fileContent: base64,
            fileName: file.name
          }
        });
        
        if (error) throw error;
        
        toast.success(data.message || `Parsed ${data.data?.fundsImported || 0} pension fund records from PDF`);
        refetchPension();
        queryClient.invalidateQueries({ queryKey: ['pension-fund-metrics'] });
      } else if (fileType.endsWith('.xlsx') || fileType.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        toast.info(`Found ${workbook.SheetNames.length} sheets in NPRA Excel file. Processing...`);
        
        const sheetSummary = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name];
          const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
          return `${name}: ${data.length} rows`;
        }).join(', ');
        
        toast.success(`Parsed NPRA Excel: ${sheetSummary}`);
      } else {
        toast.error('Please upload a PDF or Excel file (.pdf, .xlsx, .xls)');
      }
    } catch (err) {
      console.error('Pension file parse error:', err);
      toast.error('Failed to parse pension file');
    } finally {
      setIsParsingPensionFile(false);
    }
  };

  const clearPensionFile = () => {
    setPensionUploadedFileName(null);
    if (pensionFileInputRef.current) {
      pensionFileInputRef.current.value = '';
    }
  };

  // Get stats - use allLifeMetrics for accurate counts across all years/quarters
  const getQuarterStats = (year: number, quarter: number, dataType: 'life' | 'nonlife') => {
    if (dataType === 'life') {
      return allLifeMetrics.filter(m => m.report_year === year && m.report_quarter === quarter).length;
    } else {
      return nonlifeMetrics.filter(m => m.report_year === year && m.report_quarter === quarter).length;
    }
  };

  const getBrokerQuarterStats = (year: number, quarter: number) => {
    return brokerMetrics.filter(m => m.report_year === year && m.report_quarter === quarter).length;
  };

  // Clear database handlers
  const handleClearLifeData = async () => {
    if (!confirm('Are you sure you want to delete ALL Life insurance data? This action cannot be undone.')) return;
    
    setIsClearingLife(true);
    try {
      const { error } = await supabase
        .from('insurer_metrics')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      
      if (error) throw error;
      
      toast.success('Life insurance data cleared successfully');
      refetch();
      refetchAllLife();
      queryClient.invalidateQueries({ queryKey: ['all-life-metrics-admin'] });
    } catch (err) {
      console.error('Clear life data error:', err);
      toast.error('Failed to clear Life data');
    } finally {
      setIsClearingLife(false);
    }
  };

  const handleClearNonLifeData = async () => {
    if (!confirm('Are you sure you want to delete ALL Non-Life insurance data? This action cannot be undone.')) return;
    
    setIsClearingNonLife(true);
    try {
      const { error } = await supabase
        .from('nonlife_insurer_metrics')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) throw error;
      
      toast.success('Non-Life insurance data cleared successfully');
      queryClient.invalidateQueries({ queryKey: ['nonlife-metrics-admin'] });
    } catch (err) {
      console.error('Clear non-life data error:', err);
      toast.error('Failed to clear Non-Life data');
    } finally {
      setIsClearingNonLife(false);
    }
  };

  const handleClearPensionData = async () => {
    if (!confirm('Are you sure you want to delete ALL Pension fund data? This action cannot be undone.')) return;
    
    setIsClearingPension(true);
    try {
      const { error } = await supabase
        .from('pension_fund_metrics')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) throw error;
      
      toast.success('Pension fund data cleared successfully');
      refetchPension();
      queryClient.invalidateQueries({ queryKey: ['pension-fund-metrics'] });
    } catch (err) {
      console.error('Clear pension data error:', err);
      toast.error('Failed to clear Pension data');
    } finally {
      setIsClearingPension(false);
    }
  };

  const handleClearBrokerData = async () => {
    if (!confirm('Are you sure you want to delete ALL Broker data? This action cannot be undone.')) return;
    
    setIsClearingBrokers(true);
    try {
      const { error } = await supabase
        .from('broker_metrics')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) throw error;
      
      toast.success('Broker data cleared successfully');
      refetchBrokers();
      queryClient.invalidateQueries({ queryKey: ['broker-metrics-admin'] });
    } catch (err) {
      console.error('Clear broker data error:', err);
      toast.error('Failed to clear Broker data');
    } finally {
      setIsClearingBrokers(false);
    }
  };

  // News cleanup - blocked keywords
  const BLOCKED_KEYWORDS = [
    'cryptocurrency', 'bitcoin', 'forex', 'casino', 'gambling', 'betting',
    'weight loss', 'diet pill', 'miracle cure', 'get rich', 'nigerian prince',
    'lottery winner', 'free money', 'click here', 'limited time offer',
    'unsubscribe', 'spam', 'adult content', 'xxx', 'viagra', 'crypto trading',
    'nft', 'metaverse', 'web3 gaming', 'play-to-earn', 'token sale', 'ico',
    'meme coin', 'shitcoin', 'pump and dump', 'ponzi', 'pyramid scheme',
    'football', 'soccer', 'basketball', 'tennis', 'cricket', 'rugby', 
    'olympics', 'world cup', 'champions league', 'premier league', 'la liga',
    'serie a', 'bundesliga', 'nba', 'nfl', 'mlb', 'celebrity', 'kardashian',
    'entertainment', 'gossip', 'hollywood', 'bollywood', 'movie review',
    'album release', 'concert tour', 'recipe', 'cooking tips', 'fashion week',
    'horoscope', 'astrology', 'zodiac', 'dating tips', 'relationship advice',
    'car review', 'vehicle', 'motor sport', 'formula 1', 'f1', 'racing'
  ];

  const handleCleanupNews = async () => {
    setIsCleaningNews(true);
    try {
      const { data: articles, error } = await supabase
        .from('news_articles')
        .select('id, title, description, category');
      
      if (error) throw error;
      
      const articlesToDelete: string[] = [];
      
      for (const article of articles || []) {
        const content = `${article.title} ${article.description || ''}`.toLowerCase();
        
        const hasBlockedKeyword = BLOCKED_KEYWORDS.some(keyword => 
          content.includes(keyword.toLowerCase())
        );
        
        const insuranceTerms = ['insurance', 'insurer', 'underwriter', 'premium', 'policy', 
          'claim', 'actuary', 'reinsurance', 'annuity', 'coverage', 'indemnity',
          'nic', 'national insurance commission', 'enterprise life', 'sic insurance',
          'star assurance', 'glico', 'old mutual', 'prudential', 'metropolitan',
          'hollard', 'ghana reinsurance', 'regency', 'vanguard', 'phoenix'
        ];
        
        const hasInsuranceContext = insuranceTerms.some(term => 
          content.includes(term.toLowerCase())
        );
        
        if (hasBlockedKeyword || !hasInsuranceContext) {
          articlesToDelete.push(article.id);
        }
      }
      
      if (articlesToDelete.length === 0) {
        toast.success('No non-insurance articles found. Database is clean!');
        return;
      }
      
      const { error: deleteError } = await supabase
        .from('news_articles')
        .delete()
        .in('id', articlesToDelete);
      
      if (deleteError) throw deleteError;
      
      toast.success(`Successfully removed ${articlesToDelete.length} non-insurance articles`);
      queryClient.invalidateQueries({ queryKey: ['news-articles'] });
      queryClient.invalidateQueries({ queryKey: ['news-count-admin'] });
      
    } catch (err) {
      console.error('News cleanup error:', err);
      toast.error('Failed to cleanup news articles');
    } finally {
      setIsCleaningNews(false);
    }
  };

  // Sheet parsing helpers
  const parseSheetName = (sheetName: string, firstCellContent?: string): { quarter: number | null; year: number | null } => {
    const contentToSearch = firstCellContent || sheetName;
    const name = contentToSearch.toLowerCase();
    let quarter: number | null = null;
    let year: number | null = null;

    const qYearMatch = contentToSearch.match(/q\s*(\d)\s*[,\s]\s*(\d{4})/i);
    if (qYearMatch) {
      quarter = parseInt(qYearMatch[1]);
      year = parseInt(qYearMatch[2]);
      if (quarter < 1 || quarter > 4) quarter = null;
      return { quarter, year };
    }

    const qMatch = name.match(/q\s*(\d)/i) || name.match(/quarter\s*(\d)/i);
    if (qMatch) {
      quarter = parseInt(qMatch[1]);
      if (quarter < 1 || quarter > 4) quarter = null;
    }

    const yearMatch = name.match(/20(\d{2})/) || name.match(/[''](\d{2})/);
    if (yearMatch) {
      const yearNum = parseInt(yearMatch[1]);
      year = yearNum < 50 ? 2000 + yearNum : 1900 + yearNum;
    }

    return { quarter, year };
  };

  const detectDataType = (headerRow: string[], allRows?: unknown[][]): 'life' | 'nonlife' => {
    const headerStr = headerRow.join(' ').toLowerCase();
    const allRowsStr = allRows ? allRows.slice(0, 15).map(r => r?.join(' ') || '').join(' ').toLowerCase() : '';
    const searchStr = headerStr + ' ' + allRowsStr;
    
    const nonLifeIndicators = [
      'motor comprehensive', 'motor third party', 'fire, theft and property', 
      'marine cargo', 'marine hull', 'aviation', 'workman compensation',
      'non-life insurer', 'engineering', 'accident- public', 'bonds'
    ];
    
    if (nonLifeIndicators.some(indicator => searchStr.includes(indicator))) {
      return 'nonlife';
    }
    
    const lifeIndicators = [
      'life insurers', 'universal life', 'unit-linked', 'investment-linked',
      'endowment policy', 'whole life', 'credit life', 'annuities',
      'group policies', 'term', 'critical illness'
    ];
    
    if (lifeIndicators.some(indicator => searchStr.includes(indicator))) {
      return 'life';
    }
    
    return selectedCategory;
  };

  // Parse sheets (keeping existing logic but simplified for brevity)
  const parseSheet = (workbook: XLSX.WorkBook, sheetName: string, defaultYear: number): SheetData | null => {
    try {
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
      
      const firstRow = rawData[0] as unknown[];
      const firstCell = firstRow?.[0] ? String(firstRow[0]).trim() : '';
      
      let headerRowIndex = -1;
      let headerRow: string[] = [];
      
      for (let i = 0; i < Math.min(rawData.length, 25); i++) {
        const row = rawData[i] as unknown[];
        if (!row) continue;
        
        const firstCellValue = String(row[0] || '').trim().toLowerCase();
        
        // Match variations: "life insurers", "life insurer", "non-life insurer", "non-life insurers", "non life insurer"
        if (firstCellValue.match(/^(non[- ]?life\s+insurer|life\s+insurer)s?$/)) {
          headerRowIndex = i;
          headerRow = row.map(cell => String(cell || '').trim());
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        for (let i = 0; i < Math.min(rawData.length, 25); i++) {
          const row = rawData[i] as unknown[];
          if (!row) continue;
          
          const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '').length;
          if (nonEmptyCells < 5) continue;
          
          const rowStr = row.join(' ').toLowerCase();
          // More flexible: require at least 2 of the 3 key financial columns
          const hasRevenue = rowStr.includes('insurance service revenue') || rowStr.includes('gross premium') || rowStr.includes('revenue');
          const hasProfit = rowStr.includes('profit after tax') || rowStr.includes('profit') || rowStr.includes('pat');
          const hasAssets = rowStr.includes('total assets') || rowStr.includes('assets');
          const hasClaims = rowStr.includes('claims') || rowStr.includes('incurred claims');
          const hasMarketShare = rowStr.includes('market share');
          
          const matchCount = [hasRevenue, hasProfit, hasAssets, hasClaims, hasMarketShare].filter(Boolean).length;
          
          if (matchCount >= 2) {
            headerRowIndex = i;
            headerRow = row.map(cell => String(cell || '').trim());
            console.log(`[DataAdmin] Found header row at index ${i} in sheet "${sheetName}":`, headerRow.slice(0, 5).join(', '), '...');
            break;
          }
        }
      }
      
      if (headerRowIndex === -1) return null;
      
      const dataType = detectDataType(headerRow, rawData);
      
      const columnMap: { [key: string]: number } = { insurer_name: 0 };
      
      headerRow.forEach((header, index) => {
        const h = header.toLowerCase().trim();
        if (index === 0) return;
        
        if (h.includes('total assets')) columnMap['total_assets'] = index;
        if (h.includes('market share')) columnMap['market_share'] = index;
        if (h === 'expense ratio %' || (h.includes('expense ratio') && !h.includes('non') && !h.includes('attributable'))) columnMap['expense_ratio'] = index;
        if (h.includes('profit after tax') || h.includes('profit for the year')) columnMap['profit_after_tax'] = index;
        if (h.includes('claims ratio')) columnMap['claims_ratio'] = index;
        
        if (dataType === 'life') {
          if ((h.includes('insurance service revenue') || h === 'insurance revenue' || (h.includes('insurance revenue') && !h.includes('net'))) && !h.includes('net')) columnMap['gross_premium'] = index;
          if ((h.includes('investment income') || h.includes('net investment income')) && !h.includes('finance')) columnMap['investment_income'] = index;
          if (h.includes('claims') && (h.includes('paid') || h.includes('incurred') || h.includes('benefits') || h.includes('total'))) {
            columnMap['total_claims_paid'] = index;
          }
          if (h.includes('group policies')) columnMap['group_policies'] = index;
          if (h === 'term') columnMap['term_premium'] = index;
          if (h.includes('credit life')) columnMap['credit_life'] = index;
          if (h.includes('whole life')) columnMap['whole_life'] = index;
          if (h.includes('endowment')) columnMap['endowment'] = index;
          if (h.includes('universal life')) columnMap['universal_life'] = index;
          if (h === 'csm' || h.includes('contractual service margin')) columnMap['csm'] = index;
        } else {
          if ((h.includes('insurance service revenue') || h === 'insurance revenue' || (h.includes('insurance revenue') && !h.includes('net') && !h.includes('finance'))) && !h.includes('net')) columnMap['insurance_service_revenue'] = index;
          if ((h.includes('investment income') || h.includes('net investment income')) && !h.includes('finance')) columnMap['investment_income'] = index;
          if (h.includes('incurred claims') || (h.includes('claims') && h.includes('total'))) columnMap['total_incurred_claims'] = index;
          if (h.includes('insurance service result') && !h.includes('share')) columnMap['insurance_service_results'] = index;
          if (h.includes('non-attributable expense') || h.includes('non attributable expense')) columnMap['non_attributable_expenses'] = index;
          if (h.includes('total liabilities')) columnMap['total_liabilities'] = index;
          if (h.includes('motor comprehensive')) columnMap['motor_comprehensive'] = index;
          if (h.includes('motor third party') && !h.includes('fire')) columnMap['motor_third_party'] = index;
          if ((h.includes('motor third party') && h.includes('fire')) || h.includes('motor third party, fire')) columnMap['motor_third_party_fire_theft'] = index;
          if (h.includes('motor') && h.includes('other')) columnMap['motor_others'] = index;
          if ((h.includes('fire') && h.includes('private')) || h.includes('fire, theft and property (private)')) columnMap['fire_property_private'] = index;
          if ((h.includes('fire') && h.includes('commercial')) || h.includes('fire, theft and property (commercial)')) columnMap['fire_property_commercial'] = index;
          if (h.includes('public liability') || h.includes('accident- public')) columnMap['accident_public_liability'] = index;
          if (h.includes('professional indemnity') || h.includes('accident- professional')) columnMap['accident_professional_indemnity'] = index;
          if (h.includes('accident- travel') || (h.includes('travel') && !h.includes('insurance'))) columnMap['accident_travel'] = index;
          if (h.includes('accident- personal') || (h.includes('personal') && h.includes('accident'))) columnMap['accident_personal'] = index;
          if (h.includes('accident- other') || (h.includes('accident') && h.includes('other'))) columnMap['accident_others'] = index;
          if (h.includes('workman') || h.includes('employer')) columnMap['workman_compensation'] = index;
          if (h.includes('marine cargo')) columnMap['marine_cargo'] = index;
          if (h.includes('marine hull')) columnMap['marine_hull'] = index;
          if (h.includes('aviation')) columnMap['aviation'] = index;
          if (h.includes('engineering') && !h.includes('other')) columnMap['engineering'] = index;
          if (h.includes('non-life micro') || h === 'microinsurance') columnMap['microinsurance'] = index;
          if (h.includes('bond')) columnMap['bonds'] = index;
        }
      });
      
      const parsedInsurers: ParsedInsurer[] = [];
      
      const parseNumber = (val: unknown): number | undefined => {
        if (val === null || val === undefined || val === '' || val === '-') return undefined;
        const str = String(val).replace(/[,\s%]/g, '').trim();
        if (str === '' || str === '-') return undefined;
        const isNegative = String(val).includes('(') && String(val).includes(')');
        const cleanStr = str.replace(/[()]/g, '');
        const num = parseFloat(cleanStr);
        if (isNaN(num)) return undefined;
        return isNegative ? -Math.abs(num) : num;
      };
      
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i] as unknown[];
        if (!row || row.length < 3) continue;
        
        const insurerName = String(row[columnMap['insurer_name'] || 0] || '').trim();
        
        if (!insurerName || 
            insurerName.toLowerCase().includes('total') || 
            insurerName.toLowerCase() === 'life insurers' ||
            insurerName.toLowerCase() === 'non-life insurer' ||
            insurerName.length < 3) {
          continue;
        }
        
        let insurer: ParsedInsurer;
        
        if (dataType === 'life') {
          insurer = {
            insurer_name: insurerName,
            gross_premium: parseNumber(row[columnMap['gross_premium']]),
            total_assets: parseNumber(row[columnMap['total_assets']]),
            market_share: parseNumber(row[columnMap['market_share']]),
            expense_ratio: parseNumber(row[columnMap['expense_ratio']]),
            claims_ratio: parseNumber(row[columnMap['claims_ratio']]),
            profit_after_tax: parseNumber(row[columnMap['profit_after_tax']]),
            investment_income: parseNumber(row[columnMap['investment_income']]),
            total_claims_paid: parseNumber(row[columnMap['total_claims_paid']]),
            group_policies: parseNumber(row[columnMap['group_policies']]),
            term_premium: parseNumber(row[columnMap['term_premium']]),
            credit_life: parseNumber(row[columnMap['credit_life']]),
            whole_life: parseNumber(row[columnMap['whole_life']]),
            endowment: parseNumber(row[columnMap['endowment']]),
            universal_life: parseNumber(row[columnMap['universal_life']]),
            csm: parseNumber(row[columnMap['csm']]),
          } as ParsedLifeInsurer;
        } else {
          insurer = {
            insurer_name: insurerName,
            insurance_service_revenue: parseNumber(row[columnMap['insurance_service_revenue']]),
            motor_comprehensive: parseNumber(row[columnMap['motor_comprehensive']]),
            motor_third_party: parseNumber(row[columnMap['motor_third_party']]),
            motor_third_party_fire_theft: parseNumber(row[columnMap['motor_third_party_fire_theft']]),
            motor_others: parseNumber(row[columnMap['motor_others']]),
            fire_property_private: parseNumber(row[columnMap['fire_property_private']]),
            fire_property_commercial: parseNumber(row[columnMap['fire_property_commercial']]),
            accident_public_liability: parseNumber(row[columnMap['accident_public_liability']]),
            accident_professional_indemnity: parseNumber(row[columnMap['accident_professional_indemnity']]),
            accident_travel: parseNumber(row[columnMap['accident_travel']]),
            accident_personal: parseNumber(row[columnMap['accident_personal']]),
            accident_others: parseNumber(row[columnMap['accident_others']]),
            workman_compensation: parseNumber(row[columnMap['workman_compensation']]),
            marine_cargo: parseNumber(row[columnMap['marine_cargo']]),
            marine_hull: parseNumber(row[columnMap['marine_hull']]),
            aviation: parseNumber(row[columnMap['aviation']]),
            engineering: parseNumber(row[columnMap['engineering']]),
            microinsurance: parseNumber(row[columnMap['microinsurance']]),
            bonds: parseNumber(row[columnMap['bonds']]),
            profit_after_tax: parseNumber(row[columnMap['profit_after_tax']]),
            total_assets: parseNumber(row[columnMap['total_assets']]),
            market_share: parseNumber(row[columnMap['market_share']]),
            claims_ratio: parseNumber(row[columnMap['claims_ratio']]),
            expense_ratio: parseNumber(row[columnMap['expense_ratio']]),
            investment_income: parseNumber(row[columnMap['investment_income']]),
            total_incurred_claims: parseNumber(row[columnMap['total_incurred_claims']]),
            insurance_service_results: parseNumber(row[columnMap['insurance_service_results']]),
            non_attributable_expenses: parseNumber(row[columnMap['non_attributable_expenses']]),
            total_liabilities: parseNumber(row[columnMap['total_liabilities']]),
          } as ParsedNonLifeInsurer;
        }
        
        const hasData = Object.entries(insurer).some(([key, val]) => 
          key !== 'insurer_name' && val !== undefined && val !== null
        );
        
        if (hasData) {
          parsedInsurers.push(insurer);
        }
      }
      
      if (parsedInsurers.length === 0) return null;

      const { quarter, year } = parseSheetName(sheetName, firstCell);
      
      return {
        sheetName,
        quarter,
        year: year || defaultYear,
        insurers: parsedInsurers,
        selected: true,
        dataType,
      };
    } catch {
      return null;
    }
  };

  const parseExcelFile = async (file: File) => {
    setIsParsingExcel(true);
    setParsedSheets([]);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const sheetNames = workbook.SheetNames;
      const defaultYear = parseInt(selectedYear);
      const sheets: SheetData[] = [];
      
      for (const sheetName of sheetNames) {
        const sheetData = parseSheet(workbook, sheetName, defaultYear);
        if (sheetData) {
          sheets.push(sheetData);
        }
      }
      
      if (sheets.length === 0) {
        throw new Error('No valid insurance data found in any sheet.');
      }
      
      setParsedSheets(sheets);
      setUploadedFileName(file.name);
      
      const lifeCount = sheets.filter(s => s.dataType === 'life').length;
      const nonlifeCount = sheets.filter(s => s.dataType === 'nonlife').length;
      const allInsurers = sheets.flatMap(s => s.insurers);
      
      toast.success(`Found ${sheets.length} sheets (${lifeCount} Life, ${nonlifeCount} Non-Life) with ${allInsurers.length} total insurers`);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse Excel file');
    } finally {
      setIsParsingExcel(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isValidType = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
      if (!isValidType) {
        toast.error('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      parseExcelFile(file);
    }
  };

  const clearFile = () => {
    setUploadedFileName(null);
    setParsedSheets([]);
    setJsonData('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Broker sheet parsing
  const parseBrokerSheet = (workbook: XLSX.WorkBook, sheetName: string, defaultYear: number): BrokerSheetData | null => {
    try {
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
      
      let headerRowIndex = -1;
      let headerRow: string[] = [];
      
      for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        const row = rawData[i] as unknown[];
        if (!row) continue;
        
        const rowStr = row.join(' ').toLowerCase();
        const hasBrokerHeader = rowStr.includes('insurance broker') || rowStr.includes('broker name');
        const hasFinancialColumns = rowStr.includes('commission') && rowStr.includes('profit');
        
        if (hasBrokerHeader || hasFinancialColumns) {
          headerRowIndex = i;
          headerRow = row.map(cell => String(cell || '').trim());
          break;
        }
      }
      
      if (headerRowIndex === -1) return null;
      
      const columnMap: { [key: string]: number } = { broker_name: 0 };
      
      headerRow.forEach((header, index) => {
        const h = header.toLowerCase().trim();
        if (h.includes('broker') && (h.includes('name') || h.includes('insurance'))) columnMap['broker_name'] = index;
        if (h.includes('commission income')) columnMap['commission_income'] = index;
        if (h.includes('general') && h.includes('admin')) columnMap['general_admin_expenses'] = index;
        if (h.includes('operational result')) columnMap['operational_results'] = index;
        if (h.includes('total') && h.includes('investment')) columnMap['total_investments_income'] = index;
        if (h.includes('profit') && h.includes('after tax')) columnMap['profit_loss_after_tax'] = index;
        if (h.includes('market share')) columnMap['market_share'] = index;
      });
      
      const parsedBrokers: ParsedBroker[] = [];
      
      const parseNumber = (val: unknown): number | undefined => {
        if (val === null || val === undefined || val === '' || val === '-') return undefined;
        const str = String(val).replace(/[,\s]/g, '').trim();
        if (str === '' || str === '-') return undefined;
        const isNegative = String(val).includes('(') && String(val).includes(')');
        const cleanStr = str.replace(/[()]/g, '');
        const num = parseFloat(cleanStr);
        if (isNaN(num)) return undefined;
        return isNegative ? -Math.abs(num) : num;
      };

      const parseMarketShare = (val: unknown): number | undefined => {
        if (val === null || val === undefined || val === '' || val === '-') return undefined;
        const str = String(val).replace(/[,\s%]/g, '').trim();
        if (str === '' || str === '-') return undefined;
        const num = parseFloat(str);
        if (isNaN(num)) return undefined;
        return num;
      };
      
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i] as unknown[];
        if (!row || row.length < 3) continue;
        
        const brokerName = String(row[columnMap['broker_name'] || 0] || '').trim();
        
        if (!brokerName || 
            brokerName.toLowerCase().includes('total') || 
            brokerName.toLowerCase() === 'insurance broker' ||
            brokerName.length < 3) {
          continue;
        }
        
        const broker: ParsedBroker = {
          broker_name: brokerName,
          commission_income: parseNumber(row[columnMap['commission_income']]),
          general_admin_expenses: parseNumber(row[columnMap['general_admin_expenses']]),
          operational_results: parseNumber(row[columnMap['operational_results']]),
          total_investments_income: parseNumber(row[columnMap['total_investments_income']]),
          profit_loss_after_tax: parseNumber(row[columnMap['profit_loss_after_tax']]),
          market_share: parseMarketShare(row[columnMap['market_share']]),
        };
        
        const hasData = Object.entries(broker).some(([key, val]) => 
          key !== 'broker_name' && val !== undefined && val !== null
        );
        
        if (hasData) {
          parsedBrokers.push(broker);
        }
      }
      
      if (parsedBrokers.length === 0) return null;

      const { quarter, year } = parseSheetName(sheetName);
      
      return {
        sheetName,
        quarter,
        year: year || defaultYear,
        brokers: parsedBrokers,
        selected: true,
      };
    } catch {
      return null;
    }
  };

  const parseBrokerExcelFile = async (file: File) => {
    setIsParsingBrokerExcel(true);
    setParsedBrokerSheets([]);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const sheetNames = workbook.SheetNames;
      const defaultYear = parseInt(selectedYear);
      const sheets: BrokerSheetData[] = [];
      
      for (const sheetName of sheetNames) {
        const sheetData = parseBrokerSheet(workbook, sheetName, defaultYear);
        if (sheetData) {
          sheets.push(sheetData);
        }
      }
      
      if (sheets.length === 0) {
        throw new Error('No valid broker data found in any sheet.');
      }
      
      setParsedBrokerSheets(sheets);
      setBrokerUploadedFileName(file.name);
      
      const allBrokers = sheets.flatMap(s => s.brokers);
      toast.success(`Found ${sheets.length} broker sheets with ${allBrokers.length} total brokers`);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse broker Excel file');
    } finally {
      setIsParsingBrokerExcel(false);
    }
  };

  const handleBrokerFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isValidType = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
      if (!isValidType) {
        toast.error('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      parseBrokerExcelFile(file);
    }
  };

  const clearBrokerFile = () => {
    setBrokerUploadedFileName(null);
    setParsedBrokerSheets([]);
    if (brokerFileInputRef.current) {
      brokerFileInputRef.current.value = '';
    }
  };

  const toggleBrokerSheetSelection = (sheetName: string) => {
    setParsedBrokerSheets(prev => 
      prev.map(s => s.sheetName === sheetName ? { ...s, selected: !s.selected } : s)
    );
  };

  const updateBrokerSheetQuarter = (sheetName: string, quarter: number | null) => {
    setParsedBrokerSheets(prev => 
      prev.map(s => s.sheetName === sheetName ? { ...s, quarter } : s)
    );
  };

  const updateBrokerSheetYear = (sheetName: string, year: number) => {
    setParsedBrokerSheets(prev => 
      prev.map(s => s.sheetName === sheetName ? { ...s, year } : s)
    );
  };

  const handleBrokerBulkImport = async () => {
    const selectedSheets = parsedBrokerSheets.filter(s => s.selected);
    if (selectedSheets.length === 0) {
      toast.error('Please select at least one sheet to import');
      return;
    }

    setIsBrokerSubmitting(true);
    let totalImported = 0;
    const errors: string[] = [];

    try {
      for (const sheet of selectedSheets) {
        if (!sheet.quarter) {
          errors.push(`${sheet.sheetName}: Missing quarter`);
          continue;
        }

        const enrichedData = sheet.brokers.map((broker) => ({
          broker_name: broker.broker_name,
          commission_income: broker.commission_income ?? null,
          general_admin_expenses: broker.general_admin_expenses ?? null,
          operational_results: broker.operational_results ?? null,
          total_investments_income: broker.total_investments_income ?? null,
          profit_loss_after_tax: broker.profit_loss_after_tax ?? null,
          market_share: broker.market_share ?? null,
          report_year: sheet.year,
          report_quarter: sheet.quarter,
          report_source: 'NIC Quarterly Report',
        }));

        const { error } = await supabase
          .from('broker_metrics')
          .upsert(enrichedData, {
            onConflict: 'broker_name,report_year,report_quarter',
            ignoreDuplicates: false,
          });

        if (error) {
          errors.push(`${sheet.sheetName}: ${error.message}`);
        } else {
          totalImported += enrichedData.length;
        }
      }

      if (errors.length > 0) {
        toast.error(`Some imports failed: ${errors.join(', ')}`);
      }
      
      if (totalImported > 0) {
        toast.success(`Successfully imported ${totalImported} broker records from ${selectedSheets.length} sheets`);
        clearBrokerFile();
        refetchBrokers();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Import failed: ${errorMessage}`);
    } finally {
      setIsBrokerSubmitting(false);
    }
  };

  const toggleSheetSelection = (sheetName: string) => {
    setParsedSheets(prev => 
      prev.map(s => s.sheetName === sheetName ? { ...s, selected: !s.selected } : s)
    );
  };

  const updateSheetQuarter = (sheetName: string, quarter: number | null) => {
    setParsedSheets(prev => 
      prev.map(s => s.sheetName === sheetName ? { ...s, quarter } : s)
    );
  };

  const updateSheetYear = (sheetName: string, year: number) => {
    setParsedSheets(prev => 
      prev.map(s => s.sheetName === sheetName ? { ...s, year } : s)
    );
  };

  const updateSheetDataType = (sheetName: string, dataType: 'life' | 'nonlife') => {
    setParsedSheets(prev => 
      prev.map(s => s.sheetName === sheetName ? { ...s, dataType } : s)
    );
  };

  const handleBulkImport = async () => {
    const selectedSheets = parsedSheets.filter(s => s.selected);
    if (selectedSheets.length === 0) {
      toast.error('Please select at least one sheet to import');
      return;
    }

    setIsSubmitting(true);
    let totalImported = 0;
    const errors: string[] = [];

    try {
      for (const sheet of selectedSheets) {
        const normalizeInsurerId = (name: string) => {
          return name?.toLowerCase()
            .replace(/\s+company\s+limited$/i, '')
            .replace(/\s+limited$/i, '')
            .replace(/\s+ltd$/i, '')
            .replace(/insurance|assurance|life/gi, '')
            .replace(/[^a-z0-9]/g, '')
            .trim();
        };

        if (sheet.dataType === 'life') {
          const enrichedDataRaw = sheet.insurers
            .map((item) => {
              const lifeItem = item as ParsedLifeInsurer;
              return {
                insurer_id: normalizeInsurerId(lifeItem.insurer_name),
                insurer_name: lifeItem.insurer_name,
                category: 'life',
                gross_premium: lifeItem.gross_premium ?? null,
                total_assets: lifeItem.total_assets ?? null,
                market_share: lifeItem.market_share != null && lifeItem.market_share > 1 
                  ? lifeItem.market_share / 100 
                  : lifeItem.market_share ?? null,
                expense_ratio: lifeItem.expense_ratio != null && lifeItem.expense_ratio > 1
                  ? lifeItem.expense_ratio / 100
                  : lifeItem.expense_ratio ?? null,
                claims_ratio: lifeItem.claims_ratio != null && lifeItem.claims_ratio > 1
                  ? lifeItem.claims_ratio / 100
                  : lifeItem.claims_ratio ?? null,
                profit_after_tax: lifeItem.profit_after_tax ?? null,
                investment_income: lifeItem.investment_income ?? null,
                total_claims_paid: lifeItem.total_claims_paid ?? null,
                group_policies: lifeItem.group_policies ?? null,
                term_premium: lifeItem.term_premium ?? null,
                credit_life: lifeItem.credit_life ?? null,
                whole_life: lifeItem.whole_life ?? null,
                endowment: lifeItem.endowment ?? null,
                universal_life: lifeItem.universal_life ?? null,
                csm: lifeItem.csm ?? null,
                report_year: sheet.year,
                report_quarter: sheet.quarter,
                report_source: 'NIC Quarterly Report',
              };
            })
            .filter(r => r.insurer_id && r.report_quarter);

          const deduped = new Map<string, (typeof enrichedDataRaw)[number]>();
          for (const row of enrichedDataRaw) {
            const key = `${row.insurer_id}__${row.report_year}__${row.report_quarter}`;
            if (!deduped.has(key)) {
              deduped.set(key, row);
            }
          }

          const enrichedData = Array.from(deduped.values());

          const { error } = await supabase
            .from('insurer_metrics')
            .upsert(enrichedData, {
              onConflict: 'insurer_id,report_year,report_quarter',
              ignoreDuplicates: false,
            });

          if (error) {
            errors.push(`${sheet.sheetName} (Life): ${error.message}`);
          } else {
            totalImported += enrichedData.length;
          }
        } else {
          const enrichedDataRaw = sheet.insurers
            .map((item) => {
              const nonlifeItem = item as ParsedNonLifeInsurer;
              return {
                insurer_id: normalizeInsurerId(nonlifeItem.insurer_name),
                insurer_name: nonlifeItem.insurer_name,
                category: 'nonlife',
                insurance_service_revenue: nonlifeItem.insurance_service_revenue ?? null,
                motor_comprehensive: nonlifeItem.motor_comprehensive ?? null,
                motor_third_party: nonlifeItem.motor_third_party ?? null,
                motor_third_party_fire_theft: nonlifeItem.motor_third_party_fire_theft ?? null,
                motor_others: nonlifeItem.motor_others ?? null,
                fire_property_private: nonlifeItem.fire_property_private ?? null,
                fire_property_commercial: nonlifeItem.fire_property_commercial ?? null,
                accident_public_liability: nonlifeItem.accident_public_liability ?? null,
                accident_professional_indemnity: nonlifeItem.accident_professional_indemnity ?? null,
                accident_travel: nonlifeItem.accident_travel ?? null,
                accident_personal: nonlifeItem.accident_personal ?? null,
                accident_others: nonlifeItem.accident_others ?? null,
                workman_compensation: nonlifeItem.workman_compensation ?? null,
                marine_cargo: nonlifeItem.marine_cargo ?? null,
                marine_hull: nonlifeItem.marine_hull ?? null,
                aviation: nonlifeItem.aviation ?? null,
                engineering: nonlifeItem.engineering ?? null,
                microinsurance: nonlifeItem.microinsurance ?? null,
                bonds: nonlifeItem.bonds ?? null,
                profit_after_tax: nonlifeItem.profit_after_tax ?? null,
                total_assets: nonlifeItem.total_assets ?? null,
                market_share: nonlifeItem.market_share != null && nonlifeItem.market_share > 1
                  ? nonlifeItem.market_share / 100
                  : nonlifeItem.market_share ?? null,
                claims_ratio: nonlifeItem.claims_ratio != null && nonlifeItem.claims_ratio > 1
                  ? nonlifeItem.claims_ratio / 100
                  : nonlifeItem.claims_ratio ?? null,
                expense_ratio: nonlifeItem.expense_ratio != null && nonlifeItem.expense_ratio > 1
                  ? nonlifeItem.expense_ratio / 100
                  : nonlifeItem.expense_ratio ?? null,
                investment_income: nonlifeItem.investment_income ?? null,
                total_incurred_claims: nonlifeItem.total_incurred_claims ?? null,
                insurance_service_results: nonlifeItem.insurance_service_results ?? null,
                non_attributable_expenses: nonlifeItem.non_attributable_expenses ?? null,
                total_liabilities: nonlifeItem.total_liabilities ?? null,
                report_year: sheet.year,
                report_quarter: sheet.quarter,
                report_source: 'NIC Quarterly Report',
              };
            })
            .filter(r => r.insurer_id && r.report_quarter);

          const deduped = new Map<string, (typeof enrichedDataRaw)[number]>();
          for (const row of enrichedDataRaw) {
            const key = `${row.insurer_id}__${row.report_year}__${row.report_quarter}`;
            if (!deduped.has(key)) {
              deduped.set(key, row);
            }
          }

          const enrichedData = Array.from(deduped.values());

          const { error } = await supabase
            .from('nonlife_insurer_metrics')
            .upsert(enrichedData, {
              onConflict: 'insurer_id,report_year,report_quarter',
              ignoreDuplicates: false,
            });

          if (error) {
            errors.push(`${sheet.sheetName} (Non-Life): ${error.message}`);
          } else {
            totalImported += enrichedData.length;
          }
        }
      }

      if (errors.length > 0) {
        toast.error(`Some imports failed: ${errors.join(', ')}`);
      }
      
      if (totalImported > 0) {
        toast.success(`Successfully imported ${totalImported} records from ${selectedSheets.length} sheets`);
        clearFile();
        refetch();
        queryClient.invalidateQueries({ queryKey: ['nonlife-metrics-admin'] });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Import failed: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitData = async () => {
    if (!jsonData.trim()) {
      toast.error('Please enter data in JSON format or upload an Excel file');
      return;
    }

    if (parsedSheets.length > 0) {
      return handleBulkImport();
    }

    setIsSubmitting(true);
    try {
      const parsedData = JSON.parse(jsonData);
      
      if (!Array.isArray(parsedData)) {
        throw new Error('Data must be an array of insurer records');
      }

      const tableName = selectedCategory === 'life' ? 'insurer_metrics' : 'nonlife_insurer_metrics';
      
      const enrichedData = parsedData.map((item: ParsedInsurer) => ({
        insurer_id: `${item.insurer_name?.toLowerCase().replace(/\s+/g, '-').substring(0, 50)}-${selectedYear}${selectedQuarter ? `-q${selectedQuarter}` : ''}`,
        insurer_name: item.insurer_name,
        category: selectedCategory,
        ...item,
        report_year: parseInt(selectedYear),
        report_quarter: selectedQuarter ? parseInt(selectedQuarter) : null,
        report_source: 'NIC Quarterly Report',
      }));

      const { error } = await supabase
        .from(tableName)
        .upsert(enrichedData, { 
          onConflict: 'insurer_id,report_year,report_quarter',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast.success(`Successfully imported ${enrichedData.length} ${selectedCategory} records for ${selectedYear}${selectedQuarter ? ` Q${selectedQuarter}` : ''}`);
      setJsonData('');
      setUploadedFileName(null);
      refetch();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Import failed: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sampleData = `[
  {
    "insurer_name": "Enterprise Life Assurance",
    "gross_premium": 889333000,
    "market_share": 11.03
  }
]`;

  // Navigation items
  const navItems = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3, color: 'text-blue-500' },
    { id: 'news' as const, label: 'News', icon: Newspaper, color: 'text-green-500' },
    { id: 'insurers' as const, label: 'Insurers', icon: Shield, color: 'text-primary' },
    { id: 'brokers' as const, label: 'Brokers', icon: Users, color: 'text-purple-500' },
    { id: 'pension' as const, label: 'Pension', icon: Landmark, color: 'text-amber-500' },
    { id: 'settings' as const, label: 'Site Settings', icon: Globe, color: 'text-cyan-500' },
  ];

  // Stats for overview
  const totalLifeRecords = metrics.length;
  const totalNonLifeRecords = nonlifeMetrics.length;
  const totalBrokerRecords = brokerMetrics.length;
  const totalPensionFunds = pensionMetrics.length;
  const totalInsurers = insurers.length;
  const insurersWithLogos = insurers.filter(i => i.logo_url).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Data Administration
                </h1>
                <p className="text-sm text-muted-foreground">NIC & NPRA Data Management</p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3 w-3" />
              Auto-sync Active
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardContent className="p-4">
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                        activeSection === item.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${activeSection === item.id ? 'text-primary' : item.color}`} />
                      {item.label}
                    </button>
                  ))}
                </nav>
                
                <Separator className="my-4" />
                
                {/* Quick Stats */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Stats</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-blue-500/10 rounded-md text-center">
                      <p className="font-bold text-blue-600">{totalLifeRecords}</p>
                      <p className="text-muted-foreground">Life</p>
                    </div>
                    <div className="p-2 bg-green-500/10 rounded-md text-center">
                      <p className="font-bold text-green-600">{totalNonLifeRecords}</p>
                      <p className="text-muted-foreground">Non-Life</p>
                    </div>
                    <div className="p-2 bg-purple-500/10 rounded-md text-center">
                      <p className="font-bold text-purple-600">{totalBrokerRecords}</p>
                      <p className="text-muted-foreground">Brokers</p>
                    </div>
                    <div className="p-2 bg-amber-500/10 rounded-md text-center">
                      <p className="font-bold text-amber-600">{totalPensionFunds}</p>
                      <p className="text-muted-foreground">Pension</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-6">
            {/* Overview Section */}
            {activeSection === 'overview' && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">News Articles</p>
                          <p className="text-2xl font-bold">{newsCount}</p>
                        </div>
                        <Newspaper className="h-8 w-8 text-blue-500/30" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Insurers</p>
                          <p className="text-2xl font-bold">{totalInsurers}</p>
                        </div>
                        <Building2 className="h-8 w-8 text-green-500/30" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Logos Uploaded</p>
                          <p className="text-2xl font-bold">{insurersWithLogos}/{totalInsurers}</p>
                        </div>
                        <Image className="h-8 w-8 text-purple-500/30" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Pension Funds</p>
                          <p className="text-2xl font-bold">{totalPensionFunds}</p>
                        </div>
                        <Landmark className="h-8 w-8 text-amber-500/30" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Data Status by Quarter */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Data Status by Quarter
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="life">
                      <TabsList>
                        <TabsTrigger value="life">Life</TabsTrigger>
                        <TabsTrigger value="nonlife">Non-Life</TabsTrigger>
                        <TabsTrigger value="brokers">Brokers</TabsTrigger>
                      </TabsList>
                      <TabsContent value="life" className="mt-4">
                        <div className="space-y-4">
                          {[2025, 2024].map(year => (
                            <div key={year}>
                              <h4 className="text-sm font-medium mb-2">{year}</h4>
                              <div className="grid grid-cols-4 gap-2">
                                {[1, 2, 3, 4].map(q => {
                                  const count = getQuarterStats(year, q, 'life');
                                  return (
                                    <div key={q} className="p-3 bg-muted/50 rounded-lg text-center">
                                      <p className="text-lg font-bold">{count}</p>
                                      <p className="text-xs text-muted-foreground">Q{q}</p>
                                      {count > 0 ? (
                                        <Badge variant="default" className="mt-1 text-[10px]"><Check className="h-2 w-2 mr-0.5" />OK</Badge>
                                      ) : (
                                        <Badge variant="destructive" className="mt-1 text-[10px]">Empty</Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                      <TabsContent value="nonlife" className="mt-4">
                        <div className="space-y-4">
                          {[2025, 2024].map(year => (
                            <div key={year}>
                              <h4 className="text-sm font-medium mb-2">{year}</h4>
                              <div className="grid grid-cols-4 gap-2">
                                {[1, 2, 3, 4].map(q => {
                                  const count = getQuarterStats(year, q, 'nonlife');
                                  return (
                                    <div key={q} className="p-3 bg-muted/50 rounded-lg text-center">
                                      <p className="text-lg font-bold">{count}</p>
                                      <p className="text-xs text-muted-foreground">Q{q}</p>
                                      {count > 0 ? (
                                        <Badge variant="default" className="mt-1 text-[10px]"><Check className="h-2 w-2 mr-0.5" />OK</Badge>
                                      ) : (
                                        <Badge variant="destructive" className="mt-1 text-[10px]">Empty</Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                      <TabsContent value="brokers" className="mt-4">
                        <div className="space-y-4">
                          {[2025, 2024].map(year => (
                            <div key={year}>
                              <h4 className="text-sm font-medium mb-2">{year}</h4>
                              <div className="grid grid-cols-4 gap-2">
                                {[1, 2, 3, 4].map(q => {
                                  const count = getBrokerQuarterStats(year, q);
                                  return (
                                    <div key={q} className="p-3 bg-muted/50 rounded-lg text-center">
                                      <p className="text-lg font-bold">{count}</p>
                                      <p className="text-xs text-muted-foreground">Q{q}</p>
                                      {count > 0 ? (
                                        <Badge variant="default" className="mt-1 text-[10px]"><Check className="h-2 w-2 mr-0.5" />OK</Badge>
                                      ) : (
                                        <Badge variant="destructive" className="mt-1 text-[10px]">Empty</Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-500" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <Button variant="outline" onClick={() => handleCrawlNews()} disabled={isCrawlingNews} className="h-auto py-4 flex-col gap-2">
                        {isCrawlingNews ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Newspaper className="h-5 w-5 text-green-500" />}
                        <span className="text-xs">Crawl News</span>
                      </Button>
                      <Button variant="outline" onClick={handleSyncInsurers} disabled={isSyncingInsurers} className="h-auto py-4 flex-col gap-2">
                        {isSyncingInsurers ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Building2 className="h-5 w-5 text-blue-500" />}
                        <span className="text-xs">Sync Insurers</span>
                      </Button>
                      <Button variant="outline" onClick={handleSyncLogos} disabled={isSyncingLogos} className="h-auto py-4 flex-col gap-2">
                        {isSyncingLogos ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Image className="h-5 w-5 text-purple-500" />}
                        <span className="text-xs">Sync Logos</span>
                      </Button>
                      <Button variant="outline" onClick={handleSyncYears} disabled={isSyncingYears} className="h-auto py-4 flex-col gap-2">
                        {isSyncingYears ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Calendar className="h-5 w-5 text-amber-500" />}
                        <span className="text-xs">Sync Years</span>
                      </Button>
                      <Button variant="outline" onClick={handleCleanupNews} disabled={isCleaningNews} className="h-auto py-4 flex-col gap-2 text-destructive hover:text-destructive">
                        {isCleaningNews ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                        <span className="text-xs">Clean News</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Clear Database Section */}
                <Card className="border-destructive/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <Trash2 className="h-5 w-5" />
                      Clear Database
                    </CardTitle>
                    <CardDescription>Delete all data from specific tables for fresh import. Use with caution!</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button 
                        variant="outline" 
                        onClick={handleClearLifeData} 
                        disabled={isClearingLife} 
                        className="h-auto py-4 flex-col gap-2 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50"
                      >
                        {isClearingLife ? <RefreshCw className="h-5 w-5 animate-spin text-blue-500" /> : <Trash2 className="h-5 w-5 text-blue-500" />}
                        <span className="text-xs">Clear Life</span>
                        <span className="text-[10px] text-muted-foreground">{allLifeMetrics.length} records</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleClearNonLifeData} 
                        disabled={isClearingNonLife} 
                        className="h-auto py-4 flex-col gap-2 border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50"
                      >
                        {isClearingNonLife ? <RefreshCw className="h-5 w-5 animate-spin text-green-500" /> : <Trash2 className="h-5 w-5 text-green-500" />}
                        <span className="text-xs">Clear Non-Life</span>
                        <span className="text-[10px] text-muted-foreground">{nonlifeMetrics.length} records</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleClearBrokerData} 
                        disabled={isClearingBrokers} 
                        className="h-auto py-4 flex-col gap-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50"
                      >
                        {isClearingBrokers ? <RefreshCw className="h-5 w-5 animate-spin text-purple-500" /> : <Trash2 className="h-5 w-5 text-purple-500" />}
                        <span className="text-xs">Clear Brokers</span>
                        <span className="text-[10px] text-muted-foreground">{brokerMetrics.length} records</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleClearPensionData} 
                        disabled={isClearingPension} 
                        className="h-auto py-4 flex-col gap-2 border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50"
                      >
                        {isClearingPension ? <RefreshCw className="h-5 w-5 animate-spin text-amber-500" /> : <Trash2 className="h-5 w-5 text-amber-500" />}
                        <span className="text-xs">Clear Pension</span>
                        <span className="text-[10px] text-muted-foreground">{pensionMetrics.length} records</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* News Section */}
            {activeSection === 'news' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Newspaper className="h-5 w-5 text-green-500" />
                      News Management
                    </CardTitle>
                    <CardDescription>Crawl RSS feeds for insurance news and manage articles</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-muted/30">
                        <CardContent className="p-4 text-center">
                          <Newspaper className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p className="text-2xl font-bold">{newsCount}</p>
                          <p className="text-xs text-muted-foreground">Total Articles</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/30">
                        <CardContent className="p-4 text-center">
                          <RefreshCw className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                          <p className="text-lg font-bold">40+</p>
                          <p className="text-xs text-muted-foreground">RSS Feeds</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/30">
                        <CardContent className="p-4 text-center">
                          <Zap className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                          <p className="text-lg font-bold">8AM/6PM</p>
                          <p className="text-xs text-muted-foreground">Auto Sync</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Manual Crawl</h4>
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={() => handleCrawlNews()} disabled={isCrawlingNews}>
                          {isCrawlingNews ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                          Crawl All News
                        </Button>
                        <Button variant="outline" onClick={() => handleCrawlNews('nic_only')} disabled={isCrawlingNews}>
                          NIC News Only
                        </Button>
                        <Button variant="outline" onClick={() => handleCrawlNews('pension_only')} disabled={isCrawlingNews}>
                          Pension News Only
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Cleanup</h4>
                      <div className="flex items-center gap-4">
                        <Button variant="destructive" onClick={handleCleanupNews} disabled={isCleaningNews}>
                          {isCleaningNews ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                          Remove Non-Insurance Articles
                        </Button>
                        <p className="text-sm text-muted-foreground">Remove sports, entertainment, crypto articles</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* News Filters Section */}
                <NewsFiltersSection 
                  onTriggerCrawl={handleCrawlNews}
                  isCrawling={isCrawlingNews}
                />
              </div>
            )}

            {/* Insurers Section */}
            {activeSection === 'insurers' && (
              <div className="space-y-6">
                {/* Sync & Logos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Insurer Management
                    </CardTitle>
                    <CardDescription>Sync insurer data and manage logos</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Sync Insurers
                        </h4>
                        <Button onClick={handleSyncInsurers} disabled={isSyncingInsurers} className="w-full">
                          {isSyncingInsurers ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                          Sync NIC/NPRA Insurers
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">Updates insurer database from NIC/NPRA</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          Sync Logos
                        </h4>
                        <Button onClick={handleSyncLogos} disabled={isSyncingLogos} variant="secondary" className="w-full">
                          {isSyncingLogos ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Image className="h-4 w-4 mr-2" />}
                          Fetch from Clearbit/Google
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">Auto-fetch logos from external sources</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Bulk Logo Upload */}
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <ImagePlus className="h-4 w-4 text-primary" />
                        Bulk Logo Upload
                      </h4>
                      <input ref={logoFileInputRef} type="file" accept="image/*" multiple onChange={handleBulkLogoUpload} className="hidden" />
                      <Button variant="outline" onClick={() => logoFileInputRef.current?.click()} disabled={isUploadingLogos} className="w-full">
                        {isUploadingLogos ? (
                          <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Uploading {logoUploadProgress?.uploaded}/{logoUploadProgress?.total}...</>
                        ) : (
                          <><ImagePlus className="h-4 w-4 mr-2" />Upload Logo Images</>
                        )}
                      </Button>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p className="font-medium">Accepted naming formats:</p>
                        <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-1">
                          <li><code className="bg-muted px-1 rounded">enterprise-life.png</code> (insurer ID)</li>
                          <li><code className="bg-muted px-1 rounded">Enterprise_Life.png</code> (underscored)</li>
                          <li><code className="bg-muted px-1 rounded">Prudential_Life_Insurance_Ghana.png</code> (full name)</li>
                          <li><code className="bg-muted px-1 rounded">StarLife.png</code> or <code className="bg-muted px-1 rounded">QLAC.png</code> (short name)</li>
                        </ul>
                      </div>
                      
                      {insurers.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            View {insurers.length} insurers ({insurersWithLogos} with logos)
                          </summary>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto p-2 bg-background rounded-lg border">
                            {insurers.map(ins => (
                              <div key={ins.insurer_id} className="flex items-center gap-2 text-xs p-1.5 rounded">
                                {ins.logo_url ? (
                                  <img src={ins.logo_url} alt="" className="w-5 h-5 object-contain rounded" />
                                ) : (
                                  <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] text-white font-bold" style={{ backgroundColor: ins.brand_color || '#1976D2' }}>
                                    {ins.short_name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span className="truncate">{ins.short_name}</span>
                                {ins.logo_url && <Check className="h-3 w-3 text-green-500 ml-auto flex-shrink-0" />}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Import NIC Data */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-primary" />
                      Import NIC Data
                    </CardTitle>
                    <CardDescription>Upload Excel files with Life or Non-Life insurance data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Default Category</Label>
                        <Select value={selectedCategory} onValueChange={(v: 'life' | 'nonlife') => setSelectedCategory(v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="life">Life Insurance</SelectItem>
                            <SelectItem value="nonlife">Non-Life Insurance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Default Year</Label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2023">2023</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Default Quarter</Label>
                        <Select value={selectedQuarter || 'annual'} onValueChange={(v) => setSelectedQuarter(v === 'annual' ? '' : v)}>
                          <SelectTrigger><SelectValue placeholder="Select quarter" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="annual">Annual</SelectItem>
                            <SelectItem value="1">Q1</SelectItem>
                            <SelectItem value="2">Q2</SelectItem>
                            <SelectItem value="3">Q3</SelectItem>
                            <SelectItem value="4">Q4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Upload Excel File</Label>
                      <div className="flex items-center gap-4">
                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isParsingExcel} className="flex-1">
                          {isParsingExcel ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Parsing...</> : <><FileUp className="h-4 w-4 mr-2" />Choose Excel File</>}
                        </Button>
                        {uploadedFileName && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                            <FileSpreadsheet className="h-4 w-4 text-primary" />
                            <span className="text-sm">{uploadedFileName}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearFile}><X className="h-3 w-3" /></Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {parsedSheets.length > 0 && (
                      <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <Label>Detected Sheets ({parsedSheets.length})</Label>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600">{parsedSheets.filter(s => s.dataType === 'life').length} Life</Badge>
                            <Badge variant="outline" className="bg-green-500/10 text-green-600">{parsedSheets.filter(s => s.dataType === 'nonlife').length} Non-Life</Badge>
                          </div>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {parsedSheets.map((sheet) => (
                            <div key={sheet.sheetName} className="flex items-center gap-3 p-2 rounded-md bg-background border">
                              <input type="checkbox" checked={sheet.selected} onChange={() => toggleSheetSelection(sheet.sheetName)} className="h-4 w-4 rounded" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{sheet.sheetName}</p>
                                <p className="text-xs text-muted-foreground">{sheet.insurers.length} insurers</p>
                              </div>
                              <Select value={sheet.dataType} onValueChange={(v: 'life' | 'nonlife') => updateSheetDataType(sheet.sheetName, v)}>
                                <SelectTrigger className="w-[90px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="life">Life</SelectItem>
                                  <SelectItem value="nonlife">Non-Life</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select value={sheet.quarter?.toString() || 'annual'} onValueChange={(v) => updateSheetQuarter(sheet.sheetName, v === 'annual' ? null : parseInt(v))}>
                                <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="annual">Annual</SelectItem>
                                  <SelectItem value="1">Q1</SelectItem>
                                  <SelectItem value="2">Q2</SelectItem>
                                  <SelectItem value="3">Q3</SelectItem>
                                  <SelectItem value="4">Q4</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select value={sheet.year.toString()} onValueChange={(v) => updateSheetYear(sheet.sheetName, parseInt(v))}>
                                <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="2025">2025</SelectItem>
                                  <SelectItem value="2024">2024</SelectItem>
                                  <SelectItem value="2023">2023</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                        <Button onClick={handleBulkImport} disabled={isSubmitting} className="w-full">
                          {isSubmitting ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Importing...</> : <><Upload className="h-4 w-4 mr-2" />Import {parsedSheets.filter(s => s.selected).length} Sheets</>}
                        </Button>
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-2">
                      <Label>Or Paste JSON Data</Label>
                      <Textarea value={jsonData} onChange={(e) => setJsonData(e.target.value)} placeholder={sampleData} className="font-mono text-xs min-h-[120px]" />
                      <Button onClick={handleSubmitData} disabled={isSubmitting || !jsonData.trim()}>
                        {isSubmitting ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Importing...</> : <><Upload className="h-4 w-4 mr-2" />Import JSON</>}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Brokers Section */}
            {activeSection === 'brokers' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Import Broker Data
                  </CardTitle>
                  <CardDescription>Upload Excel file with Insurance Broker data from NIC Quarterly Reports</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Upload Broker Excel File</Label>
                    <div className="flex items-center gap-4">
                      <input ref={brokerFileInputRef} type="file" accept=".xlsx,.xls" onChange={handleBrokerFileChange} className="hidden" />
                      <Button variant="outline" onClick={() => brokerFileInputRef.current?.click()} disabled={isParsingBrokerExcel} className="flex-1 border-purple-500/30 hover:bg-purple-500/10">
                        {isParsingBrokerExcel ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Parsing...</> : <><FileUp className="h-4 w-4 mr-2" />Choose Broker Excel</>}
                      </Button>
                      {brokerUploadedFileName && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 rounded-md">
                          <FileSpreadsheet className="h-4 w-4 text-purple-500" />
                          <span className="text-sm">{brokerUploadedFileName}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearBrokerFile}><X className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {parsedBrokerSheets.length > 0 && (
                    <div className="space-y-3 p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
                      <div className="flex items-center justify-between">
                        <Label>Detected Sheets ({parsedBrokerSheets.length})</Label>
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-600">{parsedBrokerSheets.filter(s => s.selected).length} selected</Badge>
                      </div>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {parsedBrokerSheets.map((sheet) => (
                          <div key={sheet.sheetName} className="flex items-center gap-3 p-2 rounded-md bg-background border">
                            <input type="checkbox" checked={sheet.selected} onChange={() => toggleBrokerSheetSelection(sheet.sheetName)} className="h-4 w-4 rounded" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{sheet.sheetName}</p>
                              <p className="text-xs text-muted-foreground">{sheet.brokers.length} brokers</p>
                            </div>
                            <Select value={sheet.quarter?.toString() || 'annual'} onValueChange={(v) => updateBrokerSheetQuarter(sheet.sheetName, v === 'annual' ? null : parseInt(v))}>
                              <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="annual">Annual</SelectItem>
                                <SelectItem value="1">Q1</SelectItem>
                                <SelectItem value="2">Q2</SelectItem>
                                <SelectItem value="3">Q3</SelectItem>
                                <SelectItem value="4">Q4</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select value={sheet.year.toString()} onValueChange={(v) => updateBrokerSheetYear(sheet.sheetName, parseInt(v))}>
                              <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2023">2023</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                      <Button onClick={handleBrokerBulkImport} disabled={isBrokerSubmitting} className="w-full bg-purple-600 hover:bg-purple-700">
                        {isBrokerSubmitting ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Importing...</> : <><Upload className="h-4 w-4 mr-2" />Import {parsedBrokerSheets.filter(s => s.selected).length} Sheets</>}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pension Section */}
            {activeSection === 'pension' && (
              <PensionDataManager />
            )}

            {/* Site Settings Section */}
            {activeSection === 'settings' && (
              <SiteSettingsSection />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DataAdmin;
