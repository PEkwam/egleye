UPDATE public.news_sources
SET consecutive_errors = 0,
    next_eligible_at = now(),
    last_error = NULL,
    last_status = NULL
WHERE is_enabled = true
  AND consecutive_errors > 0
  AND consecutive_errors < 10;