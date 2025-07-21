import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Wand2, 
  Brain, 
  FileText, 
  Image, 
  Video, 
  Mic,
  Copy,
  Edit3,
  Save,
  Download,
  Share,
  Calendar,
  Target,
  Lightbulb,
  Zap,
  Settings,
  Eye,
  RefreshCw,
  Plus,
  Trash2,
  MessageSquare,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube
} from "lucide-react";

export default function ContentGenerator() {
  const { toast } = useToast();
  
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedContentType, setSelectedContentType] = useState("");
  const [selectedAITool, setSelectedAITool] = useState("");
  const [contentPrompt, setContentPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const strategies = [
    { id: "1", name: "Q1 Brand Awareness", type: "Brand Strategy" },
    { id: "2", name: "Product Launch Campaign", type: "Product Strategy" },
    { id: "3", name: "Holiday Marketing", type: "Seasonal Strategy" },
    { id: "4", name: "Thought Leadership", type: "Content Strategy" }
  ];

  const contentTypes = [
    { value: "social-post", label: "Social Media Post", icon: MessageSquare, description: "Engaging posts for social platforms" },
    { value: "blog-article", label: "Blog Article", icon: FileText, description: "Long-form educational content" },
    { value: "video-script", label: "Video Script", icon: Video, description: "Scripts for video content" },
    { value: "email-copy", label: "Email Copy", icon: FileText, description: "Email marketing content" },
    { value: "ad-copy", label: "Ad Copy", icon: Target, description: "Advertising copy and headlines" },
    { value: "caption", label: "Image Caption", icon: Image, description: "Captions for visual content" },
    { value: "hashtags", label: "Hashtag Sets", icon: MessageSquare, description: "Strategic hashtag collections" }
  ];

  const aiTools = [
    { value: "gpt4", label: "GPT-4", description: "Best for detailed content and strategy", icon: Brain },
    { value: "claude", label: "Claude", description: "Excellent for analysis and long-form", icon: Lightbulb },
    { value: "gemini", label: "Gemini", description: "Great for creative and diverse content", icon: Zap }
  ];

  const platforms = [
    { value: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500" },
    { value: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600" },
    { value: "twitter", label: "Twitter/X", icon: Twitter, color: "text-sky-500" },
    { value: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-700" },
    { value: "youtube", label: "YouTube", icon: Youtube, color: "text-red-600" }
  ];

  const contentTemplates = [
    { name: "Educational Post", prompt: "Create an educational post that teaches the audience about...", category: "Educational" },
    { name: "Behind the Scenes", prompt: "Write a behind-the-scenes post that shows...", category: "Authentic" },
    { name: "User Generated Content", prompt: "Create a post featuring customer stories about...", category: "Social Proof" },
    { name: "Product Showcase", prompt: "Write a compelling product showcase post highlighting...", category: "Product" },
    { name: "Industry Insights", prompt: "Share industry insights and trends about...", category: "Thought Leadership" },
    { name: "How-to Guide", prompt: "Create a step-by-step how-to guide for...", category: "Educational" },
    { name: "Question Post", prompt: "Write an engaging question post to spark discussion about...", category: "Engagement" },
    { name: "Motivational Quote", prompt: "Create an inspiring motivational post about...", category: "Inspirational" }
  ];

  const handleGenerateContent = async () => {
    if (!selectedStrategy || !selectedContentType || !selectedAITool) {
      toast({
        title: "Missing Information",
        description: "Please select a strategy, content type, and AI tool.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate AI content generation
    setTimeout(() => {
      const mockContent = {
        id: Date.now().toString(),
        type: selectedContentType,
        strategy: selectedStrategy,
        aiTool: selectedAITool,
        platforms: selectedPlatforms,
        content: generateMockContent(selectedContentType),
        variations: [
          generateMockContent(selectedContentType),
          generateMockContent(selectedContentType)
        ],
        metadata: {
          wordCount: 150,
          readingTime: "1 min",
          engagement: "High",
          sentiment: "Positive"
        },
        suggestions: [
          "Consider adding a call-to-action",
          "Include relevant hashtags",
          "Add visual elements for better engagement"
        ],
        schedulingSuggestions: [
          "Best time: Tuesday 10:00 AM",
          "Peak engagement: Wednesday 2:00 PM",
          "Alternative: Friday 5:00 PM"
        ]
      };
      
      setGeneratedContent(prev => [mockContent, ...prev]);
      setIsGenerating(false);
      
      toast({
        title: "Content Generated",
        description: "Your content has been generated successfully with 2 variations."
      });
    }, 3000);
  };

  const generateMockContent = (type: string) => {
    const contentMap: { [key: string]: string } = {
      "social-post": "🚀 Did you know that businesses using strategic content marketing see 6x higher conversion rates?\n\nHere's what we've learned:\n✅ Consistency beats perfection\n✅ Authenticity drives engagement\n✅ Value-first approach builds trust\n\nWhat's your biggest content challenge? Let's discuss! 👇\n\n#ContentMarketing #Strategy #BusinessGrowth",
      "blog-article": "# The Future of Content Marketing: 5 Trends to Watch\n\nContent marketing continues to evolve at a rapid pace. As we look ahead, several key trends are shaping how brands connect with their audiences...\n\n## 1. AI-Powered Personalization\nArtificial intelligence is revolutionizing how we create and deliver personalized content experiences...",
      "video-script": "HOOK: Are you making these common content marketing mistakes?\n\nINTRO: Hi everyone, I'm [Name] and today we're diving into the top 5 content mistakes that are killing your engagement.\n\nPOINT 1: Not knowing your audience...\nPOINT 2: Inconsistent posting schedule...\nPOINT 3: Focusing on selling instead of value...\n\nCTA: If this helped you, give it a like and follow for more marketing tips!",
      "email-copy": "Subject: Your content strategy is missing this one thing...\n\nHi [Name],\n\nI've been analyzing hundreds of content strategies lately, and I keep seeing the same gap...\n\nMost businesses create great content but forget about distribution. It's like throwing a party and forgetting to send invitations.\n\nHere's how to fix it:\n[Continue with solution]\n\nBest,\n[Your name]",
      "ad-copy": "Headline: Stop Wasting Time on Content That Doesn't Convert\n\nSubheading: Our AI-powered content strategy increased client engagement by 340% in 30 days\n\nBody: Transform your content marketing with data-driven strategies that actually work. Join 10,000+ marketers who've already upgraded their approach.\n\nCTA: Get Your Free Strategy Audit",
      "caption": "Behind the scenes at our content creation process! ✨\n\nOur team believes that great content starts with understanding your audience deeply. Here's Sarah working on audience research for our latest campaign.\n\nWhat's your content creation process like? Share in the comments! 👇",
      "hashtags": "#ContentMarketing #DigitalMarketing #SocialMediaStrategy #MarketingTips #BusinessGrowth #ContentCreation #SocialMediaMarketing #OnlineMarketing #BrandStrategy #MarketingStrategy #ContentStrategy #SocialMedia #Marketing #Business #Entrepreneur"
    };
    
    return contentMap[type] || "Generated content based on your selected parameters and strategy guidelines.";
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Content Generator</h1>
          <p className="text-muted-foreground mt-2">
            Generate strategic content using AI tools aligned with your marketing strategies.
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Content Settings
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Content Generation Settings</DialogTitle>
              <DialogDescription>
                Configure default settings for content generation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Default Tone</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="authoritative">Authoritative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Content Length</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (50-100 words)</SelectItem>
                    <SelectItem value="medium">Medium (100-200 words)</SelectItem>
                    <SelectItem value="long">Long (200+ words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full">Save Settings</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Generate New Content
          </CardTitle>
          <CardDescription>
            Select your parameters and let AI create strategic content for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Marketing Strategy</Label>
              <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose strategy" />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      <div>
                        <div className="font-medium">{strategy.name}</div>
                        <div className="text-xs text-muted-foreground">{strategy.type}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>AI Tool</Label>
              <Select value={selectedAITool} onValueChange={setSelectedAITool}>
                <SelectTrigger>
                  <SelectValue placeholder="Select AI tool" />
                </SelectTrigger>
                <SelectContent>
                  {aiTools.map((tool) => {
                    const IconComponent = tool.icon;
                    return (
                      <SelectItem key={tool.value} value={tool.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{tool.label}</div>
                            <div className="text-xs text-muted-foreground">{tool.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Target Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {platforms.map((platform) => {
                const IconComponent = platform.icon;
                const isSelected = selectedPlatforms.includes(platform.value);
                return (
                  <Button
                    key={platform.value}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePlatform(platform.value)}
                    className="flex items-center gap-2"
                  >
                    <IconComponent className={`h-4 w-4 ${platform.color}`} />
                    {platform.label}
                  </Button>
                );
              })}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Custom Prompt (Optional)</Label>
            <Textarea
              value={contentPrompt}
              onChange={(e) => setContentPrompt(e.target.value)}
              placeholder="Add specific instructions for the AI (e.g., 'Focus on sustainability benefits', 'Include customer testimonial', 'Mention upcoming sale')"
              rows={3}
            />
          </div>
          
          <div className="space-y-3">
            <Label>Quick Templates</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {contentTemplates.slice(0, 8).map((template) => (
                <Button
                  key={template.name}
                  variant="outline"
                  size="sm"
                  onClick={() => setContentPrompt(template.prompt)}
                  className="text-left justify-start h-auto py-2"
                >
                  <div>
                    <div className="font-medium text-xs">{template.name}</div>
                    <div className="text-xs text-muted-foreground">{template.category}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
          
          <Button 
            onClick={handleGenerateContent}
            disabled={isGenerating}
            size="lg"
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Generating Content...
              </>
            ) : (
              <>
                <Wand2 className="h-5 w-5 mr-2" />
                Generate Content
              </>
            )}
          </Button>
          
          {isGenerating && (
            <div className="space-y-2">
              <Progress value={65} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                AI is analyzing your strategy and creating optimized content...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Content */}
      {generatedContent.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Generated Content</h2>
            <Badge variant="secondary">{generatedContent.length} items</Badge>
          </div>
          
          <div className="space-y-6">
            {generatedContent.map((content) => (
              <Card key={content.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {contentTypes.find(t => t.value === content.type)?.label || content.type}
                        </CardTitle>
                        <Badge variant="outline">
                          {aiTools.find(t => t.value === content.aiTool)?.label}
                        </Badge>
                      </div>
                      <CardDescription>
                        Strategy: {strategies.find(s => s.id === content.strategy)?.name}
                      </CardDescription>
                      {content.platforms.length > 0 && (
                        <div className="flex gap-1">
                          {content.platforms.map((platform: string) => {
                            const platformData = platforms.find(p => p.value === platform);
                            if (!platformData) return null;
                            const IconComponent = platformData.icon;
                            return (
                              <Badge key={platform} variant="secondary" className="text-xs">
                                <IconComponent className={`h-3 w-3 mr-1 ${platformData.color}`} />
                                {platformData.label}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Tabs defaultValue="main" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="main">Main Version</TabsTrigger>
                      <TabsTrigger value="variations">Variations</TabsTrigger>
                      <TabsTrigger value="analytics">Analytics</TabsTrigger>
                      <TabsTrigger value="schedule">Schedule</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="main" className="space-y-4">
                      <Textarea 
                        value={content.content}
                        className="min-h-[150px]"
                        readOnly
                      />
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">Word Count:</span>
                          <p>{content.metadata.wordCount}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Reading Time:</span>
                          <p>{content.metadata.readingTime}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Engagement:</span>
                          <Badge variant="secondary">{content.metadata.engagement}</Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">AI Suggestions</Label>
                        <ul className="text-sm space-y-1">
                          {content.suggestions.map((suggestion: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="variations" className="space-y-4">
                      {content.variations.map((variation: string, index: number) => (
                        <div key={index} className="space-y-2">
                          <Label className="text-sm font-medium">Variation {index + 1}</Label>
                          <Textarea 
                            value={variation}
                            className="min-h-[100px]"
                            readOnly
                          />
                        </div>
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="analytics" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold text-primary">8.2/10</div>
                            <p className="text-sm text-muted-foreground">Predicted Engagement Score</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold text-green-600">Positive</div>
                            <p className="text-sm text-muted-foreground">Sentiment Analysis</p>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="schedule" className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Recommended Posting Times</Label>
                        <div className="space-y-2">
                          {content.schedulingSuggestions.map((suggestion: string, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm">{suggestion}</span>
                              <Button size="sm" variant="outline">
                                <Calendar className="h-4 w-4 mr-1" />
                                Schedule
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <div className="flex gap-2 pt-4">
                    <Button variant="default">
                      <Save className="h-4 w-4 mr-2" />
                      Save to Drafts
                    </Button>
                    <Button variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Post
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}