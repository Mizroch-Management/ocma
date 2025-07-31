-- Create workflow persistence tables for autosave functionality
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL DEFAULT 'ai_workflow',
  title TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  current_step INTEGER NOT NULL DEFAULT 0,
  strategy_data JSONB,
  plans_data JSONB,
  content_data JSONB,
  progress_data JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Create policies for workflow access
CREATE POLICY "Users can view their own workflows" 
ON public.workflows 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflows" 
ON public.workflows 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows" 
ON public.workflows 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows" 
ON public.workflows 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX idx_workflows_updated_at ON public.workflows(updated_at);

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION public.update_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_saved_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_workflows_updated_at();