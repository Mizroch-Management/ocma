import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkflow } from '@/contexts/workflow-context';
import { useOrganization } from '@/hooks/use-organization';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Wand2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { buildStrategyPrompt } from '@/lib/ai-prompt-builder';
import { Progress } from '@/components/ui/progress';

interface StrategyContentRestorerProps {
  onNavigateToStep?: (stepIndex: number) => void;
}

export function StrategyContentRestorer({ onNavigateToStep }: StrategyContentRestorerProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentlyGenerating, setCurrentlyGenerating] = useState<string>('');
  const { state, dispatch } = useWorkflow();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  const restoreAIGeneratedContent = async () => {
    if (!state.businessInfo || !state.draftData?.strategySteps) {
      toast({
        title: "Missing Data",
        description: "Business info and strategy steps are required for restoration.",
        variant: "destructive"
      });
      return;
    }

    setIsRestoring(true);
    setProgress(0);
    
    try {
      const steps = state.draftData.strategySteps;
      const totalSteps = steps.length;
      
      // Define the proper strategy prompts for each step
      const stepPrompts = {
        'objectives': `Based on the business information provided, create specific, measurable, achievable, relevant, and time-bound (SMART) marketing objectives. Focus on:
        - Primary business goals and how marketing will support them
        - Specific metrics and KPIs to track success
        - Timeline for achieving these objectives
        - Alignment with overall business strategy`,
        
        'audience': `Analyze the target audience and create detailed buyer personas. Include:
        - Demographic and psychographic profiles
        - Pain points and challenges they face
        - Where they spend time online and offline
        - How they prefer to consume content
        - Their buyer journey and decision-making process`,
        
        'positioning': `Develop a comprehensive brand positioning strategy including:
        - Unique value proposition that differentiates from competitors
        - Brand personality and tone of voice
        - Key messaging pillars and themes
        - Competitive advantages and positioning statements
        - Brand promise and core values`,
        
        'channels': `Recommend optimal marketing channels and tactics based on the target audience and objectives:
        - Digital marketing channels (social media, SEO, PPC, email, etc.)
        - Traditional marketing opportunities where relevant
        - Content marketing strategy and distribution
        - Paid advertising recommendations
        - Channel priority and budget allocation suggestions`
      };

      const restoredSteps = [];
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepId = step.id as keyof typeof stepPrompts;
        
        setCurrentlyGenerating(step.title);
        setProgress((i / totalSteps) * 100);
        
        console.log(`Generating content for step: ${step.title}`);
        
        // Build comprehensive AI prompt
        const aiPrompt = buildStrategyPrompt(
          state.businessInfo,
          step.title,
          step.description,
          restoredSteps.filter(s => s.status === 'approved'), // Previous approved steps for context
          stepPrompts[stepId] || step.description
        );
        
        // Call the AI generation function
        const response = await supabase.functions.invoke('generate-content', {
          body: {
            contentType: 'strategy-section',
            strategy: step.title,
            platforms: ['comprehensive-strategy'],
            customPrompt: aiPrompt,
            aiTool: 'gpt-4o-mini',
            organizationId: currentOrganization?.id
          }
        });

        if (response.error) {
          console.error(`Error generating ${step.title}:`, response.error);
          throw new Error(`Failed to generate ${step.title}: ${response.error.message}`);
        }

        const generatedContent = response.data?.content || response.data?.generatedText || "Generated content placeholder";
        
        // Create the restored step with AI content
        const restoredStep = {
          ...step,
          aiGenerated: generatedContent,
          status: 'review' as const,
          progress: 100,
          aiPrompt: aiPrompt
        };
        
        restoredSteps.push(restoredStep);
        
        console.log(`Successfully generated content for ${step.title}`);
      }
      
      setProgress(100);
      setCurrentlyGenerating('Finalizing...');
      
      // Update the workflow state with restored content
      const updatedDraftData = {
        ...state.draftData,
        strategySteps: restoredSteps,
        currentStrategyStep: 0, // Start from first step for review
        selectedAIPlatform: 'openai'
      };
      
      dispatch({
        type: 'SET_DRAFT_DATA',
        payload: updatedDraftData
      });
      
      toast({
        title: "AI Content Restored!",
        description: `Successfully regenerated all ${totalSteps} strategy steps with AI analysis.`,
      });
      
    } catch (error) {
      console.error('Error restoring AI content:', error);
      toast({
        title: "Restoration Failed",
        description: `Failed to regenerate AI content: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsRestoring(false);
      setProgress(0);
      setCurrentlyGenerating('');
    }
  };

  // Only show if we have strategy steps but they're missing AI content
  // AND it's not a new workflow (must have a workflow ID and have progressed past step 0)
  const hasEmptySteps = state.draftData?.strategySteps?.some(step => !step.aiGenerated && step.status === 'pending');
  const isNewOrEmptyWorkflow = !state.currentWorkflowId || state.progress.currentStep === 0;
  
  if (!hasEmptySteps || isNewOrEmptyWorkflow) {
    return null;
  }

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-800">
          <Wand2 className="h-5 w-5" />
          Restore AI-Generated Strategy Content
        </CardTitle>
        <CardDescription className="text-purple-700">
          Your strategy steps exist but are missing AI-generated content. 
          Click below to regenerate the comprehensive AI analysis for all 4 strategy steps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRestoring && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {currentlyGenerating ? `Generating: ${currentlyGenerating}` : 'Preparing...'}
            </p>
          </div>
        )}
        
        <Button 
          onClick={restoreAIGeneratedContent}
          disabled={isRestoring}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
          {isRestoring ? 'Regenerating AI Content...' : 'Regenerate All Strategy Content'}
        </Button>
        
        {state.draftData?.strategySteps && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Strategy steps to regenerate:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {state.draftData.strategySteps.map((step, index) => (
                <li key={step.id} className="flex items-center gap-2">
                  {step.aiGenerated ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  )}
                  {index + 1}. {step.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}