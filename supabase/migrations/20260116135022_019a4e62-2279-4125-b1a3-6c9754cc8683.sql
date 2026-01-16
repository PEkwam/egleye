-- Drop the constraint that was just added (if it exists)
ALTER TABLE public.news_articles DROP CONSTRAINT IF EXISTS news_articles_category_check;

-- Add temporary constraint that includes BOTH motor and nonlife
ALTER TABLE public.news_articles ADD CONSTRAINT news_articles_category_check 
CHECK (category = ANY (ARRAY['general'::text, 'enterprise_group'::text, 'regulator'::text, 'claims'::text, 'life_insurance'::text, 'motor'::text, 'nonlife'::text, 'pensions'::text]));

-- Update existing motor articles to nonlife
UPDATE public.news_articles SET category = 'nonlife' WHERE category = 'motor';

-- Now drop the temporary constraint
ALTER TABLE public.news_articles DROP CONSTRAINT news_articles_category_check;

-- Add final constraint without motor
ALTER TABLE public.news_articles ADD CONSTRAINT news_articles_category_check 
CHECK (category = ANY (ARRAY['general'::text, 'enterprise_group'::text, 'regulator'::text, 'claims'::text, 'life_insurance'::text, 'nonlife'::text, 'pensions'::text]));