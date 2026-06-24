DROP POLICY IF EXISTS "Public can view crawl runs" ON public.news_crawl_runs;
DROP POLICY IF EXISTS "Public can view news sources" ON public.news_sources;
REVOKE SELECT ON public.news_crawl_runs FROM anon, authenticated;
REVOKE SELECT ON public.news_sources FROM anon, authenticated;