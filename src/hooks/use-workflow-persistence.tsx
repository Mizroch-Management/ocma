import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import { useOrganization } from './use-organization';
import type { WorkflowState } from '@/contexts/workflow-context';
import { useToast } from './use-toast';

interface WorkflowPersistenceHook {
  saveWorkflow: (state: WorkflowState, workflowId?: string) => Promise<void>;
  loadWorkflow: (workflowId?: string) => Promise<WorkflowState | null>;
  autoSaveWorkflow: (state: WorkflowState, workflowId?: string) => void;
  backupToLocalStorage: (state: WorkflowState) => void;
  restoreFromLocalStorage: () => WorkflowState | null;
}

const AUTOSAVE_DELAY = 2000; // 2 seconds delay for autosave

export const useWorkflowPersistence = (): WorkflowPersistenceHook => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedStateRef = useRef<string>('');
  const backupTimeoutRef = useRef<NodeJS.Timeout>();

  // Local storage backup functions
  const backupToLocalStorage = useCallback((state: WorkflowState) => {
    try {
      const backup = {
        ...state,
        timestamp: new Date().toISOString(),
        organizationId: currentOrganization?.id
      };
      localStorage.setItem('workflow_backup', JSON.stringify(backup));
      console.log('Workflow backed up to local storage');
    } catch (error) {
      console.error('Failed to backup to local storage:', error);
    }
  }, [currentOrganization?.id]);

  const restoreFromLocalStorage = useCallback((): WorkflowState | null => {
    try {
      const backup = localStorage.getItem('workflow_backup');
      if (!backup) return null;
      
      const parsed = JSON.parse(backup);
      // Only restore if it's for the current organization
      if (parsed.organizationId !== currentOrganization?.id) return null;
      
      // Convert date strings back to Date objects
      if (parsed.approvedStrategy?.createdAt) {
        parsed.approvedStrategy.createdAt = new Date(parsed.approvedStrategy.createdAt);
      }
      if (parsed.approvedPlans) {
        parsed.approvedPlans.forEach((plan: any) => {
          if (plan.createdAt) plan.createdAt = new Date(plan.createdAt);
        });
      }
      if (parsed.approvedContent) {
        parsed.approvedContent.forEach((content: any) => {
          if (content.createdAt) content.createdAt = new Date(content.createdAt);
          if (content.scheduledDate) content.scheduledDate = new Date(content.scheduledDate);
        });
      }
      
      console.log('Workflow restored from local storage');
      return parsed;
    } catch (error) {
      console.error('Failed to restore from local storage:', error);
      return null;
    }
  }, [currentOrganization?.id]);

  // Validate workflow data before saving
  const validateWorkflowData = (state: WorkflowState): boolean => {
    // Basic validation to ensure critical data isn't lost
    if (state.businessInfo && (!state.businessInfo.company || !state.businessInfo.industry)) {
      console.warn('Invalid business info detected');
      return false;
    }
    return true;
  };

  const saveWorkflow = useCallback(async (state: WorkflowState, workflowId?: string): Promise<void> => {
    if (!user?.id) return;

    // Validate data before saving
    if (!validateWorkflowData(state)) {
      console.error('Workflow data validation failed, not saving');
      toast({
        title: "Data Validation Error",
        description: "Workflow data appears corrupted. Please check your input.",
        variant: "destructive",
      });
      return;
    }

    // Always backup to local storage first
    backupToLocalStorage(state);

    try {
      console.log('Saving workflow state:', {
        businessInfo: state.businessInfo,
        hasBusinessInfo: !!state.businessInfo,
        approvedStrategy: state.approvedStrategy,
        progress: state.progress,
        workflowId: workflowId
      });

      // Ensure we have valid data structures and serialize for JSON storage
      // Save ALL workflow data including AI prompts, user prompts, and generated content
      const workflowData = {
        user_id: user.id,
        organization_id: currentOrganization?.id || null,
        workflow_type: 'ai_workflow',
        status: state.isWorkflowActive ? 'active' : 'draft',
        current_step: state.progress.currentStep || 0,
        business_info_data: state.businessInfo ? JSON.parse(JSON.stringify(state.businessInfo)) : null,
        // Save complete draft data including AI prompts, user prompts, and all AI work products
        draft_data: state.draftData ? JSON.parse(JSON.stringify(state.draftData)) : null,
        strategy_data: state.approvedStrategy ? JSON.parse(JSON.stringify(state.approvedStrategy)) : null,
        plans_data: JSON.parse(JSON.stringify(state.approvedPlans || [])),
        content_data: JSON.parse(JSON.stringify(state.approvedContent || [])),
        progress_data: JSON.parse(JSON.stringify(state.progress || {
          currentStep: 0,
          completedSteps: [],
          strategyApproved: false,
          plansApproved: false,
          contentApproved: false,
          schedulingComplete: false,
        })),
        title: state.businessInfo?.company ? `${state.businessInfo.company} Marketing Workflow` : 'AI Marketing Workflow',
        metadata: {
          title: state.businessInfo?.company ? `${state.businessInfo.company} Marketing Workflow` : 'AI Marketing Workflow',
          completedSteps: state.progress.completedSteps || [],
          isWorkflowActive: state.isWorkflowActive || false,
          lastAutoSave: new Date().toISOString(),
          description: `Marketing strategy and automation for ${state.businessInfo?.company || 'organization'}`,
          // Include additional metadata about saved content for quick reference
          hasDraftData: !!state.draftData,
          hasAIPrompts: !!(state.draftData?.strategySteps?.some(s => s.aiPrompt) || 
                          state.draftData?.monthlyOverview?.aiPrompt || 
                          state.draftData?.weeklyPlans?.some(p => p.aiPrompt) ||
                          state.draftData?.contentPieces?.some(c => c.aiPrompt)),
          hasUserPrompts: !!(state.draftData?.strategySteps?.some(s => s.userPrompt) || 
                            state.draftData?.monthlyOverview?.userPrompt || 
                            state.draftData?.weeklyPlans?.some(p => p.userPrompt) ||
                            state.draftData?.contentPieces?.some(c => c.userPrompt))
        }
      };

      if (workflowId) {
        // Update specific workflow
        const { error } = await supabase
          .from('workflows')
          .update(workflowData)
          .eq('id', workflowId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Try to update existing workflow first, or create new one
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
      }

      // Update the last saved state reference
      lastSavedStateRef.current = JSON.stringify(state);
      
      toast({
        title: "Workflow Saved",
        description: "Your progress has been saved successfully.",
      });
    } catch (error) {
      console.error('Failed to save workflow:', error);
      
      // Ensure local backup is still available
      backupToLocalStorage(state);
      
      toast({
        title: "Save Error",
        description: "Failed to save to server, but your work is backed up locally.",
        variant: "destructive",
      });
    }
  }, [user?.id, currentOrganization?.id, toast, backupToLocalStorage, validateWorkflowData]);

  const loadWorkflow = useCallback(async (workflowId?: string): Promise<WorkflowState | null> => {
    if (!user?.id) return null;

    try {
      let query = supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user.id)
        .eq('workflow_type', 'ai_workflow');

      // Filter by current organization if available
      if (currentOrganization?.id) {
        query = query.eq('organization_id', currentOrganization.id);
      }

      if (workflowId) {
        query = query.eq('id', workflowId);
      } else {
        query = query.order('updated_at', { ascending: false }).limit(1);
      }

      const { data: workflow, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!workflow) {
        // Try to restore from local storage as fallback
        console.log('No workflow found in database, checking local storage backup');
        const localBackup = restoreFromLocalStorage();
        if (localBackup) {
          console.log('Restored workflow from local storage backup');
          return localBackup;
        }
        return null;
      }

      console.log('Loading workflow from database:', {
        id: workflow.id,
        business_info_data: workflow.business_info_data,
        hasBusinessInfo: !!workflow.business_info_data,
        updated_at: workflow.updated_at
      });

      // Reconstruct the WorkflowState from database with proper type casting
      const state: WorkflowState = {
        businessInfo: (workflow.business_info_data as any) || null,
        draftData: (workflow.draft_data as any) || null,
        approvedStrategy: (workflow.strategy_data as any) || null,
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
        currentWorkflowId: workflow.id,
      };

      console.log('Restored workflow state:', {
        businessInfo: !!state.businessInfo,
        draftData: !!state.draftData,
        draftDataKeys: state.draftData ? Object.keys(state.draftData) : [],
        strategyStepsCount: state.draftData?.strategySteps?.length || 0,
        currentStrategyStep: state.draftData?.currentStrategyStep,
        approvedStrategy: !!state.approvedStrategy,
        progress: state.progress
      });

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
  }, [user?.id, currentOrganization?.id]);

  const autoSaveWorkflow = useCallback((state: WorkflowState, workflowId?: string) => {
    if (!user?.id) return;

    // Check if state has actually changed
    const currentStateString = JSON.stringify(state);
    if (currentStateString === lastSavedStateRef.current) {
      return;
    }

    // Clear existing timeouts
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    if (backupTimeoutRef.current) {
      clearTimeout(backupTimeoutRef.current);
    }

    // Immediate local backup for critical data changes including AI work products
    if (state.businessInfo || 
        state.approvedStrategy || 
        state.approvedPlans.length > 0 || 
        state.draftData?.strategySteps?.some(s => s.aiGenerated || s.aiPrompt || s.userPrompt) ||
        state.draftData?.monthlyOverview?.aiGenerated ||
        state.draftData?.weeklyPlans?.some(p => p.aiGenerated || p.aiPrompt || p.userPrompt) ||
        state.draftData?.contentPieces?.some(c => c.aiGenerated || c.aiPrompt || c.userPrompt)) {
      backupTimeoutRef.current = setTimeout(() => {
        backupToLocalStorage(state);
      }, 500); // Quick backup
    }

    // Set new timeout for database autosave
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveWorkflow(state, workflowId);
    }, AUTOSAVE_DELAY);
  }, [user?.id, saveWorkflow, backupToLocalStorage]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (backupTimeoutRef.current) {
        clearTimeout(backupTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveWorkflow,
    loadWorkflow,
    autoSaveWorkflow,
    backupToLocalStorage,
    restoreFromLocalStorage,
  };
};