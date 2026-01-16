-- Add color_theme setting for alternating between Enterprise Group and Enterprise Life themes
INSERT INTO public.site_settings (setting_key, setting_value, setting_type, description)
VALUES ('color_theme', 'enterprise_life', 'string', 'Color theme: enterprise_life (green) or enterprise_group (maroon)')
ON CONFLICT (setting_key) DO NOTHING;