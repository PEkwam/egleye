-- Create insurer ID mapping table to sync frontend IDs with database records
CREATE TABLE public.insurer_id_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  frontend_id TEXT NOT NULL,
  db_insurer_id TEXT,
  db_insurer_name TEXT,
  db_fund_id TEXT,
  db_fund_name TEXT,
  category TEXT NOT NULL CHECK (category IN ('life', 'nonlife', 'pension')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(frontend_id, category)
);

-- Enable RLS
ALTER TABLE public.insurer_id_mappings ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view insurer mappings"
  ON public.insurer_id_mappings
  FOR SELECT
  USING (true);

-- Service role can manage mappings
CREATE POLICY "Service role can manage mappings"
  ON public.insurer_id_mappings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_insurer_id_mappings_updated_at
  BEFORE UPDATE ON public.insurer_id_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_insurer_mappings_frontend_id ON public.insurer_id_mappings(frontend_id);
CREATE INDEX idx_insurer_mappings_category ON public.insurer_id_mappings(category);