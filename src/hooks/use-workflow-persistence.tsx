import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import type { WorkflowState } from '@/contexts/workflow-context';
import { useToast } from './use-toast';

interface WorkflowPersistenceHook {
  saveWorkflow: (state: WorkflowState) => Promise<void>;
  loadWorkflow: () => Promise<WorkflowState | null>;
  autoSaveWorkflow: (state: WorkflowState) => void;
}

const AUTOSAVE_DELAY = 2000; // 2 seconds delay for autosave

export const useWorkflowPersistence = (): WorkflowPersistenceHook => {
  const { user } = useAuth();
  const { toast } = useToast();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedStateRef = useRef<string>('');

  const saveWorkflow = useCallback(async (state: WorkflowState): Promise<void> => {
    if (!user?.id) return;

    try {
      const workflowData = {
        user_id: user.id,
        workflow_type: 'ai_workflow',
        title: state.approvedStrategy?.title || 'AI Marketing Workflow',
        status: state.isWorkflowActive ? 'active' : 'draft',
        current_step: state.progress.currentStep,
        business_info_data: state.businessInfo ? JSON.parse(JSON.stringify(state.businessInfo)) : null,
        draft_data: state.draftData ? JSON.parse(JSON.stringify(state.draftData)) : null,
        strategy_data: state.approvedStrategy ? JSON.parse(JSON.stringify(state.approvedStrategy)) : null,
        plans_data: JSON.parse(JSON.stringify(state.approvedPlans)),
        content_data: JSON.parse(JSON.stringify(state.approvedContent)),
        progress_data: JSON.parse(JSON.stringify(state.progress)),
        metadata: {
          completedSteps: state.progress.completedSteps,
          isWorkflowActive: state.isWorkflowActive,
          lastAutoSave: new Date().toISOString(),
        }
      };

      // Try to update existing workflow first
      const { data: existingWorkflow } = await supabase
        .from('workflows')
        .select('id')
        .eq('user_id', user.id)
        .eq('workflow_type', 'ai_workflow')
        .single();

      if (existingWorkflow) {
        const { error } = await supabase
          .from('workflows')
          .update(workflowData)
          .eq('id', existingWorkflow.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workflows')
          .insert([workflowData]);

        if (error) throw error;
      }

      // Update the last saved state reference
      lastSavedStateRef.current = JSON.stringify(state);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast({
        title: "Save Error",
        description: "Failed to save workflow progress. Your work is saved locally.",
        variant: "destructive",
      });
    }
  }, [user?.id, toast]);

  const loadWorkflow = useCallback(async (): Promise<WorkflowState | null> => {
    if (!user?.id) return null;

    try {
      const { data: workflow, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user.id)
        .eq('workflow_type', 'ai_workflow')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!workflow) return null;

      // Reconstruct the WorkflowState from database
      const state: WorkflowState = {
        businessInfo: (workflow.business_info_data as any) || null,
        draftData: (workflow.draft_data as any) || null,
        approvedStrategy: workflow.strategy_data as any || null,
        approvedPlans: (workflow.plans_data as any) || [],
        approvedContent: (workflow.content_data as any) || [],
        progress: (workflow.progress_data as any) || {
          currentStep: 0,
          completedSteps: [],
          strategyApproved: false,
          plansApproved: false,
          contentApproved: false,
          schedulingComplete: false,
        },
        isWorkflowActive: (workflow.metadata as any)?.isWorkflowActive || false,
      };

      // Convert date strings back to Date objects
      if (state.approvedStrategy?.createdAt) {
        state.approvedStrategy.createdAt = new Date(state.approvedStrategy.createdAt);
      }
      if (state.approvedPlans) {
        state.approvedPlans.forEach((plan) => {
          if (plan.createdAt) plan.createdAt = new Date(plan.createdAt);
        });
      }
      if (state.approvedContent) {
        state.approvedContent.forEach((content) => {
          if (content.createdAt) content.createdAt = new Date(content.createdAt);
          if (content.scheduledDate) content.scheduledDate = new Date(content.scheduledDate);
        });
      }

      lastSavedStateRef.current = JSON.stringify(state);
      return state;
    } catch (error) {
      console.error('Failed to load workflow:', error);
      return null;
    }
  }, [user?.id]);

  const autoSaveWorkflow = useCallback((state: WorkflowState) => {
    if (!user?.id) return;

    // Check if state has actually changed
    const currentStateString = JSON.stringify(state);
    if (currentStateString === lastSavedStateRef.current) {
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for autosave
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveWorkflow(state);
    }, AUTOSAVE_DELAY);
  }, [user?.id, saveWorkflow]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveWorkflow,
    loadWorkflow,
    autoSaveWorkflow,
  };
};