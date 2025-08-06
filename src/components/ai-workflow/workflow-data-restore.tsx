import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkflow } from '@/contexts/workflow-context';
import { useWorkflowPersistence } from '@/hooks/use-workflow-persistence';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/use-organization';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export function WorkflowDataRestore() {
  const [isRestoring, setIsRestoring] = useState(false);
  const { state, dispatch } = useWorkflow();
  const { saveWorkflow } = useWorkflowPersistence();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const restoreScamDunkData = async () => {
    setIsRestoring(true);
    
    try {
      // Restore business info based on organization
      const orgName = currentOrganization.name;
      const businessInfo = {
        company: orgName,
        industry: orgName === "Scam Dunk" ? "Anti-Scam and Security Education" : "Technology and Digital Services",  
        productService: orgName === "Scam Dunk" ? "Scam awareness and prevention services" : "Digital technology solutions",
        primaryObjectives: orgName === "Scam Dunk" ? "Educate people about common scams and protect them from fraud" : "Provide innovative technology solutions",
        targetAudience: orgName === "Scam Dunk" ? "General public, particularly vulnerable demographics like seniors and young adults" : "Business professionals and technology users",
        targetMarkets: "Global, with focus on English-speaking markets",
        budget: "Mid-range marketing budget",
        uniqueSellingPoints: orgName === "Scam Dunk" ? "Comprehensive scam database, real-time alerts, educational content" : "Cutting-edge technology solutions and expertise",
        competitors: orgName === "Scam Dunk" ? "Other cybersecurity education platforms" : "Technology service providers",
        brandPersonality: orgName === "Scam Dunk" ? "Trustworthy, educational, protective, and empowering" : "Innovative, reliable, and professional",
        keyMetrics: orgName === "Scam Dunk" ? "User engagement, scam reports prevented, educational content views" : "Client satisfaction, technology adoption, business growth",
        additionalContext: orgName === "Scam Dunk" ? "Focus on building trust and credibility while educating users" : "Focus on delivering high-quality technology solutions",
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
        description: `Your ${currentOrganization.name} business information has been restored successfully!`
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

  // Only show this component if:
  // 1. We have a workflow ID (not a new workflow)
  // 2. We're missing critical data (data corruption scenario)
  // 3. We have an organization (safety check)
  const hasCriticalData = state.businessInfo || state.draftData?.strategySteps?.length > 0;
  const isNewWorkflow = !state.currentWorkflowId;
  const hasOrganization = !!currentOrganization;
  
  if (hasCriticalData || isNewWorkflow || !hasOrganization) {
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
          Click below to restore your {currentOrganization.name} business information and continue with your workflow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={restoreScamDunkData}
          disabled={isRestoring}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
          {isRestoring ? 'Restoring Data...' : `Restore ${currentOrganization.name} Data`}
        </Button>
      </CardContent>
    </Card>
  );
}