-- Add draft_data column to workflows table
ALTER TABLE public.workflows 
ADD COLUMN draft_data JSONB;