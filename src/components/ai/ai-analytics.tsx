import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown,
  Activity,
  BarChart3,
  PieChart,
  Brain,
  Target,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface ContentMetrics {
  impressions: number;
  engagement: number;
  clicks: number;
  shares: number;
  saves: number;
  comments: number;
  likes: number;
  reach: number;
}

interface PerformanceInsight {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  description: string;
  metric?: string;
  value?: number;
  trend?: 'up' | 'down' | 'stable';
  actionable?: string;
}

interface ContentAnalysis {
  contentId: string;
  contentType: string;
  postedAt: Date;
  platform: string;
  metrics: ContentMetrics;
  aiPrediction: {
    expectedEngagement: number;
    actualEngagement: number;
    accuracy: number;
  };
  insights: PerformanceInsight[];
  recommendations: string[];
}

interface AudienceInsight {
  demographic: string;
  percentage: number;
  engagement: number;
  growth: number;
  topInterests: string[];
}

interface AIAnalyticsData {
  overallPerformance: {
    totalPosts: number;
    avgEngagement: number;
    totalReach: number;
    growthRate: number;
    aiAccuracy: number;
  };
  contentAnalysis: ContentAnalysis[];
  audienceInsights: AudienceInsight[];
  bestPerformingContent: ContentAnalysis[];
  recommendations: string[];
  trendAnalysis: {
    trending: string[];
    declining: string[];
    emerging: string[];
  };
}

