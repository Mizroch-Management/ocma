
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useWorkflow } from "@/contexts/workflow-context";
import { Wand2, Target, Calendar, TrendingUp, Copy, Edit, Save, Sparkles } from "lucide-react";

export default function ContentCreation() {
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [generatedContent, setGeneratedContent] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { state: workflowState } = useWorkflow();

  // Combine manual strategies with AI strategy
  const strategies = [
    { id: "1", name: "Q1 Brand Awareness", description: "Focus on increasing brand visibility" },
    { id: "2", name: "Product Launch Campaign", description: "Launching new product line" },
    { id: "3", name: "Holiday Marketing", description: "Seasonal promotional content" },
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
        { id: "week1", name: "Week 1: Education & Tips", theme: "Educational content to build authority" },
        { id: "week2", name: "Week 2: Behind the Scenes", theme: "Show company culture and processes" },
        { id: "week3", name: "Week 3: User Generated Content", theme: "Feature customer stories and reviews" },
        { id: "week4", name: "Week 4: Product Focus", theme: "Highlight products and services" }
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
      
      const mockContent = [
        {
          id: "1",
          type: isUsingAIPlan ? "AI-Optimized Educational Post" : "Educational Post",
          content: isUsingAIStrategy 
            ? `Building on our AI-generated strategy objectives, here's how sustainable innovation drives real business results 📊\n\nKey insights from our data-driven approach:\n\n1. Authentic messaging increases engagement by 40%\n2. Sustainability focus resonates with Gen Z professionals\n3. Data-backed content builds trust and authority\n\n#SustainableInnovation #DataDriven #AuthenticMarketing`
            : "Did you know that 73% of marketers believe that their efforts through social media marketing have been 'somewhat effective' or 'very effective' for their business? 📊\n\nHere are 3 key strategies to improve your social media ROI:\n\n1. Focus on engagement over followers\n2. Use data-driven content planning\n3. Maintain consistent brand voice\n\n#SocialMediaTips #MarketingStrategy #BusinessGrowth",
          platforms: ["Instagram", "LinkedIn", "Facebook"],
          scheduledTime: "Tomorrow at 10:00 AM",
          hashtags: isUsingAIStrategy 
            ? ["#SustainableInnovation", "#DataDriven", "#AuthenticMarketing"]
            : ["#SocialMediaTips", "#MarketingStrategy", "#BusinessGrowth"],
          isAIEnhanced: isUsingAIStrategy || isUsingAIPlan
        },
        {
          id: "2",
          type: isUsingAIPlan ? "AI-Optimized Behind the Scenes" : "Behind the Scenes",
          content: isUsingAIStrategy
            ? "Monday motivation from our innovation team! ☕✨\n\nOur data scientists and content creators collaborate to bring you insights that matter. This week we're analyzing engagement patterns to optimize our authentic, professional approach.\n\nWhat drives your team's Monday energy?\n\n#MondayMotivation #Innovation #DataScience"
            : "Monday motivation from our creative team! ☕✨\n\nOur content creators are hard at work planning next month's campaign strategy. There's nothing quite like the energy of a brainstorming session with coffee and whiteboards.\n\nWhat does your Monday look like?\n\n#MondayMotivation #TeamWork #CreativeProcess",
          platforms: ["Instagram", "Facebook"],
          scheduledTime: "Monday at 9:00 AM",
          hashtags: isUsingAIStrategy
            ? ["#MondayMotivation", "#Innovation", "#DataScience"]
            : ["#MondayMotivation", "#TeamWork", "#CreativeProcess"],
          isAIEnhanced: isUsingAIStrategy || isUsingAIPlan
        },
        {
          id: "3",
          type: isUsingAIPlan ? "AI-Optimized Product Showcase" : "Product Showcase",
          content: isUsingAIStrategy
            ? "Introducing our latest sustainable innovation: AI-powered content optimization! 🚀\n\nAligned with our commitment to authentic, data-driven marketing:\n✅ Optimize for genuine engagement\n✅ Generate insights-based content\n✅ Analyze authentic interaction patterns\n✅ Schedule with professional precision\n\nExperience the future of sustainable marketing!\n\n#SustainableInnovation #AIOptimization #AuthenticMarketing"
            : "Introducing our latest feature: AI-powered content scheduling! 🚀\n\nNow you can:\n✅ Auto-optimize posting times\n✅ Generate content suggestions\n✅ Analyze engagement patterns\n✅ Schedule across all platforms\n\nTry it free for 14 days!\n\n#ProductUpdate #AI #SocialMediaTools",
          platforms: ["LinkedIn", "Twitter", "Facebook"],
          scheduledTime: "Wednesday at 2:00 PM",
          hashtags: isUsingAIStrategy
            ? ["#SustainableInnovation", "#AIOptimization", "#AuthenticMarketing"]
            : ["#ProductUpdate", "#AI", "#SocialMediaTools"],
          isAIEnhanced: isUsingAIStrategy || isUsingAIPlan
        }
      ];
      setGeneratedContent(mockContent);
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
                          <p className="text-sm text-purple-700 font-medium">
                            ✨ This content was enhanced using your AI-generated strategy and content plans
                          </p>
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
