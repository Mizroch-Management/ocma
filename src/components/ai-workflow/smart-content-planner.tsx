import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Edit3, RefreshCw, CheckCircle, Lightbulb, Target, Clock, BarChart3, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkflow, type WorkflowContentPlan, type BusinessInfo, type AIStrategyStep } from "@/contexts/workflow-context";
import { buildPlanningPrompt } from "@/lib/ai-prompt-builder";

interface SmartContentPlannerProps {
  strategy: any;
  onPlanApproved: (plans: any[]) => void;
}

export function SmartContentPlanner({ strategy, onPlanApproved }: SmartContentPlannerProps) {
  const { toast } = useToast();
  const { state, dispatch } = useWorkflow();
  
  const [planningPhase, setPlanningPhase] = useState<'overview' | 'weekly'>('overview');
  const [showPrompts, setShowPrompts] = useState<{[key: string]: boolean}>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [monthlyOverview, setMonthlyOverview] = useState<{
    aiGenerated: string;
    userPrompt: string;
    status: 'pending' | 'generating' | 'review' | 'approved';
    progress: number;
    aiPrompt?: string;
  }>({
    aiGenerated: '',
    userPrompt: '',
    status: 'pending',
    progress: 0
  });
  
  const [weeklyPlans, setWeeklyPlans] = useState<WorkflowContentPlan[]>([
    {
      id: 'week1',
      week: 1,
      theme: '',
      objectives: [],
      contentTypes: [],
      platforms: [],
      kpis: [],
      aiGenerated: '',
      userPrompt: '',
      status: 'pending',
      progress: 0
    },
    {
      id: 'week2', 
      week: 2,
      theme: '',
      objectives: [],
      contentTypes: [],
      platforms: [],
      kpis: [],
      aiGenerated: '',
      userPrompt: '',
      status: 'pending',
      progress: 0
    },
    {
      id: 'week3',
      week: 3,
      theme: '',
      objectives: [],
      contentTypes: [],
      platforms: [],
      kpis: [],
      aiGenerated: '',
      userPrompt: '',
      status: 'pending',
      progress: 0
    },
    {
      id: 'week4',
      week: 4,
      theme: '',
      objectives: [],
      contentTypes: [],
      platforms: [],
      kpis: [],
      aiGenerated: '',
      userPrompt: '',
      status: 'pending',
      progress: 0
    }
  ]);

  // Load saved draft data on mount - only depend on the entire draftData object
  useEffect(() => {
    if (state.draftData) {
      if (state.draftData.monthlyOverview) {
        setMonthlyOverview(state.draftData.monthlyOverview);
      }
      if (state.draftData.planningPhase) {
        setPlanningPhase(state.draftData.planningPhase);
      }
      if (state.draftData.weeklyPlans) {
        setWeeklyPlans(state.draftData.weeklyPlans);
      }
    }
  }, [state.draftData]);

  // Auto-save when data changes (but not on initial load)
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (isInitialized) {
      dispatch({
        type: 'SET_DRAFT_DATA',
        payload: {
          monthlyOverview,
          planningPhase,
          weeklyPlans,
        }
      });
    }
  }, [monthlyOverview, planningPhase, weeklyPlans, dispatch, isInitialized]);

  // Mark as initialized after first load
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialized(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const generateMonthlyOverview = async (customPrompt?: string) => {
    // Get business info and approved strategy steps from context
    const businessInfo = state.businessInfo;
    const approvedSteps = state.draftData?.strategySteps?.filter(s => s.status === 'approved') || [];
    
    if (!businessInfo) {
      toast({
        title: "Missing Information",
        description: "Business information is required for content planning.",
        variant: "destructive"
      });
      return;
    }
    
    // Build comprehensive AI prompt including all context
    const aiPrompt = buildPlanningPrompt(
      businessInfo,
      approvedSteps,
      'overview',
      undefined,
      undefined,
      customPrompt || monthlyOverview.userPrompt
    );

    setMonthlyOverview(prev => ({ ...prev, status: 'generating', progress: 0, aiPrompt }));

    try {
      let progressValue = 0;
      const progressInterval = setInterval(() => {
        progressValue = Math.min(progressValue + 15, 90);
        setMonthlyOverview(prev => ({ ...prev, progress: progressValue }));
      }, 500);

      const response = await supabase.functions.invoke('generate-content', {
        body: {
          contentType: 'blog-article',
          strategy: strategy?.name || 'Monthly Content Strategy',
          platforms: ['instagram', 'linkedin', 'twitter'],
          customPrompt: aiPrompt,
          aiTool: 'gpt-4o-mini'
        }
      });

      clearInterval(progressInterval);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate monthly overview');
      }

      const generatedContent = response.data?.content || "Generated strategy overview will appear here.";

      setMonthlyOverview(prev => ({
        ...prev,
        aiGenerated: generatedContent,
        status: 'review',
        progress: 100
      }));

      toast({
        title: "Monthly Overview Generated",
        description: "Review the content strategy overview and approve or refine it."
      });

    } catch (error) {
      console.error('Error generating monthly overview:', error);
      setMonthlyOverview(prev => ({
        ...prev,
        status: 'pending',
        progress: 0
      }));
      
      toast({
        title: "Generation Failed",
        description: "Failed to generate monthly overview. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateWeeklyPlan = async (weekIndex: number, customPrompt?: string) => {
    const weekThemes = [
      "Education & Authority Building",
      "Community Engagement & Behind-the-Scenes", 
      "Value-Driven Product Focus",
      "Social Proof & Customer Success"
    ];

    // Get business info and approved strategy steps from context
    const businessInfo = state.businessInfo;
    const approvedSteps = state.draftData?.strategySteps?.filter(s => s.status === 'approved') || [];
    
    if (!businessInfo) {
      toast({
        title: "Missing Information",
        description: "Business information is required for content planning.",
        variant: "destructive"
      });
      return;
    }
    
    // Build comprehensive AI prompt including all context
    const aiPrompt = buildPlanningPrompt(
      businessInfo,
      approvedSteps,
      'weekly',
      weekIndex + 1,
      weekThemes[weekIndex],
      customPrompt || weeklyPlans[weekIndex]?.userPrompt
    );

    setWeeklyPlans(prev => prev.map((plan, i) => 
      i === weekIndex 
        ? { ...plan, status: 'generating', progress: 0, theme: weekThemes[weekIndex], aiPrompt }
        : plan
    ));

    try {
      let progressValue = 0;
      const progressInterval = setInterval(() => {
        progressValue = Math.min(progressValue + 12, 90);
        setWeeklyPlans(prev => prev.map((plan, i) => 
          i === weekIndex ? { ...plan, progress: progressValue } : plan
        ));
      }, 500);

      const response = await supabase.functions.invoke('generate-content', {
        body: {
          contentType: 'blog-article',
          strategy: weekThemes[weekIndex],
          platforms: ['instagram', 'linkedin', 'twitter'],
          customPrompt: aiPrompt,
          aiTool: 'gpt-4o-mini'
        }
      });

      clearInterval(progressInterval);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate weekly plan');
      }

      const generatedContent = response.data?.content || "Generated weekly plan will appear here.";
      
      setWeeklyPlans(prev => prev.map((plan, i) => 
        i === weekIndex 
          ? { 
              ...plan,
              aiGenerated: generatedContent,
              status: 'review',
              progress: 100 
            }
          : plan
      ));

      toast({
        title: `Week ${weekIndex + 1} Plan Generated`,
        description: "Review the weekly content plan and approve or refine it."
      });

    } catch (error) {
      console.error(`Error generating week ${weekIndex + 1} plan:`, error);
      setWeeklyPlans(prev => prev.map((plan, i) => 
        i === weekIndex 
          ? { ...plan, status: 'pending', progress: 0 }
          : plan
      ));
      
      toast({
        title: "Generation Failed",
        description: `Failed to generate week ${weekIndex + 1} plan. Please try again.`,
        variant: "destructive"
      });
    }
  };

  const generateWeeklyContent = (weekIndex: number, theme: string) => {
    const weeklyContent = [
      `**Week 1: ${theme}**

**Objectives:**
- Establish thought leadership in the industry
- Drive 15% increase in LinkedIn followers
- Generate 100+ newsletter signups from educational content

**Content Calendar:**

**Monday - LinkedIn Article**
- Topic: "5 Data-Driven Marketing Trends Reshaping 2024"
- Format: Long-form thought leadership post
- CTA: Newsletter signup for weekly insights

**Tuesday - Instagram Educational Carousel** 
- Topic: "Marketing Metrics That Actually Matter"
- Format: 5-slide carousel with key statistics
- CTA: Save for later, share with your team

**Wednesday - Twitter Thread**
- Topic: "How to Build Brand Authority (10-tweet thread)"
- Format: Educational thread with actionable tips
- CTA: Follow for daily marketing insights

**Thursday - Blog Post + Email**
- Topic: "Complete Guide to Content Marketing ROI"
- Format: 2000-word comprehensive guide
- Distribution: Blog + email to subscribers

**Friday - Instagram Reel**
- Topic: "3 Quick Marketing Tips" (60-second reel)
- Format: Fast-paced, visually engaging tips
- CTA: Follow for weekly tips

**Weekend - LinkedIn Poll**
- Topic: "What's your biggest content marketing challenge?"
- Format: Engagement-focused poll
- CTA: Comment with your specific challenge

**Key Hashtags:** #MarketingStrategy #ContentMarketing #ThoughtLeadership #BusinessGrowth`,

      `**Week 2: ${theme}**

**Objectives:**
- Humanize the brand through authentic storytelling
- Increase Instagram engagement by 25%
- Build community through interactive content

**Content Calendar:**

**Monday - Instagram Stories Series**
- Topic: "Day in the Life: Our Content Team"
- Format: 8-10 stories showing the creative process
- CTA: Ask me anything about content creation

**Tuesday - LinkedIn Behind-the-Scenes**
- Topic: "How We Plan Our Content Strategy"
- Format: Process-focused post with photos
- CTA: What's your content planning process?

**Wednesday - Twitter Spaces (or Live Tweet)**
- Topic: "Marketing Hot Takes & Community Q&A"
- Format: Live engagement with followers
- CTA: Set reminder, join the conversation

**Thursday - Instagram Live**
- Topic: "Content Creation Tips & Tricks"
- Format: 30-minute live session with Q&A
- CTA: Submit questions in advance

**Friday - Team Spotlight Post**
- Topic: Feature a team member and their expertise
- Format: Interview-style post across platforms
- CTA: Welcome [team member] to our community

**Weekend - User-Generated Content**
- Topic: Repost customer content with permission
- Format: Shared posts with commentary
- CTA: Tag us to be featured

**Key Hashtags:** #TeamSpotlight #BehindTheScenes #CommunityFirst #TeamWork`,

      `**Week 3: ${theme}**

**Objectives:**
- Showcase product value through education, not selling
- Generate 150+ demo requests through content
- Increase email click-through rates by 20%

**Content Calendar:**

**Monday - Product Demo Video**
- Topic: "How [Product] Saves 10 Hours Per Week"
- Format: Screen recording with real use case
- CTA: Book a personalized demo

**Tuesday - Case Study Carousel**
- Topic: "Client Success: 300% ROI Increase"
- Format: Instagram carousel with key metrics
- CTA: Read full case study (link in bio)

**Wednesday - Feature Spotlight Thread**
- Topic: "Hidden Feature That Changes Everything"
- Format: Twitter thread explaining lesser-known feature
- CTA: Try it free for 14 days

**Thursday - Comparison Blog Post**
- Topic: "Choosing the Right Marketing Tool: A Buyer's Guide"
- Format: Unbiased comparison including competitors
- CTA: Download our selection checklist

**Friday - Customer Success Reel**
- Topic: Quick customer testimonial or result
- Format: 30-second video testimonial
- CTA: Start your free trial today

**Weekend - FAQ Post**
- Topic: "Most Asked Questions About [Solution]"
- Format: LinkedIn post addressing common concerns
- CTA: Ask your question in the comments

**Key Hashtags:** #ProductSpotlight #CustomerSuccess #MarketingTools #BusinessSolutions`,

      `**Week 4: ${theme}**

**Objectives:**
- Leverage social proof to build credibility
- Generate 200+ leads through customer stories
- End month with strong momentum for next cycle

**Content Calendar:**

**Monday - Customer Spotlight**
- Topic: "Meet [Customer]: From Struggle to Success"
- Format: Interview-style LinkedIn post
- CTA: Book a call to discuss your goals

**Tuesday - Review Roundup**
- Topic: "What Our Customers Are Saying"
- Format: Instagram carousel of reviews/testimonials
- CTA: Add your review (link in bio)

**Wednesday - Success Metrics Thread**
- Topic: "Real Results from Real Customers"
- Format: Twitter thread with anonymized metrics
- CTA: See how we can help your business

**Thursday - Webinar Announcement**
- Topic: "Customer Panel: Lessons Learned"
- Format: Multi-platform promotion
- CTA: Register for live webinar

**Friday - Month in Review**
- Topic: "January Highlights & February Preview"
- Format: Visual summary across platforms
- CTA: What content did you find most valuable?

**Weekend - Community Appreciation**
- Topic: "Thank You to Our Amazing Community"
- Format: Gratitude post featuring community members
- CTA: Tag someone who inspires you

**Key Hashtags:** #CustomerSpotlight #SocialProof #CommunityLove #ResultsThatMatter`
    ];

    return weeklyContent[weekIndex] || "Generated weekly content plan based on strategy.";
  };

  const approveOverview = () => {
    setIsTransitioning(true);
    setMonthlyOverview(prev => ({ ...prev, status: 'approved' }));
    
    setTimeout(() => {
      setPlanningPhase('weekly');
      generateWeeklyPlan(0);
      setIsTransitioning(false);
    }, 300);
    
    toast({
      title: "Monthly Overview Approved",
      description: "Now generating detailed weekly plans..."
    });
  };

  const approveWeekPlan = (weekIndex: number) => {
    setWeeklyPlans(prev => prev.map((plan, i) => 
      i === weekIndex ? { ...plan, status: 'approved' } : plan
    ));

    if (weekIndex < weeklyPlans.length - 1) {
      generateWeeklyPlan(weekIndex + 1);
    } else {
      // All weeks completed
      onPlanApproved(weeklyPlans.filter(p => p.status === 'approved'));
      
      toast({
        title: "Content Plans Approved",
        description: "Your monthly content strategy is ready for content creation!"
      });
    }
  };

  const retryOverview = () => {
    generateMonthlyOverview(monthlyOverview.userPrompt);
  };

  const retryWeekPlan = (weekIndex: number) => {
    generateWeeklyPlan(weekIndex, weeklyPlans[weekIndex].userPrompt);
  };

  const togglePromptVisibility = (id: string) => {
    setShowPrompts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const startPlanning = () => {
    generateMonthlyOverview();
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Smart Content Planner</CardTitle>
              <CardDescription>
                AI creates a comprehensive monthly content strategy with weekly breakdowns
              </CardDescription>
            </div>
          </div>
          
          {monthlyOverview.status === 'pending' && (
            <Button onClick={startPlanning} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Lightbulb className="h-4 w-4 mr-2" />
              Generate Content Plan
            </Button>
          )}
        </div>
      </CardHeader>

      {monthlyOverview.status !== 'pending' && (
        <CardContent className="space-y-6">
          {isTransitioning ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Transitioning to weekly planning...</span>
              </div>
            </div>
          ) : (
            <Tabs value={planningPhase} onValueChange={setPlanningPhase as any}>
              <TabsList>
                <TabsTrigger value="overview">Monthly Overview</TabsTrigger>
                <TabsTrigger value="weekly" disabled={monthlyOverview.status !== 'approved'}>
                  Weekly Plans
                </TabsTrigger>
              </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Monthly Strategy Overview</h3>
                <Badge variant={
                  monthlyOverview.status === 'approved' ? 'default' :
                  monthlyOverview.status === 'generating' ? 'secondary' :
                  monthlyOverview.status === 'review' ? 'outline' :
                  'secondary'
                }>
                  {monthlyOverview.status}
                </Badge>
              </div>

              {monthlyOverview.status === 'generating' && (
                <Progress value={monthlyOverview.progress} className="w-full" />
              )}

              {monthlyOverview.status === 'review' && (
                <div className="space-y-4 p-4 border rounded-lg bg-background/50">
                  {monthlyOverview.aiPrompt && (
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePromptVisibility('overview')}
                        className="text-xs"
                      >
                        {showPrompts.overview ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                        {showPrompts.overview ? 'Hide' : 'Show'} AI Prompt
                      </Button>
                      {showPrompts.overview && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border text-xs">
                          <pre className="whitespace-pre-wrap text-blue-700 dark:text-blue-300">{monthlyOverview.aiPrompt}</pre>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">AI Generated Strategy Overview:</label>
                    <div className="p-3 bg-muted rounded border max-h-96 overflow-y-auto">
                      <div className="whitespace-pre-wrap text-sm">{monthlyOverview.aiGenerated}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Refinement Instructions (Optional):</label>
                    <Textarea
                      value={monthlyOverview.userPrompt}
                      onChange={(e) => setMonthlyOverview(prev => ({ ...prev, userPrompt: e.target.value }))}
                      placeholder="Add specific instructions to refine the monthly strategy..."
                      rows={2}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={approveOverview} size="sm">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve & Continue
                    </Button>
                    <Button onClick={retryOverview} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              )}

              {monthlyOverview.status === 'approved' && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-200">✓ Monthly overview approved. Proceed to weekly planning.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="weekly" className="space-y-6">
              {weeklyPlans.map((plan, index) => (
                <div key={plan.id} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      plan.status === 'approved' ? 'bg-green-100 text-green-600' :
                      plan.status === 'generating' ? 'bg-blue-100 text-blue-600' :
                      plan.status === 'review' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {plan.status === 'approved' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <h3 className="font-semibold">Week {plan.week}</h3>
                    {plan.theme && <span className="text-sm text-muted-foreground">- {plan.theme}</span>}
                    <Badge variant={
                      plan.status === 'approved' ? 'default' :
                      plan.status === 'generating' ? 'secondary' :
                      plan.status === 'review' ? 'outline' :
                      'secondary'
                    }>
                      {plan.status}
                    </Badge>
                  </div>

                  {plan.status === 'generating' && (
                    <Progress value={plan.progress} className="w-full" />
                  )}

                  {plan.status === 'review' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-background/50">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">AI Generated Week {plan.week} Plan:</label>
                        <div className="p-3 bg-muted rounded border max-h-80 overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-sm">{plan.aiGenerated}</pre>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Edit Instructions (Optional):</label>
                        <Textarea
                          value={plan.userPrompt}
                          onChange={(e) => setWeeklyPlans(prev => prev.map((p, i) => 
                            i === index ? { ...p, userPrompt: e.target.value } : p
                          ))}
                          placeholder="Add specific instructions to refine this week..."
                          rows={2}
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button onClick={() => approveWeekPlan(index)} size="sm">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Week
                        </Button>
                        <Button onClick={() => retryWeekPlan(index)} variant="outline" size="sm">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  )}

                  {plan.status === 'approved' && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-800 dark:text-green-200">✓ Week {plan.week} approved and ready for content creation</p>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>
            </Tabs>
          )}
        </CardContent>
      )}
    </Card>
  );
}