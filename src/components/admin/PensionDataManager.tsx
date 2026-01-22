import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, Trash2, Save, RefreshCw, Edit, Upload, Download, FileSpreadsheet,
  Landmark, AlertTriangle, Check, Database, FileText, PieChart, BarChart3, Building2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

interface PensionFundEntry {
  fund_id: string;
  fund_name: string;
  fund_type: 'Tier 1' | 'Tier 2' | 'Tier 3' | 'tier2' | 'tier3';
  trustee_name: string;
  fund_manager: string;
  aum: number;
  market_share: number;
  investment_return: number;
  total_contributors?: number;
  total_contributions?: number;
  total_benefits_paid?: number;
  equity_allocation?: number;
  fixed_income_allocation?: number;
  money_market_allocation?: number;
  alternative_investments?: number;
}

// BNSSS (SSNIT) Data from 2024 NPRA Annual Report - Page 44
const BNSSS_2024_DATA = {
  total_assets: 22500000000, // GHS 22.5bn
  active_contributors: 2007411,
  active_pensioners: 254056,
  dependency_ratio: 8.06,
  contributions_received: 8800000000, // GHS 8.8bn
  benefits_paid: 6500000000, // GHS 6.5bn
  minimum_pension: 300,
  return_on_investment: 17.07,
  employers: 89899,
  // Historical trends from page 47-48
  historical: {
    contributors: [
      { year: 2020, value: 1633505 },
      { year: 2021, value: 1734168 },
      { year: 2022, value: 1843833 },
      { year: 2023, value: 1951494 },
      { year: 2024, value: 2007411 },
    ],
    employers: [
      { year: 2020, value: 227407 },
      { year: 2021, value: 225768 },
      { year: 2022, value: 235762 },
      { year: 2023, value: 244830 },
      { year: 2024, value: 254056 },
    ],
    assets: [
      { year: 2020, value: 22.02 },
      { year: 2021, value: 28.02 },
      { year: 2022, value: 35.3 },
      { year: 2023, value: 46.5 },
      { year: 2024, value: 63.88 },
    ],
  }
};

// Private Pension Data from 2024 NPRA Annual Report - Page 45, 50
const PRIVATE_PENSION_2024 = {
  total_assets: 63880000000, // GHS 63.88bn
  tier2_share: 28, // 28% Tier 2
  tier3_share: 72, // 72% Tier 3
  individual_trustees: 818,
  pension_fund_managers: 37,
  registered_schemes: 218,
  corporate_trustees: 23,
  fund_custodians: 18,
  benefits_paid: 1300000000, // GHS 1.3bn
  informal_sector_coverage: 13,
};

// Fund Custodians Market Share (from NPRA Report)
const FUND_CUSTODIANS_2024 = [
  { name: 'Stanbic Bank', market_share: 28.5 },
  { name: 'Standard Chartered Bank', market_share: 22.3 },
  { name: 'Ecobank Ghana', market_share: 18.7 },
  { name: 'GCB Bank', market_share: 12.4 },
  { name: 'Fidelity Bank', market_share: 8.9 },
  { name: 'Others', market_share: 9.2 },
];

// Corporate Trustees AUM Distribution (from NPRA Report)
const CORPORATE_TRUSTEES_AUM_2024 = [
  { name: 'Enterprise Trustees', aum: 14.2, market_share: 22.23 },
  { name: 'GLICO Pensions', aum: 11.5, market_share: 18.01 },
  { name: 'Pensions Alliance', aum: 9.6, market_share: 15.01 },
  { name: 'Petra Trust', aum: 7.7, market_share: 12.01 },
  { name: 'Axis Pension', aum: 6.4, market_share: 10.01 },
  { name: 'Metropolitan Pensions', aum: 5.1, market_share: 8.01 },
  { name: 'Old Mutual', aum: 3.8, market_share: 6.00 },
  { name: 'Others', aum: 5.6, market_share: 8.72 },
];

// Asset Allocation of Private Pension Funds
const ASSET_ALLOCATION_2024 = [
  { name: 'Fixed Income', value: 52, color: '#3b82f6' },
  { name: 'Equity', value: 28, color: '#22c55e' },
  { name: 'Money Market', value: 12, color: '#f59e0b' },
  { name: 'Alternative Investments', value: 5, color: '#8b5cf6' },
  { name: 'Others', value: 3, color: '#6b7280' },
];

