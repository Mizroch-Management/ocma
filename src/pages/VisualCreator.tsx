import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkflow } from "@/contexts/workflow-context";
import { 
  Wand2, 
  Download, 
  RefreshCw, 
  Palette, 
  ImageIcon, 
  Sparkles, 
  Eye,
  Share2,
  Grid3X3,
  Square,
  Smartphone,
  Monitor,
  Copy,
  Save
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
}

export default function VisualCreator() {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [selectedDimensions, setSelectedDimensions] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedContentPlan, setSelectedContentPlan] = useState("");
  const [generatedVisuals, setGeneratedVisuals] = useState<GeneratedVisual[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { state: workflowState } = useWorkflow();

  const visualStyles = [
    { id: "photorealistic", name: "Photorealistic", description: "Professional photography style" },
    { id: "modern-flat", name: "Modern Flat", description: "Clean, minimalist design" },
    { id: "gradient", name: "Gradient", description: "Vibrant gradient backgrounds" },
    { id: "hand-drawn", name: "Hand-drawn", description: "Artistic, sketch-like style" },
    { id: "3d-render", name: "3D Render", description: "Modern 3D rendered graphics" },
    { id: "watercolor", name: "Watercolor", description: "Soft, artistic watercolor effect" }
  ];

  const dimensions = [
    { id: "square", name: "Square (1:1)", size: "1024x1024", platforms: ["Instagram", "Facebook"] },
    { id: "story", name: "Story (9:16)", size: "1080x1920", platforms: ["Instagram", "Facebook", "TikTok"] },
    { id: "landscape", name: "Landscape (16:9)", size: "1920x1080", platforms: ["LinkedIn", "Twitter", "YouTube"] },
    { id: "portrait", name: "Portrait (4:5)", size: "1080x1350", platforms: ["Instagram", "Pinterest"] }
  ];

  const platforms = [
    { id: "instagram", name: "Instagram", icon: "📸" },
    { id: "facebook", name: "Facebook", icon: "👥" },
    { id: "linkedin", name: "LinkedIn", icon: "💼" },
    { id: "twitter", name: "Twitter", icon: "🐦" },
    { id: "tiktok", name: "TikTok", icon: "🎵" }
  ];

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
    if (!prompt || !selectedStyle || !selectedDimensions) return;
    
    setIsGenerating(true);
    
    // Mock image generation - in real implementation, this would call an AI image generation API
    setTimeout(() => {
      const newVisual: GeneratedVisual = {
        id: Date.now().toString(),
        url: `https://picsum.photos/seed/${Date.now()}/800/600`, // Placeholder image
        prompt: getAIEnhancedPrompt(),
        style: selectedStyle,
        dimensions: selectedDimensions,
        platform: selectedPlatform,
        contentId: selectedContentPlan,
        createdAt: new Date(),
        isAIEnhanced: Boolean(workflowState.approvedStrategy || selectedContentPlan)
      };
      
      setGeneratedVisuals(prev => [newVisual, ...prev]);
      setIsGenerating(false);
    }, 3000);
  };

  const suggestedPrompts = workflowState.approvedPlans.length > 0 
    ? workflowState.approvedPlans.map(plan => ({
        text: `${plan.theme} visual for ${plan.keyMessages[0]}`,
        planId: plan.id,
        isAIGenerated: true
      }))
    : [
        { text: "Professional team collaboration in modern office", planId: "", isAIGenerated: false },
        { text: "Minimalist product showcase with clean background", planId: "", isAIGenerated: false },
        { text: "Abstract data visualization with vibrant colors", planId: "", isAIGenerated: false }
      ];

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generation Controls */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                Visual Generation
              </CardTitle>
              <CardDescription>
                Describe the visual you want to create
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Prompt</label>
                <Textarea
                  placeholder="Describe the visual you want to generate..."
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
                      {visualStyles.map((style) => (
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
                      {dimensions.map((dim) => (
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

              <div>
                <label className="text-sm font-medium text-foreground">Target Platform</label>
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((platform) => (
                      <SelectItem key={platform.id} value={platform.id}>
                        {platform.icon} {platform.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerateVisual}
                disabled={!prompt || !selectedStyle || !selectedDimensions || isGenerating}
                className="w-full"
                size="lg"
              >
                <Wand2 className="h-5 w-5 mr-2" />
                {isGenerating ? "Generating Visual..." : "Generate Visual"}
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
                Suggested Prompts
              </CardTitle>
              <CardDescription>
                AI-generated suggestions based on your content strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {suggestedPrompts.map((suggestion, index) => (
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
                        <span className="text-sm">{suggestion.text}</span>
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
                <Button variant="outline" className="w-full justify-start">
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Template Library
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Batch Generate
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Gallery
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generated Visuals Gallery */}
      {generatedVisuals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Generated Visuals
            </CardTitle>
            <CardDescription>
              Your AI-generated visual content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedVisuals.map((visual) => (
                <Card key={visual.id} className={visual.isAIEnhanced ? "border-purple-200 bg-purple-50/30" : ""}>
                  <CardContent className="p-4">
                    <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                      <img
                        src={visual.url}
                        alt={visual.prompt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{visual.style}</Badge>
                        {visual.isAIEnhanced && (
                          <Badge variant="outline" className="text-purple-600">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI-Enhanced
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {visual.prompt}
                      </p>
                      
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {dimensions.find(d => d.id === visual.dimensions)?.name}
                        </Badge>
                        {visual.platform && (
                          <Badge variant="secondary" className="text-xs">
                            {platforms.find(p => p.id === visual.platform)?.name}
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
                        <Button variant="outline" size="sm" className="flex-1">
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
    </div>
  );
}