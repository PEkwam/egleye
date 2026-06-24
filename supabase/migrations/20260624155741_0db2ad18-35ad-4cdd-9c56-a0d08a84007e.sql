INSERT INTO public.news_subscriber_sends (subscriber_id, article_id, status)
SELECT s.id, 'e1e1a590-9486-44a5-a198-335ea81ca33c'::uuid, 'pending'
FROM public.news_subscribers s
WHERE s.is_active = true AND s.frequency = 'instant'
ON CONFLICT (subscriber_id, article_id) DO NOTHING;