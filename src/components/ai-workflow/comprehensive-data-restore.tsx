import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkflow } from '@/contexts/workflow-context';
import { useWorkflowPersistence } from '@/hooks/use-workflow-persistence';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, AlertTriangle, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organization';

interface ComprehensiveDataRestoreProps {
  onNavigateToStep?: (stepIndex: number) => void;
}

export function ComprehensiveDataRestore({ onNavigateToStep }: ComprehensiveDataRestoreProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const { state, dispatch } = useWorkflow();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // Only show this component if:
  // 1. We have a workflow ID AND it's not a brand new workflow
  // 2. We have an organization (safety check)
  // 3. We're missing some critical data (data corruption scenario)
  const hasCriticalData = state.businessInfo || state.draftData?.strategySteps?.length > 0;
  const hasOrganization = !!currentOrganization;
  
  // Don't show for:
  // - New workflows (no ID or ID exists but no data was ever saved)
  // - Workflows that already have data
  // - Missing organization
  const isNewOrEmptyWorkflow = !state.currentWorkflowId || state.progress.currentStep === 0;
  
  if (!hasOrganization || hasCriticalData || isNewOrEmptyWorkflow) {
    return null;
  }

  const restoreFullWorkflowData = async () => {
    setIsRestoring(true);
    
    try {
      // Fetch the most recent workflow data from database
      const { data: workflow, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user!.id)
        .eq('organization_id', currentOrganization!.id)
        .eq('workflow_type', 'ai_workflow')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !workflow) {
        throw new Error('No workflow data found in database');
      }

      console.log('Restoring complete workflow data:', {
        workflowId: workflow.id,
        hasDraftData: !!workflow.draft_data,
        hasBusinessInfo: !!workflow.business_info_data,
        draftDataKeys: workflow.draft_data ? Object.keys(workflow.draft_data) : []
      });

      // Construct complete workflow state with proper type casting and progress detection
      const draftData = workflow.draft_data as any;
      const businessInfo = workflow.business_info_data as any;
      
      // Detect actual progress from saved data
      const hasBusinessInfo = !!businessInfo;
      const hasStrategySteps = !!(draftData?.strategySteps?.length > 0);
      const hasMonthlyOverview = !!(draftData?.monthlyOverview?.aiGenerated);
      const hasWeeklyPlans = !!(draftData?.weeklyPlans?.length > 0);
      const hasContentPieces = !!(draftData?.contentPieces?.length > 0);
      const hasApprovedStrategy = !!(workflow.strategy_data);
      const hasApprovedPlans = !!(workflow.plans_data && Array.isArray(workflow.plans_data) && workflow.plans_data.length > 0);
      const hasApprovedContent = !!(workflow.content_data && Array.isArray(workflow.content_data) && workflow.content_data.length > 0);

      // Calculate the correct current step based on actual progress
      let correctCurrentStep = 0;
      let completedSteps: string[] = [];
      
      if (hasBusinessInfo) {
        completedSteps.push('business-info');
        correctCurrentStep = Math.max(correctCurrentStep, 1);
      }
      
      if (hasStrategySteps || hasApprovedStrategy) {
        correctCurrentStep = Math.max(correctCurrentStep, 1); // Stay on strategy step if in progress
        if (hasApprovedStrategy) {
          completedSteps.push('strategy');
          correctCurrentStep = Math.max(correctCurrentStep, 2);
        }
      }
      
      if (hasMonthlyOverview || hasWeeklyPlans || hasApprovedPlans) {
        correctCurrentStep = Math.max(correctCurrentStep, 2); // Stay on planning step if in progress
        if (hasApprovedPlans) {
          completedSteps.push('planning');
          correctCurrentStep = Math.max(correctCurrentStep, 3);
        }
      }
      
      if (hasContentPieces || hasApprovedContent) {
        correctCurrentStep = Math.max(correctCurrentStep, 3); // Stay on content step if in progress
        if (hasApprovedContent) {
          completedSteps.push('creation');
          correctCurrentStep = Math.max(correctCurrentStep, 4);
        }
      }

      const restoredState = {
        businessInfo: businessInfo || null,
        draftData: draftData || null,
        approvedStrategy: (workflow.strategy_data as any) || null,
        approvedPlans: (workflow.plans_data as any) || [],
        approvedContent: (workflow.content_data as any) || [],
        progress: {
          currentStep: correctCurrentStep,
          completedSteps,
          strategyApproved: hasApprovedStrategy,
          plansApproved: hasApprovedPlans,
          contentApproved: hasApprovedContent,
          schedulingComplete: false,
        },
        isWorkflowActive: true, // Mark as active since we have progress
        currentWorkflowId: workflow.id,
      };

      // Restore the complete workflow state
      dispatch({ type: 'LOAD_WORKFLOW', payload: restoredState });

      // Show detailed restoration info
      const restorationDetails = [
        hasBusinessInfo ? '✓ Business Information' : '✗ Business Information',
        hasStrategySteps ? `✓ Strategy Steps (${draftData.strategySteps.length})` : '✗ Strategy Steps',
        hasMonthlyOverview ? '✓ Monthly Overview' : '✗ Monthly Overview',
        hasWeeklyPlans ? `✓ Weekly Plans (${draftData.weeklyPlans.length})` : '✗ Weekly Plans',
        hasContentPieces ? `✓ Content Pieces (${draftData.contentPieces.length})` : '✗ Content Pieces',
        hasApprovedStrategy ? '✓ Approved Strategy' : '✗ Approved Strategy',
        hasApprovedPlans ? `✓ Approved Plans (${restoredState.approvedPlans.length})` : '✗ Approved Plans',
        hasApprovedContent ? `✓ Approved Content (${restoredState.approvedContent.length})` : '✗ Approved Content'
      ];

      console.log('Workflow restoration complete:', {
        restoredData: restorationDetails,
        currentStep: restoredState.progress.currentStep,
        completedSteps: restoredState.progress.completedSteps,
        hasStrategySteps,
        strategyStepsCount: draftData?.strategySteps?.length || 0,
        workflowIsActive: restoredState.isWorkflowActive
      });

      toast({
        title: "Complete Workflow Restored!",
        description: `Restored your ${businessInfo?.company || 'AI'} workflow with ${draftData?.strategySteps?.length || 0} strategy steps and progress to step ${correctCurrentStep}.`,
      });

    } catch (error) {
      console.error('Error restoring complete workflow data:', error);
      toast({
        title: "Restoration Failed",
        description: "Failed to restore workflow data from database. Please check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Database className="h-5 w-5" />
          Restore Complete Workflow Data
        </CardTitle>
        <CardDescription className="text-blue-700">
          Your workflow data exists in the database but isn't loaded properly. 
          Click below to restore all your saved progress, AI-generated content, and strategy work.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={restoreFullWorkflowData}
          disabled={isRestoring}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
          {isRestoring ? 'Restoring Complete Data...' : 'Restore All Workflow Data'}
        </Button>
      </CardContent>
    </Card>
  );
}