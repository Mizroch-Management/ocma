
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useWorkflow } from "@/contexts/workflow-context";
import { 
  Target, 
  TrendingUp, 
  Users, 
  DollarSign, 
  BarChart3,
  Calendar,
  Eye,
  Edit,
  Sparkles,
  CheckCircle
} from "lucide-react";

interface Strategy {
  id: string;
  title: string;
  objectives: string[];
  status: string;
  progress: number;
  isAIGenerated: boolean;
}

export default function Strategy() {
  const { state: workflowState } = useWorkflow();
  const [selectedStrategy, setSelectedStrategy] = useState("current");

  // Real strategies would come from the database
  const existingStrategies: Strategy[] = [];

  // Combine existing and AI strategies
  const allStrategies = [
    ...existingStrategies,
    ...(workflowState.approvedStrategy ? [{
      id: workflowState.approvedStrategy.id,
      title: workflowState.approvedStrategy.title,
      objectives: workflowState.approvedStrategy.objectives,
      status: "active",
      progress: 85,
      isAIGenerated: true,
      ...workflowState.approvedStrategy
    }] : [])
  ];

  const currentStrategy = workflowState.approvedStrategy;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Marketing Strategy</h1>
        <p className="text-muted-foreground mt-2">
          Manage your marketing strategies and track their performance across all channels.
        </p>
        {workflowState.approvedStrategy && (
          <div className="flex items-center gap-2 mt-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-purple-700">
              AI-generated strategy is now active and integrated
            </span>
          </div>
        )}
      </div>

      {/* Strategy Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Strategies</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allStrategies.length}</div>
            <p className="text-xs text-muted-foreground">
              {allStrategies.filter(s => s.isAIGenerated).length} AI-generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allStrategies.length > 0 ? Math.round(allStrategies.reduce((acc, s) => acc + s.progress, 0) / allStrategies.length) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Performance tracking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Plans</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowState.approvedPlans.length}</div>
            <p className="text-xs text-muted-foreground">
              Weekly content plans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              No data available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategy List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Strategies</CardTitle>
            <CardDescription>
              All active marketing strategies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allStrategies.map((strategy) => (
                <div
                  key={strategy.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedStrategy === strategy.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  } ${strategy.isAIGenerated ? 'border-purple-200 bg-purple-50/50' : ''}`}
                  onClick={() => setSelectedStrategy(strategy.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {strategy.isAIGenerated && <Sparkles className="h-4 w-4 text-purple-600" />}
                      <h4 className="font-medium text-sm">{strategy.title}</h4>
                    </div>
                    <Badge variant={strategy.status === 'active' ? 'default' : 'secondary'}>
                      {strategy.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {strategy.objectives}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>{strategy.progress}%</span>
                    </div>
                    <Progress value={strategy.progress} className="h-1" />
                  </div>
                  {strategy.isAIGenerated && (
                    <div className="text-xs text-purple-600 mt-2">
                      AI-Generated Strategy
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Strategy Details */}
        <div className="lg:col-span-2">
          {workflowState.approvedStrategy && selectedStrategy === workflowState.approvedStrategy.id ? (
            <Card className="border-purple-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <CardTitle>{workflowState.approvedStrategy.title}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  AI-generated marketing strategy with comprehensive analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="targets">Targets</TabsTrigger>
                    <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Objectives</h4>
                      <p className="text-sm text-muted-foreground">
                        {workflowState.approvedStrategy.objectives}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Budget Allocation</h4>
                      <p className="text-sm text-muted-foreground">
                        {workflowState.approvedStrategy.budget}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Additional Context</h4>
                      <p className="text-sm text-muted-foreground">
                        {workflowState.approvedStrategy.additionalContext}
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="targets" className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Target Markets</h4>
                      <p className="text-sm text-muted-foreground">
                        {workflowState.approvedStrategy.targetMarkets}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Tone of Voice</h4>
                      <p className="text-sm text-muted-foreground">
                        {workflowState.approvedStrategy.toneOfVoice}
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="guidelines" className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Brand Guidelines</h4>
                      <p className="text-sm text-muted-foreground">
                        {workflowState.approvedStrategy.brandGuidelines}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Compliance Requirements</h4>
                      <p className="text-sm text-muted-foreground">
                        {workflowState.approvedStrategy.compliance}
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="metrics" className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Key Metrics</h4>
                      <p className="text-sm text-muted-foreground">
                        {workflowState.approvedStrategy.keyMetrics}
                      </p>
                    </div>
                    
                    {workflowState.approvedContent.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Content Performance</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-2xl font-bold text-green-600">
                                {workflowState.approvedContent.length}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Content pieces created
                              </p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-2xl font-bold text-blue-600">
                                {workflowState.approvedPlans.length}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Weekly plans active
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Strategy Selected</CardTitle>
                <CardDescription>
                  Create or select a marketing strategy to view details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Use the AI Workflow to generate your first marketing strategy, or create one manually.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
