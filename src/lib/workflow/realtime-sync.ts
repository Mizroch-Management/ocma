import { supabase } from "@/integrations/supabase/client";
import { log } from "@/utils/logger";

export interface WorkflowRealtimeSync {
  subscribe: (workflowId: string, onUpdate: (data: any) => void) => () => void;
  broadcastUpdate: (workflowId: string, data: any) => Promise<void>;
}

// Subscribe to real-time workflow updates
export function subscribeToWorkflow(
  workflowId: string,
  organizationId: string,
  onUpdate: (data: any) => void
): () => void {
  const channel = supabase
    .channel(`workflow:${workflowId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'workflows',
        filter: `id=eq.${workflowId}`
      },
      (payload) => {
        log.info('Workflow update received', { workflowId, payload });
        onUpdate(payload.new);
      }
    )
    .on(
      'broadcast',
      {
        event: 'workflow_state_change'
      },
      (payload) => {
        log.info('Workflow state change broadcast received', { workflowId, payload });
        onUpdate(payload.payload);
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    supabase.removeChannel(channel);
  };
}

// Broadcast workflow updates to all connected clients
export async function broadcastWorkflowUpdate(
  workflowId: string,
  data: any
): Promise<void> {
  try {
    const channel = supabase.channel(`workflow:${workflowId}`);
    
    await channel.send({
      type: 'broadcast',
      event: 'workflow_state_change',
      payload: data
    });

    log.info('Workflow update broadcast sent', { workflowId });
  } catch (error) {
    log.error('Failed to broadcast workflow update', error, undefined, {
      workflowId,
      action: 'broadcast_update'
    });
  }
}

// Subscribe to all workflows for an organization
export function subscribeToOrganizationWorkflows(
  organizationId: string,
  onUpdate: (workflow: any) => void
): () => void {
  const channel = supabase
    .channel(`org-workflows:${organizationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workflows',
        filter: `organization_id=eq.${organizationId}`
      },
      (payload) => {
        log.info('Organization workflow update received', { 
          organizationId, 
          event: payload.eventType,
          workflowId: payload.new?.id || payload.old?.id 
        });
        onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Sync workflow state across tabs/windows
export function setupCrossTabSync(
  workflowId: string,
  onSync: (state: any) => void
): () => void {
  const channelName = `sync:workflow:${workflowId}`;
  
  // Listen for changes from other tabs
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === channelName && e.newValue) {
      try {
        const state = JSON.parse(e.newValue);
        log.info('Cross-tab sync received', { workflowId });
        onSync(state);
      } catch (error) {
        log.error('Failed to parse cross-tab sync data', error);
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}

// Broadcast state changes to other tabs
export function broadcastToOtherTabs(workflowId: string, state: any): void {
  const channelName = `sync:workflow:${workflowId}`;
  try {
    localStorage.setItem(channelName, JSON.stringify({
      ...state,
      timestamp: Date.now()
    }));
  } catch (error) {
    log.error('Failed to broadcast to other tabs', error);
  }
}

// Create a workflow sync manager
export function createWorkflowSyncManager(
  workflowId: string,
  organizationId: string
): WorkflowRealtimeSync {
  return {
    subscribe: (id: string, onUpdate: (data: any) => void) => {
      return subscribeToWorkflow(id, organizationId, onUpdate);
    },
    broadcastUpdate: async (id: string, data: any) => {
      await broadcastWorkflowUpdate(id, data);
      broadcastToOtherTabs(id, data);
    }
  };
}