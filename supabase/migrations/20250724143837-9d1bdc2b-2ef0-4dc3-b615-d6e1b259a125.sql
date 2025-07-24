-- Fix the cron job by properly formatting the timestamp
SELECT cron.unschedule('publish-scheduled-content');

-- Create a fixed cron job that runs every minute to publish scheduled content
SELECT cron.schedule(
  'publish-scheduled-content',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
        url:='https://wxxjbkqnvpbjywejfrox.supabase.co/functions/v1/publish-scheduled-content',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eGpia3FudnBianl3ZWpmcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzQ1NDcsImV4cCI6MjA2ODc1MDU0N30.p_yTKoOkIScmsaXWj2IBs8rsr5lCcKmNzBdYdW9Hfb4"}'::jsonb,
        body:=concat('{"timestamp": "', now()::text, '"}')::jsonb
    ) as request_id;
  $$
);