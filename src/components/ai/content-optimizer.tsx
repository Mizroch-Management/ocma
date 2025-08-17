import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Sparkles, 
  TrendingUp, 
  Hash, 
  Clock, 
  Target,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  Copy,
  RefreshCw,
  Wand2,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { aiServices } from "@/lib/ai/services";
import { motion, AnimatePresence } from "framer-motion";

interface OptimizationResult {
  optimizedContent: string;
  score: number;
  improvements: string[];
  hashtags: string[];
  bestPostingTime: string;
  engagementPrediction: number;
  variations: string[];
  seoKeywords?: string[];
  readabilityScore?: number;
}

interface ContentOptimizerProps {
  content: string;
  platform?: string;
  audience?: {
    demographics: string[];
    interests: string[];
  };
  onOptimized?: (result: OptimizationResult) => void;
}

export function ContentOptimizer({ 
  content: initialContent, 
  platform = 'instagram',
  audience,
  onOptimized 
}: ContentOptimizerProps) {
  const [content, setContent] = useState(initialContent);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [selectedVariation, setSelectedVariation] = useState(0);
  const [activeTab, setActiveTab] = useState("optimization");

  // Real AI optimization using actual AI services
  const optimizeContent = useCallback(async () => {
    setIsOptimizing(true);
    
    try {
      // Use real AI services for content optimization
      const aiResult = await aiServices.optimizeContent(content, platform, [
        'engagement',
        'readability', 
        'platform_algorithm',
        'trending_keywords'
      ]);
      
      // Generate additional insights
      const analytics = await aiServices.analyzeContentPerformance(content, platform);
      
      const result: OptimizationResult = {
        optimizedContent: aiResult.content,
        score: aiResult.metrics.platformOptimization,
        improvements: aiResult.suggestions,
        hashtags: aiResult.hashtags,
        bestPostingTime: analytics.bestPostingTime,
        engagementPrediction: analytics.predictions.engagement,
        variations: aiResult.variations,
        seoKeywords: aiResult.keywords,
        readabilityScore: aiResult.metrics.readabilityScore
      };
      
      setOptimizationResult(result);
      onOptimized?.(result);
    } catch (error) {
      console.error('Optimization failed:', error);
      // Fallback to basic optimization if AI fails
      const fallbackResult: OptimizationResult = {
        optimizedContent: improveContent(content, platform),
        score: calculateScore(content),
        improvements: ["Basic optimization applied - connect AI services for advanced features"],
        hashtags: generateHashtags(content, platform),
        bestPostingTime: getBestPostingTime(platform),
        engagementPrediction: 60,
        variations: generateVariations(content),
        seoKeywords: extractKeywords(content),
        readabilityScore: 75
      };
      setOptimizationResult(fallbackResult);
    } finally {
      setIsOptimizing(false);
    }
  }, [content, platform, onOptimized]);

  // Helper functions for content optimization
  const improveContent = (original: string, platform: string): string => {
    // Simple content improvement simulation
    const improvements: Record<string, string> = {
      instagram: `✨ ${original}\n\n💡 What's your take on this?\n\n#trending #viral`,
      twitter: `${original.substring(0, 250)}... 🧵\n\nThoughts?`,
      linkedin: `${original}\n\nI'd love to hear your professional insights on this topic.`,
      facebook: `${original}\n\n👍 Like if you agree!\n💬 Share your thoughts below!`
    };
    
    return improvements[platform] || original;
  };

  const calculateScore = (content: string): number => {
    let score = 60;
    
    // Length optimization
    if (content.length > 100 && content.length < 300) score += 10;
    
    // Emoji usage
    if (/[\u{1F300}-\u{1F9FF}]/u.test(content)) score += 5;
    
    // Question marks (engagement)
    if (content.includes('?')) score += 5;
    
    // Call to action
    const ctaWords = ['click', 'share', 'comment', 'learn', 'discover'];
    if (ctaWords.some(word => content.toLowerCase().includes(word))) score += 10;
    
    // Hashtags
    if (content.includes('#')) score += 5;
    
    return Math.min(100, score);
  };

  const generateHashtags = (content: string, platform: string): string[] => {
    const baseHashtags = ['marketing', 'socialmedia', 'contentcreator', 'digitalmarketing'];
    const platformHashtags: Record<string, string[]> = {
      instagram: ['instagood', 'instadaily', 'reels', 'explore'],
      twitter: ['TwitterX', 'trending', 'viral', 'thread'],
      linkedin: ['professional', 'business', 'leadership', 'innovation'],
      facebook: ['facebookpost', 'community', 'share', 'follow']
    };
    
    return [
      ...baseHashtags.slice(0, 5),
      ...(platformHashtags[platform] || []).slice(0, 5)
    ].map(tag => `#${tag}`);
  };

  const getBestPostingTime = (platform: string): string => {
    const times: Record<string, string> = {
      instagram: "9:00 AM or 7:00 PM",
      twitter: "9:00 AM or 8:00 PM",
      linkedin: "7:30 AM or 5:30 PM",
      facebook: "1:00 PM or 4:00 PM"
    };
    
    return times[platform] || "9:00 AM";
  };

  const generateVariations = (content: string): string[] => {
    return [
      content, // Original
      `🎯 ${content}`, // With emoji hook
      `Did you know? ${content}`, // Question opening
      `${content}\n\nWhat are your thoughts?` // With engagement question
    ];
  };

  const extractKeywords = (content: string): string[] => {
    // Simple keyword extraction - in production, use NLP
    const words = content.toLowerCase().split(/\s+/);
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const keywords = words
      .filter(word => word.length > 3 && !commonWords.has(word))
      .filter((word, index, self) => self.indexOf(word) === index)
      .slice(0, 5);
    return keywords;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getEngagementColor = (prediction: number): string => {
    if (prediction >= 80) return "bg-green-500";
    if (prediction >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI Content Optimizer
          </CardTitle>
          <CardDescription>
            Enhance your content with AI-powered optimization for maximum engagement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your content to optimize..."
              className="min-h-[150px]"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-muted-foreground">
                {content.length} characters
              </span>
              <div className="flex gap-2">
                <Badge variant="outline">{platform}</Badge>
                {audience && (
                  <Badge variant="outline">
                    {audience.demographics[0]}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <Button 
            onClick={optimizeContent} 
            disabled={isOptimizing || !content}
            className="w-full"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Optimize Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      <AnimatePresence>
        {optimizationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Optimization Results</CardTitle>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Content Score:</span>
                    <span className={cn("text-2xl font-bold", getScoreColor(optimizationResult.score))}>
                      {optimizationResult.score}/100
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Predicted Engagement: {optimizationResult.engagementPrediction}%
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="optimization">Optimized</TabsTrigger>
                    <TabsTrigger value="variations">Variations</TabsTrigger>
                    <TabsTrigger value="insights">Insights</TabsTrigger>
                    <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="optimization" className="space-y-4">
                    <div className="relative">
                      <Textarea
                        value={optimizationResult.optimizedContent}
                        readOnly
                        className="min-h-[200px] pr-12"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(optimizationResult.optimizedContent)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Improvements Made:</h4>
                      <ul className="space-y-1">
                        {optimizationResult.improvements.map((improvement, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="variations" className="space-y-4">
                    <div className="space-y-3">
                      {optimizationResult.variations.map((variation, index) => (
                        <Card 
                          key={index}
                          className={cn(
                            "cursor-pointer transition-all",
                            selectedVariation === index && "ring-2 ring-primary"
                          )}
                          onClick={() => setSelectedVariation(index)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <Badge variant={index === 0 ? "default" : "outline"}>
                                {index === 0 ? "Original" : `Variation ${index}`}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(variation);
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-sm">{variation}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="insights" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Best Posting Time</span>
                          </div>
                          <p className="text-lg font-semibold">
                            {optimizationResult.bestPostingTime}
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Readability Score</span>
                          </div>
                          <p className="text-lg font-semibold">
                            {optimizationResult.readabilityScore}/100
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">SEO Keywords</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {optimizationResult.seoKeywords?.map((keyword, index) => (
                            <Badge key={index} variant="secondary">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Engagement Prediction</span>
                        <span className="text-sm font-semibold">
                          {optimizationResult.engagementPrediction}%
                        </span>
                      </div>
                      <Progress 
                        value={optimizationResult.engagementPrediction} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Based on content analysis and platform trends
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="hashtags" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Recommended Hashtags</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(optimizationResult.hashtags.join(' '))}
                        >
                          <Copy className="h-3 w-3 mr-2" />
                          Copy All
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {optimizationResult.hashtags.map((hashtag, index) => (
                          <Badge 
                            key={index}
                            variant="secondary"
                            className="cursor-pointer hover:bg-secondary/80"
                            onClick={() => copyToClipboard(hashtag)}
                          >
                            <Hash className="h-3 w-3 mr-1" />
                            {hashtag.replace('#', '')}
                          </Badge>
                        ))}
                      </div>
                      <Alert>
                        <Lightbulb className="h-4 w-4" />
                        <AlertDescription>
                          Use 5-10 hashtags for optimal reach. Mix popular and niche tags for best results.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}