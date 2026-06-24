
-- Fix Graphic feeds (Joomla query-string format works)
UPDATE public.news_sources SET url='https://www.graphic.com.gh/?format=feed&type=rss',
  last_error=NULL, last_status='pending', consecutive_errors=0, next_eligible_at=now()
 WHERE url='https://www.graphic.com.gh/feed';

UPDATE public.news_sources SET url='https://www.graphic.com.gh/news?format=feed&type=rss',
  last_error=NULL, last_status='pending', consecutive_errors=0, next_eligible_at=now()
 WHERE url='https://www.graphic.com.gh/news/feed';

UPDATE public.news_sources SET url='https://www.graphic.com.gh/business?format=feed&type=rss',
  last_error=NULL, last_status='pending', consecutive_errors=0, next_eligible_at=now()
 WHERE url='https://www.graphic.com.gh/business/feed';

-- Class FM no longer publishes RSS — disable
UPDATE public.news_sources SET is_enabled=false,
  last_error='Source has no RSS feed (site migration); disabled'
 WHERE url='https://classfmonline.com/feed';
