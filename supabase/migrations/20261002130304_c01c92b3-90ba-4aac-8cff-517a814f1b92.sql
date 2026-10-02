CREATE TABLE public.regulatory_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulator text NOT NULL,
  title text NOT NULL,
  summary text,
  source_url text NOT NULL UNIQUE,
  source_name text,
  published_at timestamptz,
  impact_level text NOT NULL DEFAULT 'medium',
  business_impact text,
  affected_units text[] NOT NULL DEFAULT '{}',
  action_items text[] NOT NULL DEFAULT '{}',
  deadline text,
  analyzed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.regulatory_updates TO anon, authenticated;
GRANT ALL ON public.regulatory_updates TO service_role;
ALTER TABLE public.regulatory_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view regulatory updates" ON public.regulatory_updates FOR SELECT USING (true);
CREATE INDEX idx_reg_updates_pub ON public.regulatory_updates (published_at DESC);
CREATE TRIGGER update_regulatory_updates_updated_at BEFORE UPDATE ON public.regulatory_updates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

SELECT cron.schedule(
  'regulatory-scanner-6h',
  '20 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sodvlktbvqaxuxnpgbzb.supabase.co/functions/v1/regulatory-scanner',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvZHZsa3RidnFheHV4bnBnYnpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTA4ODYsImV4cCI6MjA4NDEyNjg4Nn0.XmU59cjRY6pPcJuqBdzqFhDSLu5xyoWKQuE391Q-n4k", "x-cron-secret": "0nQDeCRNJLAfN6TwjAXioFb3jrNit1nI9d5sDJ1NxGGrqEIE"}'::jsonb,
    body := jsonb_build_object('action', 'scan')
  );
  $$
);