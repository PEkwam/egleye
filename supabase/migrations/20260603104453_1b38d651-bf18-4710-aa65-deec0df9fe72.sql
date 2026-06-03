ALTER TABLE public.news_sources
  ADD COLUMN IF NOT EXISTS consecutive_errors integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_eligible_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_news_sources_enabled_next_eligible
  ON public.news_sources (is_enabled, next_eligible_at);
