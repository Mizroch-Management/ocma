import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWorkflow } from "@/contexts/workflow-context";
import { useAIPlatforms } from "@/hooks/use-ai-platforms";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Wand2, 
  Download, 
  RefreshCw, 
  Palette, 
  ImageIcon, 
  Sparkles, 
  Eye,
  Video,
  AlertTriangle,
  Settings,
  Copy,
  Save,
  Loader2,
  PlayCircle,
  Star,
  Zap,
  Camera,
  Film,
  Grid3X3,
  Calendar,
  Edit,
  Trash2,
  Clock,
  Filter,
  Search
} from "lucide-react";

interface GeneratedVisual {
  id: string;
  url: string;
  prompt: string;
  style: string;
  dimensions: string;
  platform: string;
  contentId?: string;
  createdAt: Date;
  isAIEnhanced: boolean;
  type: 'image' | 'video';
  aiPlatform: string;
  generation_time?: number;
  cost?: number;
  dbId?: string; // Database ID for saved content
}

interface AIPlatformRecommendation {
  platform: string;
  score: number;
  reasons: string[];
  type: 'image' | 'video';
}

interface AISuggestion {
  text: string;
  style: string;
  reasoning: string;
  planId: string | null;
  platforms: string[];
  isAIGenerated: boolean;
}

