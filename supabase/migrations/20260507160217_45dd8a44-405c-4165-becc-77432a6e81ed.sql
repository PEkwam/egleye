
-- Push subscription registry
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  audience text NOT NULL DEFAULT 'public', -- 'public' | 'admin'
  subscriber_id uuid REFERENCES public.news_subscribers(id) ON DELETE SET NULL,
  label text,
  user_agent text,
  is_active boolean NOT NULL DEFAULT true,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can register their own device
CREATE POLICY "Anyone can register a push subscription"
  ON public.push_subscriptions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Anyone can remove their device by endpoint match (handled via edge function)
CREATE POLICY "Service role manages push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions (is_active);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_audience ON public.push_subscriptions (audience);

CREATE TRIGGER trg_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- VAPID key holders (auto-populated on first use by edge function)
INSERT INTO public.site_settings (setting_key, setting_value, setting_type, description)
VALUES
  ('vapid_public_key', NULL, 'text', 'VAPID public key for Web Push (safe to expose)'),
  ('vapid_private_key', NULL, 'text', 'VAPID private key for Web Push (server-only)'),
  ('vapid_subject', 'mailto:admin@egleye.app', 'text', 'VAPID contact subject for Web Push')
ON CONFLICT (setting_key) DO NOTHING;

-- Public can read only the public key
DROP POLICY IF EXISTS "Public can view safe settings" ON public.site_settings;
CREATE POLICY "Public can view safe settings"
  ON public.site_settings
  FOR SELECT
  TO public
  USING (
    setting_key = ANY (ARRAY[
      'site_name','site_tagline','logo_url','color_theme',
      'news_include_keywords','news_exclude_keywords',
      'vapid_public_key'
    ])
  );
