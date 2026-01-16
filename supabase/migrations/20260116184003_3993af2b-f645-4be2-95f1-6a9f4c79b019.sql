-- Create site_settings table for configurable site options
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT NOT NULL DEFAULT 'text',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings (for displaying logo/name)
CREATE POLICY "Anyone can view site settings" 
ON public.site_settings 
FOR SELECT 
USING (true);

-- Service role can manage settings
CREATE POLICY "Service role can manage site settings" 
ON public.site_settings 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insert default settings
INSERT INTO public.site_settings (setting_key, setting_value, setting_type, description) VALUES
('site_name', 'InsuraWatch', 'text', 'The name displayed next to the logo'),
('site_tagline', 'Ghana Insurance Intelligence', 'text', 'Tagline shown under the site name'),
('logo_url', '/enterprise-life-logo.png', 'image', 'URL of the site logo');

-- Add trigger for updated_at
CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();