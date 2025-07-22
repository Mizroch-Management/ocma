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

interface AIStrategyStep {
  id: string;
  title: string;
  description: string;
  aiGenerated: string;
  userPrompt: string;
  status: 'pending' | 'generating' | 'review' | 'approved' | 'retry';
  progress: number;
}

interface AIStrategyConsultantProps {
  onStrategyApproved: (strategy: any) => void;
  masterStrategy: any;
}

export function AIStrategyConsultant({ onStrategyApproved, masterStrategy }: AIStrategyConsultantProps) {
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

    // Simulate AI generation with progress
    const progressInterval = setInterval(() => {
      setSteps(prev => prev.map((s, i) => 
        i === stepIndex && s.progress < 90
          ? { ...s, progress: s.progress + 10 }
          : s
      ));
    }, 200);

    setTimeout(() => {
      clearInterval(progressInterval);
      
      const generatedContent = generateMockContent(step.id, customPrompt || step.userPrompt);
      
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
    }, 2000);
  };

  const generateMockContent = (stepId: string, customPrompt?: string) => {
    const mockContent: { [key: string]: string } = {
      objectives: `**Primary Objectives (Q1 2024):**

1. **Brand Awareness**: Increase brand recognition by 45% among target demographics
   - Reach 500K new potential customers monthly
   - Achieve 25% aided brand recall in market research

2. **Engagement Growth**: Build authentic community engagement
   - Grow social media following by 40% across platforms
   - Maintain 8%+ engagement rate on key content

3. **Lead Generation**: Drive qualified prospect pipeline
   - Generate 2,500 marketing qualified leads monthly
   - Achieve 15% lead-to-customer conversion rate

4. **Revenue Impact**: Directly contribute to business growth
   - Support $2M in new revenue attributable to marketing
   - Reduce customer acquisition cost by 20%

**Success Metrics**: Monthly brand tracking, engagement analytics, lead scoring, revenue attribution`,

      audience: `**Primary Audience Segments:**

**Segment 1: Digital Innovators (40% of TAM)**
- Demographics: 28-40 years, urban professionals, $75K+ income
- Psychographics: Early adopters, value efficiency, socially conscious
- Behaviors: Active on LinkedIn/Instagram, reads industry blogs
- Pain Points: Time management, staying current with trends
- Preferred Content: How-to guides, industry insights, behind-the-scenes

**Segment 2: Growth-Focused SMBs (35% of TAM)**
- Demographics: Business owners/managers, 30-50 years
- Psychographics: Results-driven, budget-conscious, collaborative
- Behaviors: Research-heavy buyers, referral-dependent
- Pain Points: Resource constraints, scaling challenges
- Preferred Content: Case studies, ROI-focused content, testimonials

**Segment 3: Enterprise Decision Makers (25% of TAM)**
- Demographics: C-level executives, 40-60 years
- Psychographics: Strategic thinkers, risk-averse, data-driven
- Behaviors: Long sales cycles, committee-based decisions
- Pain Points: Complex implementations, stakeholder buy-in
- Preferred Content: Whitepapers, thought leadership, analyst reports`,

      positioning: `**Brand Positioning Strategy:**

**Core Position**: "The intelligent marketing platform that transforms data into growth"

**Competitive Differentiation:**
- **vs. Traditional Tools**: We're AI-native, not AI-added
- **vs. Enterprise Solutions**: Enterprise power, startup agility
- **vs. Point Solutions**: Unified platform, not fragmented tools

**Value Propositions by Segment:**

**For Digital Innovators:**
"Stay ahead of marketing trends with AI that learns and adapts to your industry"

**For SMBs:**
"Get enterprise-level marketing intelligence without enterprise complexity or cost"

**For Enterprise:**
"Scale personalized marketing across all touchpoints with unified data intelligence"

**Brand Pillars:**
1. **Intelligence**: AI-powered insights that drive decisions
2. **Simplicity**: Complex marketing made simple and actionable
3. **Results**: Measurable impact on growth and ROI
4. **Innovation**: Cutting-edge technology, practical application

**Messaging Framework**: "Your marketing is only as smart as your data. Make it genius."`,

      channels: `**Recommended Channel Strategy:**

**Tier 1 Channels (60% of budget):**
1. **LinkedIn Marketing** - Primary B2B reach and thought leadership
   - Sponsored content for awareness
   - InMail for direct outreach
   - Company page for community building

2. **Content Marketing Hub** - Blog, resources, and SEO
   - 3x weekly blog posts targeting buyer journey
   - Gated resources for lead generation
   - SEO optimization for buyer intent keywords

**Tier 2 Channels (30% of budget):**
3. **Email Marketing** - Nurture and retention
   - Welcome series for new leads
   - Weekly newsletter with industry insights
   - Behavior-triggered campaigns

4. **Webinars & Events** - Thought leadership and demos
   - Monthly educational webinars
   - Industry conference participation
   - Customer success showcases

**Tier 3 Channels (10% of budget):**
5. **Social Media** - Brand building and engagement
   - Instagram for behind-the-scenes content
   - Twitter for industry conversations
   - YouTube for product demonstrations

**Attribution Model**: Multi-touch attribution focusing on assist channels and conversion paths`
    };
    
    return mockContent[stepId] || "AI-generated content based on your strategy and requirements.";
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