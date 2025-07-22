-- Add Perplexity API key setting
INSERT INTO public.system_settings (setting_key, setting_value, category, description) VALUES 
('perplexity_api_key', '{"api_key": "", "supports_tools": true}', 'ai_platforms', 'Perplexity API key for real-time search and reasoning');

-- Update existing AI platform settings to include tools support information
UPDATE public.system_settings 
SET setting_value = jsonb_set(setting_value, '{supports_tools}', 'true'::jsonb)
WHERE setting_key = 'openai_api_key';

UPDATE public.system_settings 
SET setting_value = jsonb_set(setting_value, '{supports_tools}', 'true'::jsonb)
WHERE setting_key = 'anthropic_api_key';

UPDATE public.system_settings 
SET setting_value = jsonb_set(setting_value, '{supports_tools}', 'true'::jsonb)
WHERE setting_key = 'google_ai_api_key';

UPDATE public.system_settings 
SET setting_value = jsonb_set(setting_value, '{supports_tools}', 'false'::jsonb)
WHERE setting_key = 'huggingface_api_key';

UPDATE public.system_settings 
SET setting_value = jsonb_set(setting_value, '{supports_tools}', 'false'::jsonb)
WHERE setting_key = 'stability_ai_api_key';

UPDATE public.system_settings 
SET setting_value = jsonb_set(setting_value, '{supports_tools}', 'false'::jsonb)
WHERE setting_key = 'elevenlabs_api_key';

UPDATE public.system_settings 
SET setting_value = jsonb_set(setting_value, '{supports_tools}', 'false'::jsonb)
WHERE setting_key = 'runware_api_key';