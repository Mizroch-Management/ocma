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

// Type definitions for workflow step components
interface BusinessInfoProps {
  onInfoSubmitted: (info: Record<string, unknown>) => void;
}

interface StrategyConsultantProps {
  businessInfo?: Record<string, unknown>;
  onStrategyApproved: (strategy: Record<string, unknown>) => void;
}

interface ContentPlannerProps {
  strategy?: Record<string, unknown>;
  onPlanApproved: (plans: Record<string, unknown>[]) => void;
}

interface ContentCreatorProps {
  contentPlans?: Record<string, unknown>[];
  onContentApproved: (content: Record<string, unknown>[]) => void;
}

type WorkflowStepComponent = 
  | React.ComponentType<BusinessInfoProps>
  | React.ComponentType<StrategyConsultantProps>
  | React.ComponentType<ContentPlannerProps>
  | React.ComponentType<ContentCreatorProps>
  | React.ComponentType<Record<string, never>>;

interface WorkflowStepRendererProps {
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
  onBusinessInfoUpdate: (info: Record<string, unknown>) => void;
}

interface StepConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  component: WorkflowStepComponent;
}

const stepConfig: StepConfig[] = [
  {
    id: 'business-info',
    title: 'Business Information Setup',
    description: 'Tell us about your business to personalize your marketing strategy',
    icon: Building2,
    component: BusinessInfoCollector as WorkflowStepComponent
  },
  {
    id: 'strategy',
    title: 'AI Strategy Development',
    description: 'Our AI analyzes your business and creates a comprehensive marketing strategy',
    icon: Brain,
    component: AIStrategyConsultant as WorkflowStepComponent
  },
  {
    id: 'planning',
    title: 'Smart Content Planning',
    description: 'Generate a detailed content calendar with platform-specific strategies',
    icon: Calendar,
    component: SmartContentPlanner as WorkflowStepComponent
  },
  {
    id: 'creation',
    title: 'Intelligent Content Creation',
    description: 'Create engaging, platform-optimized content based on your strategy',
    icon: Wand2,
    component: IntelligentContentCreator as WorkflowStepComponent
  },
  {
    id: 'scheduling',
    title: 'Automated Scheduling',
    description: 'Set up automated posting schedules and integration dashboards',
    icon: Clock,
    component: WorkflowIntegrationDashboard as WorkflowStepComponent
  }
];

export function WorkflowStepRenderer({ 
  currentStep, 
  onStepChange, 
  onBusinessInfoUpdate 
}: WorkflowStepRendererProps) {
  const { state, dispatch } = useWorkflow();
  
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

  // Allow free navigation between all sections
  const canGoBack = validStep > 0;
  const canGoForward = validStep < stepConfig.length - 1; // Removed completion requirement

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
        {(() => {
          const StepComponentTyped = StepComponent as React.ComponentType<Record<string, unknown>>;
          const componentProps: Record<string, unknown> = { key: `step-${validStep}` };
          
          // Add props based on the current step
          switch (validStep) {
            case 0: // Business Info Collector
              componentProps.onInfoSubmitted = onBusinessInfoUpdate;
              break;
            case 1: // AI Strategy Consultant
              componentProps.businessInfo = state.businessInfo;
              componentProps.onStrategyApproved = (strategy: Record<string, unknown>) => {
                dispatch({ type: 'SET_APPROVED_STRATEGY', payload: strategy });
              };
              break;
            case 2: // Smart Content Planner
              componentProps.strategy = state.approvedStrategy;
              componentProps.onPlanApproved = (plans: Record<string, unknown>[]) => {
                dispatch({ type: 'SET_APPROVED_PLANS', payload: plans });
              };
              break;
            case 3: // Intelligent Content Creator
              componentProps.contentPlans = state.approvedPlans;
              componentProps.onContentApproved = (content: Record<string, unknown>[]) => {
                dispatch({ type: 'SET_APPROVED_CONTENT', payload: content });
              };
              break;
            case 4: // Workflow Integration Dashboard
              // No specific props needed
              break;
          }
          
          return <StepComponentTyped {...componentProps} />;
        })()}
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
                <button
                  key={index}
                  onClick={() => onStepChange(index)}
                  className={`
                    w-3 h-3 rounded-full transition-all cursor-pointer hover:scale-125
                    ${index === validStep 
                      ? 'bg-blue-500 ring-2 ring-blue-300' 
                      : isStepCompleted(index) 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }
                  `}
                  title={`Go to ${stepConfig[index].title}`}
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

      {/* Step Helper Message */}
      {validStep > 0 && !isStepCompleted(validStep - 1) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-700">
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">
                Note: Previous steps may need to be completed for optimal results, but you can work on any section.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}