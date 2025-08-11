import { useState, useEffect, useCallback } from "react";
import { useWorkflow, type BusinessInfo } from "@/contexts/workflow-context";
import { useWorkflowPersistence } from "@/hooks/use-workflow-persistence";
import { useToast } from "@/hooks/use-toast";
import { log } from '@/utils/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkflowManager } from "@/components/ai-workflow/workflow-manager";
import { WorkflowDataViewer } from "@/components/ai-workflow/workflow-data-viewer";
import { WorkflowDataRestore } from "@/components/ai-workflow/workflow-data-restore";
import { ComprehensiveDataRestore } from "@/components/ai-workflow/comprehensive-data-restore";
import { StrategyContentRestorer } from "@/components/ai-workflow/strategy-content-restorer";
import { 
  Database, 
  RefreshCw, 
  Save, 
  AlertCircle, 
  CheckCircle2,
  Settings,
  Eye,
  Upload
} from "lucide-react";

interface WorkflowDataManagerProps {
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
}

export function WorkflowDataManager({ currentStep, onStepChange }: WorkflowDataManagerProps) {
  const { toast } = useToast();
  const { state, dispatch } = useWorkflow();
  const { saveWorkflow, loadWorkflow } = useWorkflowPersistence();
  
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(
    state.currentWorkflowId || null
  );
  const [showWorkflowManager, setShowWorkflowManager] = useState(!state.businessInfo);
  const [showDataViewer, setShowDataViewer] = useState(false);
  const [showDataRestore, setShowDataRestore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save functionality
  useEffect(() => {
    if (state.businessInfo && currentWorkflowId) {
      const autoSaveTimer = setTimeout(() => {
        handleAutoSave();
      }, 30000); // Auto-save every 30 seconds

      return () => clearTimeout(autoSaveTimer);
    }
  }, [state, currentWorkflowId]);

  // Load workflow on mount
  useEffect(() => {
    if (currentWorkflowId && !state.businessInfo) {
      handleLoadWorkflow();
    }
  }, [currentWorkflowId]);

  const handleAutoSave = useCallback(async () => {
    if (!currentWorkflowId) return;

    try {
      await saveWorkflow();
      setLastSaved(new Date());
    } catch (error) {
      log.error('Auto-save failed', error instanceof Error ? error : new Error(String(error)), { workflowId: currentWorkflowId }, { component: 'WorkflowDataManager', action: 'auto_save' });
      // Don't show error toast for auto-save failures to avoid annoying users
    }
  }, [saveWorkflow, currentWorkflowId]);

  const handleSaveWorkflow = async () => {
    setIsLoading(true);
    try {
      await saveWorkflow();
      setLastSaved(new Date());
      toast({
        title: "Workflow Saved",
        description: "Your progress has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadWorkflow = async () => {
    if (!currentWorkflowId) return;

    setIsLoading(true);
    try {
      await loadWorkflow(currentWorkflowId);
      toast({
        title: "Workflow Loaded",
        description: "Your workflow has been loaded successfully.",
      });
      setShowWorkflowManager(false);
    } catch (error) {
      log.error('Error loading workflow', error instanceof Error ? error : new Error(String(error)), { workflowId: currentWorkflowId }, { component: 'WorkflowDataManager', action: 'load_workflow' });
      toast({
        title: "Load Failed",
        description: "Failed to load workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBusinessInfoUpdate = (businessInfo: BusinessInfo) => {
    dispatch({ type: 'SET_BUSINESS_INFO', payload: businessInfo });
    setShowWorkflowManager(false);
    
    // Move to next step after business info is completed
    if (currentStep === 0) {
      onStepChange(1);
    }

    toast({
      title: "Business Information Updated",
      description: "Your business information has been saved.",
    });
  };

  const handleWorkflowSelect = (workflowId: string | null) => {
    if (workflowId) {
      setCurrentWorkflowId(workflowId);
      dispatch({ type: 'SET_CURRENT_WORKFLOW_ID', payload: workflowId });
      setShowWorkflowManager(false);
      handleLoadWorkflow();
    } else {
      // Create new workflow
      setCurrentWorkflowId(null);
      dispatch({ type: 'RESET_WORKFLOW' });
      setShowWorkflowManager(false);
      onStepChange(0);
    }
  };

  const getWorkflowStatus = () => {
    const completedSteps = [
      state.businessInfo ? 1 : 0,
      state.progress.strategyApproved ? 1 : 0,
      state.progress.plansApproved ? 1 : 0,
      state.progress.contentApproved ? 1 : 0,
      state.progress.schedulingComplete ? 1 : 0,
    ].reduce((sum, val) => sum + val, 0);

    return {
      completed: completedSteps,
      total: 5,
      percentage: (completedSteps / 5) * 100
    };
  };

  const status = getWorkflowStatus();

  // Show workflow manager if requested
  if (showWorkflowManager) {
    return (
      <WorkflowManager
        onSelectWorkflow={handleWorkflowSelect}
        currentWorkflowId={currentWorkflowId}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Workflow Status Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5" />
                Workflow Data Management
              </CardTitle>
              <CardDescription>
                Manage your workflow data, view progress, and restore from backups
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {status.completed}/{status.total} Steps
              </Badge>
              {lastSaved && (
                <span className="text-xs text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {/* Action Buttons */}
            <Button
              onClick={handleSaveWorkflow}
              disabled={isLoading}
              size="sm"
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Progress
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowWorkflowManager(true)}
              size="sm"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Workflow Settings
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowDataViewer(!showDataViewer)}
              size="sm"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {showDataViewer ? 'Hide' : 'View'} Data
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowDataRestore(!showDataRestore)}
              size="sm"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Restore Data
            </Button>
          </div>

          {/* Status Indicators */}
          <div className="mt-4 grid grid-cols-5 gap-2">
            {[
              { label: 'Business', completed: !!state.businessInfo },
              { label: 'Strategy', completed: state.progress.strategyApproved },
              { label: 'Planning', completed: state.progress.plansApproved },
              { label: 'Creation', completed: state.progress.contentApproved },
              { label: 'Scheduling', completed: state.progress.schedulingComplete },
            ].map((step, index) => (
              <div key={step.label} className="text-center">
                <div className={`
                  w-full h-2 rounded-full
                  ${step.completed ? 'bg-green-500' : 'bg-gray-200'}
                `} />
                <span className="text-xs text-gray-600 mt-1 block">
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Viewer */}
      {showDataViewer && (
        <WorkflowDataViewer />
      )}

      {/* Data Restore Options */}
      {showDataRestore && (
        <div className="space-y-4">
          <WorkflowDataRestore />
          <ComprehensiveDataRestore />
          <StrategyContentRestorer />
        </div>
      )}

      {/* Validation Warnings */}
      {!state.businessInfo && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              <div>
                <div className="font-medium">Business Information Required</div>
                <div className="text-sm text-amber-600">
                  Please complete your business information to enable all workflow features.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {status.completed === status.total && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <div className="font-medium">Workflow Complete! 🎉</div>
                <div className="text-sm text-green-600">
                  Your AI marketing workflow is fully configured and ready to use.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}