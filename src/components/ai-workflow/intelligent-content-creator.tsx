import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Wand2, Edit3, RefreshCw, CheckCircle, Copy, Eye, Share, MessageSquare, Image, Video, FileText, Calendar } from "lucide-react";

interface ContentPiece {
  id: string;
  type: string;
  platform: string;
  title: string;
  content: string;
  hashtags: string[];
  callToAction: string;
  schedulingSuggestion: string;
  aiGenerated: string;
  userPrompt: string;
  status: 'pending' | 'generating' | 'review' | 'approved' | 'retry';
  progress: number;
  variations: string[];
}

interface IntelligentContentCreatorProps {
  contentPlans: any[];
  onContentApproved: (content: ContentPiece[]) => void;
}

export function IntelligentContentCreator({ contentPlans, onContentApproved }: IntelligentContentCreatorProps) {
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState("1");
  const [selectedDay, setSelectedDay] = useState("monday");
  const [contentPieces, setContentPieces] = useState<ContentPiece[]>([]);
  
  const platforms = ['LinkedIn', 'Instagram', 'Twitter', 'Email', 'Blog'];
  const contentTypes = ['Educational Post', 'Behind-the-Scenes', 'Product Focus', 'Customer Story', 'Industry Insight'];

  const generateContentForDay = async (week: string, day: string, customPrompt?: string) => {
    // Create content pieces for the selected day
    const dayContent = [
      {
        id: `${week}-${day}-linkedin`,
        type: 'Educational Post',
        platform: 'LinkedIn',
        title: '',
        content: '',
        hashtags: [],
        callToAction: '',
        schedulingSuggestion: '',
        aiGenerated: '',
        userPrompt: customPrompt || '',
        status: 'generating' as const,
        progress: 0,
        variations: []
      },
      {
        id: `${week}-${day}-instagram`,
        type: 'Visual Story',
        platform: 'Instagram',
        title: '',
        content: '',
        hashtags: [],
        callToAction: '',
        schedulingSuggestion: '',
        aiGenerated: '',
        userPrompt: customPrompt || '',
        status: 'generating' as const,
        progress: 0,
        variations: []
      }
    ];

    setContentPieces(prev => [...prev.filter(p => !p.id.startsWith(`${week}-${day}`)), ...dayContent]);

    // Simulate AI generation for each piece
    for (let i = 0; i < dayContent.length; i++) {
      const piece = dayContent[i];
      
      const progressInterval = setInterval(() => {
        setContentPieces(prev => prev.map(p => 
          p.id === piece.id && p.progress < 90
            ? { ...p, progress: p.progress + 15 }
            : p
        ));
      }, 200);

      setTimeout(() => {
        clearInterval(progressInterval);
        
        const generated = generateMockContent(piece.type, piece.platform, week, day);
        
        setContentPieces(prev => prev.map(p => 
          p.id === piece.id 
            ? { 
                ...p,
                ...generated,
                status: 'review',
                progress: 100 
              }
            : p
        ));

        if (i === dayContent.length - 1) {
          toast({
            title: "Content Generated",
            description: `${dayContent.length} content pieces created for ${day}. Review and approve each piece.`
          });
        }
      }, (i + 1) * 1500);
    }
  };

  const generateMockContent = (type: string, platform: string, week: string, day: string) => {
    const contentMap: { [key: string]: any } = {
      'Educational Post-LinkedIn': {
        title: "5 Data-Driven Marketing Insights for 2024",
        content: `🚀 Just analyzed Q4 marketing data across 500+ campaigns. Here are the 5 insights that will shape your 2024 strategy:

1. **Video content drives 3x more engagement** than static posts
   → But only when under 90 seconds

2. **Personalization increases CTR by 41%**
   → Use behavioral triggers, not just demographic data

3. **Tuesday 10 AM is the new Thursday 2 PM**
   → Peak engagement times have shifted post-pandemic

4. **Micro-influencers (1K-10K followers) generate 60% higher engagement rates**
   → Quality of audience > quantity of followers

5. **Interactive content (polls, quizzes) sees 4x more shares**
   → People love being part of the conversation

Which insight surprises you most? 👇

#MarketingInsights #DataDriven #Strategy2024 #MarketingTrends #DigitalMarketing`,
        hashtags: ['#MarketingInsights', '#DataDriven', '#Strategy2024', '#MarketingTrends', '#DigitalMarketing'],
        callToAction: "Share your biggest marketing challenge in the comments",
        schedulingSuggestion: "Tuesday 10:00 AM - Peak professional engagement time",
        variations: [
          "Focus on 3 insights instead of 5 for higher retention",
          "Add industry-specific examples for better relevance"
        ]
      },
      'Visual Story-Instagram': {
        title: "Behind the Marketing Magic",
        content: `Behind the scenes of our content creation process ✨

Swipe to see how we turn data into engaging stories:

1. 📊 Data analysis (the boring but crucial part!)
2. 🧠 Strategy brainstorming with coffee ☕
3. 🎨 Visual creation and design
4. 📝 Copy writing and refinement
5. 📅 Strategic scheduling
6. 🚀 Launch and optimization

The magic happens in the preparation! What's your content creation process like?

#BehindTheScenes #ContentCreation #MarketingProcess #CreativeProcess #TeamWork #ContentStrategy`,
        hashtags: ['#BehindTheScenes', '#ContentCreation', '#MarketingProcess', '#CreativeProcess', '#TeamWork', '#ContentStrategy'],
        callToAction: "Save this post and tell us your process in the comments!",
        schedulingSuggestion: "Wednesday 2:00 PM - High Instagram engagement window",
        variations: [
          "Create a carousel showing each step with visuals",
          "Add team member quotes about their favorite part of the process"
        ]
      },
      'Product Focus-LinkedIn': {
        title: "How AI Transformed Our Client's Content ROI",
        content: `📈 Case Study: How one client increased their content ROI by 340% in 90 days

**The Challenge:**
Small marketing team, limited resources, inconsistent content performance

**The Solution:**
Implemented our AI-powered content strategy platform

**The Process:**
1. **Week 1-2:** AI analyzed 2 years of historical content data
2. **Week 3-4:** Generated personalized content calendar
3. **Week 5-8:** Automated content creation with human oversight
4. **Week 9-12:** Continuous optimization based on performance

**The Results:**
✅ 340% increase in content ROI
✅ 75% reduction in content creation time
✅ 120% increase in qualified leads
✅ 89% improvement in engagement rates

**Key Takeaway:** AI doesn't replace creativity—it amplifies it by handling the data analysis and optimization, freeing teams to focus on strategy and storytelling.

Curious how this could work for your team?

#AIMarketing #ContentROI #MarketingAutomation #CaseStudy #MarketingResults`,
        hashtags: ['#AIMarketing', '#ContentROI', '#MarketingAutomation', '#CaseStudy', '#MarketingResults'],
        callToAction: "Book a 15-minute strategy call to see how this applies to your business",
        schedulingSuggestion: "Thursday 11:00 AM - B2B decision maker active time",
        variations: [
          "Include specific metrics and percentages",
          "Add client testimonial quote for social proof"
        ]
      }
    };

    const key = `${type}-${platform}`;
    return contentMap[key] || {
      title: "AI-Generated Content",
      content: "Engaging content created based on your strategy and brand voice...",
      hashtags: ['#Marketing', '#Content', '#Strategy'],
      callToAction: "Engage with your audience",
      schedulingSuggestion: "Optimal timing based on audience analysis",
      variations: ["Variation 1 with different angle", "Variation 2 with different tone"]
    };
  };

  const approveContent = (contentId: string) => {
    setContentPieces(prev => prev.map(piece => 
      piece.id === contentId ? { ...piece, status: 'approved' } : piece
    ));

    toast({
      title: "Content Approved",
      description: "Content piece approved and ready for scheduling."
    });
  };

  const retryContent = (contentId: string) => {
    const piece = contentPieces.find(p => p.id === contentId);
    if (piece) {
      setContentPieces(prev => prev.map(p => 
        p.id === contentId 
          ? { ...p, status: 'generating', progress: 0 }
          : p
      ));

      setTimeout(() => {
        const generated = generateMockContent(piece.type, piece.platform, selectedWeek, selectedDay);
        setContentPieces(prev => prev.map(p => 
          p.id === contentId 
            ? { 
                ...p,
                ...generated,
                status: 'review',
                progress: 100 
              }
            : p
        ));
      }, 2000);
    }
  };

  const approveAllContent = () => {
    const approvedContent = contentPieces.filter(p => p.status === 'approved');
    onContentApproved(approvedContent);
    
    toast({
      title: "All Content Approved",
      description: "Your content is ready for scheduling and publishing!"
    });
  };

  const updateContentPrompt = (contentId: string, prompt: string) => {
    setContentPieces(prev => prev.map(piece => 
      piece.id === contentId ? { ...piece, userPrompt: prompt } : piece
    ));
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Wand2 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Intelligent Content Creator</CardTitle>
              <CardDescription>
                AI generates platform-optimized content based on your approved strategy
              </CardDescription>
            </div>
          </div>
          
          {contentPieces.filter(p => p.status === 'approved').length > 0 && (
            <Button onClick={approveAllContent} size="lg" className="bg-purple-600 hover:bg-purple-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalize Content ({contentPieces.filter(p => p.status === 'approved').length})
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Week</label>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Week 1</SelectItem>
                <SelectItem value="2">Week 2</SelectItem>
                <SelectItem value="3">Week 3</SelectItem>
                <SelectItem value="4">Week 4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Day</label>
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="tuesday">Tuesday</SelectItem>
                <SelectItem value="wednesday">Wednesday</SelectItem>
                <SelectItem value="thursday">Thursday</SelectItem>
                <SelectItem value="friday">Friday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button 
              onClick={() => generateContentForDay(selectedWeek, selectedDay)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Content
            </Button>
          </div>
        </div>

        {contentPieces.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">
              Content for Week {selectedWeek} - {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}
            </h3>
            
            <div className="grid gap-6">
              {contentPieces
                .filter(piece => piece.id.startsWith(`${selectedWeek}-${selectedDay}`))
                .map((piece) => (
                  <Card key={piece.id} className="border-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {piece.platform === 'LinkedIn' && <MessageSquare className="h-5 w-5 text-blue-600" />}
                            {piece.platform === 'Instagram' && <Image className="h-5 w-5 text-pink-500" />}
                            {piece.platform === 'Twitter' && <MessageSquare className="h-5 w-5 text-blue-400" />}
                            {piece.platform === 'Email' && <FileText className="h-5 w-5 text-gray-600" />}
                            <span className="font-semibold">{piece.platform}</span>
                          </div>
                          <Badge variant="outline">{piece.type}</Badge>
                        </div>
                        <Badge variant={
                          piece.status === 'approved' ? 'default' :
                          piece.status === 'generating' ? 'secondary' :
                          piece.status === 'review' ? 'outline' :
                          'secondary'
                        }>
                          {piece.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {piece.status === 'generating' && (
                        <Progress value={piece.progress} className="w-full" />
                      )}

                      {piece.status === 'review' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Generated Content:</label>
                            <div className="p-3 bg-muted rounded border">
                              <h4 className="font-semibold mb-2">{piece.title}</h4>
                              <div className="whitespace-pre-wrap text-sm mb-3">{piece.content}</div>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {piece.hashtags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                                ))}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                <strong>CTA:</strong> {piece.callToAction}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                <strong>Best time:</strong> {piece.schedulingSuggestion}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Refinement Instructions (Optional):</label>
                            <Textarea
                              value={piece.userPrompt}
                              onChange={(e) => updateContentPrompt(piece.id, e.target.value)}
                              placeholder="Add specific instructions to refine this content..."
                              rows={2}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button onClick={() => approveContent(piece.id)} size="sm">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button onClick={() => retryContent(piece.id)} variant="outline" size="sm">
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Regenerate
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                            <Button variant="outline" size="sm">
                              <Copy className="h-4 w-4 mr-2" />
                              Copy
                            </Button>
                          </div>

                          {piece.variations.length > 0 && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border">
                              <p className="text-sm font-medium mb-2">AI Suggestions:</p>
                              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                {piece.variations.map((variation, index) => (
                                  <li key={index}>• {variation}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {piece.status === 'approved' && (
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-green-800 dark:text-green-200">✓ Content approved and ready for scheduling</p>
                            <Button variant="outline" size="sm">
                              <Calendar className="h-4 w-4 mr-2" />
                              Schedule Now
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}