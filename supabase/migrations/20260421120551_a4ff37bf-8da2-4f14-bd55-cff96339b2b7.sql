-- News subscribers table for email alerts
CREATE TABLE public.news_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  frequency TEXT NOT NULL DEFAULT 'instant',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validate frequency value via trigger (avoids brittle CHECK constraints)
CREATE OR REPLACE FUNCTION public.validate_news_subscriber()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.frequency NOT IN ('instant', 'daily') THEN
    RAISE EXCEPTION 'frequency must be either "instant" or "daily"';
  END IF;
  NEW.email = lower(trim(NEW.email));
  IF NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid email address';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_news_subscriber_trigger
BEFORE INSERT OR UPDATE ON public.news_subscribers
FOR EACH ROW
EXECUTE FUNCTION public.validate_news_subscriber();

CREATE TRIGGER update_news_subscribers_updated_at
BEFORE UPDATE ON public.news_subscribers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS - subscriber emails are private; only service role can manage
ALTER TABLE public.news_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages subscribers"
ON public.news_subscribers
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for active-frequency queries used by the digest job
CREATE INDEX idx_news_subscribers_active_freq
ON public.news_subscribers (is_active, frequency)
WHERE is_active = true;