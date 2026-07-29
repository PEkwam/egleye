DELETE FROM public.news_subscriber_sends WHERE article_id IN (
  SELECT id FROM public.news_articles
  WHERE coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(content,'')
    !~* '(insur|assur|reinsur|underwrit|actuar|policyholder|annuit|endowment|bancassur|microinsur|takaful|indemnity|solvency|pension|ssnit|npra|provident fund|trustee)'
);
DELETE FROM public.news_articles
WHERE coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(content,'')
  !~* '(insur|assur|reinsur|underwrit|actuar|policyholder|annuit|endowment|bancassur|microinsur|takaful|indemnity|solvency|pension|ssnit|npra|provident fund|trustee)';
UPDATE public.news_subscriber_sends SET status = 'cancelled', updated_at = now()
WHERE status = 'pending' AND article_id IN (
  SELECT id FROM public.news_articles WHERE category = 'pensions'
     OR coalesce(title,'') || ' ' || coalesce(description,'') ~* '(pension|npra|ssnit|provident fund)'
);