import { useEffect, useState } from "react";
import { useWorkflow } from "@/contexts/workflow-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Calendar,
  Target
} from "lucide-react";

interface ProgressMetric {
  label: string;
  value: number;
  total: number;
  status: 'completed' | 'in-progress' | 'pending';
  icon: React.ComponentType;
}

interface WorkflowProgressTrackerProps {
  currentStep: number;
}

export function WorkflowProgressTracker({ currentStep }: WorkflowProgressTrackerProps) {
  const { state } = useWorkflow();
  const [progressMetrics, setProgressMetrics] = useState<ProgressMetric[]>([]);

  useEffect(() => {
    const metrics: ProgressMetric[] = [
      {
        label: 'Business Setup',
        value: state.businessInfo ? 1 : 0,
        total: 1,
        status: state.businessInfo ? 'completed' : currentStep === 0 ? 'in-progress' : 'pending',
        icon: Target
      },
      {
        label: 'Strategy Development',
        value: state.progress.strategyApproved ? 1 : 0,
        total: 1,
        status: state.progress.strategyApproved ? 'completed' : currentStep === 1 ? 'in-progress' : 'pending',
        icon: TrendingUp
      },
      {
        label: 'Content Planning',
        value: state.approvedPlans ? state.approvedPlans.length : 0,
        total: 4, // Assuming 4 weeks of content planning
        status: state.progress.plansApproved ? 'completed' : currentStep === 2 ? 'in-progress' : 'pending',
        icon: Calendar
      },
      {
        label: 'Content Creation',
        value: state.approvedContent ? state.approvedContent.length : 0,
        total: 20, // Estimated number of content pieces
        status: state.progress.contentApproved ? 'completed' : currentStep === 3 ? 'in-progress' : 'pending',
        icon: CheckCircle2
      },
      {
        label: 'Scheduling Setup',
        value: state.progress.schedulingComplete ? 1 : 0,
        total: 1,
        status: state.progress.schedulingComplete ? 'completed' : currentStep === 4 ? 'in-progress' : 'pending',
        icon: Clock
      }
    ];

    setProgressMetrics(metrics);
  }, [state, currentStep]);

  const getOverallProgress = () => {
    const totalCompleted = progressMetrics.reduce((acc, metric) => acc + metric.value, 0);
    const totalPossible = progressMetrics.reduce((acc, metric) => acc + metric.total, 0);
    return totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0;
  };

  const getCompletedStepsCount = () => {
    return progressMetrics.filter(metric => metric.status === 'completed').length;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'in-progress':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Progress Overview
        </CardTitle>
        <CardDescription>
          Track your workflow completion across all steps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Completion</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {getCompletedStepsCount()}/{progressMetrics.length} Steps
              </Badge>
              <span className="text-sm text-gray-600">
                {Math.round(getOverallProgress())}%
              </span>
            </div>
          </div>
          <Progress value={getOverallProgress()} className="h-2" />
        </div>

        {/* Individual Step Progress */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700">Step Details</h4>
          {progressMetrics.map((metric, index) => {
            const Icon = metric.icon;
            const progressPercentage = metric.total > 0 ? (metric.value / metric.total) * 100 : 0;
            
            return (
              <div key={metric.label} className={`p-3 rounded-lg border ${getStatusColor(metric.status)}`}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{metric.label}</span>
                    {getStatusIcon(metric.status)}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600 mb-1">
                      {metric.value}/{metric.total}
                    </div>
                    <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${getProgressColor(metric.status)}`}
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Step Indicator */}
        {currentStep < progressMetrics.length && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Currently working on: {progressMetrics[currentStep]?.label}
              </span>
            </div>
          </div>
        )}

        {/* Completion Celebration */}
        {getOverallProgress() === 100 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <h4 className="font-semibold text-green-800 mb-1">
              🎉 Workflow Complete!
            </h4>
            <p className="text-sm text-green-700">
              Your AI marketing workflow is fully set up and ready to generate results.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}