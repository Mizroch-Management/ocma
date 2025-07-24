import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAIPlatforms } from "@/hooks/use-ai-platforms";
import { Brain, Edit3, RefreshCw, CheckCircle, Lightbulb, Target, TrendingUp, Wrench, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface AIStrategyStep {
  id: string;
  title: string;
  description: string;
  aiGenerated: string;
  userPrompt: string;
  status: 'pending' | 'generating' | 'review' | 'approved' | 'retry';
  progress: number;
}

interface BusinessInfo {
  company: string;
  industry: string;
  productService: string;
  primaryObjectives: string;
  targetAudience: string;
  targetMarkets: string;
  budget: string;
  uniqueSellingPoints: string;
  competitors: string;
  brandPersonality: string;
  keyMetrics: string;
  additionalContext: string;
}

interface AIStrategyConsultantProps {
  onStrategyApproved: (strategy: any) => void;
  businessInfo: BusinessInfo;
}

export function AIStrategyConsultant({ onStrategyApproved, businessInfo }: AIStrategyConsultantProps) {
  const { toast } = useToast();
  const { platforms, getPlatformsWithTools } = useAIPlatforms();
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(0);
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

  const generateStepContent = async (stepIndex: number, customPrompt?: string) => {
    const step = steps[stepIndex];
    
    setSteps(prev => prev.map((s, i) => 
      i === stepIndex 
        ? { ...s, status: 'generating', progress: 0 }
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

      const businessContext = `
Company: ${businessInfo.company}
Industry: ${businessInfo.industry}
Product/Service: ${businessInfo.productService}
Primary Objectives: ${businessInfo.primaryObjectives}
Target Audience: ${businessInfo.targetAudience}
Target Markets: ${businessInfo.targetMarkets}
Budget: ${businessInfo.budget}
Unique Selling Points: ${businessInfo.uniqueSellingPoints}
Competitors: ${businessInfo.competitors}
Brand Personality: ${businessInfo.brandPersonality}
Key Metrics: ${businessInfo.keyMetrics}
Additional Context: ${businessInfo.additionalContext}
      `;

      const response = await supabase.functions.invoke('generate-content', {
        body: {
          contentType: 'strategy-section',
          strategy: step.title,
          platforms: [selectedPlatform],
          customPrompt: `
Create a comprehensive marketing strategy section for: ${step.title}
Section Description: ${step.description}
Business Context: ${businessContext}
Additional Instructions: ${customPrompt || step.userPrompt || ''}

Please provide detailed, actionable recommendations specific to this business.
          `,
          aiTool: 'gpt-4o-mini'
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium">AI Generated Content:</label>
                      <div className="p-3 bg-muted rounded border">
                        <pre className="whitespace-pre-wrap text-sm">{step.aiGenerated}</pre>
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
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-200">✓ Step approved and ready for next phase</p>
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