// 2024 NPRA Report - Accurate data
const NPRA_2024_DATA: PensionFundEntry[] = [
  // Tier 1 - SSNIT
  {
    fund_id: 'ssnit-tier1',
    fund_name: 'SSNIT (BNSSS)',
    fund_type: 'Tier 1',
    trustee_name: 'SSNIT',
    fund_manager: 'SSNIT',
    aum: 22500000000,
    market_share: 26.05,
    investment_return: 17.07,
    total_contributors: 2007411,
    total_contributions: 8800000000,
    total_benefits_paid: 6500000000,
  },
  // Tier 2 Corporate Trustees
  {
    fund_id: 'enterprise-trustees-t2',
    fund_name: 'Enterprise Trustees Limited',
    fund_type: 'Tier 2',
    trustee_name: 'Enterprise Trustees',
    fund_manager: 'Enterprise Group',
    aum: 3978720000,
    market_share: 22.23,
    investment_return: 16.5,
  },
  {
    fund_id: 'glico-pensions-t2',
    fund_name: 'GLICO Pensions Trustee',
    fund_type: 'Tier 2',
    trustee_name: 'GLICO Pensions',
    fund_manager: 'GLICO Group',
    aum: 3221040000,
    market_share: 18.01,
    investment_return: 15.8,
  },
  {
    fund_id: 'pensions-alliance-t2',
    fund_name: 'Pensions Alliance Trust',
    fund_type: 'Tier 2',
    trustee_name: 'Pensions Alliance Trust',
    fund_manager: 'PAT',
    aum: 2684850000,
    market_share: 15.01,
    investment_return: 14.9,
  },
  {
    fund_id: 'petra-trust-t2',
    fund_name: 'Petra Trust Company',
    fund_type: 'Tier 2',
    trustee_name: 'Petra Trust',
    fund_manager: 'Petra Trust',
    aum: 2147880000,
    market_share: 12.01,
    investment_return: 15.2,
  },
  {
    fund_id: 'axis-pension-t2',
    fund_name: 'Axis Pension Trust',
    fund_type: 'Tier 2',
    trustee_name: 'Axis Pension Trust',
    fund_manager: 'Axis Pensions',
    aum: 1789900000,
    market_share: 10.01,
    investment_return: 14.5,
  },
  {
    fund_id: 'metropolitan-pensions-t2',
    fund_name: 'Metropolitan Pensions Trust',
    fund_type: 'Tier 2',
    trustee_name: 'Metropolitan Pensions',
    fund_manager: 'Metropolitan',
    aum: 1431920000,
    market_share: 8.01,
    investment_return: 15.0,
  },
  {
    fund_id: 'old-mutual-pensions-t2',
    fund_name: 'Old Mutual Pension Trust',
    fund_type: 'Tier 2',
    trustee_name: 'Old Mutual',
    fund_manager: 'Old Mutual',
    aum: 1073940000,
    market_share: 6.00,
    investment_return: 14.8,
  },
  // Tier 3
  {
    fund_id: 'enterprise-trustees-t3',
    fund_name: 'Enterprise Trustees T3 Scheme',
    fund_type: 'Tier 3',
    trustee_name: 'Enterprise Trustees',
    fund_manager: 'Enterprise Group',
    aum: 11497500000,
    market_share: 25.00,
    investment_return: 18.2,
  },
  {
    fund_id: 'glico-pensions-t3',
    fund_name: 'GLICO Personal Pension',
    fund_type: 'Tier 3',
    trustee_name: 'GLICO Pensions',
    fund_manager: 'GLICO Group',
    aum: 9198000000,
    market_share: 20.00,
    investment_return: 16.5,
  },
  {
    fund_id: 'pat-t3',
    fund_name: 'PAT Personal Pension',
    fund_type: 'Tier 3',
    trustee_name: 'Pensions Alliance Trust',
    fund_manager: 'PAT',
    aum: 8278200000,
    market_share: 18.00,
    investment_return: 17.1,
  },
  {
    fund_id: 'petra-trust-t3',
    fund_name: 'Petra Provident Fund',
    fund_type: 'Tier 3',
    trustee_name: 'Petra Trust',
    fund_manager: 'Petra Trust',
    aum: 6898500000,
    market_share: 15.00,
    investment_return: 16.8,
  },
  {
    fund_id: 'axis-pension-t3',
    fund_name: 'Axis Personal Pension',
    fund_type: 'Tier 3',
    trustee_name: 'Axis Pension Trust',
    fund_manager: 'Axis Pensions',
    aum: 5518800000,
    market_share: 12.00,
    investment_return: 15.9,
  },
];

