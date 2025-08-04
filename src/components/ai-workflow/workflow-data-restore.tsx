import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkflow } from '@/contexts/workflow-context';
import { useWorkflowPersistence } from '@/hooks/use-workflow-persistence';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export function WorkflowDataRestore() {
  const [isRestoring, setIsRestoring] = useState(false);
  const { state, dispatch } = useWorkflow();
  const { saveWorkflow } = useWorkflowPersistence();
  const { toast } = useToast();

  const restoreScamDunkData = async () => {
    setIsRestoring(true);
    
    try {
      // Restore business info for Scam Dunk
      const businessInfo = {
        company: "Scam Dunk",
        industry: "Anti-Scam and Security Education",  
        productService: "Scam awareness and prevention services",
        primaryObjectives: "Educate people about common scams and protect them from fraud",
        targetAudience: "General public, particularly vulnerable demographics like seniors and young adults",
        targetMarkets: "Global, with focus on English-speaking markets",
        budget: "Mid-range marketing budget",
        uniqueSellingPoints: "Comprehensive scam database, real-time alerts, educational content",
        competitors: "Other cybersecurity education platforms",
        brandPersonality: "Trustworthy, educational, protective, and empowering",
        keyMetrics: "User engagement, scam reports prevented, educational content views",
        additionalContext: "Focus on building trust and credibility while educating users",
        teamMembers: ["Marketing Specialist", "Content Creator"]
      };

      // Update the workflow state
      dispatch({ type: 'SET_BUSINESS_INFO', payload: businessInfo });
      
      // Update progress to reflect that business info is collected
      dispatch({ 
        type: 'UPDATE_PROGRESS', 
        payload: { 
          currentStep: 1,
          completedSteps: ['business-info']
        }
      });

      // Save the updated workflow
      await saveWorkflow({
        ...state,
        businessInfo,
        progress: {
          ...state.progress,
          currentStep: 1,
          completedSteps: ['business-info']
        }
      }, state.currentWorkflowId);

      toast({
        title: "Workflow Data Restored",
        description: "Your Scam Dunk business information has been restored successfully!"
      });

    } catch (error) {
      console.error('Error restoring workflow data:', error);
      toast({
        title: "Restore Failed",
        description: "Failed to restore workflow data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Only show this component if business info is missing
  if (state.businessInfo) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Missing Workflow Data Detected
        </CardTitle>
        <CardDescription className="text-orange-700">
          It looks like your workflow data is missing. This can happen due to data migration or sync issues.
          Click below to restore your Scam Dunk business information and continue with your workflow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={restoreScamDunkData}
          disabled={isRestoring}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
          {isRestoring ? 'Restoring Data...' : 'Restore Scam Dunk Data'}
        </Button>
      </CardContent>
    </Card>
  );
}