import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAIPlatforms } from "@/hooks/use-ai-platforms";
import { Brain, Edit3, RefreshCw, CheckCircle, Lightbulb, Target, TrendingUp, Wrench, Zap, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useWorkflow, type BusinessInfo, type AIStrategyStep } from "@/contexts/workflow-context";
import { buildStrategyPrompt } from "@/lib/ai-prompt-builder";
import { AIPlatformToolsSelector } from "./ai-platform-tools-selector";

interface AIStrategyConsultantProps {
  onStrategyApproved: (strategy: any) => void;
  businessInfo: BusinessInfo;
}

export function AIStrategyConsultant({ onStrategyApproved, businessInfo }: AIStrategyConsultantProps) {
  const { toast } = useToast();
  const { platforms, getPlatformsWithTools, getPlatformTools } = useAIPlatforms();
  const { state, dispatch } = useWorkflow();
  
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(0);
  const [showPrompts, setShowPrompts] = useState<{[key: string]: boolean}>({});
  const [enabledTools, setEnabledTools] = useState<{[platform: string]: string[]}>({});
  const [steps, setSteps] = useState<AIStrategyStep[]>([
    {
      id: 'objectives',
      title: 'Strategic Objectives',
      description: 'AI analyzes your goals and creates specific, measurable objectives',
      aiGenerated: '',
      userPrompt: '',
      status: 'pending',
      progress: 0
    },
    {
      id: 'audience',
      title: 'Target Audience Analysis',
      description: 'AI defines detailed audience segments and personas',
      aiGenerated: '',
      userPrompt: '',
      status: 'pending',
      progress: 0
    },
    {
      id: 'positioning',
      title: 'Brand Positioning',
      description: 'AI creates competitive positioning and unique value props',
      aiGenerated: '',
      userPrompt: '',
      status: 'pending',
      progress: 0
    },
    {
      id: 'channels',
      title: 'Channel Strategy',
      description: 'AI recommends optimal marketing channels and tactics',
      aiGenerated: '',
      userPrompt: '',
      status: 'pending',
      progress: 0
    }
  ]);

  // Load saved draft data on mount and calculate correct current step
  useEffect(() => {
    if (state.draftData?.strategySteps) {
      console.log('Loading saved strategy steps:', state.draftData.strategySteps);
      setSteps(state.draftData.strategySteps);
      
      // Calculate the correct current step based on progress
      const savedSteps = state.draftData.strategySteps;
      let calculatedCurrentStep = 0;
      
      // Find the first step that isn't approved or completed
      for (let i = 0; i < savedSteps.length; i++) {
        if (savedSteps[i].status === 'approved') {
          calculatedCurrentStep = i + 1; // Move to next step
        } else if (savedSteps[i].status === 'review' || savedSteps[i].aiGenerated) {
          calculatedCurrentStep = i; // Stay on this step for review
          break;
        } else if (savedSteps[i].status === 'generating') {
          calculatedCurrentStep = i; // Stay on generating step
          break;
        } else {
          // This is the first pending step
          calculatedCurrentStep = i;
          break;
        }
      }
      
      // If all steps are approved, we should be at the end
      if (calculatedCurrentStep >= savedSteps.length) {
        calculatedCurrentStep = savedSteps.length - 1;
      }
      
      console.log('Calculated current step:', calculatedCurrentStep, 'from saved steps');
      setCurrentStep(calculatedCurrentStep);
      
      // Auto-set platform if we have saved progress but no platform selected
      if (state.draftData.selectedAIPlatform && !selectedPlatform) {
        setSelectedPlatform(state.draftData.selectedAIPlatform);
      }
    }
    if (state.draftData?.selectedAIPlatform) {
      setSelectedPlatform(state.draftData.selectedAIPlatform);
    }
  }, [state.draftData]);
  
  // Check if we need to auto-start generation for steps that were interrupted
  useEffect(() => {
    if (steps.length > 0 && selectedPlatform && currentStep >= 0) {
      const currentStepData = steps[currentStep];
      // If current step exists but has no content and isn't generating, auto-start
      if (currentStepData && 
          currentStepData.status === 'pending' && 
          !currentStepData.aiGenerated && 
          currentStep > 0) { // Don't auto-start the first step
        console.log('Auto-continuing generation for step:', currentStep, currentStepData.title);
        setTimeout(() => generateStepContent(currentStep), 1000);
      }
    }
  }, [steps, selectedPlatform, currentStep]);

  // Auto-save when steps change
  useEffect(() => {
    dispatch({
      type: 'SET_DRAFT_DATA',
      payload: {
        strategySteps: steps,
        currentStrategyStep: currentStep,
        selectedAIPlatform: selectedPlatform,
      }
    });
  }, [steps, currentStep, selectedPlatform, dispatch]);

  const generateStepContent = async (stepIndex: number, customPrompt?: string) => {
    const step = steps[stepIndex];
    
    // Get approved steps for context
    const approvedSteps = steps.slice(0, stepIndex).filter(s => s.status === 'approved');
    
    // Build comprehensive AI prompt
    const aiPrompt = buildStrategyPrompt(
      businessInfo,
      step.title,
      step.description,
      approvedSteps,
      customPrompt || step.userPrompt
    );
    
    setSteps(prev => prev.map((s, i) => 
      i === stepIndex 
        ? { ...s, status: 'generating', progress: 0, aiPrompt }
        : s
    ));

    try {
      // Real AI generation with progress tracking
      const progressInterval = setInterval(() => {
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex && s.progress < 90
            ? { ...s, progress: s.progress + 10 }
            : s
        ));
      }, 500);

      const platformTools = getPlatformTools(selectedPlatform);
      const response = await supabase.functions.invoke('generate-content', {
        body: {
          contentType: 'strategy-section',
          strategy: step.title,
          platforms: [selectedPlatform],
          customPrompt: aiPrompt,
          aiTool: 'gpt-4o-mini',
          enabledTools: platformTools
        }
      });

      clearInterval(progressInterval);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate content');
      }

      const generatedContent = response.data?.content || "Generated content will appear here.";
      
      setSteps(prev => prev.map((s, i) => 
        i === stepIndex 
          ? { 
              ...s, 
              aiGenerated: generatedContent,
              status: 'review',
              progress: 100 
            }
          : s
      ));

      toast({
        title: "AI Analysis Complete",
        description: `${step.title} has been generated. Please review and approve or edit.`
      });

    } catch (error) {
      console.error('Error generating strategy content:', error);
      setSteps(prev => prev.map((s, i) => 
        i === stepIndex 
          ? { ...s, status: 'pending', progress: 0 }
          : s
      ));
      
      toast({
        title: "Generation Failed",
        description: "Failed to generate strategy content. Please try again.",
        variant: "destructive"
      });
    }
  };

  const updateUserPrompt = (stepIndex: number, prompt: string) => {
    setSteps(prev => prev.map((s, i) => 
      i === stepIndex ? { ...s, userPrompt: prompt } : s
    ));
  };

  const approveStep = (stepIndex: number) => {
    setSteps(prev => prev.map((s, i) => 
      i === stepIndex ? { ...s, status: 'approved' } : s
    ));

    if (stepIndex < steps.length - 1) {
      setCurrentStep(stepIndex + 1);
      generateStepContent(stepIndex + 1);
    } else {
      // All steps completed
      const approvedStrategy = {
        id: Date.now().toString(),
        name: "AI-Generated Strategy",
        description: "Comprehensive strategy created by AI Consultant",
        status: "Active",
        steps: steps.filter(s => s.status === 'approved'),
        createdAt: new Date().toISOString()
      };
      
      onStrategyApproved(approvedStrategy);
      
      toast({
        title: "Strategy Approved",
        description: "Your AI-generated strategy is ready for content planning!"
      });
    }
  };

  const retryStep = (stepIndex: number) => {
    generateStepContent(stepIndex, steps[stepIndex].userPrompt);
  };

  const editApprovedStep = (stepIndex: number) => {
    // Set the step back to review mode so user can edit
    setSteps(prev => prev.map((s, i) => 
      i === stepIndex ? { ...s, status: 'review' } : s
    ));
    
    // Set current step to this step so it's highlighted and visible
    setCurrentStep(stepIndex);
    
    toast({
      title: "Step Ready for Edit",
      description: `${steps[stepIndex].title} is now ready for editing and regeneration.`
    });
  };

  const togglePromptVisibility = (stepId: string) => {
    setShowPrompts(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const startAIConsultation = () => {
    setCurrentStep(0);
    generateStepContent(0);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">AI Strategy Consultant</CardTitle>
              <CardDescription>
                Let AI analyze your goals and create a comprehensive marketing strategy
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {steps.every(s => s.status === 'pending') && (
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-platform" className="text-sm font-medium">AI Platform:</Label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select AI Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPlatformsWithTools().map(platform => (
                        <SelectItem key={platform.key} value={platform.key}>
                          <div className="flex items-center gap-2">
                            <span>{platform.name}</span>
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              Tools
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={startAIConsultation} 
                  size="lg"
                  disabled={!selectedPlatform}
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Start AI Consultation
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {steps.some(s => s.status !== 'pending') && (
        <CardContent className="space-y-6">
          {/* AI Tools Configuration */}
          {selectedPlatform && (
            <AIPlatformToolsSelector
              selectedPlatform={selectedPlatform}
              onToolsUpdate={(platform, tools) => {
                setEnabledTools(prev => ({ ...prev, [platform]: tools }));
              }}
              className="mb-6"
            />
          )}
          
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    step.status === 'approved' ? 'bg-green-100 text-green-600' :
                    step.status === 'generating' ? 'bg-blue-100 text-blue-600' :
                    step.status === 'review' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {step.status === 'approved' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  <Badge variant={
                    step.status === 'approved' ? 'default' :
                    step.status === 'generating' ? 'secondary' :
                    step.status === 'review' ? 'outline' :
                    'secondary'
                  }>
                    {step.status}
                  </Badge>
                </div>

                {step.status === 'generating' && (
                  <Progress value={step.progress} className="w-full" />
                )}

                {step.status === 'review' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-background/50">
                    {/* AI Prompt Visibility Toggle */}
                    {step.aiPrompt && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePromptVisibility(step.id)}
                            className="text-xs"
                          >
                            {showPrompts[step.id] ? (
                              <>
                                <EyeOff className="h-3 w-3 mr-1" />
                                Hide AI Prompt
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Show AI Prompt
                              </>
                            )}
                          </Button>
                        </div>
                        {showPrompts[step.id] && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border text-xs">
                            <label className="text-xs font-medium text-blue-800 dark:text-blue-200">AI Prompt Used:</label>
                            <pre className="whitespace-pre-wrap text-blue-700 dark:text-blue-300 mt-1">{step.aiPrompt}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">AI Generated Content:</label>
                      <div className="p-3 bg-muted rounded border">
                        <div className="whitespace-pre-wrap text-sm">{step.aiGenerated}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Edit Instructions (Optional):</label>
                      <Textarea
                        value={step.userPrompt}
                        onChange={(e) => updateUserPrompt(index, e.target.value)}
                        placeholder="Add specific instructions to refine this section..."
                        rows={2}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={() => approveStep(index)} size="sm">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button onClick={() => retryStep(index)} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                )}

                {step.status === 'approved' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <p className="text-sm text-green-800 dark:text-green-200 font-medium">Step approved and ready for next phase</p>
                    </div>

                    {/* AI Prompt Visibility Toggle */}
                    {step.aiPrompt && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePromptVisibility(step.id)}
                            className="text-xs"
                          >
                            {showPrompts[step.id] ? (
                              <>
                                <EyeOff className="h-3 w-3 mr-1" />
                                Hide AI Prompt
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Show AI Prompt
                              </>
                            )}
                          </Button>
                        </div>
                        {showPrompts[step.id] && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border text-xs">
                            <label className="text-xs font-medium text-blue-800 dark:text-blue-200">AI Prompt Used:</label>
                            <pre className="whitespace-pre-wrap text-blue-700 dark:text-blue-300 mt-1">{step.aiPrompt}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Generated Content:</label>
                      <div className="p-3 bg-background rounded border">
                        <div className="whitespace-pre-wrap text-sm">{step.aiGenerated}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Edit Instructions (Optional):</label>
                      <Textarea
                        value={step.userPrompt}
                        onChange={(e) => updateUserPrompt(index, e.target.value)}
                        placeholder="Add specific instructions to refine this section..."
                        rows={2}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => editApprovedStep(index)} 
                        variant="outline" 
                        size="sm"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit and Regenerate
                      </Button>
                    </div>
                  </div>
                )}

                {index < steps.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}