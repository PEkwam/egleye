
-- Restrict site_settings to only expose known safe keys publicly
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;

CREATE POLICY "Public can view safe settings" ON public.site_settings
FOR SELECT
USING (setting_key IN (
  'site_name',
  'site_tagline',
  'logo_url',
  'color_theme',
  'news_include_keywords',
  'news_exclude_keywords'
));

-- Add storage policies to restrict insurer-logos bucket uploads
-- Only allow public reads, block anonymous/authenticated writes
CREATE POLICY "Insurer logos are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'insurer-logos');

CREATE POLICY "Only service role can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'insurer-logos' AND (SELECT auth.role()) = 'service_role');

CREATE POLICY "Only service role can update logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'insurer-logos' AND (SELECT auth.role()) = 'service_role');

CREATE POLICY "Only service role can delete logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'insurer-logos' AND (SELECT auth.role()) = 'service_role');
