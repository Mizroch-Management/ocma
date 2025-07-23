-- Add Grok (xAI) API key setting
INSERT INTO public.system_settings (setting_key, setting_value, category, description) VALUES 
('grok_api_key', '{"api_key": "", "supports_tools": true}', 'ai_platforms', 'Grok (xAI) API key for AI text generation');