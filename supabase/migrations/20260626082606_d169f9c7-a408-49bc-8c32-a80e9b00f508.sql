CREATE TABLE IF NOT EXISTS public.email_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('gmail','outlook','sendgrid','mailgun','smtp')),
  host text NOT NULL,
  port integer NOT NULL DEFAULT 587,
  secure boolean NOT NULL DEFAULT false,
  username text NOT NULL,
  password text NOT NULL,
  from_email text NOT NULL,
  from_name text NOT NULL DEFAULT '',
  reply_to text,
  is_active boolean NOT NULL DEFAULT true,
  last_verified_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.email_connections FROM anon, authenticated;
GRANT  ALL ON public.email_connections TO service_role;

ALTER TABLE public.email_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages email connections"
ON public.email_connections
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS email_connections_one_active
  ON public.email_connections ((is_active))
  WHERE is_active = true;

CREATE TRIGGER set_email_connections_updated_at
BEFORE UPDATE ON public.email_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();