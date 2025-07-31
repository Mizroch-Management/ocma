-- Add business_info_data column to workflows table
ALTER TABLE public.workflows 
ADD COLUMN business_info_data JSONB;