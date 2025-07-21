
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWorkflow } from "@/contexts/workflow-context";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  Target, 
  BarChart3, 
  FileText, 
  CheckCircle, 
  ArrowRight,
  RefreshCw 
} from "lucide-react";

export function WorkflowIntegrationDashboard() {
  const { state, dispatch } = useWorkflow();
  const navigate = useNavigate();

  if (!state.isWorkflowActive) {
    return null;
  }

  const overallProgress = (
    (state.progress.strategyApproved ? 25 : 0) +
    (state.progress.plansApproved ? 25 : 0) +
    (state.progress.contentApproved ? 25 : 0) +
    (state.progress.schedulingComplete ? 25 : 0)
  );

  const handleViewInSection = (section: string) => {
    navigate(`/${section}`);
  };

  const handleResetWorkflow = () => {
    if (confirm('Are you sure you want to reset the workflow? This will clear all approved content.')) {
      dispatch({ type: 'RESET_WORKFLOW' });
      navigate('/ai-workflow');
    }
  };

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-background">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              AI Workflow Integration
            </CardTitle>
            <CardDescription>
              Your approved AI workflow is now integrated across the application
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetWorkflow}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Workflow
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Workflow Progress</span>
              <span className="text-sm text-muted-foreground">{overallProgress}% Complete</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Strategy Section */}
            <Card className="border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <Badge variant={state.progress.strategyApproved ? "default" : "secondary"}>
                    {state.progress.strategyApproved ? "Applied" : "Pending"}
                  </Badge>
                </div>
                <h4 className="font-semibold text-sm mb-1">Strategy</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  {state.approvedStrategy ? "AI strategy integrated" : "No strategy applied"}
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleViewInSection('strategy')}
                  disabled={!state.progress.strategyApproved}
                >
                  View Strategy
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Calendar Section */}
            <Card className="border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <Badge variant={state.approvedContent.length > 0 ? "default" : "secondary"}>
                    {state.approvedContent.length} Items
                  </Badge>
                </div>
                <h4 className="font-semibold text-sm mb-1">Calendar</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Content scheduled automatically
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleViewInSection('calendar')}
                  disabled={state.approvedContent.length === 0}
                >
                  View Calendar
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Content Creation Section */}
            <Card className="border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <Badge variant={state.approvedPlans.length > 0 ? "default" : "secondary"}>
                    {state.approvedPlans.length} Plans
                  </Badge>
                </div>
                <h4 className="font-semibold text-sm mb-1">Content</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Templates and themes ready
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleViewInSection('content-creation')}
                  disabled={state.approvedPlans.length === 0}
                >
                  Create Content
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Analytics Section */}
            <Card className="border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                  <Badge variant={state.progress.strategyApproved ? "default" : "secondary"}>
                    {state.progress.strategyApproved ? "Tracking" : "Pending"}
                  </Badge>
                </div>
                <h4 className="font-semibold text-sm mb-1">Analytics</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Performance tracking active
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleViewInSection('analytics')}
                  disabled={!state.progress.strategyApproved}
                >
                  View Analytics
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {state.approvedStrategy && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Current Strategy: {state.approvedStrategy.title}</h4>
              <p className="text-xs text-muted-foreground">
                {state.approvedStrategy.objectives}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