export default function VisualCreator() {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [selectedDimensions, setSelectedDimensions] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedContentPlan, setSelectedContentPlan] = useState("");
  const [selectedAIPlatform, setSelectedAIPlatform] = useState("");
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video'>('image');
  const [generatedVisuals, setGeneratedVisuals] = useState<GeneratedVisual[]>([]);
  const [savedVisuals, setSavedVisuals] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [showSavedContent, setShowSavedContent] = useState(false);
  const [recommendations, setRecommendations] = useState<AIPlatformRecommendation[]>([]);
  const [aiSuggestions, setAISuggestions] = useState<AISuggestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const { state: workflowState } = useWorkflow();
  const { platforms: aiPlatforms, getConfiguredPlatforms } = useAIPlatforms();
  const { toast } = useToast();

  // AI Platform configurations for different content types
  const aiPlatformsByType = {
    image: [
      { key: "openai", name: "OpenAI DALL-E", quality: "high", speed: "medium", cost: "$$", description: "Premium image generation with excellent prompt understanding" },
      { key: "stability_ai", name: "Stability AI", quality: "high", speed: "fast", cost: "$", description: "Open-source Stable Diffusion models" },
      { key: "runware", name: "Runware", quality: "medium", speed: "very-fast", cost: "$", description: "Ultra-fast image generation API" },
      { key: "huggingface", name: "Hugging Face", quality: "medium", speed: "medium", cost: "free", description: "Free open-source models" }
    ],
    video: [
      { key: "openai", name: "OpenAI Video", quality: "high", speed: "slow", cost: "$$$", description: "AI video generation (coming soon)" },
      { key: "runware", name: "Runware Video", quality: "high", speed: "slow", cost: "$$$", description: "AI video generation and editing" },
      { key: "stability_ai", name: "Stability Video", quality: "high", speed: "slow", cost: "$$$", description: "Stable Video Diffusion" }
    ]
  };
  
  // Get configured platforms for debugging
  const configuredPlatforms = getConfiguredPlatforms();
  console.log('Configured platforms:', configuredPlatforms);
  console.log('Video platforms available:', aiPlatformsByType.video);
  console.log('Filtered video platforms:', aiPlatformsByType.video.filter(platform => configuredPlatforms.some(cp => cp.key === platform.key)));

  const visualStyles = {
    image: [
      { id: "photorealistic", name: "Photorealistic", description: "Professional photography style" },
      { id: "digital-art", name: "Digital Art", description: "Modern digital illustration" },
      { id: "cinematic", name: "Cinematic", description: "Movie-like dramatic lighting" },
      { id: "anime", name: "Anime", description: "Japanese animation style" },
      { id: "oil-painting", name: "Oil Painting", description: "Classical fine art style" },
      { id: "minimalist", name: "Minimalist", description: "Clean, simple design" },
      { id: "cyberpunk", name: "Cyberpunk", description: "Futuristic neon aesthetic" },
      { id: "vintage", name: "Vintage", description: "Retro nostalgic feel" }
    ],
    video: [
      { id: "cinematic", name: "Cinematic", description: "Movie-quality production" },
      { id: "animated", name: "Animated", description: "Motion graphics style" },
      { id: "documentary", name: "Documentary", description: "Real-world storytelling" },
      { id: "promotional", name: "Promotional", description: "Marketing focused" },
      { id: "social-media", name: "Social Media", description: "Platform optimized" }
    ]
  };

  const dimensionsByType = {
    image: [
      { id: "square", name: "Square (1:1)", size: "1024x1024", platforms: ["Instagram", "Facebook"] },
      { id: "story", name: "Story (9:16)", size: "1080x1920", platforms: ["Instagram", "Facebook", "TikTok"] },
      { id: "landscape", name: "Landscape (16:9)", size: "1920x1080", platforms: ["LinkedIn", "Twitter", "YouTube"] },
      { id: "portrait", name: "Portrait (4:5)", size: "1080x1350", platforms: ["Instagram", "Pinterest"] },
      { id: "banner", name: "Banner (3:1)", size: "1500x500", platforms: ["LinkedIn", "Twitter", "Website"] },
      { id: "thumbnail", name: "Thumbnail (16:9)", size: "1280x720", platforms: ["YouTube", "Vimeo"] }
    ],
    video: [
      { id: "square", name: "Square (1:1)", size: "1080x1080", platforms: ["Instagram", "Facebook"] },
      { id: "story", name: "Story (9:16)", size: "1080x1920", platforms: ["Instagram", "TikTok", "Snapchat"] },
      { id: "landscape", name: "Landscape (16:9)", size: "1920x1080", platforms: ["YouTube", "LinkedIn", "Facebook"] },
      { id: "short", name: "Short Form (9:16)", size: "1080x1920", platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"] }
    ]
  };

  const socialPlatforms = [
    { id: "instagram", name: "Instagram", icon: "📸", supports: ["image", "video"] },
    { id: "facebook", name: "Facebook", icon: "👥", supports: ["image", "video"] },
    { id: "linkedin", name: "LinkedIn", icon: "💼", supports: ["image", "video"] },
    { id: "twitter", name: "Twitter", icon: "🐦", supports: ["image", "video"] },
    { id: "tiktok", name: "TikTok", icon: "🎵", supports: ["video"] },
    { id: "youtube", name: "YouTube", icon: "🎬", supports: ["video"] },
    { id: "pinterest", name: "Pinterest", icon: "📌", supports: ["image"] },
    { id: "snapchat", name: "Snapchat", icon: "👻", supports: ["image", "video"] }
  ];

  // Load AI-powered suggestions
  const loadAISuggestions = useCallback(async () => {
    if (!selectedMediaType) return;
    
    setIsLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-visual-suggestions', {
        body: {
          mediaType: selectedMediaType,
          strategy: workflowState.approvedStrategy,
          contentPlans: workflowState.approvedPlans,
          existingContent: [], // Could load recent content here
          targetPlatforms: socialPlatforms
            .filter(p => p.supports.includes(selectedMediaType))
            .map(p => p.id),
          brandContext: null
        }
      });

      if (error) throw error;

      setAISuggestions(data.suggestions.map((s: any) => ({
        ...s,
        isAIGenerated: true
      })));
    } catch (error: any) {
      console.error('Failed to load AI suggestions:', error);
      // Fallback to basic suggestions
      setAISuggestions([
        {
          text: `Professional ${selectedMediaType} with modern design`,
          style: 'professional',
          reasoning: 'Clean, business-oriented approach',
          planId: null,
          platforms: ['linkedin', 'facebook'],
          isAIGenerated: false
        }
      ]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [selectedMediaType, workflowState]);

  // Load saved visual content
  const loadSavedContent = useCallback(async () => {
    setIsLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from('generated_content')
        .select('*')
        .eq('content_type', selectedMediaType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedVisuals(data || []);
    } catch (error: any) {
      console.error('Failed to load saved content:', error);
    } finally {
      setIsLoadingSaved(false);
    }
  }, [selectedMediaType]);

  // Save visual content to database
  const saveVisualContent = async (visual: GeneratedVisual) => {
    try {
      const { error } = await supabase
        .from('generated_content')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          title: visual.prompt.slice(0, 100),
          content: visual.url,
          content_type: visual.type,
          metadata: {
            style: visual.style,
            dimensions: visual.dimensions,
            platform: visual.platform,
            aiPlatform: visual.aiPlatform,
            generation_time: visual.generation_time,
            cost: visual.cost,
            isAIEnhanced: visual.isAIEnhanced
          },
          ai_tool: visual.aiPlatform
        });

      if (error) throw error;

      toast({
        title: "Content Saved",
        description: "Visual content has been saved to your library.",
      });

      loadSavedContent();
    } catch (error: any) {
      console.error('Failed to save content:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save content. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Generate AI platform recommendations based on requirements
  const generateRecommendations = useCallback((mediaType: 'image' | 'video', prompt: string) => {
    const availablePlatforms = aiPlatformsByType[mediaType];
    const configuredPlatforms = getConfiguredPlatforms();
    
    const recs: AIPlatformRecommendation[] = availablePlatforms
      .filter(platform => configuredPlatforms.some(cp => cp.key === platform.key))
      .map(platform => {
        let score = 70; // Base score
        const reasons: string[] = [];

        // Quality scoring
        if (platform.quality === "high") { score += 20; reasons.push("High quality output"); }
        if (platform.quality === "medium") { score += 10; }

        // Speed scoring  
        if (platform.speed === "very-fast") { score += 15; reasons.push("Very fast generation"); }
        if (platform.speed === "fast") { score += 10; reasons.push("Fast generation"); }

        // Cost scoring
        if (platform.cost === "free") { score += 15; reasons.push("Free to use"); }
        if (platform.cost === "$") { score += 10; reasons.push("Cost effective"); }

        // Prompt complexity analysis
        if (prompt.length > 100) {
          if (platform.key === "openai") { score += 10; reasons.push("Excellent prompt understanding"); }
        }

        // Media type specific recommendations
        if (mediaType === "image" && platform.key === "openai") {
          score += 10; reasons.push("Best for creative images");
        }
        if (mediaType === "video" && platform.key === "runware") {
          score += 10; reasons.push("Specialized video generation");
        }

        return {
          platform: platform.key,
          score: Math.min(score, 100),
          reasons,
          type: mediaType
        };
      })
      .sort((a, b) => b.score - a.score);

    setRecommendations(recs);
  }, [getConfiguredPlatforms]);

  // Generate AI-enhanced prompts based on workflow context
  const getAIEnhancedPrompt = () => {
    if (!workflowState.approvedStrategy && workflowState.approvedPlans.length === 0) {
      return prompt;
    }

    let enhancedPrompt = prompt;
    
    if (workflowState.approvedStrategy) {
      const strategy = workflowState.approvedStrategy;
      enhancedPrompt += ` Professional, ${strategy.toneOfVoice} style, aligned with ${strategy.targetMarkets} audience`;
    }

    if (selectedContentPlan && workflowState.approvedPlans.length > 0) {
      const plan = workflowState.approvedPlans.find(p => p.id === selectedContentPlan);
      if (plan) {
        enhancedPrompt += `, ${plan.theme} theme, focusing on ${plan.keyMessages.join(' and ')}`;
      }
    }

    return enhancedPrompt;
  };

  const handleGenerateVisual = async () => {
    if (!prompt || !selectedStyle || !selectedDimensions || !selectedAIPlatform) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including AI platform selection.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    const startTime = Date.now();
    
    try {
      const enhancedPrompt = getAIEnhancedPrompt();
      
      // Call the appropriate edge function based on media type and platform
      let functionName = '';
      if (selectedMediaType === 'image') {
        functionName = 'generate-visual-content';
      } else if (selectedMediaType === 'video') {
        functionName = 'generate-video-content';
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          prompt: enhancedPrompt,
          style: selectedStyle,
          dimensions: selectedDimensions,
          platform: selectedAIPlatform,
          mediaType: selectedMediaType,
          settings: {
            quality: 'high',
            aspectRatio: selectedDimensions
          }
        }
      });

      if (error) throw error;

      const generationTime = Date.now() - startTime;
      
      const newVisual: GeneratedVisual = {
        id: Date.now().toString(),
        url: data.url || data.videoUrl,
        prompt: enhancedPrompt,
        style: selectedStyle,
        dimensions: selectedDimensions,
        platform: selectedPlatform,
        contentId: selectedContentPlan,
        createdAt: new Date(),
        isAIEnhanced: Boolean(workflowState.approvedStrategy || selectedContentPlan),
        type: selectedMediaType,
        aiPlatform: selectedAIPlatform,
        generation_time: generationTime,
        cost: data.cost
      };
      
      setGeneratedVisuals(prev => [newVisual, ...prev]);
      
      toast({
        title: "Content Generated Successfully",
        description: `${selectedMediaType.charAt(0).toUpperCase() + selectedMediaType.slice(1)} generated in ${(generationTime / 1000).toFixed(1)}s using ${aiPlatformsByType[selectedMediaType].find(p => p.key === selectedAIPlatform)?.name}`,
      });
      
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle quick actions
  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'saved-content':
        setShowSavedContent(true);
        loadSavedContent();
        break;
      case 'refresh-suggestions':
        loadAISuggestions();
        break;
      case 'batch-generate':
        toast({
          title: "Batch Generation",
          description: "This feature will be available soon!",
        });
        break;
      default:
        break;
    }
  };

  // Update recommendations when relevant fields change
  useEffect(() => {
    if (prompt && selectedMediaType) {
      generateRecommendations(selectedMediaType, prompt);
    }
  }, [prompt, selectedMediaType, generateRecommendations]);

  // Load AI suggestions when media type changes
  useEffect(() => {
    loadAISuggestions();
  }, [loadAISuggestions]);

  const hasConfiguredPlatforms = configuredPlatforms.length > 0;
  const currentStyles = visualStyles[selectedMediaType] || visualStyles.image;
  const currentDimensions = dimensionsByType[selectedMediaType] || dimensionsByType.image;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">AI Visual Creator</h1>
        <p className="text-muted-foreground mt-2">
          Generate stunning AI-powered visuals for your content strategy and social media campaigns.
        </p>
        {(workflowState.approvedStrategy || workflowState.approvedPlans.length > 0) && (
          <div className="flex items-center gap-2 mt-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-purple-700">
              AI workflow context available for enhanced visual generation
            </span>
          </div>
        )}
      </div>

      {!hasConfiguredPlatforms && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No AI platforms configured. Please go to <strong>Settings</strong> to configure your API keys for image and video generation.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={selectedMediaType} onValueChange={(value: any) => setSelectedMediaType(value)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="image" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Images
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2">
            <Film className="h-4 w-4" />
            Videos (with Audio)
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedMediaType} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Generation Controls */}
            <div className="lg:col-span-2 space-y-6">
              {/* AI Platform Recommendations */}
              {recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary" />
                      AI Platform Recommendations
                    </CardTitle>
                    <CardDescription>
                      Best platforms for your {selectedMediaType} generation based on your requirements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recommendations.slice(0, 3).map((rec, index) => {
                        const platformInfo = aiPlatformsByType[selectedMediaType].find(p => p.key === rec.platform);
                        return (
                          <div key={rec.platform} className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedAIPlatform === rec.platform ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedAIPlatform(rec.platform)}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {index === 0 && <Zap className="h-4 w-4 text-yellow-500" />}
                                <span className="font-medium">{platformInfo?.name}</span>
                                <Badge variant="outline" className="text-xs">{rec.score}/100</Badge>
                              </div>
                              <div className="flex gap-1">
                                <Badge variant="secondary" className="text-xs">{platformInfo?.quality}</Badge>
                                <Badge variant="secondary" className="text-xs">{platformInfo?.cost}</Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{platformInfo?.description}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {rec.reasons.slice(0, 3).map((reason, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{reason}</Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary" />
                    {selectedMediaType.charAt(0).toUpperCase() + selectedMediaType.slice(1)} Generation
                  </CardTitle>
                  <CardDescription>
                    Describe the {selectedMediaType} you want to create
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Prompt</label>
                    <Textarea
                      placeholder={`Describe the ${selectedMediaType} you want to generate...`}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
              
                  {workflowState.approvedPlans.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-foreground">Link to Content Plan</label>
                      <Select value={selectedContentPlan} onValueChange={setSelectedContentPlan}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select content plan (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No specific plan</SelectItem>
                          {workflowState.approvedPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-3 w-3 text-purple-600" />
                                Week {plan.weekNumber}: {plan.theme}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Style</label>
                      <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose style" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentStyles.map((style) => (
                            <SelectItem key={style.id} value={style.id}>
                              <div>
                                <div className="font-medium">{style.name}</div>
                                <div className="text-sm text-muted-foreground">{style.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground">Dimensions</label>
                      <Select value={selectedDimensions} onValueChange={setSelectedDimensions}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose dimensions" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentDimensions.map((dim) => (
                            <SelectItem key={dim.id} value={dim.id}>
                              <div>
                                <div className="font-medium">{dim.name}</div>
                                <div className="text-sm text-muted-foreground">{dim.size}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">AI Platform</label>
                      <Select value={selectedAIPlatform} onValueChange={setSelectedAIPlatform}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select AI platform" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border shadow-lg z-50">
                          {aiPlatformsByType[selectedMediaType]
                            .filter(platform => configuredPlatforms.some(cp => cp.key === platform.key))
                            .map((platform) => (
                            <SelectItem key={platform.key} value={platform.key} className="bg-background hover:bg-accent">
                              <div>
                                <div className="font-medium">{platform.name}</div>
                                <div className="text-sm text-muted-foreground">{platform.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                          {aiPlatformsByType[selectedMediaType]
                            .filter(platform => configuredPlatforms.some(cp => cp.key === platform.key)).length === 0 && (
                            <SelectItem value="" disabled className="bg-background">
                              No configured AI platforms for {selectedMediaType}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground">Target Platform</label>
                      <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          {socialPlatforms
                            .filter(platform => platform.supports.includes(selectedMediaType))
                            .map((platform) => (
                            <SelectItem key={platform.id} value={platform.id}>
                              {platform.icon} {platform.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateVisual}
                    disabled={!prompt || !selectedStyle || !selectedDimensions || !selectedAIPlatform || isGenerating || !hasConfiguredPlatforms}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Generating {selectedMediaType}...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-5 w-5 mr-2" />
                        Generate {selectedMediaType.charAt(0).toUpperCase() + selectedMediaType.slice(1)}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Suggestions and Quick Actions */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Suggested Prompts
                    {isLoadingSuggestions && <Loader2 className="h-4 w-4 animate-spin" />}
                  </CardTitle>
                  <CardDescription>
                    AI-generated suggestions based on your strategy
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {aiSuggestions.map((suggestion, index) => (
                      <div key={index} className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full text-left h-auto p-3"
                          onClick={() => {
                            setPrompt(suggestion.text);
                            if (suggestion.planId) setSelectedContentPlan(suggestion.planId);
                          }}
                        >
                          <div className="flex items-start gap-2 w-full">
                            {suggestion.isAIGenerated && <Sparkles className="h-3 w-3 text-purple-600 mt-1 flex-shrink-0" />}
                            <div className="text-left">
                              <div className="text-sm font-medium">{suggestion.text}</div>
                              {suggestion.reasoning && (
                                <div className="text-xs text-muted-foreground mt-1">{suggestion.reasoning}</div>
                              )}
                            </div>
                          </div>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => handleQuickAction('saved-content')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Saved Content
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => handleQuickAction('refresh-suggestions')}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh AI Suggestions
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => handleQuickAction('batch-generate')}
                    >
                      <Grid3X3 className="h-4 w-4 mr-2" />
                      Batch Generate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Generated Content Gallery */}
      {generatedVisuals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedMediaType === 'image' && <ImageIcon className="h-5 w-5 text-primary" />}
              {selectedMediaType === 'video' && <Video className="h-5 w-5 text-primary" />}
              Generated {selectedMediaType.charAt(0).toUpperCase() + selectedMediaType.slice(1)} Content
            </CardTitle>
            <CardDescription>
              Your AI-generated {selectedMediaType} content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedVisuals.filter(v => v.type === selectedMediaType).map((visual) => (
                <Card key={visual.id} className={visual.isAIEnhanced ? "border-purple-200 bg-purple-50/30" : ""}>
                  <CardContent className="p-4">
                    <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                      {visual.type === 'image' && (
                        <img
                          src={visual.url}
                          alt={visual.prompt}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {visual.type === 'video' && (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900">
                          <PlayCircle className="h-12 w-12 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{visual.style}</Badge>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">{visual.aiPlatform}</Badge>
                          {visual.isAIEnhanced && (
                            <Badge variant="outline" className="text-purple-600">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI-Enhanced
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {visual.prompt}
                      </p>
                      
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {currentDimensions.find(d => d.id === visual.dimensions)?.name}
                        </Badge>
                        {visual.platform && (
                          <Badge variant="secondary" className="text-xs">
                            {socialPlatforms.find(p => p.id === visual.platform)?.name}
                          </Badge>
                        )}
                        {visual.generation_time && (
                          <Badge variant="outline" className="text-xs">
                            {(visual.generation_time / 1000).toFixed(1)}s
                          </Badge>
                        )}
                        {visual.cost && (
                          <Badge variant="outline" className="text-xs">
                            ${visual.cost.toFixed(3)}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Copy className="h-3 w-3 mr-1" />
                          Duplicate
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => saveVisualContent(visual)}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                      </div>

                      {visual.isAIEnhanced && (
                        <div className="p-2 bg-purple-50 rounded border border-purple-200">
                          <p className="text-xs text-purple-700">
                            ✨ Generated using your AI workflow context
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Content Dialog */}
      <Dialog open={showSavedContent} onOpenChange={setShowSavedContent}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Saved Visual Content</DialogTitle>
            <DialogDescription>
              Manage your saved {selectedMediaType} content
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All platforms</SelectItem>
                  {socialPlatforms.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id}>
                      {platform.icon} {platform.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoadingSaved ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedVisuals
                  .filter(content => 
                    (!searchQuery || content.title.toLowerCase().includes(searchQuery.toLowerCase())) &&
                    (!filterPlatform || content.metadata?.platform === filterPlatform)
                  )
                  .map((content) => (
                    <Card key={content.id}>
                      <CardContent className="p-4">
                        <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                          {content.content_type === 'image' ? (
                            <img
                              src={content.content}
                              alt={content.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                              <PlayCircle className="h-8 w-8 text-white" />
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm line-clamp-2">{content.title}</h4>
                          
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {content.metadata?.style}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {content.metadata?.aiPlatform}
                            </Badge>
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Calendar className="h-3 w-3 mr-1" />
                              Schedule
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}