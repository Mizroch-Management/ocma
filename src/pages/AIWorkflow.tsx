
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { BusinessInfoCollector } from "@/components/ai-workflow/business-info-collector";
import { AIStrategyConsultant } from "@/components/ai-workflow/ai-strategy-consultant";
import { SmartContentPlanner } from "@/components/ai-workflow/smart-content-planner";
import { IntelligentContentCreator } from "@/components/ai-workflow/intelligent-content-creator";
import { WorkflowIntegrationDashboard } from "@/components/workflow/workflow-integration-dashboard";
import { WorkflowDataViewer } from "@/components/ai-workflow/workflow-data-viewer";
import { WorkflowManager } from "@/components/ai-workflow/workflow-manager";
import { WorkflowDataRestore } from "@/components/ai-workflow/workflow-data-restore";
import { ComprehensiveDataRestore } from "@/components/ai-workflow/comprehensive-data-restore";
import { useWorkflow, type BusinessInfo } from "@/contexts/workflow-context";
import { useWorkflowPersistence } from "@/hooks/use-workflow-persistence";
import { 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  Brain, 
  Calendar, 
  Wand2, 
  BarChart3,
  Lightbulb,
  Building2
} from "lucide-react";

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
  progress: number;
}


export default function AIWorkflow() {
  const { toast } = useToast();
  const { state, dispatch } = useWorkflow();
  const { saveWorkflow, loadWorkflow } = useWorkflowPersistence();
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(state.currentWorkflowId || null);
  const [showWorkflowManager, setShowWorkflowManager] = useState(!state.businessInfo);
  const [currentStep, setCurrentStep] = useState(0);
  
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    {
      id: 'business-info',
      title: 'Business Information',
      description: 'Collect business details to personalize your strategy',
      status: businessInfo ? 'completed' : 'active',
      progress: businessInfo ? 100 : 0
    },
    {
      id: 'strategy',
      title: 'AI Strategy Consultant',
      description: 'AI analyzes your goals and creates comprehensive marketing strategy',
      status: state.progress.strategyApproved ? 'completed' : 
             businessInfo ? 'active' : 'pending',
      progress: state.progress.strategyApproved ? 100 : 0
    },
    {
      id: 'planning',
      title: 'Smart Content Planner',
      description: 'AI generates monthly content strategy with weekly breakdowns',
      status: state.progress.plansApproved ? 'completed' : 
             state.progress.strategyApproved ? 'active' : 'pending',
      progress: state.progress.plansApproved ? 100 : 0
    },
    {
      id: 'creation',
      title: 'Intelligent Content Creator',
      description: 'AI creates platform-optimized content based on your strategy',
      status: state.progress.contentApproved ? 'completed' : 
             state.progress.plansApproved ? 'active' : 'pending',
      progress: state.progress.contentApproved ? 100 : 0
    },
    {
      id: 'scheduling',
      title: 'Automated Scheduler',
      description: 'AI optimizes posting times and schedules across all platforms',
      status: state.progress.schedulingComplete ? 'completed' : 
             state.progress.contentApproved ? 'active' : 'pending',
      progress: state.progress.schedulingComplete ? 100 : 0
    }
  ]);

  // Update current step based on loaded workflow state
  useEffect(() => {
    if (state.businessInfo || (state.progress.completedSteps && state.progress.completedSteps.includes("1"))) {
      const hasBusinessInfo = !!state.businessInfo;
      const hasStrategy = !!state.approvedStrategy || state.progress.strategyApproved;
      const hasPlans = (state.approvedPlans && state.approvedPlans.length > 0) || state.progress.plansApproved;
      const hasContent = (state.approvedContent && state.approvedContent.length > 0) || state.progress.contentApproved;
      
      if (hasContent) {
        setCurrentStep(4);
      } else if (hasPlans) {
        setCurrentStep(3);
      } else if (hasStrategy) {
        setCurrentStep(2);
      } else if (hasBusinessInfo) {
        setCurrentStep(1);
      }
    }
  }, [state]);

  useEffect(() => {
    if (state.businessInfo) {
      setBusinessInfo(state.businessInfo);
      setShowWorkflowManager(false);
    }
  }, [state.businessInfo]);

  const handleSelectWorkflow = async (workflowId: string | null) => {
    if (workflowId) {
      try {
        console.log('Loading workflow:', workflowId);
        const workflowState = await loadWorkflow(workflowId);
        console.log('Loaded workflow state:', workflowState);
        
        if (workflowState) {
          dispatch({ type: 'LOAD_WORKFLOW', payload: workflowState });
          setCurrentWorkflowId(workflowId);
          setShowWorkflowManager(false);
          
          // Update the local businessInfo state
          if (workflowState.businessInfo) {
            console.log('Setting business info:', workflowState.businessInfo);
            setBusinessInfo(workflowState.businessInfo);
          }
          
          // Update workflow steps based on loaded state with data verification
          const hasBusinessInfo = !!workflowState.businessInfo;
          const hasStrategy = !!workflowState.approvedStrategy || workflowState.progress.strategyApproved;
          const hasPlans = (workflowState.approvedPlans && workflowState.approvedPlans.length > 0) || workflowState.progress.plansApproved;
          const hasContent = (workflowState.approvedContent && workflowState.approvedContent.length > 0) || workflowState.progress.contentApproved;
          
          setWorkflowSteps(prev => prev.map((step, index) => {
            switch (index) {
              case 0:
                return { ...step, status: hasBusinessInfo ? 'completed' : 'active', progress: hasBusinessInfo ? 100 : 0 };
              case 1:
                return { ...step, status: hasStrategy ? 'completed' : hasBusinessInfo ? 'active' : 'pending', progress: hasStrategy ? 100 : 0 };
              case 2:
                return { ...step, status: hasPlans ? 'completed' : hasStrategy ? 'active' : 'pending', progress: hasPlans ? 100 : 0 };
              case 3:
                return { ...step, status: hasContent ? 'completed' : hasPlans ? 'active' : 'pending', progress: hasContent ? 100 : 0 };
              case 4:
                return { ...step, status: workflowState.progress.schedulingComplete ? 'completed' : hasContent ? 'active' : 'pending', progress: workflowState.progress.schedulingComplete ? 100 : 0 };
              default:
                return step;
            }
          }));
          
          toast({
            title: "Workflow Loaded",
            description: "Your workflow has been restored successfully!"
          });
        } else {
          toast({
            title: "Error",
            description: "Workflow not found or could not be loaded",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error loading workflow:', error);
        toast({
          title: "Error",
          description: "Failed to load workflow",
          variant: "destructive"
        });
      }
    } else {
      setCurrentWorkflowId(null);
      setShowWorkflowManager(true);
    }
  };

  const handleBusinessInfoSubmitted = (info: BusinessInfo) => {
    setBusinessInfo(info);
    dispatch({ type: 'SET_BUSINESS_INFO', payload: info });
    
    setWorkflowSteps(prev => prev.map((step, index) => 
      index === 0 
        ? { ...step, status: 'completed', progress: 100 }
        : index === 1 
        ? { ...step, status: 'active' }
        : step
    ));
    
    setCurrentStep(1);
    
    toast({
      title: "Business Information Saved",
      description: "Information collected. Ready to create your AI strategy!"
    });
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    setWorkflowSteps(prev => prev.map((step, index) => ({
      ...step,
      status: index < stepIndex 
        ? 'completed' 
        : index === stepIndex 
        ? 'active' 
        : 'pending'
    })));
  };

  const invalidateSubsequentSteps = (fromStep: number) => {
    // Clear subsequent step data and reset their status
    if (fromStep <= 1) {
      dispatch({ type: 'SET_APPROVED_STRATEGY', payload: null });
      dispatch({ type: 'SET_APPROVED_PLANS', payload: [] });
      dispatch({ type: 'SET_APPROVED_CONTENT', payload: [] });
      dispatch({ type: 'SET_DRAFT_DATA', payload: null });
    } else if (fromStep <= 2) {
      dispatch({ type: 'SET_APPROVED_PLANS', payload: [] });
      dispatch({ type: 'SET_APPROVED_CONTENT', payload: [] });
    } else if (fromStep <= 3) {
      dispatch({ type: 'SET_APPROVED_CONTENT', payload: [] });
    }
    
    setWorkflowSteps(prev => prev.map((step, index) => {
      if (index > fromStep) {
        return { ...step, status: 'pending', progress: 0 };
      }
      return step;
    }));
    
    toast({
      title: "Workflow Updated",
      description: "Subsequent steps will be regenerated based on your changes",
    });
  };

  const handleStrategyApproved = (strategy: any) => {
    const workflowStrategy = {
      id: Date.now().toString(),
      title: strategy.name || "AI-Generated Marketing Strategy",
      objectives: businessInfo?.primaryObjectives || "",
      targetMarkets: businessInfo?.targetMarkets || "",
      budget: businessInfo?.budget || "",
      compliance: "Standard compliance requirements",
      toneOfVoice: businessInfo?.brandPersonality || "Professional and engaging",
      brandGuidelines: businessInfo?.uniqueSellingPoints || "",
      keyMetrics: businessInfo?.keyMetrics || "",
      additionalContext: businessInfo?.additionalContext || "",
      createdAt: new Date(),
      isAIGenerated: true,
      businessInfo: businessInfo,
      strategySteps: strategy.steps || []
    };

    dispatch({ type: 'SET_APPROVED_STRATEGY', payload: workflowStrategy });
    
    setWorkflowSteps(prev => prev.map((step, index) => 
      index === 1 
        ? { ...step, status: 'completed', progress: 100 }
        : index === 2 
        ? { ...step, status: 'active' }
        : step
    ));
    
    setCurrentStep(2);
    
    toast({
      title: "Strategy Phase Complete",
      description: "Strategy saved and integrated across the app. Moving to content planning phase..."
    });
  };

  const handlePlansApproved = (plans: any[]) => {
    const contentPlans = plans.map((plan, index) => ({
      id: `plan-${Date.now()}-${index}`,
      weekNumber: index + 1,
      theme: plan.theme,
      objectives: plan.objectives || [],
      contentPillars: plan.contentPillars || [],
      platforms: plan.platforms || [],
      frequency: plan.frequency || "Daily",
      keyMessages: plan.keyMessages || [],
      createdAt: new Date(),
    }));

    dispatch({ type: 'SET_APPROVED_PLANS', payload: contentPlans });
    
    setWorkflowSteps(prev => prev.map((step, index) => 
      index === 2 
        ? { ...step, status: 'completed', progress: 100 }
        : index === 3 
        ? { ...step, status: 'active' }
        : step
    ));
    
    setCurrentStep(3);
    
    toast({
      title: "Planning Phase Complete",
      description: "Content plans saved and available in Calendar. Moving to content creation phase..."
    });
  };

  const handleContentApproved = (content: any[]) => {
    const generatedContent = content.map((item, index) => ({
      id: `content-${Date.now()}-${index}`,
      title: item.title,
      content: item.content,
      platforms: item.platforms || [],
      scheduledDate: item.scheduledDate || new Date(),
      timezone: item.timezone || 'UTC',
      status: 'scheduled' as const,
      platformOptimizations: item.platformOptimizations || {},
      planId: state.approvedPlans[0]?.id || '',
      createdAt: new Date(),
    }));

    dispatch({ type: 'SET_APPROVED_CONTENT', payload: generatedContent });
    
    setWorkflowSteps(prev => prev.map((step, index) => 
      index === 3 
        ? { ...step, status: 'completed', progress: 100 }
        : index === 4 
        ? { ...step, status: 'active' }
        : step
    ));
    
    setCurrentStep(4);
    
    toast({
      title: "Content Creation Complete",
      description: "Content saved and scheduled in Calendar. Ready for automated scheduling..."
    });
  };

  const handleSchedulingComplete = () => {
    dispatch({ 
      type: 'UPDATE_PROGRESS', 
      payload: { schedulingComplete: true, currentStep: 4 }
    });
    
    setWorkflowSteps(prev => prev.map((step, index) => 
      index === 4 ? { ...step, status: 'completed', progress: 100 } : step
    ));
    
    toast({
      title: "Workflow Complete!",
      description: "Your AI-driven marketing strategy is now live and integrated across all sections."
    });
  };

  const getStepIcon = (stepId: string, status: string) => {
    const iconProps = { className: "h-5 w-5" };
    
    if (status === 'completed') {
      return <CheckCircle {...iconProps} className="h-5 w-5 text-green-600" />;
    }
    
    switch (stepId) {
      case 'business-info': return <Building2 {...iconProps} />;
      case 'strategy': return <Brain {...iconProps} />;
      case 'planning': return <Calendar {...iconProps} />;
      case 'creation': return <Wand2 {...iconProps} />;
      case 'scheduling': return <Clock {...iconProps} />;
      default: return <Lightbulb {...iconProps} />;
    }
  };

  const overallProgress = workflowSteps.reduce((acc, step) => acc + step.progress, 0) / workflowSteps.length;

  // Show workflow manager if no workflow is selected or no business info
  if (showWorkflowManager) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Marketing Workflows</h1>
            <p className="text-muted-foreground mt-2">
              Manage your AI-driven marketing automation projects
            </p>
          </div>
        </div>
        
        <WorkflowManager 
          onSelectWorkflow={handleSelectWorkflow}
          currentWorkflowId={currentWorkflowId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI-Driven Marketing Workflow</h1>
          <p className="text-muted-foreground mt-2">
            Complete marketing automation from strategy to content creation to scheduling
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => setShowWorkflowManager(true)}
            variant="outline"
            size="sm"
          >
            All Workflows
          </Button>
          <Button 
            onClick={() => saveWorkflow(state, currentWorkflowId || undefined)}
            variant="outline"
            size="sm"
          >
            Save Progress
          </Button>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{Math.round(overallProgress)}%</div>
            <div className="text-sm text-muted-foreground">Complete</div>
          </div>
        </div>
      </div>

      {/* Data Restore Components */}
      <ComprehensiveDataRestore />
      <WorkflowDataRestore />
      
      {/* Integration Dashboard */}
      <WorkflowIntegrationDashboard />
      
      {/* Workflow Data Viewer */}
      <WorkflowDataViewer />

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Workflow Progress
          </CardTitle>
          <CardDescription>
            Track your progress through the AI-powered marketing workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={overallProgress} className="w-full h-2" />
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (step.status === 'completed' || step.status === 'active') {
                        setCurrentStep(index);
                        if (index > 0 && step.status === 'completed') {
                          invalidateSubsequentSteps(index);
                        }
                      }
                    }}
                    disabled={step.status === 'pending'}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      step.status === 'pending' 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'cursor-pointer hover:bg-muted'
                    } ${currentStep === index ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      step.status === 'completed' ? 'bg-green-100 text-green-600' :
                      step.status === 'active' ? 'bg-primary/10 text-primary' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {getStepIcon(step.id, step.status)}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-sm">{step.title}</h3>
                      <Badge variant={
                        step.status === 'completed' ? 'default' :
                        step.status === 'active' ? 'secondary' :
                        'outline'
                      } className="text-xs">
                        {step.status}
                      </Badge>
                    </div>
                  </button>
                  {step.status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentStep(index);
                        invalidateSubsequentSteps(index);
                      }}
                      className="text-xs"
                    >
                      Edit & Regenerate
                    </Button>
                  )}
                  {index < workflowSteps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Components */}
      <div className="space-y-8">
        {/* Step 1: Business Info Collector */}
        {(currentStep === 0 || (!businessInfo && !state.businessInfo)) && (
          <BusinessInfoCollector 
            onInfoSubmitted={handleBusinessInfoSubmitted}
          />
        )}

        {/* Step 2: AI Strategy Consultant */}
        {currentStep === 1 && (businessInfo || state.businessInfo) && (
          <AIStrategyConsultant 
            onStrategyApproved={handleStrategyApproved}
            businessInfo={businessInfo || state.businessInfo}
          />
        )}

        {/* Step 3: Smart Content Planner */}
        {currentStep === 2 && (state.progress.strategyApproved || state.approvedStrategy) && (
          <>
            <Separator />
            <SmartContentPlanner 
              strategy={state.approvedStrategy}
              onPlanApproved={handlePlansApproved}
            />
          </>
        )}

        {/* Step 4: Intelligent Content Creator */}
        {currentStep === 3 && (state.progress.plansApproved || (state.approvedPlans && state.approvedPlans.length > 0)) && (
          <>
            <Separator />
            <IntelligentContentCreator 
              contentPlans={state.approvedPlans}
              onContentApproved={handleContentApproved}
            />
          </>
        )}

        {/* Step 5: Automated Scheduler */}
        {state.progress.contentApproved && !state.progress.schedulingComplete && (
          <>
            <Separator />
            <Card className="border-green-200 bg-gradient-to-r from-green-50 to-background">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Automated Scheduler</CardTitle>
                      <CardDescription>
                        AI optimizes posting times and schedules across all platforms
                      </CardDescription>
                    </div>
                  </div>
                  
                  <Button onClick={handleSchedulingComplete} size="lg" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activate Scheduler
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Content Ready</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">{state.approvedContent.length}</div>
                      <p className="text-sm text-muted-foreground">Pieces ready for scheduling</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Optimal Times</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>LinkedIn:</strong> Tue-Thu 10 AM
                        </div>
                        <div className="text-sm">
                          <strong>Instagram:</strong> Wed-Fri 2 PM
                        </div>
                        <div className="text-sm">
                          <strong>Twitter:</strong> Daily 9 AM, 3 PM
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Platforms</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Badge variant="secondary">LinkedIn Connected</Badge>
                        <Badge variant="secondary">Instagram Connected</Badge>
                        <Badge variant="secondary">Twitter Connected</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Summary Card */}
      {workflowSteps.every(step => step.status === 'completed') && (
        <>
          <Separator />
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
            <CardHeader>
              <CardTitle className="text-xl text-center">🎉 Workflow Complete!</CardTitle>
              <CardDescription className="text-center">
                Your AI-driven marketing strategy is now live and integrated across all sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">1</div>
                  <div className="text-sm text-muted-foreground">Strategy Created</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{state.approvedPlans.length}</div>
                  <div className="text-sm text-muted-foreground">Weeks Planned</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{state.approvedContent.length}</div>
                  <div className="text-sm text-muted-foreground">Content Pieces</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">3</div>
                  <div className="text-sm text-muted-foreground">Platforms Active</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
