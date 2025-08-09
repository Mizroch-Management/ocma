import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organization';
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
import { log } from "@/utils/logger";
import { ContentEditorDialog } from "@/components/content/content-editor-dialog";
import { ContentSchedulerDialog } from "@/components/content/content-scheduler-dialog";
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
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedContentType, setSelectedContentType] = useState("");
  const [selectedAITool, setSelectedAITool] = useState("");
  const [contentPrompt, setContentPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [schedulingContent, setSchedulingContent] = useState<any>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

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
    { value: "gpt4-turbo", label: "GPT-4 Turbo", description: "Faster GPT-4 for quick content", icon: Zap },
    { value: "claude", label: "Claude", description: "Excellent for analysis and long-form", icon: Lightbulb },
    { value: "claude-haiku", label: "Claude Haiku", description: "Fast and efficient for simple tasks", icon: RefreshCw },
    { value: "gemini", label: "Gemini Pro", description: "Great for creative and diverse content", icon: Zap },
    { value: "perplexity", label: "Perplexity", description: "Real-time web search and trends", icon: Eye },
    { value: "dalle3", label: "DALL-E 3", description: "Advanced image generation", icon: Image },
    { value: "midjourney", label: "Midjourney", description: "Artistic image creation", icon: Image },
    { value: "runware", label: "Runware AI", description: "Fast image generation", icon: Wand2 },
    { value: "elevenlabs", label: "ElevenLabs", description: "Voice and audio generation", icon: Mic }
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

  // Load saved content on component mount
  useEffect(() => {
    loadSavedContent();
  }, []);

  const loadSavedContent = async () => {
    setIsLoadingContent(true);
    try {
      let query = supabase
        .from('generated_content')
        .select('*');
      
      // Filter by current organization if available
      if (currentOrganization?.id) {
        query = query.eq('organization_id', currentOrganization.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        log.error('Failed to load content', error, undefined, {
          component: 'ContentGenerator',
          action: 'load_content',
          organizationId: currentOrganization?.id
        });
        return;
      }

      if (data) {
        const formattedContent = data.map(item => ({
          id: item.id,
          title: item.title,
          content: item.content,
          type: item.content_type,
          aiTool: item.ai_tool,
          strategy: item.strategy,
          platforms: item.platforms || [],
          variations: item.variations || [],
          suggestions: item.suggestions || [],
          metadata: item.metadata || {},
          schedulingSuggestions: item.scheduling_suggestions || [],
          platformOptimizations: item.platform_optimizations || {},
          hashtags: item.hashtags || [],
          createdAt: new Date(item.created_at),
          isScheduled: item.is_scheduled,
          scheduledDate: item.scheduled_date,
          scheduledPlatforms: item.scheduled_platforms || []
        }));
        setGeneratedContent(formattedContent);
      }
    } catch (error) {
      log.error('Error loading saved content', error, undefined, {
        component: 'ContentGenerator',
        action: 'load_saved_content',
        organizationId: currentOrganization?.id
      });
      toast({
        title: "Error Loading Content",
        description: "Failed to load your saved content.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingContent(false);
    }
  };

  const saveContentToDatabase = async (content: any) => {
    try {
      const { data, error } = await supabase
        .from('generated_content')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          organization_id: currentOrganization?.id || null,
          title: content.title,
          content: content.content,
          content_type: content.type,
          strategy: content.strategy,
          platforms: content.platforms,
          ai_tool: content.aiTool,
          variations: content.variations,
          suggestions: content.suggestions,
          hashtags: content.hashtags,
          platform_optimizations: content.platformOptimizations,
          metadata: content.metadata,
          scheduling_suggestions: content.schedulingSuggestions
        })
        .select()
        .single();

      if (error) {
        log.error('Failed to save content', error, undefined, {
          component: 'ContentGenerator',
          action: 'save_content',
          organizationId: currentOrganization?.id
        });
        toast({
          title: "Save Error",
          description: "Failed to save content to database.",
          variant: "destructive"
        });
        return null;
      }
      return data;
    } catch (error) {
      log.error('Error saving content', error, undefined, {
        component: 'ContentGenerator',
        action: 'save_content_error',
        organizationId: currentOrganization?.id
      });
      return false;
    }
  };

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
    
    try {
      // Call the Supabase edge function to generate real content
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          contentType: selectedContentType,
          strategy: strategies.find(s => s.id === selectedStrategy)?.name,
          platforms: selectedPlatforms,
          customPrompt: contentPrompt,
          aiTool: selectedAITool,
          organizationId: currentOrganization?.id // Pass organization ID for API key retrieval
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate content');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const newContent = {
        title: data.title,
        content: data.content,
        type: selectedContentType,
        aiTool: selectedAITool,
        strategy: selectedStrategy,
        platforms: selectedPlatforms,
        variations: data.variations || [],
        suggestions: data.suggestions || [],
        metadata: data.metadata || {},
        schedulingSuggestions: data.schedulingSuggestions || [],
        platformOptimizations: data.platformOptimizations || {},
        hashtags: data.hashtags || [],
        createdAt: new Date()
      };
      
      // Save to database and add to top of list
      const savedContent = await saveContentToDatabase(newContent);
      if (savedContent) {
        // Format the saved content to match the state structure
        const formattedSavedContent = {
          id: savedContent.id,
          title: savedContent.title,
          content: savedContent.content,
          type: savedContent.content_type,
          aiTool: savedContent.ai_tool,
          strategy: newContent.strategy, // Keep original strategy reference
          platforms: savedContent.platforms || [],
          variations: savedContent.variations || [],
          suggestions: savedContent.suggestions || [],
          metadata: savedContent.metadata || {},
          schedulingSuggestions: savedContent.scheduling_suggestions || [],
          platformOptimizations: savedContent.platform_optimizations || {},
          hashtags: savedContent.hashtags || [],
          createdAt: new Date(savedContent.created_at),
          isScheduled: savedContent.is_scheduled || false,
          scheduledDate: savedContent.scheduled_date,
          scheduledPlatforms: savedContent.scheduled_platforms || []
        };
        
        setGeneratedContent(prev => [formattedSavedContent, ...prev]);
        
        toast({
          title: "Content Generated & Saved!",
          description: "Your AI-generated content is ready and saved to your library."
        });
      } else {
        // If database save fails, still add to local state without ID
        toast({
          title: "Content Not Saved",
          description: "Content generated but not saved to database. Scheduling will not be available.",
          variant: "destructive"
        });
      }
      
      setIsGenerating(false);

    } catch (error) {
      log.error('Content generation failed', error, undefined, {
        component: 'ContentGenerator',
        action: 'generate_content',
        organizationId: currentOrganization?.id
      });
      setIsGenerating(false);
      
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateMockContent = (type: string) => {
    const baseContent = {
      'social-post': {
        title: "Engaging Social Media Post",
        content: "🚀 Ready to transform your business with AI? Join thousands of successful entrepreneurs who are already leveraging cutting-edge technology to scale their operations and increase productivity. What's your biggest challenge right now? Drop a comment below! 👇\n\n#BusinessGrowth #AI #Entrepreneurship #Innovation",
        variations: [
          "💡 AI isn't just the future - it's happening NOW! Discover how smart businesses are using AI to automate tasks, improve customer service, and boost profits. Ready to join the revolution? 🔥\n\n#AIRevolution #SmartBusiness #Automation",
          "⚡ Quick question: What if you could save 10 hours per week using AI tools? Our community members are doing exactly that! Want to know their secrets? 🤔\n\n#ProductivityHacks #TimeManagement #AI"
        ]
      },
      'blog-article': {
        title: "The Ultimate Guide to AI-Powered Business Growth",
        content: "In today's rapidly evolving business landscape, artificial intelligence has emerged as a game-changing force that's reshaping how companies operate, compete, and grow. From startups to Fortune 500 companies, organizations are leveraging AI to streamline operations, enhance customer experiences, and drive unprecedented growth.\n\nThis comprehensive guide explores the practical applications of AI in business, providing actionable insights for leaders looking to harness this transformative technology...",
        variations: [
          "How AI is Revolutionizing Modern Business: A Strategic Approach",
          "From Automation to Innovation: Building an AI-First Business Strategy"
        ]
      },
      'video-script': {
        title: "AI Business Transformation Video Script",
        content: "[HOOK - 0-3 seconds]\n'What if I told you that AI could help you double your business efficiency in just 30 days?'\n\n[INTRODUCTION - 3-10 seconds]\nHi, I'm [Name], and today I'm sharing the exact AI strategies that helped my clients increase their revenue by 40% this quarter.\n\n[MAIN CONTENT - 10-45 seconds]\nHere are the top 3 AI tools every business owner needs:\n\n1. Customer Service Automation\n2. Content Creation AI\n3. Data Analytics Tools\n\n[CALL TO ACTION - 45-60 seconds]\nReady to transform your business? Download our free AI implementation guide in the link below!",
        variations: [
          "The 60-Second AI Business Makeover",
          "3 AI Tools That Changed Everything for My Business"
        ]
      }
    };

    const content = baseContent[type as keyof typeof baseContent] || baseContent['social-post'];
    
    return {
      ...content,
      suggestions: [
        "Consider adding more interactive elements to boost engagement",
        "Include a clear call-to-action to drive conversions",
        "Use trending hashtags relevant to your industry",
        "Add emojis strategically to increase visual appeal"
      ],
      metadata: {
        wordCount: content.content.split(' ').length,
        readingTime: Math.ceil(content.content.split(' ').length / 200) + " min",
        engagement: "High",
        sentiment: "Positive"
      },
      schedulingSuggestions: [
        "Tuesday 10:00 AM - Peak engagement time",
        "Thursday 2:00 PM - Afternoon boost",
        "Saturday 9:00 AM - Weekend reach"
      ],
      platformOptimizations: {
        instagram: {
          content: content.content + "\n\n📱 Save this post for later!",
          hashtags: ["#BusinessGrowth", "#AI", "#Entrepreneurship"],
          visualType: "Carousel",
          cta: "Save & Share",
          language: "English"
        },
        linkedin: {
          content: "Professional insight: " + content.content,
          hashtags: ["#Leadership", "#Innovation", "#BusinessStrategy"],
          visualType: "Single Image",
          cta: "Connect with me",
          language: "English"
        }
      }
    };
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleEditContent = (content: any) => {
    setEditingContent(content);
  };

  const handleSaveContent = (updatedContent: any) => {
    setGeneratedContent(prev => 
      prev.map(item => item.id === updatedContent.id ? updatedContent : item)
    );
  };

  const handleScheduleContent = (content: any) => {
    setSchedulingContent(content);
  };

  const handleSaveSchedule = async (scheduledContent: any) => {
    try {
      // Update the content in the database with schedule information
      const { error } = await supabase
        .from('generated_content')
        .update({
          is_scheduled: true,
          scheduled_date: scheduledContent.scheduledDate,
          scheduled_platforms: scheduledContent.platforms,
          publication_status: 'scheduled'
        })
        .eq('id', scheduledContent.id);

      if (error) {
        log.error('Failed to save schedule', error, undefined, {
          component: 'ContentGenerator',
          action: 'save_schedule',
          organizationId: currentOrganization?.id
        });
        toast({
          title: "Schedule Error",
          description: "Failed to save schedule. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setGeneratedContent(prev => 
        prev.map(item => 
          item.id === scheduledContent.id 
            ? { ...item, ...scheduledContent }
            : item
        )
      );

      toast({
        title: "Content Scheduled!",
        description: `Your content has been scheduled for ${new Date(scheduledContent.scheduledDate).toLocaleString()}`
      });

      setSchedulingContent(null);
    } catch (error) {
      log.error('Error scheduling content', error, undefined, {
        component: 'ContentGenerator',
        action: 'schedule_content_error',
        organizationId: currentOrganization?.id
      });
      toast({
        title: "Scheduling Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    try {
      const { error } = await supabase
        .from('generated_content')
        .delete()
        .eq('id', contentId);

      if (error) {
        log.error('Failed to delete content', error, undefined, {
          component: 'ContentGenerator',
          action: 'delete_content',
          organizationId: currentOrganization?.id
        });
        toast({
          title: "Delete Error",
          description: "Failed to delete content from database.",
          variant: "destructive"
        });
        return;
      }

      setGeneratedContent(prev => prev.filter(item => item.id !== contentId));
      toast({
        title: "Content Deleted",
        description: "Content has been permanently deleted."
      });
    } catch (error) {
      log.error('Error deleting content', error, undefined, {
        component: 'ContentGenerator',
        action: 'delete_content_error',
        organizationId: currentOrganization?.id
      });
      toast({
        title: "Delete Error", 
        description: "Failed to delete content.",
        variant: "destructive"
      });
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to Clipboard",
      description: "Content has been copied to your clipboard."
    });
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
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">AI is generating your content using {aiTools.find(t => t.value === selectedAITool)?.label}...</span>
              </div>
              <Progress value={65} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Analyzing strategy, optimizing for platforms, and creating engaging content...
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
                      <Button variant="ghost" size="sm" onClick={() => handleEditContent(content)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleCopyContent(content.content)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleScheduleContent(content)}>
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteContent(content.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Tabs defaultValue="main" className="w-full">
                     <TabsList className="grid w-full grid-cols-5">
                       <TabsTrigger value="main">Main Version</TabsTrigger>
                       <TabsTrigger value="variations">Variations</TabsTrigger>
                       <TabsTrigger value="replies">Reply Management</TabsTrigger>
                       <TabsTrigger value="analytics">Analytics</TabsTrigger>
                       <TabsTrigger value="schedule">Schedule</TabsTrigger>
                     </TabsList>
                    
                    <TabsContent value="main" className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Generated Content</Label>
                          <Button variant="outline" size="sm" onClick={() => handleCopyContent(content.content)}>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <Textarea 
                          value={content.content}
                          className="min-h-[150px]"
                          readOnly
                        />
                      </div>
                      
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
                    
                     <TabsContent value="replies" className="space-y-4">
                       <div className="space-y-4">
                         <div className="space-y-2">
                           <Label className="text-sm font-medium">Reply Strategy</Label>
                           <Select>
                             <SelectTrigger>
                               <SelectValue placeholder="Select reply strategy" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="auto">Auto-reply with AI</SelectItem>
                               <SelectItem value="template">Use reply templates</SelectItem>
                               <SelectItem value="manual">Manual review required</SelectItem>
                               <SelectItem value="mixed">Mixed approach</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                         
                         <div className="space-y-2">
                           <Label className="text-sm font-medium">Auto-Reply Templates</Label>
                           <div className="space-y-2">
                             <Textarea placeholder="Thank you for your comment! 🙏" className="min-h-[60px]" />
                             <Textarea placeholder="Great question! Let me get back to you on that..." className="min-h-[60px]" />
                             <Textarea placeholder="We appreciate your feedback! 💪" className="min-h-[60px]" />
                           </div>
                         </div>
                         
                         <div className="space-y-2">
                           <Label className="text-sm font-medium">Reply Triggers</Label>
                           <Input placeholder="Keywords: question, help, support, pricing" />
                         </div>
                         
                         <div className="space-y-2">
                           <Label className="text-sm font-medium">Thread Management</Label>
                           <div className="flex items-center space-x-2">
                             <input type="checkbox" id="followUp" className="rounded" />
                             <Label htmlFor="followUp" className="text-sm">Enable follow-up questions</Label>
                           </div>
                           <div className="flex items-center space-x-2">
                             <input type="checkbox" id="escalate" className="rounded" />
                             <Label htmlFor="escalate" className="text-sm">Escalate complex queries</Label>
                           </div>
                         </div>
                         
                         <Button className="w-full">
                           <Settings className="h-4 w-4 mr-2" />
                           Save Reply Settings
                         </Button>
                       </div>
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
                    <Button variant="default" onClick={() => handleEditContent(content)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Content
                    </Button>
                    <Button variant="outline" onClick={() => handleScheduleContent(content)}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Post
                    </Button>
                    <Button variant="outline" onClick={() => handleCopyContent(content.content)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Content
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Content Editor Dialog */}
      <ContentEditorDialog
        isOpen={!!editingContent}
        onOpenChange={(open) => !open && setEditingContent(null)}
        content={editingContent}
        onSave={handleSaveContent}
      />

      {/* Content Scheduler Dialog */}
      <ContentSchedulerDialog
        isOpen={!!schedulingContent}
        onOpenChange={(open) => !open && setSchedulingContent(null)}
        content={schedulingContent}
        onSchedule={handleSaveSchedule}
      />
    </div>
  );
}