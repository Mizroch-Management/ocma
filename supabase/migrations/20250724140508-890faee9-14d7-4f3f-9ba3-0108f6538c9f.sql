-- Create table for publication logs
CREATE TABLE public.publication_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.generated_content(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  published_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  platform_post_id TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.publication_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for publication logs
CREATE POLICY "Users can view their own publication logs" 
ON public.publication_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.generated_content 
    WHERE generated_content.id = publication_logs.content_id 
    AND generated_content.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage publication logs" 
ON public.publication_logs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add publication status to generated_content table
ALTER TABLE public.generated_content 
ADD COLUMN publication_status TEXT DEFAULT 'draft' CHECK (publication_status IN ('draft', 'scheduled', 'publishing', 'published', 'failed'));

-- Create index for scheduled content queries
CREATE INDEX idx_generated_content_scheduled ON public.generated_content(scheduled_date, is_scheduled, publication_status) 
WHERE is_scheduled = true AND publication_status IN ('scheduled', 'publishing');