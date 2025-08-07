import React from "react";
import { BusinessInfoCollector } from "@/components/ai-workflow/business-info-collector";
import { AIStrategyConsultant } from "@/components/ai-workflow/ai-strategy-consultant";
import { SmartContentPlanner } from "@/components/ai-workflow/smart-content-planner";
import { IntelligentContentCreator } from "@/components/ai-workflow/intelligent-content-creator";
import { WorkflowIntegrationDashboard } from "@/components/workflow/workflow-integration-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkflow } from "@/contexts/workflow-context";
import { 
  Building2, 
  Brain, 
  Calendar, 
  Wand2, 
  Clock,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkflowStepRendererProps {
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
  onBusinessInfoUpdate: (info: any) => void;
}

const stepConfig = [
  {
    id: 'business-info',
    title: 'Business Information Setup',
    description: 'Tell us about your business to personalize your marketing strategy',
    icon: Building2,
    component: BusinessInfoCollector
  },
  {
    id: 'strategy',
    title: 'AI Strategy Development',
    description: 'Our AI analyzes your business and creates a comprehensive marketing strategy',
    icon: Brain,
    component: AIStrategyConsultant
  },
  {
    id: 'planning',
    title: 'Smart Content Planning',
    description: 'Generate a detailed content calendar with platform-specific strategies',
    icon: Calendar,
    component: SmartContentPlanner
  },
  {
    id: 'creation',
    title: 'Intelligent Content Creation',
    description: 'Create engaging, platform-optimized content based on your strategy',
    icon: Wand2,
    component: IntelligentContentCreator
  },
  {
    id: 'scheduling',
    title: 'Automated Scheduling',
    description: 'Set up automated posting schedules and integration dashboards',
    icon: Clock,
    component: WorkflowIntegrationDashboard
  }
];

export function WorkflowStepRenderer({ 
  currentStep, 
  onStepChange, 
  onBusinessInfoUpdate 
}: WorkflowStepRendererProps) {
  const { state } = useWorkflow();
  
  // Ensure currentStep is within bounds
  const validStep = Math.max(0, Math.min(currentStep, stepConfig.length - 1));
  const step = stepConfig[validStep];

  if (!step) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Invalid step configuration
          </div>
        </CardContent>
      </Card>
    );
  }

  const Icon = step.icon;
  const StepComponent = step.component;

  const canGoBack = validStep > 0;
  const canGoForward = validStep < stepConfig.length - 1 && isStepCompleted(validStep);

  function isStepCompleted(stepIndex: number): boolean {
    switch (stepIndex) {
      case 0: // Business Info
        return !!state.businessInfo;
      case 1: // Strategy
        return state.progress.strategyApproved || !!state.approvedStrategy;
      case 2: // Planning
        return state.progress.plansApproved || (state.approvedPlans && state.approvedPlans.length > 0);
      case 3: // Creation
        return state.progress.contentApproved || (state.approvedContent && state.approvedContent.length > 0);
      case 4: // Scheduling
        return state.progress.schedulingComplete;
      default:
        return false;
    }
  }

  const handlePrevious = () => {
    if (canGoBack) {
      onStepChange(validStep - 1);
    }
  };

  const handleNext = () => {
    if (canGoForward) {
      onStepChange(validStep + 1);
    }
  };

  const getStepStatus = () => {
    if (isStepCompleted(validStep)) {
      return { color: 'text-green-600', text: 'Completed' };
    }
    return { color: 'text-blue-600', text: 'In Progress' };
  };

  const status = getStepStatus();

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">{step.title}</CardTitle>
                <span className={`text-sm font-medium ${status.color}`}>
                  {status.text}
                </span>
              </div>
              <CardDescription className="mt-1">
                {step.description}
              </CardDescription>
            </div>
            <div className="text-sm text-gray-500">
              Step {validStep + 1} of {stepConfig.length}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {React.createElement(StepComponent, {
          // Business Info Collector props
          onInfoSubmitted: onBusinessInfoUpdate,
          
          // AI Strategy Consultant props
          businessInfo: state.businessInfo,
          onStrategyApproved: (strategy: any) => {
            // This will be handled by the workflow context
          },
          
          // Smart Content Planner props
          strategy: state.approvedStrategy,
          onPlanApproved: (plans: any[]) => {
            // This will be handled by the workflow context
          },
          
          // Intelligent Content Creator props
          contentPlans: state.approvedPlans,
          onContentApproved: (content: any[]) => {
            // This will be handled by the workflow context
          },
          
          key: `step-${validStep}` // Force re-render when step changes
        })}
      </div>

      {/* Navigation Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={!canGoBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous Step
            </Button>

            <div className="flex items-center gap-2">
              {stepConfig.map((_, index) => (
                <div
                  key={index}
                  className={`
                    w-2 h-2 rounded-full transition-colors
                    ${index === validStep 
                      ? 'bg-blue-500' 
                      : isStepCompleted(index) 
                        ? 'bg-green-500' 
                        : 'bg-gray-300'
                    }
                  `}
                />
              ))}
            </div>

            <Button
              variant={canGoForward ? "default" : "outline"}
              onClick={handleNext}
              disabled={!canGoForward}
              className="flex items-center gap-2"
            >
              {validStep === stepConfig.length - 1 ? 'Complete Workflow' : 'Next Step'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step Validation Messages */}
      {validStep > 0 && !isStepCompleted(validStep - 1) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-700">
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">
                Complete the previous step to unlock all features of this step.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}