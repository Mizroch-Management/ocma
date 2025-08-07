import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWorkflow } from "@/contexts/workflow-context";
import { 
  CheckCircle, 
  Clock, 
  ArrowRight,
  Brain, 
  Calendar, 
  Wand2, 
  BarChart3,
  Lightbulb,
  Building2
} from "lucide-react";

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
  progress: number;
  icon: React.ComponentType;
}

interface WorkflowStepNavigationProps {
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
  onManualNavigation: (isManual: boolean) => void;
}

const stepIcons = {
  'business-info': Building2,
  'strategy': Brain,
  'planning': Calendar,
  'creation': Wand2,
  'scheduling': Clock
};

export function WorkflowStepNavigation({ 
  currentStep, 
  onStepChange, 
  onManualNavigation 
}: WorkflowStepNavigationProps) {
  const { state } = useWorkflow();
  
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    {
      id: 'business-info',
      title: 'Business Information',
      description: 'Collect business details to personalize your strategy',
      status: state.businessInfo ? 'completed' : 'active',
      progress: state.businessInfo ? 100 : 0,
      icon: Building2
    },
    {
      id: 'strategy',
      title: 'AI Strategy Consultant',
      description: 'AI analyzes your goals and creates comprehensive marketing strategy',
      status: state.progress.strategyApproved ? 'completed' : 
             state.businessInfo ? 'active' : 'pending',
      progress: state.progress.strategyApproved ? 100 : 0,
      icon: Brain
    },
    {
      id: 'planning',
      title: 'Smart Content Planner',
      description: 'AI generates monthly content strategy with weekly breakdowns',
      status: state.progress.plansApproved ? 'completed' : 
             state.progress.strategyApproved ? 'active' : 'pending',
      progress: state.progress.plansApproved ? 100 : 0,
      icon: Calendar
    },
    {
      id: 'creation',
      title: 'Intelligent Content Creator',
      description: 'AI creates platform-optimized content based on your strategy',
      status: state.progress.contentApproved ? 'completed' : 
             state.progress.plansApproved ? 'active' : 'pending',
      progress: state.progress.contentApproved ? 100 : 0,
      icon: Wand2
    },
    {
      id: 'scheduling',
      title: 'Automated Scheduler',
      description: 'AI optimizes posting times and schedules across all platforms',
      status: state.progress.schedulingComplete ? 'completed' : 
             state.progress.contentApproved ? 'active' : 'pending',
      progress: state.progress.schedulingComplete ? 100 : 0,
      icon: Clock
    }
  ]);

  // Update workflow steps when state changes
  useEffect(() => {
    setWorkflowSteps(prev => prev.map((step, index) => {
      let status: 'pending' | 'active' | 'completed' = 'pending';
      let progress = 0;

      switch (step.id) {
        case 'business-info':
          status = state.businessInfo ? 'completed' : 'active';
          progress = state.businessInfo ? 100 : 0;
          break;
        case 'strategy':
          status = state.progress.strategyApproved ? 'completed' : 
                   state.businessInfo ? 'active' : 'pending';
          progress = state.progress.strategyApproved ? 100 : 0;
          break;
        case 'planning':
          status = state.progress.plansApproved ? 'completed' : 
                   state.progress.strategyApproved ? 'active' : 'pending';
          progress = state.progress.plansApproved ? 100 : 0;
          break;
        case 'creation':
          status = state.progress.contentApproved ? 'completed' : 
                   state.progress.plansApproved ? 'active' : 'pending';
          progress = state.progress.contentApproved ? 100 : 0;
          break;
        case 'scheduling':
          status = state.progress.schedulingComplete ? 'completed' : 
                   state.progress.contentApproved ? 'active' : 'pending';
          progress = state.progress.schedulingComplete ? 100 : 0;
          break;
      }

      return { ...step, status, progress };
    }));
  }, [state.businessInfo, state.progress]);

  const handleStepClick = (stepIndex: number) => {
    const step = workflowSteps[stepIndex];
    
    // Allow navigation to completed steps or the next available step
    if (step.status === 'completed' || step.status === 'active') {
      onManualNavigation(true);
      onStepChange(stepIndex);
    }
  };

  const getOverallProgress = () => {
    const completedSteps = workflowSteps.filter(step => step.status === 'completed').length;
    return (completedSteps / workflowSteps.length) * 100;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'active':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default' as const;
      case 'active':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI Marketing Workflow Progress
        </CardTitle>
        <CardDescription>
          Complete each step to build your comprehensive marketing strategy
        </CardDescription>
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Overall Progress</span>
            <span>{Math.round(getOverallProgress())}%</span>
          </div>
          <Progress value={getOverallProgress()} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            const isCurrentStep = index === currentStep;
            const canNavigate = step.status === 'completed' || step.status === 'active';
            
            return (
              <div key={step.id} className="relative">
                <div
                  className={`
                    flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 cursor-pointer
                    ${isCurrentStep ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                    ${canNavigate ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
                  `}
                  onClick={() => handleStepClick(index)}
                >
                  {/* Step Number & Icon */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                      ${step.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        step.status === 'active' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-500'}
                    `}>
                      {index + 1}
                    </div>
                    <Icon className={`
                      h-5 w-5
                      ${step.status === 'completed' ? 'text-green-500' : 
                        step.status === 'active' ? 'text-blue-500' : 
                        'text-gray-400'}
                    `} />
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{step.title}</h3>
                      <Badge variant={getStatusBadgeVariant(step.status)}>
                        {step.status}
                      </Badge>
                      {getStatusIcon(step.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                    
                    {/* Progress Bar for Active Steps */}
                    {step.status === 'active' && step.progress > 0 && step.progress < 100 && (
                      <div className="mt-2">
                        <Progress value={step.progress} className="h-1" />
                      </div>
                    )}
                  </div>

                  {/* Navigation Arrow */}
                  {canNavigate && (
                    <div className="flex-shrink-0">
                      <ArrowRight className={`
                        h-5 w-5 transition-transform
                        ${isCurrentStep ? 'text-blue-500 transform translate-x-1' : 'text-gray-400'}
                      `} />
                    </div>
                  )}
                </div>

                {/* Connector Line */}
                {index < workflowSteps.length - 1 && (
                  <div className="absolute left-8 top-full w-0.5 h-4 bg-gray-200" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}