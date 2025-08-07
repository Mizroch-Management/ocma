import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  Zap, 
  DollarSign, 
  Clock, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Settings,
  BarChart3,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIPlatforms } from "@/hooks/use-ai-platforms";

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  category: 'text' | 'image' | 'audio' | 'video';
  capabilities: string[];
  contextWindow: number;
  pricing: {
    input: number;  // per 1K tokens
    output: number; // per 1K tokens
  };
  speed: 'fast' | 'medium' | 'slow';
  quality: 'basic' | 'good' | 'excellent';
  recommended?: boolean;
}

// Available AI models with their configurations
const AI_MODELS: AIModel[] = [
  // OpenAI Models
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    category: 'text',
    capabilities: ['text-generation', 'analysis', 'code', 'reasoning'],
    contextWindow: 128000,
    pricing: { input: 0.01, output: 0.03 },
    speed: 'medium',
    quality: 'excellent',
    recommended: true
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    category: 'text',
    capabilities: ['text-generation', 'analysis'],
    contextWindow: 4096,
    pricing: { input: 0.001, output: 0.002 },
    speed: 'fast',
    quality: 'good'
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    provider: 'openai',
    category: 'image',
    capabilities: ['image-generation', 'editing'],
    contextWindow: 4000,
    pricing: { input: 0.04, output: 0.04 },
    speed: 'slow',
    quality: 'excellent'
  },
  
  // Anthropic Models
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    category: 'text',
    capabilities: ['text-generation', 'analysis', 'code', 'reasoning', 'vision'],
    contextWindow: 200000,
    pricing: { input: 0.015, output: 0.075 },
    speed: 'medium',
    quality: 'excellent',
    recommended: true
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    category: 'text',
    capabilities: ['text-generation', 'analysis', 'code'],
    contextWindow: 200000,
    pricing: { input: 0.003, output: 0.015 },
    speed: 'fast',
    quality: 'good'
  },
  
  // Google Models
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google_ai',
    category: 'text',
    capabilities: ['text-generation', 'analysis', 'vision'],
    contextWindow: 32000,
    pricing: { input: 0.001, output: 0.002 },
    speed: 'fast',
    quality: 'good'
  },
  
  // Stability AI
  {
    id: 'stable-diffusion-xl',
    name: 'Stable Diffusion XL',
    provider: 'stability_ai',
    category: 'image',
    capabilities: ['image-generation'],
    contextWindow: 1024,
    pricing: { input: 0.002, output: 0.002 },
    speed: 'fast',
    quality: 'good'
  }
];

interface ModelSelectorProps {
  onModelSelect: (model: AIModel) => void;
  selectedModel?: AIModel;
  category?: 'text' | 'image' | 'audio' | 'video';
}

