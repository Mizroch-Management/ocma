-- Migration for real backend implementation
-- This migration adds all necessary tables and functions for the complete backend functionality

-- Platform accounts table for storing connected social media accounts
CREATE TABLE IF NOT EXISTS platform_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'pinterest')),
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_handle TEXT NOT NULL,
  profile_image TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '[]'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, account_id, user_id)
);

-- Scheduled posts table for the job queue system
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  content TEXT NOT NULL,
  platforms TEXT[] NOT NULL,
  media_urls TEXT[],
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  max_attempts INTEGER DEFAULT 3,
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Post results table for tracking individual platform publishing results
CREATE TABLE IF NOT EXISTS post_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_post_id UUID NOT NULL REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  post_id TEXT,
  url TEXT,
  error TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content analyses table for storing AI analysis results
CREATE TABLE IF NOT EXISTS content_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  platform TEXT NOT NULL,
  content_type TEXT,
  analysis_result JSONB NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content optimizations table for storing optimization results
CREATE TABLE IF NOT EXISTS content_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_content TEXT NOT NULL,
  optimized_content TEXT NOT NULL,
  platform TEXT NOT NULL,
  objective TEXT NOT NULL,
  optimization_result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduling analyses table for storing intelligent scheduling results
CREATE TABLE IF NOT EXISTS scheduling_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  platforms TEXT[] NOT NULL,
  analysis_result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social mentions table for tracking brand mentions
CREATE TABLE IF NOT EXISTS social_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  mention_id TEXT NOT NULL,
  content TEXT NOT NULL,
  author JSONB NOT NULL,
  url TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  responded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, mention_id)
);

-- Hashtag metrics table for tracking hashtag performance
CREATE TABLE IF NOT EXISTS hashtag_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  hashtag TEXT NOT NULL,
  post_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL DEFAULT 0,
  trending_score DECIMAL DEFAULT 0,
  tracked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, hashtag, tracked_at)
);

-- Platform metrics history for tracking performance over time
CREATE TABLE IF NOT EXISTS platform_metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  posts INTEGER DEFAULT 0,
  engagement_rate DECIMAL DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table for user notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'error')),
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys table for storing platform credentials
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  client_id TEXT,
  client_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table extension for notification preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "post_publishing": true,
  "mentions": true,
  "scheduled_posts": true,
  "api_errors": true
}'::jsonb;

-- Publication logs table (might already exist)
CREATE TABLE IF NOT EXISTS publication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID,
  platform TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  published_at TIMESTAMPTZ,
  platform_post_id TEXT,
  error_message TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_accounts_user_platform ON platform_accounts(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_platform_accounts_active ON platform_accounts(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_status ON scheduled_posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status_time ON scheduled_posts(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_post_results_scheduled_post ON post_results(scheduled_post_id);

CREATE INDEX IF NOT EXISTS idx_content_analyses_user ON content_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_content_analyses_platform ON content_analyses(platform);

CREATE INDEX IF NOT EXISTS idx_social_mentions_platform ON social_mentions(platform);
CREATE INDEX IF NOT EXISTS idx_social_mentions_priority ON social_mentions(priority) WHERE priority = 'high';
CREATE INDEX IF NOT EXISTS idx_social_mentions_responded ON social_mentions(responded) WHERE responded = false;

CREATE INDEX IF NOT EXISTS idx_hashtag_metrics_platform_hashtag ON hashtag_metrics(platform, hashtag);
CREATE INDEX IF NOT EXISTS idx_hashtag_metrics_tracked_at ON hashtag_metrics(tracked_at);

CREATE INDEX IF NOT EXISTS idx_platform_metrics_history_user_platform ON platform_metrics_history(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_history_recorded_at ON platform_metrics_history(recorded_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Functions and triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_platform_accounts_updated_at ON platform_accounts;
CREATE TRIGGER update_platform_accounts_updated_at
    BEFORE UPDATE ON platform_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_posts_updated_at ON scheduled_posts;
CREATE TRIGGER update_scheduled_posts_updated_at
    BEFORE UPDATE ON scheduled_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtag_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_logs ENABLE ROW LEVEL SECURITY;

-- Platform accounts policies
CREATE POLICY "Users can view their own platform accounts" ON platform_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own platform accounts" ON platform_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own platform accounts" ON platform_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own platform accounts" ON platform_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Scheduled posts policies
CREATE POLICY "Users can view their own scheduled posts" ON scheduled_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled posts" ON scheduled_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled posts" ON scheduled_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled posts" ON scheduled_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Post results policies
CREATE POLICY "Users can view their post results" ON post_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scheduled_posts
      WHERE scheduled_posts.id = post_results.scheduled_post_id
      AND scheduled_posts.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert post results" ON post_results
  FOR INSERT WITH CHECK (true);

-- Content analyses policies
CREATE POLICY "Users can view their own content analyses" ON content_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content analyses" ON content_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Content optimizations policies
CREATE POLICY "Users can view their own content optimizations" ON content_optimizations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content optimizations" ON content_optimizations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Scheduling analyses policies
CREATE POLICY "Users can view their own scheduling analyses" ON scheduling_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduling analyses" ON scheduling_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Social mentions policies (global read for monitoring)
CREATE POLICY "Users can view social mentions" ON social_mentions
  FOR SELECT USING (true);

CREATE POLICY "System can manage social mentions" ON social_mentions
  FOR ALL USING (true);

-- Hashtag metrics policies (global read)
CREATE POLICY "Users can view hashtag metrics" ON hashtag_metrics
  FOR SELECT USING (true);

CREATE POLICY "System can manage hashtag metrics" ON hashtag_metrics
  FOR ALL USING (true);

-- Platform metrics history policies
CREATE POLICY "Users can view their own platform metrics history" ON platform_metrics_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert platform metrics history" ON platform_metrics_history
  FOR INSERT WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- API keys policies (admin only)
CREATE POLICY "Only admins can manage API keys" ON api_keys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Publication logs policies
CREATE POLICY "Users can view publication logs for their content" ON publication_logs
  FOR SELECT USING (true); -- Will be filtered by content ownership in application logic

CREATE POLICY "System can manage publication logs" ON publication_logs
  FOR ALL USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE platform_accounts IS 'Stores connected social media platform accounts with OAuth tokens';
COMMENT ON TABLE scheduled_posts IS 'Job queue for scheduled social media posts';
COMMENT ON TABLE post_results IS 'Results of publishing attempts to individual platforms';
COMMENT ON TABLE content_analyses IS 'AI-powered content analysis results';
COMMENT ON TABLE content_optimizations IS 'Content optimization results from AI';
COMMENT ON TABLE scheduling_analyses IS 'Intelligent scheduling analysis results';
COMMENT ON TABLE social_mentions IS 'Brand mentions tracked across social platforms';
COMMENT ON TABLE hashtag_metrics IS 'Performance metrics for tracked hashtags';
COMMENT ON TABLE platform_metrics_history IS 'Historical metrics for connected platforms';
COMMENT ON TABLE notifications IS 'User notifications for various system events';
COMMENT ON TABLE api_keys IS 'Platform API credentials for system integrations';