CREATE TABLE public.news_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'general',
  source_label text NOT NULL,
  mode text NOT NULL DEFAULT 'general',
  is_local boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_status text,
  last_error text,
  articles_found_total integer NOT NULL DEFAULT 0,
  last_articles_found integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news_sources TO anon, authenticated;
GRANT ALL ON public.news_sources TO service_role;
ALTER TABLE public.news_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view news sources" ON public.news_sources FOR SELECT USING (true);
CREATE POLICY "Service role manages news sources" ON public.news_sources FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER trg_news_sources_updated_at BEFORE UPDATE ON public.news_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_news_sources_enabled ON public.news_sources(is_enabled, mode);

CREATE TABLE public.news_crawl_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  trigger_source text NOT NULL DEFAULT 'manual',
  mode text NOT NULL DEFAULT 'general',
  sources_run integer NOT NULL DEFAULT 0,
  articles_fetched integer NOT NULL DEFAULT 0,
  articles_kept integer NOT NULL DEFAULT 0,
  articles_inserted integer NOT NULL DEFAULT 0,
  duplicates_skipped integer NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news_crawl_runs TO anon, authenticated;
GRANT ALL ON public.news_crawl_runs TO service_role;
ALTER TABLE public.news_crawl_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view crawl runs" ON public.news_crawl_runs FOR SELECT USING (true);
CREATE POLICY "Service role manages crawl runs" ON public.news_crawl_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX idx_news_crawl_runs_started ON public.news_crawl_runs(started_at DESC);