export function ModelSelector({ onModelSelect, selectedModel, category }: ModelSelectorProps) {
  const { platforms, loading } = useAIPlatforms();
  const [filters, setFilters] = useState({
    provider: 'all',
    speed: 'all',
    quality: 'all'
  });
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonModels, setComparisonModels] = useState<AIModel[]>([]);

  // Filter models based on category and configured platforms
  const availableModels = AI_MODELS.filter(model => {
    // Filter by category if specified
    if (category && model.category !== category) return false;
    
    // Filter by configured platforms
    const platform = platforms.find(p => p.key === model.provider);
    if (!platform?.isConfigured) return false;
    
    // Apply user filters
    if (filters.provider !== 'all' && model.provider !== filters.provider) return false;
    if (filters.speed !== 'all' && model.speed !== filters.speed) return false;
    if (filters.quality !== 'all' && model.quality !== filters.quality) return false;
    
    return true;
  });

  const recommendedModels = availableModels.filter(m => m.recommended);

  const handleModelSelect = (model: AIModel) => {
    onModelSelect(model);
  };

  const toggleComparison = (model: AIModel) => {
    setComparisonModels(prev => {
      const exists = prev.find(m => m.id === model.id);
      if (exists) {
        return prev.filter(m => m.id !== model.id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), model];
      }
      return [...prev, model];
    });
    setShowComparison(true);
  };

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case 'fast': return <Zap className="h-4 w-4 text-green-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'slow': return <Clock className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getQualityBadge = (quality: string) => {
    const colors = {
      basic: 'bg-gray-100 text-gray-800',
      good: 'bg-blue-100 text-blue-800',
      excellent: 'bg-purple-100 text-purple-800'
    };
    return (
      <Badge className={cn('capitalize', colors[quality as keyof typeof colors])}>
        {quality}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Model Selection
          </CardTitle>
          <CardDescription>
            Choose the best AI model for your content generation needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Provider</Label>
              <Select value={filters.provider} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, provider: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google_ai">Google AI</SelectItem>
                  <SelectItem value="stability_ai">Stability AI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Speed</Label>
              <Select value={filters.speed} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, speed: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Speed</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="slow">Slow</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Quality</Label>
              <Select value={filters.quality} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, quality: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Quality</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Models */}
      {recommendedModels.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Recommended Models
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedModels.map(model => (
              <Card 
                key={model.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedModel?.id === model.id && "ring-2 ring-primary"
                )}
                onClick={() => handleModelSelect(model)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{model.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {model.provider}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-yellow-100">
                      Recommended
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Speed</span>
                      <div className="flex items-center gap-1">
                        {getSpeedIcon(model.speed)}
                        <span className="text-sm capitalize">{model.speed}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Quality</span>
                      {getQualityBadge(model.quality)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Context</span>
                      <span className="text-sm">{model.contextWindow.toLocaleString()} tokens</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Cost</span>
                      <span className="text-sm">
                        ${model.pricing.input}/1K in, ${model.pricing.output}/1K out
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1">
                      Select Model
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleComparison(model);
                      }}
                    >
                      Compare
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Available Models */}
      <div>
        <h3 className="text-lg font-semibold mb-3">All Available Models</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableModels.map(model => (
            <Card 
              key={model.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedModel?.id === model.id && "ring-2 ring-primary",
                comparisonModels.find(m => m.id === model.id) && "ring-2 ring-blue-500"
              )}
              onClick={() => handleModelSelect(model)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{model.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {model.provider}
                    </CardDescription>
                  </div>
                  {model.recommended && (
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  {getSpeedIcon(model.speed)}
                  {getQualityBadge(model.quality)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {model.contextWindow.toLocaleString()} tokens • 
                  ${model.pricing.input}/${model.pricing.output} per 1K
                </div>
                <div className="flex gap-1 flex-wrap">
                  {model.capabilities.slice(0, 3).map(cap => (
                    <Badge key={cap} variant="outline" className="text-xs">
                      {cap}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Model Comparison */}
      {showComparison && comparisonModels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Model Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Feature</th>
                    {comparisonModels.map(model => (
                      <th key={model.id} className="text-left p-2">
                        {model.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2 font-medium">Provider</td>
                    {comparisonModels.map(model => (
                      <td key={model.id} className="p-2">{model.provider}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-medium">Speed</td>
                    {comparisonModels.map(model => (
                      <td key={model.id} className="p-2">
                        <div className="flex items-center gap-1">
                          {getSpeedIcon(model.speed)}
                          <span className="capitalize">{model.speed}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-medium">Quality</td>
                    {comparisonModels.map(model => (
                      <td key={model.id} className="p-2">
                        {getQualityBadge(model.quality)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-medium">Context Window</td>
                    {comparisonModels.map(model => (
                      <td key={model.id} className="p-2">
                        {model.contextWindow.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Cost (per 1K)</td>
                    {comparisonModels.map(model => (
                      <td key={model.id} className="p-2">
                        ${model.pricing.input} / ${model.pricing.output}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setComparisonModels([]);
                  setShowComparison(false);
                }}
              >
                Clear Comparison
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Models Available */}
      {availableModels.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No AI models available. Please configure API keys in Settings to enable AI features.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}