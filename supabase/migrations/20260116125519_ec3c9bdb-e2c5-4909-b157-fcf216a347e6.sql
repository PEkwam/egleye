-- First drop the old constraint
ALTER TABLE public.insurers DROP CONSTRAINT IF EXISTS insurers_category_check;

-- Add new constraint that includes both motor and nonlife temporarily
ALTER TABLE public.insurers ADD CONSTRAINT insurers_category_check 
CHECK (category = ANY (ARRAY['life'::text, 'motor'::text, 'nonlife'::text, 'pension'::text]));

-- Update existing motor records to nonlife
UPDATE public.insurers SET category = 'nonlife' WHERE category = 'motor';

-- Drop the constraint again
ALTER TABLE public.insurers DROP CONSTRAINT insurers_category_check;

-- Add final constraint without motor
ALTER TABLE public.insurers ADD CONSTRAINT insurers_category_check 
CHECK (category = ANY (ARRAY['life'::text, 'nonlife'::text, 'pension'::text]));