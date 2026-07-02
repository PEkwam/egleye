SELECT cron.unschedule('crawl-insurance-news-15min');
SELECT cron.schedule(
  'crawl-insurance-news-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sodvlktbvqaxuxnpgbzb.supabase.co/functions/v1/crawl-insurance-news',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvZHZsa3RidnFheHV4bnBnYnpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTA4ODYsImV4cCI6MjA4NDEyNjg4Nn0.XmU59cjRY6pPcJuqBdzqFhDSLu5xyoWKQuE391Q-n4k", "x-cron-secret": "0nQDeCRNJLAfN6TwjAXioFb3jrNit1nI9d5sDJ1NxGGrqEIE"}'::jsonb,
    body := jsonb_build_object('source', 'cron-15min', 'time', now())
  );
  $$
);

-- Mark old stuck "running" crawl rows as failed so the UI stops showing them.
UPDATE public.news_crawl_runs
SET status='failed', finished_at=now(), error_message='Auto-closed stale run (cron auth was blocked)'
WHERE status='running' AND started_at < now() - interval '1 hour';