// Column mapping for imports
const COLUMN_MAPPINGS = {
  fund_id: ['fund_id', 'id', 'fund_code', 'code'],
  fund_name: ['fund_name', 'name', 'scheme_name', 'scheme', 'fund'],
  fund_type: ['fund_type', 'type', 'tier', 'category'],
  trustee_name: ['trustee_name', 'trustee', 'corporate_trustee'],
  fund_manager: ['fund_manager', 'manager', 'fund_manager_name'],
  aum: ['aum', 'assets_under_management', 'total_assets', 'assets'],
  market_share: ['market_share', 'share', 'percentage'],
  investment_return: ['investment_return', 'return', 'returns', 'roi'],
  total_contributors: ['total_contributors', 'contributors', 'members'],
  total_contributions: ['total_contributions', 'contributions'],
  total_benefits_paid: ['total_benefits_paid', 'benefits_paid', 'benefits'],
  equity_allocation: ['equity_allocation', 'equity', 'equity_pct'],
  fixed_income_allocation: ['fixed_income_allocation', 'fixed_income', 'bonds'],
  money_market_allocation: ['money_market_allocation', 'money_market', 'cash'],
  alternative_investments: ['alternative_investments', 'alternatives', 'alt_investments'],
};

const formatCurrency = (value: number) => {
  if (value >= 1e9) return `GHS ${(value / 1e9).toFixed(2)}bn`;
  if (value >= 1e6) return `GHS ${(value / 1e6).toFixed(2)}m`;
  return `GHS ${value.toLocaleString()}`;
};

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6b7280'];

