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

export function ComprehensiveDataRestore() {
  const [isRestoring, setIsRestoring] = useState(false);
  const { dispatch } = useWorkflow();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

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

      // Construct complete workflow state with proper type casting
      const restoredState = {
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

      // Restore the complete workflow state
      dispatch({ type: 'LOAD_WORKFLOW', payload: restoredState });

      // Show detailed restoration info
      const draftData = restoredState.draftData as any;
      const businessInfo = restoredState.businessInfo as any;
      const restorationDetails = [
        restoredState.businessInfo ? '✓ Business Information' : '✗ Business Information',
        draftData?.strategySteps?.length ? `✓ Strategy Steps (${draftData.strategySteps.length})` : '✗ Strategy Steps',
        draftData?.monthlyOverview?.aiGenerated ? '✓ Monthly Overview' : '✗ Monthly Overview',
        draftData?.weeklyPlans?.length ? `✓ Weekly Plans (${draftData.weeklyPlans.length})` : '✗ Weekly Plans',
        draftData?.contentPieces?.length ? `✓ Content Pieces (${draftData.contentPieces.length})` : '✗ Content Pieces',
        restoredState.approvedStrategy ? '✓ Approved Strategy' : '✗ Approved Strategy',
        restoredState.approvedPlans?.length ? `✓ Approved Plans (${restoredState.approvedPlans.length})` : '✗ Approved Plans',
        restoredState.approvedContent?.length ? `✓ Approved Content (${restoredState.approvedContent.length})` : '✗ Approved Content'
      ];

      console.log('Workflow restoration complete:', {
        restoredData: restorationDetails,
        currentStep: restoredState.progress.currentStep,
        completedSteps: restoredState.progress.completedSteps
      });

      toast({
        title: "Complete Workflow Restored!",
        description: `Restored your ${businessInfo?.company || 'AI'} workflow with all saved progress and AI-generated content.`,
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