-- Create job queue table
CREATE TABLE IF NOT EXISTS job_queue (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    platform VARCHAR(50),
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    scheduled_for TIMESTAMPTZ NOT NULL,
    retry_config JSONB DEFAULT '{"maxAttempts": 3, "backoffMultiplier": 2}'::jsonb,
    attempts INTEGER DEFAULT 0,
    external_id VARCHAR(255), -- For QStash or other external queue IDs
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    last_error TEXT,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_job_queue_user_id ON job_queue(user_id);
CREATE INDEX idx_job_queue_status ON job_queue(status);
CREATE INDEX idx_job_queue_scheduled_for ON job_queue(scheduled_for);
CREATE INDEX idx_job_queue_next_retry ON job_queue(next_retry_at);

-- Enable RLS
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own jobs"
    ON job_queue FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own jobs"
    ON job_queue FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own jobs"
    ON job_queue FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own jobs"
    ON job_queue FOR DELETE
    USING (user_id = auth.uid());

-- Create system logs table for audit trail
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    platform VARCHAR(50),
    status VARCHAR(20),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on system logs
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- System logs policies
CREATE POLICY "Users can view own logs"
    ON system_logs FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System can insert logs"
    ON system_logs FOR INSERT
    WITH CHECK (true); -- Service role will handle this

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for job_queue
CREATE TRIGGER update_job_queue_updated_at 
    BEFORE UPDATE ON job_queue 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create a cron job to process pending jobs (if using pg_cron)
-- This would be set up in Supabase dashboard or via Edge Function
-- SELECT cron.schedule('process-jobs', '*/5 * * * *', $$
--   SELECT http_post(
--     'https://your-app.vercel.app/api/jobs/process',
--     '{}',
--     'application/json'
--   );
-- $$);