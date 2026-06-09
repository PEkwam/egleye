
DROP POLICY IF EXISTS "Service role manages archive" ON public.news_subscriber_sends_archive;

-- Service role bypasses RLS; authenticated admins read via edge function (service role).
-- No anon access.

REVOKE EXECUTE ON FUNCTION public.archive_old_subscriber_sends() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.archive_old_subscriber_sends() FROM anon;
REVOKE EXECUTE ON FUNCTION public.archive_old_subscriber_sends() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.archive_old_subscriber_sends() TO service_role;
