-- Create system_settings table for platform integrations and API keys
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only owners can view and manage system settings
CREATE POLICY "Only owners can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default platform settings (all disconnected initially)
INSERT INTO public.system_settings (setting_key, setting_value, category, description) VALUES 
('facebook_integration', '{"connected": false, "credentials": {}}', 'social_media', 'Facebook platform integration settings'),
('instagram_integration', '{"connected": false, "credentials": {}}', 'social_media', 'Instagram platform integration settings'),
('twitter_integration', '{"connected": false, "credentials": {}}', 'social_media', 'Twitter/X platform integration settings'),
('linkedin_integration', '{"connected": false, "credentials": {}}', 'social_media', 'LinkedIn platform integration settings'),
('youtube_integration', '{"connected": false, "credentials": {}}', 'social_media', 'YouTube platform integration settings'),
('tiktok_integration', '{"connected": false, "credentials": {}}', 'social_media', 'TikTok platform integration settings'),
('pinterest_integration', '{"connected": false, "credentials": {}}', 'social_media', 'Pinterest platform integration settings'),
('snapchat_integration', '{"connected": false, "credentials": {}}', 'social_media', 'Snapchat platform integration settings'),
('openai_api_key', '{"api_key": ""}', 'ai_platforms', 'OpenAI API key for GPT models'),
('anthropic_api_key', '{"api_key": ""}', 'ai_platforms', 'Anthropic API key for Claude models'),
('google_ai_api_key', '{"api_key": ""}', 'ai_platforms', 'Google AI API key for Gemini models'),
('huggingface_api_key', '{"api_key": ""}', 'ai_platforms', 'Hugging Face API key for open source models'),
('stability_ai_api_key', '{"api_key": ""}', 'ai_platforms', 'Stability AI API key for image generation'),
('elevenlabs_api_key', '{"api_key": ""}', 'ai_platforms', 'ElevenLabs API key for voice synthesis'),
('runware_api_key', '{"api_key": ""}', 'ai_platforms', 'Runware API key for image generation');