-- Create table for storing generated content
CREATE TABLE public.generated_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL,
  strategy TEXT,
  platforms TEXT[],
  ai_tool TEXT,
  variations JSONB DEFAULT '[]'::jsonb,
  suggestions JSONB DEFAULT '[]'::jsonb,
  hashtags TEXT[],
  platform_optimizations JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  scheduling_suggestions JSONB DEFAULT '[]'::jsonb,
  is_scheduled BOOLEAN DEFAULT false,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  scheduled_platforms TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own generated content" 
ON public.generated_content 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generated content" 
ON public.generated_content 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated content" 
ON public.generated_content 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated content" 
ON public.generated_content 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_generated_content_updated_at
BEFORE UPDATE ON public.generated_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();