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

// Schedule content for publication
export async function scheduleContent(
  content: Partial<ScheduledContent>,
  organizationId: string
): Promise<ScheduledContent | null> {
  try {
    const { data, error } = await supabase
      .from('generated_content')
      .insert({
        ...content,
        organization_id: organizationId,
        is_scheduled: true,
        publication_status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      log.error('Failed to schedule content', error);
      throw error;
    }

    log.info('Content scheduled successfully', { contentId: data.id });
    return data;
  } catch (error) {
    log.error('Error scheduling content', error);
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
export async function cancelScheduledContent(contentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('generated_content')
      .update({
        is_scheduled: false,
        publication_status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', contentId);

    if (error) {
      log.error('Failed to cancel scheduled content', error);
      throw error;
    }

    log.info('Scheduled content cancelled', { contentId });
    return true;
  } catch (error) {
    log.error('Error cancelling scheduled content', error);
    return false;
  }
}

// Trigger immediate publishing (for testing)
export async function triggerPublishing(): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('publish-scheduled-content', {
      body: {}
    });

    if (error) {
      log.error('Failed to trigger publishing', error);
      throw error;
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