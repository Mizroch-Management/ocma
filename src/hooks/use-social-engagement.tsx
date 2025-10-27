import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { log } from '@/utils/logger';
import { useOrganization } from '@/hooks/use-organization';

export interface SocialMention {
  id: string;
  platform: string;
  user: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  engagement_potential: 'high' | 'medium' | 'low';
  timestamp: string;
  post_url: string;
  user_followers: number;
  user_engagement_rate: number;
  requires_response: boolean;
  ai_confidence: number;
}

export interface EngagementOpportunity {
  id: string;
  type: 'thread_reply' | 'influencer_outreach' | 'hashtag_trend';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggested_action: string;
  potential_reach: number;
  engagement_score: number;
  time_sensitive: boolean;
  expires_at: string | null;
}

export interface Influencer {
  id: string;
  name: string;
  handle: string;
  platform: string;
  followers: number;
  engagement_rate: string;
  niche: string;
  ai_score: number;
  reason: string;
  suggested_approach: string;
  recent_content: string;
  collaboration_potential: 'high' | 'medium' | 'low';
  estimated_reach: number;
  audience_overlap: number;
}

export interface AIResponse {
  primary_response: string;
  variations: Array<{
    style: string;
    response: string;
    character_count: number;
  }>;
  confidence_score: number;
  engagement_tips: string[];
  optimal_timing: {
    recommended_time: string;
    timezone: string;
    reasoning: string;
    alternative_times: string[];
  };
  hashtag_suggestions: string[];
  tone_analysis: string;
  character_count: number;
  platform_optimized: {
    original_length: number;
    platform_limit: number;
    within_limit: boolean;
    optimized_response: string;
    truncated: boolean;
  };
}

export function useSocialEngagement() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;

  const [mentions, setMentions] = useState<SocialMention[]>([]);
  const [opportunities, setOpportunities] = useState<EngagementOpportunity[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const monitorMentions = useCallback(async (platform: string) => {
    if (!organizationId) {
      toast({
        title: "Organization Required",
        description: "Select an organization to monitor social engagement.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-engagement-monitor', {
        body: {
          platform,
          action: 'monitor_mentions',
          data: {},
          organizationId
        }
      });

      if (error) throw error;

      setMentions(data.mentions);
      toast({
        title: "Mentions Updated",
        description: `Found ${data.total_count} mentions with ${data.high_priority_count} high priority items.`,
      });
    } catch (error) {
      log.error('Error monitoring mentions', error instanceof Error ? error : new Error(String(error)), { platform }, { component: 'useSocialEngagement', action: 'monitor_mentions' });
      toast({
        title: "Error",
        description: "Failed to monitor mentions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId, toast]);

  const getEngagementOpportunities = async (platform: string) => {
    if (!organizationId) {
      toast({
        title: "Organization Required",
        description: "Select an organization to analyze opportunities.",
        variant: "destructive"
      });
      return;
    }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-engagement-monitor', {
        body: {
          platform,
          action: 'get_engagement_opportunities',
          data: {},
          organizationId
        }
      });

      if (error) throw error;

      setOpportunities(data.opportunities);
      toast({
        title: "AI Analysis Complete",
        description: `Found ${data.total_count} engagement opportunities with ${data.high_priority_count} high priority items.`,
      });
    } catch (error) {
      log.error('Error getting opportunities', error instanceof Error ? error : new Error(String(error)), {}, { component: 'useSocialEngagement', action: 'get_opportunities' });
      toast({
        title: "Error",
        description: "Failed to analyze opportunities. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const discoverInfluencers = async (platform: string, criteria: Record<string, unknown>) => {
    if (!organizationId) {
      toast({
        title: "Organization Required",
        description: "Select an organization to discover influencers.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-engagement-monitor', {
        body: {
          platform,
          action: 'discover_influencers',
          data: criteria,
          organizationId
        }
      });

      if (error) throw error;

      setInfluencers(data.influencers);
      toast({
        title: "Influencer Discovery Complete",
        description: `Found ${data.total_found} influencers with ${data.high_priority} high priority matches.`,
      });
    } catch (error) {
      log.error('Error discovering influencers', error instanceof Error ? error : new Error(String(error)), { niche }, { component: 'useSocialEngagement', action: 'discover_influencers' });
      toast({
        title: "Error",
        description: "Failed to discover influencers. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAIResponse = async (
    originalContent: string,
    context: any,
    responseStyle: string = 'professional',
    platform: string = 'twitter'
  ): Promise<AIResponse | null> => {
    if (!organizationId) {
      toast({
        title: "Organization Required",
        description: "Select an organization to generate AI responses.",
        variant: "destructive"
      });
      return null;
    }
    try {
      const { data, error } = await supabase.functions.invoke('ai-response-generator', {
        body: {
          original_content: originalContent,
          context,
          response_style: responseStyle,
          platform,
          user_profile: {},
          conversation_history: [],
          organizationId
        }
      });

      if (error) throw error;

      toast({
        title: "AI Response Generated",
        description: "Personalized response ready for review and customization.",
      });

      return data;
    } catch (error) {
      log.error('Error generating AI response', error instanceof Error ? error : new Error(String(error)), { originalText, platform }, { component: 'useSocialEngagement', action: 'generate_ai_response' });
      toast({
        title: "Error",
        description: "Failed to generate AI response. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const analyzeSentiment = async (content: string) => {
    if (!organizationId) {
      toast({
        title: "Organization Required",
        description: "Select an organization to analyze sentiment.",
        variant: "destructive"
      });
      return null;
    }
    try {
      const { data, error } = await supabase.functions.invoke('social-engagement-monitor', {
        body: {
          platform: 'general',
          action: 'analyze_sentiment',
          data: { content },
          organizationId
        }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      log.error('Error analyzing sentiment', error instanceof Error ? error : new Error(String(error)), { text }, { component: 'useSocialEngagement', action: 'analyze_sentiment' });
      toast({
        title: "Error",
        description: "Failed to analyze sentiment. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const trackHashtags = async (platform: string, hashtags: string[]) => {
    if (!organizationId) {
      toast({
        title: "Organization Required",
        description: "Select an organization to track hashtags.",
        variant: "destructive"
      });
      return null;
    }
    try {
      const { data, error } = await supabase.functions.invoke('social-engagement-monitor', {
        body: {
          platform,
          action: 'track_hashtags',
          data: { hashtags },
          organizationId
        }
      });

      if (error) throw error;

      toast({
        title: "Hashtag Tracking Updated",
        description: `Now tracking ${hashtags.length} hashtags for engagement opportunities.`,
      });

      return data;
    } catch (error) {
      log.error('Error tracking hashtags', error instanceof Error ? error : new Error(String(error)), { hashtags }, { component: 'useSocialEngagement', action: 'track_hashtags' });
      toast({
        title: "Error",
        description: "Failed to track hashtags. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !analyzing) {
        // Auto-refresh mentions for all platforms
        ['twitter', 'facebook', 'instagram', 'linkedin'].forEach(platform => {
          monitorMentions(platform);
        });
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [loading, analyzing, monitorMentions]);

  return {
    mentions,
    opportunities,
    influencers,
    loading,
    analyzing,
    monitorMentions,
    getEngagementOpportunities,
    discoverInfluencers,
    generateAIResponse,
    analyzeSentiment,
    trackHashtags
  };
}
