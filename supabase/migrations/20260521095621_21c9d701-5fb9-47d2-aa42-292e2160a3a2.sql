-- Remove duplicate permissive storage policies on insurer-logos that lacked service_role check
DROP POLICY IF EXISTS "Service role can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete logos" ON storage.objects;

-- Restrict pension-reports bucket policy to service role only
DROP POLICY IF EXISTS "Service role can manage pension reports" ON storage.objects;
CREATE POLICY "Service role can manage pension reports"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'pension-reports')
WITH CHECK (bucket_id = 'pension-reports');

-- Also remove the duplicate public-read policy on insurer-logos (keep one)
DROP POLICY IF EXISTS "Anyone can view insurer logos" ON storage.objects;