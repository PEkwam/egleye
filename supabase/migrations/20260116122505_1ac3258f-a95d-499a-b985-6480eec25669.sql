-- Add years_in_ghana column to nonlife_insurer_metrics table
ALTER TABLE public.nonlife_insurer_metrics 
ADD COLUMN IF NOT EXISTS years_in_ghana integer DEFAULT 0;

-- Add years_in_ghana column to pension_fund_metrics table
ALTER TABLE public.pension_fund_metrics 
ADD COLUMN IF NOT EXISTS years_in_ghana integer DEFAULT 0;