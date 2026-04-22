CREATE TABLE IF NOT EXISTS public.news_subscriber_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES public.news_subscribers(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  error_message text,
  message_id text,
  queued_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT news_subscriber_sends_unique UNIQUE (subscriber_id, article_id),
  CONSTRAINT news_subscriber_sends_status_check
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped'))
);

CREATE INDEX IF NOT EXISTS idx_news_subscriber_sends_subscriber
  ON public.news_subscriber_sends (subscriber_id);
CREATE INDEX IF NOT EXISTS idx_news_subscriber_sends_status
  ON public.news_subscriber_sends (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_subscriber_sends_article
  ON public.news_subscriber_sends (article_id);

ALTER TABLE public.news_subscriber_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages subscriber sends"
  ON public.news_subscriber_sends
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_news_subscriber_sends_updated_at
  BEFORE UPDATE ON public.news_subscriber_sends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();