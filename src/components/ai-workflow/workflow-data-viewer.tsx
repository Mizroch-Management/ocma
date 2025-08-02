import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useWorkflow } from "@/contexts/workflow-context";
import { 
  Download, 
  Eye, 
  Database, 
  FileText, 
  Users, 
  Target,
  Building2,
  Calendar,
  Lightbulb,
  BarChart3
} from "lucide-react";

export function WorkflowDataViewer() {
  const { state } = useWorkflow();
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(false);

  const exportToJson = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      company: state.businessInfo?.company || 'Unknown',
      workflowData: {
        businessInfo: state.businessInfo,
        strategy: state.approvedStrategy,
        plans: state.approvedPlans,
        content: state.approvedContent,
        progress: state.progress
      }
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.businessInfo?.company || 'workflow'}-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Data Exported",
      description: "Your workflow data has been downloaded as JSON file",
    });
  };

  const exportToMarkdown = () => {
    const businessInfo = state.businessInfo;
    const strategy = state.approvedStrategy;
    const plans = state.approvedPlans;
    
    let markdown = `# ${businessInfo?.company || 'Company'} - AI Marketing Workflow Export\n\n`;
    markdown += `**Exported:** ${new Date().toLocaleDateString()}\n\n`;
    
    // Business Information
    markdown += `## Business Information\n\n`;
    if (businessInfo) {
      markdown += `- **Company:** ${businessInfo.company}\n`;
      markdown += `- **Industry:** ${businessInfo.industry}\n`;
      markdown += `- **Product/Service:** ${businessInfo.productService}\n`;
      markdown += `- **Target Markets:** ${businessInfo.targetMarkets}\n`;
      markdown += `- **Budget:** ${businessInfo.budget}\n`;
      markdown += `- **Brand Personality:** ${businessInfo.brandPersonality}\n\n`;
      
      markdown += `### Primary Objectives\n${businessInfo.primaryObjectives}\n\n`;
      markdown += `### Target Audience\n${businessInfo.targetAudience}\n\n`;
      markdown += `### Key Metrics\n${businessInfo.keyMetrics}\n\n`;
      markdown += `### Additional Context\n${businessInfo.additionalContext}\n\n`;
      
      if (businessInfo.teamMembers && businessInfo.teamMembers.length > 0) {
        markdown += `### Team Members\n`;
        businessInfo.teamMembers.forEach((member, index) => {
          markdown += `${index + 1}. ${member}\n`;
        });
        markdown += `\n`;
      }
    }
    
    // Strategy
    if (strategy) {
      markdown += `## Marketing Strategy\n\n`;
      markdown += `- **Title:** ${strategy.title}\n`;
      markdown += `- **Created:** ${new Date(strategy.createdAt).toLocaleDateString()}\n`;
      markdown += `- **AI Generated:** ${strategy.isAIGenerated ? 'Yes' : 'No'}\n\n`;
      
      markdown += `### Strategy Details\n`;
      markdown += `- **Objectives:** ${strategy.objectives}\n`;
      markdown += `- **Target Markets:** ${strategy.targetMarkets}\n`;
      markdown += `- **Budget:** ${strategy.budget}\n`;
      markdown += `- **Tone of Voice:** ${strategy.toneOfVoice}\n`;
      markdown += `- **Key Metrics:** ${strategy.keyMetrics}\n\n`;
    }
    
    // Content Plans
    if (plans && plans.length > 0) {
      markdown += `## Content Plans\n\n`;
      plans.forEach((plan, index) => {
        markdown += `### Week ${plan.weekNumber} - ${plan.theme}\n`;
        markdown += `- **Frequency:** ${plan.frequency}\n`;
        markdown += `- **Platforms:** ${plan.platforms?.join(', ')}\n`;
        if (plan.keyMessages && plan.keyMessages.length > 0) {
          markdown += `- **Key Messages:** ${plan.keyMessages.join(', ')}\n`;
        }
        markdown += `\n`;
      });
    }
    
    // Progress Summary
    markdown += `## Workflow Progress\n\n`;
    markdown += `- **Current Step:** ${state.progress.currentStep}\n`;
    markdown += `- **Strategy Approved:** ${state.progress.strategyApproved ? 'Yes' : 'No'}\n`;
    markdown += `- **Plans Approved:** ${state.progress.plansApproved ? 'Yes' : 'No'}\n`;
    markdown += `- **Content Approved:** ${state.progress.contentApproved ? 'Yes' : 'No'}\n`;
    markdown += `- **Scheduling Complete:** ${state.progress.schedulingComplete ? 'Yes' : 'No'}\n`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${businessInfo?.company || 'workflow'}-strategy-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Strategy Exported",
      description: "Your workflow data has been downloaded as Markdown file",
    });
  };

  if (!isVisible) {
    return (
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Your Workflow Data</CardTitle>
                <CardDescription>
                  View and export all your collected business information and generated strategy
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsVisible(true)}
                variant="outline"
                size="sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Data
              </Button>
              <Button
                onClick={exportToJson}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <Button
                onClick={exportToMarkdown}
                variant="outline"
                size="sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export Strategy
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Your Workflow Data</CardTitle>
              <CardDescription>
                All your data is automatically saved to the database and persisted across sessions
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsVisible(false)}
              variant="outline"
              size="sm"
            >
              Hide Data
            </Button>
            <Button
              onClick={exportToJson}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button
              onClick={exportToMarkdown}
              variant="outline"
              size="sm"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export Strategy
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="business" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="business">Business Info</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>
          
          <TabsContent value="business" className="space-y-4">
            {state.businessInfo ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Company Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <strong>Company:</strong> {state.businessInfo.company}
                      </div>
                      <div>
                        <strong>Industry:</strong> {state.businessInfo.industry}
                      </div>
                      <div>
                        <strong>Budget:</strong> {state.businessInfo.budget}
                      </div>
                      <div>
                        <strong>Target Markets:</strong> {state.businessInfo.targetMarkets}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Brand & Objectives
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <strong>Brand Personality:</strong> {state.businessInfo.brandPersonality}
                      </div>
                      <div>
                        <strong>Key Metrics:</strong> {state.businessInfo.keyMetrics}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Product/Service Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{state.businessInfo.productService}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Primary Objectives</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{state.businessInfo.primaryObjectives}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Target Audience</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{state.businessInfo.targetAudience}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Context</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{state.businessInfo.additionalContext}</p>
                  </CardContent>
                </Card>
                
                {state.businessInfo.teamMembers && state.businessInfo.teamMembers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Team Members ({state.businessInfo.teamMembers.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {state.businessInfo.teamMembers.map((member, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Badge variant="secondary">{index + 1}</Badge>
                            <span className="text-sm">{member}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No business information collected yet.</p>
            )}
          </TabsContent>
          
          <TabsContent value="strategy" className="space-y-4">
            {state.approvedStrategy ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      {state.approvedStrategy.title}
                    </CardTitle>
                    <CardDescription>
                      Created: {new Date(state.approvedStrategy.createdAt).toLocaleDateString()}
                      {state.approvedStrategy.isAIGenerated && (
                        <Badge className="ml-2">AI Generated</Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div><strong>Objectives:</strong> {state.approvedStrategy.objectives}</div>
                        <div><strong>Target Markets:</strong> {state.approvedStrategy.targetMarkets}</div>
                        <div><strong>Budget:</strong> {state.approvedStrategy.budget}</div>
                      </div>
                      <div className="space-y-3">
                        <div><strong>Tone of Voice:</strong> {state.approvedStrategy.toneOfVoice}</div>
                        <div><strong>Key Metrics:</strong> {state.approvedStrategy.keyMetrics}</div>
                        <div><strong>Compliance:</strong> {state.approvedStrategy.compliance}</div>
                      </div>
                    </div>
                    {state.approvedStrategy.additionalContext && (
                      <div className="mt-4">
                        <strong>Additional Context:</strong>
                        <p className="text-sm mt-1">{state.approvedStrategy.additionalContext}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <p className="text-muted-foreground">No strategy approved yet.</p>
            )}
          </TabsContent>
          
          <TabsContent value="plans" className="space-y-4">
            {state.approvedPlans && state.approvedPlans.length > 0 ? (
              <div className="space-y-4">
                {state.approvedPlans.map((plan, index) => (
                  <Card key={plan.id || index}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Week {plan.weekNumber} - {plan.theme}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <strong>Frequency:</strong> {plan.frequency}
                      </div>
                      {plan.platforms && plan.platforms.length > 0 && (
                        <div>
                          <strong>Platforms:</strong> {plan.platforms.join(', ')}
                        </div>
                      )}
                      {plan.keyMessages && plan.keyMessages.length > 0 && (
                        <div>
                          <strong>Key Messages:</strong>
                          <ul className="mt-1 list-disc list-inside text-sm">
                            {plan.keyMessages.map((message: string, idx: number) => (
                              <li key={idx}>{message}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No content plans approved yet.</p>
            )}
          </TabsContent>
          
          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Workflow Progress Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Business Info Collected:</span>
                      <Badge variant={state.businessInfo ? "default" : "outline"}>
                        {state.businessInfo ? "✓ Complete" : "Pending"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Strategy Approved:</span>
                      <Badge variant={state.progress.strategyApproved ? "default" : "outline"}>
                        {state.progress.strategyApproved ? "✓ Complete" : "Pending"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Plans Approved:</span>
                      <Badge variant={state.progress.plansApproved ? "default" : "outline"}>
                        {state.progress.plansApproved ? "✓ Complete" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Content Approved:</span>
                      <Badge variant={state.progress.contentApproved ? "default" : "outline"}>
                        {state.progress.contentApproved ? "✓ Complete" : "Pending"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Scheduling Complete:</span>
                      <Badge variant={state.progress.schedulingComplete ? "default" : "outline"}>
                        {state.progress.schedulingComplete ? "✓ Complete" : "Pending"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Current Step:</span>
                      <Badge variant="secondary">{state.progress.currentStep}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Data Persistence Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">All data is automatically saved to your database and will persist across sessions</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}