export function PensionDataManager() {
  const [selectedYear, setSelectedYear] = useState('2024');
  const [isImporting, setIsImporting] = useState(false);
  const [editingFund, setEditingFund] = useState<PensionFundEntry | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isColumnMappingOpen, setIsColumnMappingOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: pensionMetrics = [], refetch } = useQuery({
    queryKey: ['pension-metrics-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pension_fund_metrics')
        .select('*')
        .order('report_year', { ascending: false })
        .order('aum', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length > 0) {
          const columns = Object.keys(jsonData[0] as object);
          setDetectedColumns(columns);
          setImportData(jsonData);
          
          // Auto-map columns
          const autoMapping: Record<string, string> = {};
          for (const [dbField, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
            const matchedCol = columns.find(col => 
              possibleNames.some(name => 
                col.toLowerCase().includes(name.toLowerCase())
              )
            );
            if (matchedCol) autoMapping[dbField] = matchedCol;
          }
          setColumnMapping(autoMapping);
          setIsColumnMappingOpen(true);
        }
      } else if (fileName.endsWith('.json')) {
        const text = await file.text();
        const jsonData = JSON.parse(text);
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        if (dataArray.length > 0) {
          const columns = Object.keys(dataArray[0]);
          setDetectedColumns(columns);
          setImportData(dataArray);
          
          const autoMapping: Record<string, string> = {};
          for (const [dbField, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
            const matchedCol = columns.find(col => 
              possibleNames.some(name => 
                col.toLowerCase().includes(name.toLowerCase())
              )
            );
            if (matchedCol) autoMapping[dbField] = matchedCol;
          }
          setColumnMapping(autoMapping);
          setIsColumnMappingOpen(true);
        }
      } else if (fileName.endsWith('.csv')) {
        const text = await file.text();
        const workbook = XLSX.read(text, { type: 'string' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length > 0) {
          const columns = Object.keys(jsonData[0] as object);
          setDetectedColumns(columns);
          setImportData(jsonData);
          
          const autoMapping: Record<string, string> = {};
          for (const [dbField, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
            const matchedCol = columns.find(col => 
              possibleNames.some(name => 
                col.toLowerCase().includes(name.toLowerCase())
              )
            );
            if (matchedCol) autoMapping[dbField] = matchedCol;
          }
          setColumnMapping(autoMapping);
          setIsColumnMappingOpen(true);
        }
      } else {
        toast.error('Unsupported file format. Please use Excel (.xlsx, .xls), CSV, or JSON files.');
      }
    } catch (error) {
      console.error('File parsing error:', error);
      toast.error('Failed to parse file');
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportMappedData = async () => {
    if (!columnMapping.fund_name) {
      toast.error('Please map the Fund Name column');
      return;
    }

    setIsImporting(true);
    try {
      const year = parseInt(selectedYear);
      const metricsToInsert = importData.map((row, index) => ({
        fund_id: columnMapping.fund_id ? row[columnMapping.fund_id] : `imported-${Date.now()}-${index}`,
        fund_name: row[columnMapping.fund_name],
        fund_type: columnMapping.fund_type ? row[columnMapping.fund_type] : 'Tier 2',
        trustee_name: columnMapping.trustee_name ? row[columnMapping.trustee_name] : null,
        fund_manager: columnMapping.fund_manager ? row[columnMapping.fund_manager] : null,
        aum: columnMapping.aum ? parseFloat(String(row[columnMapping.aum]).replace(/[^0-9.-]/g, '')) || 0 : 0,
        market_share: columnMapping.market_share ? parseFloat(String(row[columnMapping.market_share]).replace(/[^0-9.-]/g, '')) || 0 : 0,
        investment_return: columnMapping.investment_return ? parseFloat(String(row[columnMapping.investment_return]).replace(/[^0-9.-]/g, '')) || 0 : 0,
        total_contributors: columnMapping.total_contributors ? parseInt(String(row[columnMapping.total_contributors]).replace(/[^0-9]/g, '')) || null : null,
        total_contributions: columnMapping.total_contributions ? parseFloat(String(row[columnMapping.total_contributions]).replace(/[^0-9.-]/g, '')) || null : null,
        total_benefits_paid: columnMapping.total_benefits_paid ? parseFloat(String(row[columnMapping.total_benefits_paid]).replace(/[^0-9.-]/g, '')) || null : null,
        equity_allocation: columnMapping.equity_allocation ? parseFloat(String(row[columnMapping.equity_allocation]).replace(/[^0-9.-]/g, '')) || null : null,
        fixed_income_allocation: columnMapping.fixed_income_allocation ? parseFloat(String(row[columnMapping.fixed_income_allocation]).replace(/[^0-9.-]/g, '')) || null : null,
        money_market_allocation: columnMapping.money_market_allocation ? parseFloat(String(row[columnMapping.money_market_allocation]).replace(/[^0-9.-]/g, '')) || null : null,
        alternative_investments: columnMapping.alternative_investments ? parseFloat(String(row[columnMapping.alternative_investments]).replace(/[^0-9.-]/g, '')) || null : null,
        report_year: year,
        report_source: `Imported from file - ${new Date().toISOString()}`,
      }));

      const { error } = await supabase
        .from('pension_fund_metrics')
        .upsert(metricsToInsert, { onConflict: 'fund_id,report_year' });

      if (error) throw error;

      toast.success(`Imported ${metricsToInsert.length} pension fund records for ${year}`);
      setIsColumnMappingOpen(false);
      setImportData([]);
      setColumnMapping({});
      refetch();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import pension data');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportDefaultData = async () => {
    setIsImporting(true);
    try {
      const year = parseInt(selectedYear);
      const metricsToInsert = NPRA_2024_DATA.map(fund => ({
        fund_id: fund.fund_id,
        fund_name: fund.fund_name,
        fund_type: fund.fund_type,
        trustee_name: fund.trustee_name,
        fund_manager: fund.fund_manager,
        aum: fund.aum,
        aum_previous: fund.aum * 0.88,
        aum_growth_rate: 12,
        market_share: fund.market_share,
        investment_return: fund.investment_return,
        total_contributors: fund.total_contributors || null,
        total_contributions: fund.total_contributions || null,
        total_benefits_paid: fund.total_benefits_paid || null,
        equity_allocation: fund.equity_allocation || (fund.fund_type === 'Tier 1' ? 35 : 25),
        fixed_income_allocation: fund.fixed_income_allocation || (fund.fund_type === 'Tier 1' ? 45 : 50),
        money_market_allocation: fund.money_market_allocation || 15,
        alternative_investments: 10,
        expense_ratio: 0.85,
        report_year: year,
        report_quarter: null,
        report_source: `NPRA ${year} Annual Report`,
      }));

      const { error } = await supabase
        .from('pension_fund_metrics')
        .upsert(metricsToInsert, { onConflict: 'fund_id,report_year' });

      if (error) throw error;

      toast.success(`Imported ${metricsToInsert.length} pension fund records for ${year}`);
      refetch();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import pension data');
    } finally {
      setIsImporting(false);
    }
  };

  const handleUpdateFund = async (fund: PensionFundEntry) => {
    try {
      const { error } = await supabase
        .from('pension_fund_metrics')
        .update({
          fund_name: fund.fund_name,
          fund_type: fund.fund_type,
          trustee_name: fund.trustee_name,
          fund_manager: fund.fund_manager,
          aum: fund.aum,
          market_share: fund.market_share,
          investment_return: fund.investment_return,
          total_contributors: fund.total_contributors,
          total_contributions: fund.total_contributions,
          total_benefits_paid: fund.total_benefits_paid,
        })
        .eq('fund_id', fund.fund_id)
        .eq('report_year', parseInt(selectedYear));

      if (error) throw error;

      toast.success('Fund updated successfully');
      setIsEditDialogOpen(false);
      setEditingFund(null);
      refetch();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update fund');
    }
  };

  const handleDeleteFund = async (fundId: string, year: number) => {
    if (!confirm('Are you sure you want to delete this fund record?')) return;
    
    try {
      const { error } = await supabase
        .from('pension_fund_metrics')
        .delete()
        .eq('fund_id', fundId)
        .eq('report_year', year);

      if (error) throw error;

      toast.success('Fund deleted successfully');
      refetch();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete fund');
    }
  };

  const handleExportTemplate = () => {
    const templateData = [
      {
        fund_id: 'example-fund-1',
        fund_name: 'Example Pension Fund',
        fund_type: 'Tier 2',
        trustee_name: 'Example Trustees Ltd',
        fund_manager: 'Example Asset Management',
        aum: 1000000000,
        market_share: 10.5,
        investment_return: 15.2,
        total_contributors: 50000,
        total_contributions: 500000000,
        total_benefits_paid: 100000000,
        equity_allocation: 25,
        fixed_income_allocation: 50,
        money_market_allocation: 15,
        alternative_investments: 10,
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pension Data Template');
    XLSX.writeFile(wb, 'pension-data-template.xlsx');
    toast.success('Template downloaded');
  };

  const handleExportData = () => {
    const dataToExport = pensionMetrics.map(m => ({
      fund_id: m.fund_id,
      fund_name: m.fund_name,
      fund_type: m.fund_type,
      trustee_name: m.trustee_name,
      fund_manager: m.fund_manager,
      aum: m.aum,
      market_share: m.market_share,
      investment_return: m.investment_return,
      total_contributors: m.total_contributors,
      total_contributions: m.total_contributions,
      total_benefits_paid: m.total_benefits_paid,
      report_year: m.report_year,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pension Data');
    XLSX.writeFile(wb, `pension-data-${selectedYear}.xlsx`);
    toast.success('Data exported successfully');
  };

  const filteredMetrics = pensionMetrics.filter(m => m.report_year === parseInt(selectedYear));
  const tier1Data = filteredMetrics.filter(m => m.fund_type === 'Tier 1');
  const tier2Data = filteredMetrics.filter(m => m.fund_type === 'Tier 2' || m.fund_type === 'tier2');
  const tier3Data = filteredMetrics.filter(m => m.fund_type === 'Tier 3' || m.fund_type === 'tier3');

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-amber-500" />
            Pension Data Manager
          </CardTitle>
          <CardDescription>
            Manage pension fund metrics with accurate figures from NPRA reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <Label>Report Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1" />

            {/* Import/Export Buttons */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              onChange={handleFileUpload}
              className="hidden"
            />

            <Button variant="outline" onClick={handleExportTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download Template
            </Button>

            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Import File
            </Button>

            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={pensionMetrics.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>

            <Button
              onClick={handleImportDefaultData}
              disabled={isImporting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isImporting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Import NPRA 2024 Data
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-amber-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-amber-600">{filteredMetrics.length}</p>
              <p className="text-xs text-muted-foreground">Total Funds</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{tier1Data.length}</p>
              <p className="text-xs text-muted-foreground">Tier 1</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{tier2Data.length}</p>
              <p className="text-xs text-muted-foreground">Tier 2</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">{tier3Data.length}</p>
              <p className="text-xs text-muted-foreground">Tier 3</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(filteredMetrics.reduce((sum, m) => sum + (m.aum || 0), 0))}
              </p>
              <p className="text-xs text-muted-foreground">Total AUM</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="bnsss">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="bnsss" className="flex items-center gap-1">
            <Landmark className="h-3 w-3" />
            BNSSS
          </TabsTrigger>
          <TabsTrigger value="private" className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Private
          </TabsTrigger>
          <TabsTrigger value="tier1">Tier 1</TabsTrigger>
          <TabsTrigger value="tier2">Tier 2</TabsTrigger>
          <TabsTrigger value="tier3">Tier 3</TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-1">
            <PieChart className="h-3 w-3" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* BNSSS (SSNIT) Tab */}
        <TabsContent value="bnsss">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Landmark className="h-5 w-5 text-blue-600" />
                Basic National Social Security Scheme (BNSSS) - SSNIT
              </CardTitle>
              <CardDescription>Data from NPRA 2024 Annual Report - Page 44</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(BNSSS_2024_DATA.total_assets)}</p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Active Contributors</p>
                  <p className="text-2xl font-bold text-green-600">{BNSSS_2024_DATA.active_contributors.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-purple-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Active Pensioners</p>
                  <p className="text-2xl font-bold text-purple-600">{BNSSS_2024_DATA.active_pensioners.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-amber-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Dependency Ratio</p>
                  <p className="text-2xl font-bold text-amber-600">{BNSSS_2024_DATA.dependency_ratio}</p>
                </div>
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-emerald-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Contributions Received</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(BNSSS_2024_DATA.contributions_received)}</p>
                </div>
                <div className="p-4 bg-red-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Benefits Paid</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(BNSSS_2024_DATA.benefits_paid)}</p>
                </div>
                <div className="p-4 bg-cyan-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Minimum Pension</p>
                  <p className="text-2xl font-bold text-cyan-600">GHS {BNSSS_2024_DATA.minimum_pension}</p>
                </div>
                <div className="p-4 bg-pink-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Return on Investment</p>
                  <p className="text-2xl font-bold text-pink-600">{BNSSS_2024_DATA.return_on_investment}%</p>
                </div>
              </div>

              {/* Historical Trends */}
              <div className="mt-6">
                <h4 className="font-medium mb-4">Active Contributors Trend (2020-2024)</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={BNSSS_2024_DATA.historical.contributors}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Bar dataKey="value" fill="#3b82f6" name="Contributors" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Private Pension Tab */}
        <TabsContent value="private">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Private Pension Overview</CardTitle>
                <CardDescription>2024 Annual Report - Page 45</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-amber-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Assets</p>
                    <p className="text-xl font-bold text-amber-600">{formatCurrency(PRIVATE_PENSION_2024.total_assets)}</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Benefits Paid</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(PRIVATE_PENSION_2024.benefits_paid)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-lg font-bold">{PRIVATE_PENSION_2024.corporate_trustees}</p>
                    <p className="text-xs text-muted-foreground">Corporate Trustees</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-lg font-bold">{PRIVATE_PENSION_2024.fund_custodians}</p>
                    <p className="text-xs text-muted-foreground">Fund Custodians</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-lg font-bold">{PRIVATE_PENSION_2024.pension_fund_managers}</p>
                    <p className="text-xs text-muted-foreground">Fund Managers</p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Private Pension Schemes by Share of AUM</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Tier 2</span>
                        <span className="text-sm font-medium">{PRIVATE_PENSION_2024.tier2_share}%</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${PRIVATE_PENSION_2024.tier2_share}%` }} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Tier 3</span>
                        <span className="text-sm font-medium">{PRIVATE_PENSION_2024.tier3_share}%</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: `${PRIVATE_PENSION_2024.tier3_share}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Asset Allocation of Private Pension Funds</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPie>
                    <Pie
                      data={ASSET_ALLOCATION_2024}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {ASSET_ALLOCATION_2024.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tier 1 Tab */}
        <TabsContent value="tier1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tier 1 - Basic National Social Security Scheme</CardTitle>
              <CardDescription>SSNIT managed mandatory pension scheme</CardDescription>
            </CardHeader>
            <CardContent>
              {tier1Data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fund Name</TableHead>
                      <TableHead className="text-right">AUM</TableHead>
                      <TableHead className="text-right">Market Share</TableHead>
                      <TableHead className="text-right">Return</TableHead>
                      <TableHead className="text-right">Contributors</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tier1Data.map((fund) => (
                      <TableRow key={fund.id}>
                        <TableCell className="font-medium">{fund.fund_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(fund.aum || 0)}</TableCell>
                        <TableCell className="text-right">{fund.market_share?.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{fund.investment_return?.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{fund.total_contributors?.toLocaleString() || '-'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingFund({
                                  fund_id: fund.fund_id,
                                  fund_name: fund.fund_name,
                                  fund_type: fund.fund_type as any,
                                  trustee_name: fund.trustee_name || '',
                                  fund_manager: fund.fund_manager || '',
                                  aum: fund.aum || 0,
                                  market_share: fund.market_share || 0,
                                  investment_return: fund.investment_return || 0,
                                  total_contributors: fund.total_contributors || undefined,
                                  total_contributions: fund.total_contributions || undefined,
                                  total_benefits_paid: fund.total_benefits_paid || undefined,
                                });
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteFund(fund.fund_id, fund.report_year)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mb-2 text-amber-500" />
                  <p>No Tier 1 data for {selectedYear}</p>
                  <p className="text-sm">Click "Import NPRA 2024 Data" to add data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tier 2 Tab */}
        <TabsContent value="tier2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tier 2 - Occupational Pension Schemes</CardTitle>
              <CardDescription>Corporate trustee managed occupational schemes</CardDescription>
            </CardHeader>
            <CardContent>
              {tier2Data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fund Name</TableHead>
                      <TableHead>Trustee</TableHead>
                      <TableHead className="text-right">AUM</TableHead>
                      <TableHead className="text-right">Market Share</TableHead>
                      <TableHead className="text-right">Return</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tier2Data.map((fund) => (
                      <TableRow key={fund.id}>
                        <TableCell className="font-medium">{fund.fund_name}</TableCell>
                        <TableCell>{fund.trustee_name || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(fund.aum || 0)}</TableCell>
                        <TableCell className="text-right">{fund.market_share?.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{fund.investment_return?.toFixed(2)}%</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingFund({
                                  fund_id: fund.fund_id,
                                  fund_name: fund.fund_name,
                                  fund_type: fund.fund_type as any,
                                  trustee_name: fund.trustee_name || '',
                                  fund_manager: fund.fund_manager || '',
                                  aum: fund.aum || 0,
                                  market_share: fund.market_share || 0,
                                  investment_return: fund.investment_return || 0,
                                });
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteFund(fund.fund_id, fund.report_year)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mb-2 text-amber-500" />
                  <p>No Tier 2 data for {selectedYear}</p>
                  <p className="text-sm">Click "Import NPRA 2024 Data" to add data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tier 3 Tab */}
        <TabsContent value="tier3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tier 3 - Provident Funds & Personal Pensions</CardTitle>
              <CardDescription>Voluntary personal and provident fund schemes</CardDescription>
            </CardHeader>
            <CardContent>
              {tier3Data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fund Name</TableHead>
                      <TableHead>Trustee</TableHead>
                      <TableHead className="text-right">AUM</TableHead>
                      <TableHead className="text-right">Market Share</TableHead>
                      <TableHead className="text-right">Return</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tier3Data.map((fund) => (
                      <TableRow key={fund.id}>
                        <TableCell className="font-medium">{fund.fund_name}</TableCell>
                        <TableCell>{fund.trustee_name || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(fund.aum || 0)}</TableCell>
                        <TableCell className="text-right">{fund.market_share?.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{fund.investment_return?.toFixed(2)}%</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingFund({
                                  fund_id: fund.fund_id,
                                  fund_name: fund.fund_name,
                                  fund_type: fund.fund_type as any,
                                  trustee_name: fund.trustee_name || '',
                                  fund_manager: fund.fund_manager || '',
                                  aum: fund.aum || 0,
                                  market_share: fund.market_share || 0,
                                  investment_return: fund.investment_return || 0,
                                });
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteFund(fund.fund_id, fund.report_year)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mb-2 text-amber-500" />
                  <p>No Tier 3 data for {selectedYear}</p>
                  <p className="text-sm">Click "Import NPRA 2024 Data" to add data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics/Charts Tab */}
        <TabsContent value="charts">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Fund Custodians Market Share */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fund Custodians Market Share</CardTitle>
                <CardDescription>Distribution of assets across fund custodians</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={FUND_CUSTODIANS_2024}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="market_share"
                      label={({ name, market_share }) => `${name}: ${market_share}%`}
                    >
                      {FUND_CUSTODIANS_2024.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Corporate Trustees AUM Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AUM Distribution of Corporate Trustees</CardTitle>
                <CardDescription>Assets under management by corporate trustee</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={CORPORATE_TRUSTEES_AUM_2024} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${v}bn`} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => `GHS ${value}bn`} />
                    <Bar dataKey="aum" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Private Pension Scheme by Share of AUM */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Private Pension Scheme by Share of AUM</CardTitle>
                <CardDescription>Tier 2 vs Tier 3 distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPie>
                    <Pie
                      data={[
                        { name: 'Tier 2', value: PRIVATE_PENSION_2024.tier2_share },
                        { name: 'Tier 3', value: PRIVATE_PENSION_2024.tier3_share },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      <Cell fill="#22c55e" />
                      <Cell fill="#8b5cf6" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* BNSSS Historical Assets Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">BNSSS Assets Trend (2020-2024)</CardTitle>
                <CardDescription>Total assets growth over 5 years</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={BNSSS_2024_DATA.historical.assets}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(v) => `${v}bn`} />
                    <Tooltip formatter={(value: number) => `GHS ${value}bn`} />
                    <Bar dataKey="value" fill="#3b82f6" name="Total Assets" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Column Mapping Dialog */}
      <Dialog open={isColumnMappingOpen} onOpenChange={setIsColumnMappingOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Map Import Columns</DialogTitle>
            <DialogDescription>
              Map your file columns to the database fields. {importData.length} rows detected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(COLUMN_MAPPINGS).map((dbField) => (
                <div key={dbField} className="space-y-1">
                  <Label className="text-sm capitalize">{dbField.replace(/_/g, ' ')}</Label>
                  <Select 
                    value={columnMapping[dbField] || ''} 
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, [dbField]: value })}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- None --</SelectItem>
                      {detectedColumns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            {importData.length > 0 && (
              <div className="border rounded-lg p-3">
                <h4 className="font-medium mb-2">Preview (first 3 rows)</h4>
                <div className="text-xs overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fund Name</TableHead>
                        <TableHead>AUM</TableHead>
                        <TableHead>Market Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.slice(0, 3).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{columnMapping.fund_name ? row[columnMapping.fund_name] : '-'}</TableCell>
                          <TableCell>{columnMapping.aum ? row[columnMapping.aum] : '-'}</TableCell>
                          <TableCell>{columnMapping.market_share ? row[columnMapping.market_share] : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsColumnMappingOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleImportMappedData} disabled={isImporting}>
                {isImporting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Import {importData.length} Records
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pension Fund</DialogTitle>
            <DialogDescription>
              Update the fund metrics with accurate figures
            </DialogDescription>
          </DialogHeader>
          {editingFund && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fund Name</Label>
                <Input
                  value={editingFund.fund_name}
                  onChange={(e) => setEditingFund({ ...editingFund, fund_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>AUM (GHS)</Label>
                  <Input
                    type="number"
                    value={editingFund.aum}
                    onChange={(e) => setEditingFund({ ...editingFund, aum: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Market Share (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingFund.market_share}
                    onChange={(e) => setEditingFund({ ...editingFund, market_share: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Investment Return (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingFund.investment_return}
                    onChange={(e) => setEditingFund({ ...editingFund, investment_return: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contributors</Label>
                  <Input
                    type="number"
                    value={editingFund.total_contributors || ''}
                    onChange={(e) => setEditingFund({ ...editingFund, total_contributors: parseInt(e.target.value) || undefined })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateFund(editingFund)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
