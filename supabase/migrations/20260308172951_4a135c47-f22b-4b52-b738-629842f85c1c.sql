INSERT INTO storage.buckets (id, name, public)
VALUES ('pension-reports', 'pension-reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Service role can manage pension reports"
ON storage.objects FOR ALL
USING (bucket_id = 'pension-reports')
WITH CHECK (bucket_id = 'pension-reports');