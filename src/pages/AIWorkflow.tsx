import { useState, useEffect, useCallback } from "react";
import { useWorkflow, type BusinessInfo } from "@/contexts/workflow-context";
import { useToast } from "@/hooks/use-toast";
import { WorkflowStepNavigation } from "@/components/ai-workflow/workflow-step-navigation";
import { WorkflowProgressTracker } from "@/components/ai-workflow/workflow-progress-tracker";
import { WorkflowStepRenderer } from "@/components/ai-workflow/workflow-step-renderer";
import { WorkflowDataManager } from "@/components/ai-workflow/workflow-data-manager";

/**
 * Refactored AIWorkflow Component
 * 
 * This component has been modularized into focused, reusable components:
 * - WorkflowStepNavigation: Handles step navigation and progress display
 * - WorkflowProgressTracker: Shows detailed progress metrics
 * - WorkflowStepRenderer: Renders the current step content
 * - WorkflowDataManager: Manages workflow data, persistence, and restoration
 * 
 * Benefits of this architecture:
 * - Single Responsibility Principle: Each component has a clear purpose
 * - Better Performance: Components can be memoized independently
 * - Improved Testability: Each component can be tested in isolation
 * - Enhanced Maintainability: Changes are localized to specific components
 * - Reusability: Components can be reused in other parts of the application
 */
export default function AIWorkflow() {
  const { toast } = useToast();
  const { state } = useWorkflow();
  
  // Core workflow state
  const [currentStep, setCurrentStep] = useState(0);
  const [isManualNavigation, setIsManualNavigation] = useState(false);
  const [showWorkflowManager, setShowWorkflowManager] = useState(!state.businessInfo);

  /**
   * Determine the appropriate step based on workflow state
   * This replaces the complex useEffect logic from the original component
   */
  const determineCurrentStep = useCallback((): number => {
    // If manually navigated, respect the user's choice
    if (isManualNavigation) {
      return currentStep;
    }

    // Determine step based on completed work
    if (!state.businessInfo) {
      return 0; // Business Info step
    }
    
    if (!state.progress.strategyApproved && !state.approvedStrategy) {
      return 1; // Strategy step
    }
    
    if (!state.progress.plansApproved && (!state.approvedPlans || state.approvedPlans.length === 0)) {
      return 2; // Planning step
    }
    
    if (!state.progress.contentApproved && (!state.approvedContent || state.approvedContent.length === 0)) {
      return 3; // Creation step
    }
    
    if (!state.progress.schedulingComplete) {
      return 4; // Scheduling step
    }
    
    return 4; // All steps complete, stay on final step
  }, [state, isManualNavigation, currentStep]);

  /**
   * Update current step when workflow state changes
   */
  useEffect(() => {
    const newStep = determineCurrentStep();
    if (newStep !== currentStep && !isManualNavigation) {
      setCurrentStep(newStep);
    }
  }, [determineCurrentStep, currentStep, isManualNavigation]);

  /**
   * Handle step navigation from child components
   */
  const handleStepChange = useCallback((stepIndex: number) => {
    setCurrentStep(stepIndex);
    setIsManualNavigation(true);
    
    // Reset manual navigation flag after a delay to allow auto-progression
    setTimeout(() => {
      setIsManualNavigation(false);
    }, 5000);
  }, []);

  /**
   * Handle manual navigation flag from child components
   */
  const handleManualNavigation = useCallback((isManual: boolean) => {
    setIsManualNavigation(isManual);
  }, []);

  /**
   * Handle business information updates
   */
  const handleBusinessInfoUpdate = useCallback((businessInfo: BusinessInfo) => {
    // Business info is handled by WorkflowDataManager
    // This callback is here for compatibility with WorkflowStepRenderer
    toast({
      title: "Business Information Updated",
      description: "Moving to next step...",
    });
  }, [toast]);

  /**
   * Show workflow manager if no business info
   */
  if (showWorkflowManager) {
    return (
      <div className="container mx-auto px-4 py-6">
        <WorkflowDataManager
          currentStep={currentStep}
          onStepChange={handleStepChange}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Marketing Workflow</h1>
          <p className="text-gray-600 mt-2">
            Complete your AI-powered marketing setup step by step
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Navigation & Progress */}
          <div className="lg:col-span-1 space-y-6">
            <WorkflowStepNavigation
              currentStep={currentStep}
              onStepChange={handleStepChange}
              onManualNavigation={handleManualNavigation}
            />
            
            <WorkflowProgressTracker currentStep={currentStep} />
          </div>

          {/* Right Column: Step Content */}
          <div className="lg:col-span-2">
            <WorkflowStepRenderer
              currentStep={currentStep}
              onStepChange={handleStepChange}
              onBusinessInfoUpdate={handleBusinessInfoUpdate}
            />
          </div>
        </div>

        {/* Bottom Section: Data Management */}
        <WorkflowDataManager
          currentStep={currentStep}
          onStepChange={handleStepChange}
        />
      </div>
    </div>
  );
}

/**
 * Performance Notes:
 * - Components can be wrapped with React.memo() for better performance
 * - State updates are minimized and localized to relevant components
 * - Complex calculations are memoized with useCallback and useMemo
 * - Auto-save functionality is handled by WorkflowDataManager
 * 
 * Maintainability Notes:
 * - Each component has a single, clear responsibility
 * - Props interfaces are well-defined and documented
 * - Error handling is centralized in the toast system
 * - State management follows predictable patterns
 * 
 * Testability Notes:
 * - Components can be tested in isolation
 * - Props are explicit and easy to mock
 * - Business logic is separated from presentation logic
 * - Side effects are clearly defined and contained
 */