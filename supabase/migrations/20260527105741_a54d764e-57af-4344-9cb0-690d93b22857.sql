
-- Public-read tables (have permissive SELECT policy for everyone)
GRANT SELECT ON public.broker_metrics TO anon, authenticated;
GRANT ALL ON public.broker_metrics TO service_role;

GRANT SELECT ON public.insurer_id_mappings TO anon, authenticated;
GRANT ALL ON public.insurer_id_mappings TO service_role;

GRANT SELECT ON public.insurer_logos TO anon, authenticated;
GRANT ALL ON public.insurer_logos TO service_role;

GRANT SELECT ON public.insurer_metrics TO anon, authenticated;
GRANT ALL ON public.insurer_metrics TO service_role;

GRANT SELECT ON public.insurers TO anon, authenticated;
GRANT ALL ON public.insurers TO service_role;

GRANT SELECT ON public.news_articles TO anon, authenticated;
GRANT ALL ON public.news_articles TO service_role;

GRANT SELECT ON public.nonlife_insurer_metrics TO anon, authenticated;
GRANT ALL ON public.nonlife_insurer_metrics TO service_role;

GRANT SELECT ON public.pension_fund_metrics TO anon, authenticated;
GRANT ALL ON public.pension_fund_metrics TO service_role;

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

-- Service-role-only tables (no anon/authenticated access by policy)
GRANT ALL ON public.news_subscriber_sends TO service_role;
GRANT ALL ON public.news_subscribers TO service_role;
GRANT ALL ON public.push_subscriptions TO service_role;
