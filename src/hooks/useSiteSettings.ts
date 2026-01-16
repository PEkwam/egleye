import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SiteSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  setting_type: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useSiteSettings() {
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading, error } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('setting_key');
      
      if (error) throw error;
      return data as SiteSetting[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const getSetting = (key: string): string => {
    const setting = settings.find(s => s.setting_key === key);
    return setting?.setting_value || '';
  };

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('site_settings')
        .update({ setting_value: value })
        .eq('setting_key', key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });

  const colorTheme = getSetting('color_theme') || 'enterprise_life';
  
  // Dynamic logo based on color theme
  const themeLogoUrl = colorTheme === 'enterprise_group' 
    ? '/logos/enterprise-group.jpg' 
    : '/enterprise-life-logo.png';

  return {
    settings,
    isLoading,
    error,
    getSetting,
    siteName: getSetting('site_name') || 'InsuraWatch',
    siteTagline: getSetting('site_tagline') || 'Ghana Insurance Intelligence',
    logoUrl: themeLogoUrl,
    colorTheme,
    updateSetting: updateSettingMutation.mutate,
    isUpdating: updateSettingMutation.isPending,
  };
}