export function AIAnalytics() {
  const [timeRange, setTimeRange] = useState("7d");
  const [platform, setPlatform] = useState("all");
  const [analyticsData, setAnalyticsData] = useState<AIAnalyticsData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Simulate AI analysis
  const performAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock analytics data
      const mockData: AIAnalyticsData = {
        overallPerformance: {
          totalPosts: 45,
          avgEngagement: 6.8,
          totalReach: 125000,
          growthRate: 15.3,
          aiAccuracy: 82.5
        },
        contentAnalysis: generateMockContentAnalysis(),
        audienceInsights: generateMockAudienceInsights(),
        bestPerformingContent: generateMockBestContent(),
        recommendations: [
          "Post more video content - videos show 3x higher engagement",
          "Optimal posting time is 9 AM based on audience activity",
          "Use more emotional hooks in your captions",
          "Increase posting frequency on Tuesdays and Thursdays",
          "Leverage trending hashtags #AI and #Marketing",
          "Create more educational content - highest save rate"
        ],
        trendAnalysis: {
          trending: ["AI tools", "productivity tips", "remote work"],
          declining: ["generic quotes", "stock photos"],
          emerging: ["AI automation", "personal branding", "micro-learning"]
        }
      };
      
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [timeRange, platform]);

  useEffect(() => {
    performAnalysis();
  }, [performAnalysis]);

  const generateMockContentAnalysis = (): ContentAnalysis[] => {
    return Array.from({ length: 10 }, (_, i) => ({
      contentId: `content-${i + 1}`,
      contentType: ['post', 'reel', 'story', 'article'][Math.floor(Math.random() * 4)],
      postedAt: subDays(new Date(), Math.floor(Math.random() * 30)),
      platform: ['instagram', 'twitter', 'linkedin'][Math.floor(Math.random() * 3)],
      metrics: {
        impressions: Math.floor(Math.random() * 10000) + 1000,
        engagement: Math.random() * 10 + 1,
        clicks: Math.floor(Math.random() * 500),
        shares: Math.floor(Math.random() * 100),
        saves: Math.floor(Math.random() * 200),
        comments: Math.floor(Math.random() * 50),
        likes: Math.floor(Math.random() * 1000),
        reach: Math.floor(Math.random() * 8000) + 1000
      },
      aiPrediction: {
        expectedEngagement: Math.random() * 10 + 3,
        actualEngagement: Math.random() * 10 + 2,
        accuracy: Math.random() * 30 + 70
      },
      insights: generateMockInsights(),
      recommendations: [
        "Add more hashtags for better discovery",
        "Include a clear call-to-action",
        "Post at peak audience hours"
      ]
    }));
  };

  const generateMockAudienceInsights = (): AudienceInsight[] => {
    return [
      {
        demographic: "25-34 Professionals",
        percentage: 35,
        engagement: 8.5,
        growth: 12,
        topInterests: ["Technology", "Business", "Innovation"]
      },
      {
        demographic: "18-24 Students",
        percentage: 25,
        engagement: 7.2,
        growth: 18,
        topInterests: ["Education", "Career", "Trends"]
      },
      {
        demographic: "35-44 Managers",
        percentage: 20,
        engagement: 6.8,
        growth: 8,
        topInterests: ["Leadership", "Strategy", "Growth"]
      },
      {
        demographic: "45+ Executives",
        percentage: 20,
        engagement: 5.5,
        growth: 5,
        topInterests: ["Industry News", "Insights", "Networking"]
      }
    ];
  };

  const generateMockBestContent = (): ContentAnalysis[] => {
    return generateMockContentAnalysis()
      .sort((a, b) => b.metrics.engagement - a.metrics.engagement)
      .slice(0, 3);
  };

  const generateMockInsights = (): PerformanceInsight[] => {
    return [
      {
        type: 'success',
        title: 'High Engagement',
        description: 'This content exceeded average engagement by 45%',
        metric: 'engagement',
        value: 8.5,
        trend: 'up',
        actionable: 'Create similar content types'
      },
      {
        type: 'warning',
        title: 'Low Reach',
        description: 'Reach was 30% below average',
        metric: 'reach',
        value: -30,
        trend: 'down',
        actionable: 'Improve hashtag strategy'
      },
      {
        type: 'info',
        title: 'Peak Activity',
        description: 'Most engagement occurred at 9 AM',
        metric: 'time',
        value: 9,
        trend: 'stable',
        actionable: 'Schedule posts for this time'
      }
    ];
  };

  const getMetricIcon = (metric: string) => {
    const icons: Record<string, JSX.Element> = {
      impressions: <Eye className="h-4 w-4" />,
      engagement: <Activity className="h-4 w-4" />,
      likes: <Heart className="h-4 w-4" />,
      comments: <MessageCircle className="h-4 w-4" />,
      shares: <Share2 className="h-4 w-4" />
    };
    return icons[metric] || <BarChart3 className="h-4 w-4" />;
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'down': return <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'stable': return <Minus className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  const getInsightColor = (type: string) => {
    const colors = {
      success: 'bg-green-100 border-green-500 text-green-900',
      warning: 'bg-yellow-100 border-yellow-500 text-yellow-900',
      info: 'bg-blue-100 border-blue-500 text-blue-900',
      error: 'bg-red-100 border-red-500 text-red-900'
    };
    return colors[type as keyof typeof colors] || colors.info;
  };

  if (isAnalyzing && !analyticsData) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Brain className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-lg font-medium">Analyzing your content performance...</p>
            <Progress value={66} className="w-64" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analyticsData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No analytics data available. Start creating content to see insights.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Analytics & Insights
          </CardTitle>
          <CardDescription>
            Deep analysis of your content performance with actionable recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="twitter">Twitter/X</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={performAnalysis}
              disabled={isAnalyzing}
              variant="outline"
            >
              {isAnalyzing ? (
                <>
                  <Activity className="mr-2 h-4 w-4 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Refresh Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-bold">{analyticsData.overallPerformance.totalPosts}</p>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Avg Engagement</p>
                <p className="text-2xl font-bold">{analyticsData.overallPerformance.avgEngagement.toFixed(1)}%</p>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Total Reach</p>
                <p className="text-2xl font-bold">{(analyticsData.overallPerformance.totalReach / 1000).toFixed(0)}K</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Growth Rate</p>
                <div className="flex items-center gap-1">
                  <p className="text-2xl font-bold">{analyticsData.overallPerformance.growthRate.toFixed(1)}%</p>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">AI Accuracy</p>
                <p className="text-2xl font-bold">{analyticsData.overallPerformance.aiAccuracy.toFixed(1)}%</p>
              </div>
              <Brain className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Content */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="audience">Audience</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="recommendations">AI Insights</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Best Performing Content</h3>
                <div className="space-y-3">
                  {analyticsData.bestPerformingContent.map((content, index) => (
                    <motion.div
                      key={content.contentId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedContent(content)}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{content.contentType}</Badge>
                                <Badge variant="outline">{content.platform}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {format(content.postedAt, 'MMM d, yyyy')}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                                <div>
                                  <p className="text-xs text-muted-foreground">Engagement</p>
                                  <p className="text-sm font-semibold flex items-center gap-1">
                                    {content.metrics.engagement.toFixed(1)}%
                                    {getTrendIcon('up')}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Reach</p>
                                  <p className="text-sm font-semibold">
                                    {(content.metrics.reach / 1000).toFixed(1)}K
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Likes</p>
                                  <p className="text-sm font-semibold">{content.metrics.likes}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">AI Accuracy</p>
                                  <p className="text-sm font-semibold">
                                    {content.aiPrediction.accuracy.toFixed(0)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-green-100 text-green-800">
                                Top Performer
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Performance Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analyticsData.contentAnalysis[0]?.insights.map((insight, index) => (
                    <div key={index} 
                         className={cn("p-4 border-l-4 rounded-lg", getInsightColor(insight.type))}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            {insight.title}
                            {getTrendIcon(insight.trend)}
                          </h4>
                          <p className="text-sm mt-1">{insight.description}</p>
                          {insight.actionable && (
                            <p className="text-xs mt-2 font-medium">
                              💡 {insight.actionable}
                            </p>
                          )}
                        </div>
                        {insight.value && (
                          <span className="text-2xl font-bold">
                            {insight.value > 0 ? '+' : ''}{insight.value}
                            {insight.metric === 'engagement' ? '%' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="content" className="space-y-4 mt-6">
              <div className="space-y-3">
                {analyticsData.contentAnalysis.map((content) => (
                  <Card key={content.contentId} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedContent(content)}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline">{content.contentType}</Badge>
                            <Badge variant="outline">{content.platform}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(content.postedAt, 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="flex items-center gap-2">
                              <Eye className="h-3 w-3 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Impressions</p>
                                <p className="text-sm font-semibold">{content.metrics.impressions.toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Activity className="h-3 w-3 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Engagement</p>
                                <p className="text-sm font-semibold">{content.metrics.engagement.toFixed(1)}%</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Heart className="h-3 w-3 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Likes</p>
                                <p className="text-sm font-semibold">{content.metrics.likes}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageCircle className="h-3 w-3 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Comments</p>
                                <p className="text-sm font-semibold">{content.metrics.comments}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Share2 className="h-3 w-3 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Shares</p>
                                <p className="text-sm font-semibold">{content.metrics.shares}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div>
                                  <span className="text-xs text-muted-foreground">AI Predicted: </span>
                                  <span className="text-sm font-medium">{content.aiPrediction.expectedEngagement.toFixed(1)}%</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground">Actual: </span>
                                  <span className="text-sm font-medium">{content.aiPrediction.actualEngagement.toFixed(1)}%</span>
                                </div>
                              </div>
                              <Badge variant={content.aiPrediction.accuracy > 80 ? "default" : "secondary"}>
                                {content.aiPrediction.accuracy.toFixed(0)}% Accurate
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="audience" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Audience Demographics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analyticsData.audienceInsights.map((segment, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold">{segment.demographic}</h4>
                            <p className="text-sm text-muted-foreground">
                              {segment.percentage}% of audience
                            </p>
                          </div>
                          <Badge variant={segment.growth > 10 ? "default" : "secondary"}>
                            {segment.growth > 0 ? '+' : ''}{segment.growth}% growth
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Engagement Rate</span>
                              <span className="font-medium">{segment.engagement}%</span>
                            </div>
                            <Progress value={segment.engagement * 10} className="h-2" />
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Top Interests</p>
                            <div className="flex flex-wrap gap-1">
                              {segment.topInterests.map((interest, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {interest}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="trends" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Trending Topics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analyticsData.trendAnalysis.trending.map((topic, index) => (
                        <li key={index} className="flex items-center justify-between">
                          <span className="text-sm">{topic}</span>
                          <ArrowUp className="h-3 w-3 text-green-500" />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      Emerging Topics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analyticsData.trendAnalysis.emerging.map((topic, index) => (
                        <li key={index} className="flex items-center justify-between">
                          <span className="text-sm">{topic}</span>
                          <Badge variant="outline" className="text-xs">New</Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Declining Topics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analyticsData.trendAnalysis.declining.map((topic, index) => (
                        <li key={index} className="flex items-center justify-between">
                          <span className="text-sm">{topic}</span>
                          <ArrowDown className="h-3 w-3 text-red-500" />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="recommendations" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI-Generated Recommendations
                </h3>
                <div className="space-y-3">
                  {analyticsData.recommendations.map((rec, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                          <span>{rec}</span>
                          <Button size="sm" variant="outline">Apply</Button>
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base">AI Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Based on the analysis of your content over the past {timeRange}, here's what the AI recommends:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-primary mt-0.5" />
                      <span>Focus on video content for 3x higher engagement rates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-primary mt-0.5" />
                      <span>Post consistently at 9 AM for optimal reach</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-primary mt-0.5" />
                      <span>Target 25-34 professionals - your most engaged audience</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
                      <span>Leverage AI and productivity topics while they're trending</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Content Detail Modal */}
      <AnimatePresence>
        {selectedContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedContent(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-background rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Content Performance Details</CardTitle>
                  <CardDescription>
                    Posted on {format(selectedContent.postedAt, 'MMMM d, yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Platform</p>
                      <Badge>{selectedContent.platform}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Content Type</p>
                      <Badge>{selectedContent.contentType}</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Performance Metrics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(selectedContent.metrics).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          {getMetricIcon(key)}
                          <div>
                            <p className="text-xs text-muted-foreground capitalize">{key}</p>
                            <p className="text-sm font-semibold">
                              {typeof value === 'number' && key !== 'engagement' 
                                ? value.toLocaleString() 
                                : `${value}%`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">AI Prediction Accuracy</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Expected Engagement</span>
                        <span className="text-sm font-medium">
                          {selectedContent.aiPrediction.expectedEngagement.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Actual Engagement</span>
                        <span className="text-sm font-medium">
                          {selectedContent.aiPrediction.actualEngagement.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={selectedContent.aiPrediction.accuracy} className="h-2" />
                      <p className="text-xs text-muted-foreground text-right">
                        {selectedContent.aiPrediction.accuracy.toFixed(0)}% Accurate
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Recommendations</h4>
                    <ul className="space-y-1">
                      {selectedContent.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSelectedContent(null)}>
                      Close
                    </Button>
                    <Button>
                      Apply Recommendations
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}