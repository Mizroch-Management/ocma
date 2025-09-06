import { supabase } from "@/integrations/supabase/client";
import { log } from "@/utils/logger";

export interface Strategy {
  id: string;
  title: string;
  description: string;
  objectives?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  is_ai_generated?: boolean;
  metadata?: Record<string, any>;
}

export async function fetchUserStrategies(organizationId: string): Promise<Strategy[]> {
  try {
    // Fetch strategies from the database
    const { data: strategies, error } = await supabase
      .from('strategies')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Failed to fetch strategies', error, undefined, {
        organizationId,
        action: 'fetch_strategies'
      });
      throw error;
    }

    return strategies || [];
  } catch (error) {
    log.error('Error fetching strategies', error);
    return [];
  }
}

export async function createStrategy(
  organizationId: string,
  strategy: Partial<Strategy>
): Promise<Strategy | null> {
  try {
    const { data, error } = await supabase
      .from('strategies')
      .insert({
        ...strategy,
        organization_id: organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      log.error('Failed to create strategy', error);
      throw error;
    }

    return data;
  } catch (error) {
    log.error('Error creating strategy', error);
    return null;
  }
}

export async function updateStrategy(
  strategyId: string,
  updates: Partial<Strategy>
): Promise<Strategy | null> {
  try {
    const { data, error } = await supabase
      .from('strategies')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', strategyId)
      .select()
      .single();

    if (error) {
      log.error('Failed to update strategy', error);
      throw error;
    }

    return data;
  } catch (error) {
    log.error('Error updating strategy', error);
    return null;
  }
}

export async function deleteStrategy(strategyId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('strategies')
      .delete()
      .eq('id', strategyId);

    if (error) {
      log.error('Failed to delete strategy', error);
      throw error;
    }

    return true;
  } catch (error) {
    log.error('Error deleting strategy', error);
    return false;
  }
}

// Subscribe to real-time strategy updates
export function subscribeToStrategies(
  organizationId: string,
  onUpdate: (strategies: Strategy[]) => void
) {
  const channel = supabase
    .channel(`strategies:${organizationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'strategies',
        filter: `organization_id=eq.${organizationId}`
      },
      async () => {
        // Refetch all strategies on any change
        const strategies = await fetchUserStrategies(organizationId);
        onUpdate(strategies);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}