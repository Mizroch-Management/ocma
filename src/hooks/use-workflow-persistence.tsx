import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import type { WorkflowState } from '@/contexts/workflow-context';
import { useToast } from './use-toast';

interface WorkflowPersistenceHook {
  saveWorkflow: (state: WorkflowState, workflowId?: string) => Promise<void>;
  loadWorkflow: (workflowId?: string) => Promise<WorkflowState | null>;
  autoSaveWorkflow: (state: WorkflowState, workflowId?: string) => void;
  restoreScamDunkData: () => Promise<void>;
}

const AUTOSAVE_DELAY = 2000; // 2 seconds delay for autosave

export const useWorkflowPersistence = (): WorkflowPersistenceHook => {
  const { user } = useAuth();
  const { toast } = useToast();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedStateRef = useRef<string>('');

  const saveWorkflow = useCallback(async (state: WorkflowState, workflowId?: string): Promise<void> => {
    if (!user?.id) return;

    try {
      console.log('Saving workflow state:', {
        businessInfo: state.businessInfo,
        hasBusinessInfo: !!state.businessInfo,
        approvedStrategy: state.approvedStrategy,
        progress: state.progress
      });

      const workflowData = {
        user_id: user.id,
        workflow_type: 'ai_workflow',
        status: state.isWorkflowActive ? 'active' : 'draft',
        current_step: state.progress.currentStep,
        business_info_data: state.businessInfo ? JSON.parse(JSON.stringify(state.businessInfo)) : null,
        draft_data: state.draftData ? JSON.parse(JSON.stringify(state.draftData)) : null,
        strategy_data: state.approvedStrategy ? JSON.parse(JSON.stringify(state.approvedStrategy)) : null,
        plans_data: JSON.parse(JSON.stringify(state.approvedPlans)),
        content_data: JSON.parse(JSON.stringify(state.approvedContent)),
        progress_data: JSON.parse(JSON.stringify(state.progress)),
        metadata: {
          title: state.businessInfo?.company ? `${state.businessInfo.company} Marketing Workflow` : 'AI Marketing Workflow',
          completedSteps: state.progress.completedSteps,
          isWorkflowActive: state.isWorkflowActive,
          lastAutoSave: new Date().toISOString(),
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
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast({
        title: "Save Error",
        description: "Failed to save workflow progress. Your work is saved locally.",
        variant: "destructive",
      });
    }
  }, [user?.id, toast]);

  // Helper function to restore lost business data
  const restoreScamDunkData = useCallback(async (): Promise<void> => {
    if (!user?.id) return;

    const scamDunkBusinessInfo = {
      company: "Scam Dunk",
      industry: "Cybersecurity/Consumer Protection",
      productService: "Platform to help people identify and avoid scams",
      primaryObjectives: "Educate users about common scam tactics and provide tools to verify suspicious communications",
      targetAudience: "General consumers, elderly populations, small business owners vulnerable to scams",
      targetMarkets: "North America, Europe, Australia",
      budget: "Mid-range marketing budget",
      uniqueSellingPoints: "Real-time scam detection, community-driven reporting, educational resources",
      competitors: "ScamAdviser, Better Business Bureau, Federal Trade Commission resources",
      brandPersonality: "Trustworthy, educational, protective, empowering",
      keyMetrics: "User engagement, scam reports prevented, educational content reach",
      additionalContext: "Focus on building trust and credibility in cybersecurity space",
      teamMembers: []
    };

    const workflowData = {
      user_id: user.id,
      workflow_type: 'ai_workflow',
      status: 'draft',
      current_step: 0,
      business_info_data: scamDunkBusinessInfo,
      draft_data: null,
      strategy_data: null,
      plans_data: [],
      content_data: [],
      progress_data: {
        currentStep: 0,
        completedSteps: [],
        strategyApproved: false,
        plansApproved: false,
        contentApproved: false,
        schedulingComplete: false,
      },
      metadata: {
        title: "Scam Dunk Marketing Workflow",
        completedSteps: [],
        isWorkflowActive: false,
        lastAutoSave: new Date().toISOString(),
      }
    };

    try {
      const { error } = await supabase
        .from('workflows')
        .update(workflowData)
        .eq('id', 'dbe6f82f-f6d9-436e-a5f1-ce01f596ab4d')
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Data Restored",
        description: "Your Scam Dunk business information has been restored!"
      });
    } catch (error) {
      console.error('Failed to restore data:', error);
      toast({
        title: "Restore Error",
        description: "Failed to restore your business data",
        variant: "destructive"
      });
    }
  }, [user?.id, toast]);

  const loadWorkflow = useCallback(async (workflowId?: string): Promise<WorkflowState | null> => {
    if (!user?.id) return null;

    try {
      let query = supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user.id)
        .eq('workflow_type', 'ai_workflow');

      if (workflowId) {
        query = query.eq('id', workflowId);
      } else {
        query = query.order('updated_at', { ascending: false }).limit(1);
      }

      const { data: workflow, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!workflow) return null;

      console.log('Loading workflow from database:', {
        id: workflow.id,
        business_info_data: workflow.business_info_data,
        hasBusinessInfo: !!workflow.business_info_data,
        updated_at: workflow.updated_at
      });

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
        currentWorkflowId: workflow.id,
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

  const autoSaveWorkflow = useCallback((state: WorkflowState, workflowId?: string) => {
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
      saveWorkflow(state, workflowId);
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
    restoreScamDunkData,
  };
};