
CREATE TABLE IF NOT EXISTS public.news_subscriber_sends_archive (
  id uuid PRIMARY KEY,
  subscriber_id uuid NOT NULL,
  article_id uuid NOT NULL,
  status text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  error_message text,
  message_id text,
  queued_at timestamptz NOT NULL,
  sent_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  week_start date NOT NULL
);

GRANT SELECT ON public.news_subscriber_sends_archive TO authenticated;
GRANT ALL ON public.news_subscriber_sends_archive TO service_role;

ALTER TABLE public.news_subscriber_sends_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages archive"
ON public.news_subscriber_sends_archive
FOR ALL
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sends_archive_week ON public.news_subscriber_sends_archive(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_sends_archive_created ON public.news_subscriber_sends_archive(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sends_archive_status ON public.news_subscriber_sends_archive(status);

CREATE OR REPLACE FUNCTION public.archive_old_subscriber_sends()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  moved_count integer := 0;
BEGIN
  WITH moved AS (
    DELETE FROM public.news_subscriber_sends
    WHERE created_at < now() - interval '7 days'
    RETURNING *
  )
  INSERT INTO public.news_subscriber_sends_archive
    (id, subscriber_id, article_id, status, attempts, error_message, message_id,
     queued_at, sent_at, failed_at, created_at, updated_at, week_start)
  SELECT id, subscriber_id, article_id, status, attempts, error_message, message_id,
         queued_at, sent_at, failed_at, created_at, updated_at,
         date_trunc('week', created_at)::date
  FROM moved
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS moved_count = ROW_COUNT;
  RETURN moved_count;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('archive-subscriber-sends-weekly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'archive-subscriber-sends-weekly',
  '0 2 * * 1',
  $$SELECT public.archive_old_subscriber_sends();$$
);
