
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useWorkflow } from "@/contexts/workflow-context";
import { Wand2, Target, Calendar, TrendingUp, Copy, Edit, Save, Sparkles, ImageIcon, ExternalLink } from "lucide-react";

export default function ContentCreation() {
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [generatedContent, setGeneratedContent] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { state: workflowState } = useWorkflow();

  // Combine manual strategies with AI strategy
  const strategies = [
    { id: "1", name: "Q1 Brand Awareness", description: "Focus on increasing brand visibility", isAIGenerated: false },
    { id: "2", name: "Product Launch Campaign", description: "Launching new product line", isAIGenerated: false },
    { id: "3", name: "Holiday Marketing", description: "Seasonal promotional content", isAIGenerated: false },
    ...(workflowState.approvedStrategy ? [{
      id: workflowState.approvedStrategy.id,
      name: workflowState.approvedStrategy.title,
      description: workflowState.approvedStrategy.objectives,
      isAIGenerated: true
    }] : [])
  ];

  // Use AI workflow plans if available
  const weeklyPipelines = workflowState.approvedPlans.length > 0 
    ? workflowState.approvedPlans.map((plan, index) => ({
        id: plan.id,
        name: `Week ${plan.weekNumber}: ${plan.theme}`,
        theme: plan.keyMessages.join(', '),
        isAIGenerated: true
      }))
    : [
        { id: "week1", name: "Week 1: Education & Tips", theme: "Educational content to build authority", isAIGenerated: false },
        { id: "week2", name: "Week 2: Behind the Scenes", theme: "Show company culture and processes", isAIGenerated: false },
        { id: "week3", name: "Week 3: User Generated Content", theme: "Feature customer stories and reviews", isAIGenerated: false },
        { id: "week4", name: "Week 4: Product Focus", theme: "Highlight products and services", isAIGenerated: false }
      ];

  const platforms = [
    { name: "Instagram", color: "bg-pink-500", enabled: true },
    { name: "Facebook", color: "bg-blue-600", enabled: true },
    { name: "Twitter", color: "bg-sky-500", enabled: false },
    { name: "LinkedIn", color: "bg-blue-700", enabled: true },
    { name: "TikTok", color: "bg-black", enabled: false }
  ];

  const handleGenerateContent = async () => {
    if (!selectedStrategy || !selectedWeek) return;
    
    setIsGenerating(true);
    
    // Enhanced content generation based on AI workflow context
    setTimeout(() => {
      const isUsingAIStrategy = strategies.find(s => s.id === selectedStrategy)?.isAIGenerated;
      const isUsingAIPlan = weeklyPipelines.find(w => w.id === selectedWeek)?.isAIGenerated;
      
      // In a real implementation, this would generate content based on the selected strategy and plans
      setGeneratedContent([]);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Content Creation</h1>
        <p className="text-muted-foreground mt-2">
          Generate strategic content based on your marketing strategy and weekly messaging pipelines.
        </p>
        {(workflowState.approvedStrategy || workflowState.approvedPlans.length > 0) && (
          <div className="flex items-center gap-2 mt-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-purple-700">
              AI workflow templates and strategies are available for enhanced content generation
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategy Selection */}
        <Card className={selectedStrategy === workflowState.approvedStrategy?.id ? "border-purple-200 bg-purple-50/30" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Marketing Strategy
            </CardTitle>
            <CardDescription>
              Select the marketing strategy to align your content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
              <SelectTrigger>
                <SelectValue placeholder="Choose strategy" />
              </SelectTrigger>
              <SelectContent>
                {strategies.map((strategy) => (
                  <SelectItem key={strategy.id} value={strategy.id}>
                    <div className="flex items-center gap-2">
                      {strategy.isAIGenerated && <Sparkles className="h-3 w-3 text-purple-600" />}
                      <div>
                        <div className="font-medium">{strategy.name}</div>
                        <div className="text-sm text-muted-foreground">{strategy.description}</div>
                        {strategy.isAIGenerated && (
                          <div className="text-xs text-purple-600">AI-Generated Strategy</div>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Weekly Pipeline */}
        <Card className={weeklyPipelines.find(w => w.id === selectedWeek)?.isAIGenerated ? "border-purple-200 bg-purple-50/30" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Weekly Pipeline
            </CardTitle>
            <CardDescription>
              Choose the weekly messaging theme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Select week theme" />
              </SelectTrigger>
              <SelectContent>
                {weeklyPipelines.map((week) => (
                  <SelectItem key={week.id} value={week.id}>
                    <div className="flex items-center gap-2">
                      {week.isAIGenerated && <Sparkles className="h-3 w-3 text-purple-600" />}
                      <div>
                        <div className="font-medium">{week.name}</div>
                        <div className="text-sm text-muted-foreground">{week.theme}</div>
                        {week.isAIGenerated && (
                          <div className="text-xs text-purple-600">AI-Generated Plan</div>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Platform Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Platform Status
            </CardTitle>
            <CardDescription>
              Connected platforms for content distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {platforms.map((platform) => (
                <div key={platform.name} className="flex items-center justify-between">
                  <span className="text-sm">{platform.name}</span>
                  <Badge variant={platform.enabled ? "default" : "secondary"}>
                    {platform.enabled ? "Connected" : "Not Connected"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleGenerateContent}
          disabled={!selectedStrategy || !selectedWeek || isGenerating}
          size="lg"
          className="px-8"
        >
          <Wand2 className="h-5 w-5 mr-2" />
          {isGenerating ? "Generating Content..." : "Generate Content"}
        </Button>
      </div>

      {/* Generated Content */}
      {generatedContent.length > 0 && (
        <div className="space-y-6">
          <Separator />
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Generated Content</h2>
            <div className="grid gap-6">
              {generatedContent.map((content) => (
                <Card key={content.id} className={content.isAIEnhanced ? "border-purple-200 bg-purple-50/30" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {content.isAIEnhanced && <Sparkles className="h-4 w-4 text-purple-600" />}
                        <CardTitle className="text-lg">{content.type}</CardTitle>
                        {content.isAIEnhanced && (
                          <Badge variant="outline" className="text-purple-600">AI-Enhanced</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <ImageIcon className="h-4 w-4 mr-1" />
                          Add Visual
                        </Button>
                        <Button variant="outline" size="sm">
                          <Copy className="h-4 w-4 mr-1" />
                          Duplicate
                        </Button>
                        <Button variant="default" size="sm">
                          <Save className="h-4 w-4 mr-1" />
                          Save to Drafts
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea 
                      value={content.content}
                      className="min-h-[150px] mb-4"
                      readOnly
                    />
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">Target Platforms:</p>
                        <div className="flex gap-2">
                          {content.platforms.map((platform: string) => (
                            <Badge key={platform} variant="secondary">{platform}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">Hashtags:</p>
                        <div className="flex gap-2 flex-wrap">
                          {content.hashtags.map((hashtag: string) => (
                            <Badge key={hashtag} variant="outline">{hashtag}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-foreground">Suggested Schedule:</p>
                        <p className="text-sm text-muted-foreground">{content.scheduledTime}</p>
                      </div>

                      {content.isAIEnhanced && (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-purple-700 font-medium">
                              ✨ This content was enhanced using your AI-generated strategy and content plans
                            </p>
                            <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Create Visual
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