INSERT INTO public.news_sources (name, url, category, source_label, mode, is_local) VALUES
('MyJoyOnline', 'https://www.myjoyonline.com/feed/', 'general', 'MyJoyOnline', 'general', true),
('MyJoyOnline Business', 'https://www.myjoyonline.com/business/feed/', 'general', 'MyJoyOnline Business', 'general', true),
('Graphic Online', 'https://www.graphic.com.gh/feed', 'general', 'Graphic Online', 'general', true),
('Graphic Business', 'https://www.graphic.com.gh/business/feed', 'general', 'Graphic Business', 'general', true),
('Citi Newsroom', 'https://citinewsroom.com/feed/', 'general', 'Citi Newsroom', 'general', true),
('Citi Business', 'https://citinewsroom.com/category/business/feed/', 'general', 'Citi Business', 'general', true),
('GhanaWeb', 'https://www.ghanaweb.com/GhanaHomePage/rss/rss.php', 'general', 'GhanaWeb', 'general', true),
('GhanaWeb Business', 'https://www.ghanaweb.com/GhanaHomePage/business/rss/rss.php', 'general', 'GhanaWeb Business', 'general', true),
('3News', 'https://3news.com/feed/', 'general', '3News', 'general', true),
('Modern Ghana', 'https://www.modernghana.com/rss/business.xml', 'general', 'Modern Ghana', 'general', true),
('B&FT Online', 'https://thebftonline.com/feed/', 'general', 'B&FT Online', 'general', true),
('Starr FM', 'https://starrfm.com.gh/feed/', 'general', 'Starr FM', 'general', true),
('Peace FM', 'https://www.peacefmonline.com/rss/rss.xml', 'general', 'Peace FM', 'general', true),
('Daily Graphic News', 'https://www.graphic.com.gh/news/feed', 'general', 'Daily Graphic News', 'general', true),
('Pulse Ghana', 'https://www.pulse.com.gh/rss', 'general', 'Pulse Ghana', 'general', true),
('Ghana News Agency', 'https://www.gna.org.gh/feed/', 'general', 'Ghana News Agency', 'general', true),
('Adom Online', 'https://www.adomonline.com/feed/', 'general', 'Adom Online', 'general', true),
('Class FM', 'https://classfmonline.com/feed', 'general', 'Class FM', 'general', true),
('Ghana Business News', 'https://www.ghanabusinessnews.com/feed/', 'general', 'Ghana Business News', 'general', true),
('Ghana Insurance Hub', 'https://www.ghanainsurancehub.com/feed/', 'general', 'Ghana Insurance Hub', 'general', true),
('Ghana Insurance Hub RSS', 'https://www.ghanainsurancehub.com/feed/rss/', 'general', 'Ghana Insurance Hub', 'general', true),
('Google News: ghana insurance', 'https://news.google.com/rss/search?q=ghana+insurance&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Google News', 'general', false),
('Google News: ghana life insurance', 'https://news.google.com/rss/search?q=ghana+life+insurance&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Google News', 'general', false),
('Google News: ghana insurance industry', 'https://news.google.com/rss/search?q=ghana+insurance+industry&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Google News', 'general', false),
('Google News: Enterprise Life Ghana', 'https://news.google.com/rss/search?q=Enterprise+Life+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'enterprise_group', 'Google News', 'general', false),
('Google News: Enterprise Insurance Ghana', 'https://news.google.com/rss/search?q=Enterprise+Insurance+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'enterprise_group', 'Google News', 'general', false),
('Google News: Enterprise Group Ghana insurance', 'https://news.google.com/rss/search?q=Enterprise+Group+Ghana+insurance&hl=en-GH&gl=GH&ceid=GH:en', 'enterprise_group', 'Google News', 'general', false),
('Google News: Enterprise Trustees Ghana', 'https://news.google.com/rss/search?q=Enterprise+Trustees+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'enterprise_group', 'Google News', 'general', false),
('Google News: Acacia Health Ghana', 'https://news.google.com/rss/search?q=Acacia+Health+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'enterprise_group', 'Google News', 'general', false),
('Google News: Enterprise Properties Ghana', 'https://news.google.com/rss/search?q=Enterprise+Properties+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'enterprise_group', 'Google News', 'general', false),
('Google News: Transitions Funeral Ghana', 'https://news.google.com/rss/search?q=Transitions+Funeral+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'enterprise_group', 'Google News', 'general', false),
('Google News: SIC Insurance Ghana', 'https://news.google.com/rss/search?q=SIC+Insurance+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Google News', 'general', false),
('Google News: Starlife Insurance Ghana', 'https://news.google.com/rss/search?q=Starlife+Insurance+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Google News', 'general', false),
('Google News: GLICO Ghana insurance', 'https://news.google.com/rss/search?q=GLICO+Ghana+insurance&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Google News', 'general', false),
('Google News: Prudential Life Ghana', 'https://news.google.com/rss/search?q=Prudential+Life+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Google News', 'general', false),
('Google News: Hollard Insurance Ghana', 'https://news.google.com/rss/search?q=Hollard+Insurance+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Google News', 'general', false),
('Google News: Old Mutual Ghana', 'https://news.google.com/rss/search?q=Old+Mutual+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Google News', 'general', false),
('Google News: Star Assurance Ghana', 'https://news.google.com/rss/search?q=Star+Assurance+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Google News', 'general', false),
('Google News: Metropolitan Life Ghana', 'https://news.google.com/rss/search?q=Metropolitan+Life+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Google News', 'general', false),
('Google News: National Insurance Commission Ghana', 'https://news.google.com/rss/search?q=National+Insurance+Commission+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'regulator', 'Google News', 'nic', false),
('Google News: NIC Ghana insurance', 'https://news.google.com/rss/search?q=NIC+Ghana+insurance&hl=en-GH&gl=GH&ceid=GH:en', 'regulator', 'Google News', 'nic', false),
('NIC Ghana: site nicgh.org', 'https://news.google.com/rss/search?q=site:nicgh.org&hl=en-GH&gl=GH&ceid=GH:en', 'regulator', 'NIC Ghana', 'nic', false),
('Google News: ghana insurance regulation', 'https://news.google.com/rss/search?q=ghana+insurance+regulation&hl=en-GH&gl=GH&ceid=GH:en', 'regulator', 'Google News', 'nic', false),
('Google News: ghana insurance circular directive', 'https://news.google.com/rss/search?q=ghana+insurance+circular+directive&hl=en-GH&gl=GH&ceid=GH:en', 'regulator', 'Google News', 'nic', false),
('Google News: ghana insurance license compliance', 'https://news.google.com/rss/search?q=ghana+insurance+license+compliance&hl=en-GH&gl=GH&ceid=GH:en', 'regulator', 'Google News', 'nic', false),
('Ghana Insurance Hub: site ghanainsurancehub.com', 'https://news.google.com/rss/search?q=site:ghanainsurancehub.com&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Ghana Insurance Hub', 'general', false),
('Africa Insurance Pulse: site africainsurancepulse.com ghana', 'https://news.google.com/rss/search?q=site:africainsurancepulse.com+ghana&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Africa Insurance Pulse', 'general', false),
('Ghana Reinsurance: site ghanare.com', 'https://news.google.com/rss/search?q=site:ghanare.com&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Ghana Reinsurance', 'general', false),
('Atlas Magazine: site atlas-mag.net ghana insurance', 'https://news.google.com/rss/search?q=site:atlas-mag.net+ghana+insurance&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Atlas Magazine', 'general', false),
('Accra Street Journal: site accrastreetjournal.com insurance', 'https://news.google.com/rss/search?q=site:accrastreetjournal.com+insurance&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Accra Street Journal', 'general', false),
('News Ghana: site newsghana.com.gh insurance', 'https://news.google.com/rss/search?q=site:newsghana.com.gh+insurance&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'News Ghana', 'general', false),
('African Insurance Org: site african-insurance.org ghana', 'https://news.google.com/rss/search?q=site:african-insurance.org+ghana&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'African Insurance Org', 'general', false),
('Google News: ghana reinsurance industry', 'https://news.google.com/rss/search?q=ghana+reinsurance+industry&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Google News', 'general', false),
('Google News: ghana insurance broker agent', 'https://news.google.com/rss/search?q=ghana+insurance+broker+agent&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Google News', 'general', false),
('Google News: ghana microinsurance bancassurance', 'https://news.google.com/rss/search?q=ghana+microinsurance+bancassurance&hl=en-GH&gl=GH&ceid=GH:en', 'general', 'Google News', 'general', false),
('Google News: ghana pension NPRA', 'https://news.google.com/rss/search?q=ghana+pension+NPRA&hl=en-GH&gl=GH&ceid=GH:en', 'pensions', 'Google News', 'pension', false),
('Google News: SSNIT Ghana', 'https://news.google.com/rss/search?q=SSNIT+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'pensions', 'Google News', 'pension', false),
('Google News: Ghana pension fund', 'https://news.google.com/rss/search?q=Ghana+pension+fund&hl=en-GH&gl=GH&ceid=GH:en', 'pensions', 'Google News', 'pension', false),
('Google News: Ghana pension regulator NPRA', 'https://news.google.com/rss/search?q=Ghana+pension+regulator+NPRA&hl=en-GH&gl=GH&ceid=GH:en', 'pensions', 'Google News', 'pension', false),
('Google News: National Pensions Regulatory Authority Ghana', 'https://news.google.com/rss/search?q=National+Pensions+Regulatory+Authority+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'pensions', 'Google News', 'pension', false),
('NPRA: site npra.gov.gh', 'https://news.google.com/rss/search?q=site:npra.gov.gh&hl=en-GH&gl=GH&ceid=GH:en', 'pensions', 'NPRA', 'pension', false),
('Google News: Ghana tier 2 pension', 'https://news.google.com/rss/search?q=Ghana+tier+2+pension&hl=en-GH&gl=GH&ceid=GH:en', 'pensions', 'Google News', 'pension', false),
('Google News: Ghana tier 3 pension provident', 'https://news.google.com/rss/search?q=Ghana+tier+3+pension+provident&hl=en-GH&gl=GH&ceid=GH:en', 'pensions', 'Google News', 'pension', false),
('Google News: GLICO Pensions Ghana', 'https://news.google.com/rss/search?q=GLICO+Pensions+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'pensions', 'Google News', 'pension', false),
('Google News: Pensions Alliance Trust Ghana', 'https://news.google.com/rss/search?q=Pensions+Alliance+Trust+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'pensions', 'Google News', 'pension', false),
('Google News: Petra Trust Ghana', 'https://news.google.com/rss/search?q=Petra+Trust+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'pensions', 'Google News', 'pension', false),
('Google News: Axis Pension Trust Ghana', 'https://news.google.com/rss/search?q=Axis+Pension+Trust+Ghana&hl=en-GH&gl=GH&ceid=GH:en', 'pensions', 'Google News', 'pension', false)
ON CONFLICT (url) DO NOTHING;