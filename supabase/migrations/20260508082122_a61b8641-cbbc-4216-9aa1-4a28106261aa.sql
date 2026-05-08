
-- Restrict permissive "Service role" policies to the service_role only.
-- Previously these were applied to PUBLIC, granting anon/authenticated users full write access.

DROP POLICY IF EXISTS "Service role can manage articles" ON public.news_articles;
CREATE POLICY "Service role can manage articles" ON public.news_articles
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage broker metrics" ON public.broker_metrics;
CREATE POLICY "Service role can manage broker metrics" ON public.broker_metrics
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage metrics" ON public.insurer_metrics;
CREATE POLICY "Service role can manage metrics" ON public.insurer_metrics
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage nonlife metrics" ON public.nonlife_insurer_metrics;
CREATE POLICY "Service role can manage nonlife metrics" ON public.nonlife_insurer_metrics
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage pension metrics" ON public.pension_fund_metrics;
CREATE POLICY "Service role can manage pension metrics" ON public.pension_fund_metrics
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage mappings" ON public.insurer_id_mappings;
CREATE POLICY "Service role can manage mappings" ON public.insurer_id_mappings
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage site settings" ON public.site_settings;
CREATE POLICY "Service role can manage site settings" ON public.site_settings
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages subscribers" ON public.news_subscribers;
CREATE POLICY "Service role manages subscribers" ON public.news_subscribers
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages subscriber sends" ON public.news_subscriber_sends;
CREATE POLICY "Service role manages subscriber sends" ON public.news_subscriber_sends
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role manages push subscriptions" ON public.push_subscriptions
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
