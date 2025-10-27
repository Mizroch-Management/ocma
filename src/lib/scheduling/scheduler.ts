import { supabase } from "@/integrations/supabase/client";
import { log } from "@/utils/logger";

export interface ScheduledContent {
  id: string;
  title: string;
  content: string;
  scheduled_date: string;
  scheduled_platforms: string[];
  is_scheduled: boolean;
  publication_status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  organization_id: string;
}

export interface SchedulePostOptions {
  content: string;
  platforms: string[];
  publishAt: Date | string;
  timezone?: string;
  media?: Array<{ url: string; type?: string }>;
  metadata?: Record<string, unknown>;
}

export interface SchedulePostResult {
  jobId: string;
  scheduledAt: string;
  status: string;
}

// Schedule content for publication via Supabase Edge Function
export async function scheduleContent(
  options: SchedulePostOptions,
  organizationId: string
): Promise<SchedulePostResult | null> {
  try {
    const publishDate = options.publishAt instanceof Date ? options.publishAt : new Date(options.publishAt);

    if (Number.isNaN(publishDate.getTime())) {
      throw new Error('Invalid publishAt value');
    }

    const publishAt = publishDate.toISOString();

    const { data, error } = await supabase.functions.invoke('schedule-post', {
      body: {
        ...options,
        publishAt,
        organizationId,
      },
    });

    if (error || !data?.success) {
      log.error('Failed to schedule content', error || new Error(data?.error));
      return null;
    }

    log.info('Content scheduled successfully', { jobId: data.jobId });
    return {
      jobId: data.jobId,
      scheduledAt: data.scheduledAt,
      status: data.status,
    };
  } catch (error) {
    log.error('Error scheduling content', error as Error);
    return null;
  }
}

// Update scheduled content
export async function updateScheduledContent(
  contentId: string,
  updates: Partial<ScheduledContent>
): Promise<ScheduledContent | null> {
  try {
    const { data, error } = await supabase
      .from('generated_content')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', contentId)
      .select()
      .single();

    if (error) {
      log.error('Failed to update scheduled content', error);
      throw error;
    }

    return data;
  } catch (error) {
    log.error('Error updating scheduled content', error);
    return null;
  }
}

// Get scheduled content for an organization
export async function getScheduledContent(
  organizationId: string,
  status?: string
): Promise<ScheduledContent[]> {
  try {
    let query = supabase
      .from('generated_content')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_scheduled', true);

    if (status) {
      query = query.eq('publication_status', status);
    }

    const { data, error } = await query.order('scheduled_date', { ascending: true });

    if (error) {
      log.error('Failed to fetch scheduled content', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    log.error('Error fetching scheduled content', error);
    return [];
  }
}

// Cancel scheduled content
export async function cancelScheduledContent(postId: string, organizationId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('cancel-scheduled-post', {
      body: {
        postId,
        organizationId,
      }
    });

    if (error || !data?.success) {
      log.error('Failed to cancel scheduled content', error || new Error(data?.error));
      return false;
    }

    log.info('Scheduled content cancelled', { postId });
    return true;
  } catch (error) {
    log.error('Error cancelling scheduled content', error);
    return false;
  }
}

// Trigger immediate publishing (for testing)
export async function triggerPublishing(organizationId: string): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('publish-scheduled-content', {
      body: { organizationId }
    });

    if (error || data?.error) {
      const reason = error?.message || data?.error || 'Unknown error';
      log.error('Failed to trigger publishing', new Error(reason));
      throw new Error(reason);
    }

    log.info('Publishing triggered successfully');
  } catch (error) {
    log.error('Error triggering publishing', error);
    throw error;
  }
}

// Subscribe to publishing status updates
export function subscribeToPublishingStatus(
  organizationId: string,
  onUpdate: (content: ScheduledContent[]) => void
) {
  const channel = supabase
    .channel(`publishing:${organizationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'generated_content',
        filter: `organization_id=eq.${organizationId}`
      },
      async () => {
        const content = await getScheduledContent(organizationId);
        onUpdate(content);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
