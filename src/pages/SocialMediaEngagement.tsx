import { useState, useEffect } from "react";
import { usePublishedContent } from "@/components/calendar/content-integration";
import { useSocialEngagement, type AIResponse } from "@/hooks/use-social-engagement";
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
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  Heart, 
  Share, 
  Search,
  User,
  Tag,
  TrendingUp,
  Clock,
  Target,
  Bot,
  Users,
  Eye,
  Plus,
  Settings,
  Filter,
  RefreshCw as Refresh,
  Star,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  CheckCircle,
  AlertCircle,
  Zap,
  Brain,
  Lightbulb,
  Wand2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Send,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar
} from "lucide-react";

export default function SocialMediaEngagement() {
  const { toast } = useToast();
  const publishedContent = usePublishedContent();
  const {
    mentions,
    opportunities,
    influencers,
    loading,
    analyzing,
    monitorMentions,
    getEngagementOpportunities,
    discoverInfluencers,
    generateAIResponse,
    analyzeSentiment,
    trackHashtags
  } = useSocialEngagement();
  
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [engagementType, setEngagementType] = useState("");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [aiResponseData, setAiResponseData] = useState<AIResponse | null>(null);
  const [responseStyle, setResponseStyle] = useState("professional");
  const [industryNiche, setIndustryNiche] = useState("");
  const [minFollowers, setMinFollowers] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");

  const platforms = [
    { value: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500" },
    { value: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600" },
    { value: "twitter", label: "Twitter/X", icon: Twitter, color: "text-sky-500" },
    { value: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-700" },
    { value: "youtube", label: "YouTube", icon: Youtube, color: "text-red-600" }
  ];

  const engagementTypes = [
    { value: "influencer-outreach", label: "Influencer Outreach", icon: Star, description: "Engage with industry influencers" },
    { value: "hashtag-engagement", label: "Hashtag Engagement", icon: Tag, description: "Engage through strategic hashtags" },
    { value: "competitor-monitoring", label: "Competitor Monitoring", icon: Eye, description: "Monitor and engage with competitor content" },
    { value: "community-building", label: "Community Building", icon: Users, description: "Build and nurture community relationships" },
    { value: "trend-participation", label: "Trend Participation", icon: TrendingUp, description: "Participate in trending conversations" }
  ];

  const handleSearchInfluencers = async () => {
    if (!selectedPlatform) {
      toast({
        title: "Platform Required",
        description: "Please select a platform to search for influencers.",
        variant: "destructive"
      });
      return;
    }

    const criteria = {
      platform: selectedPlatform,
      niche: industryNiche,
      min_followers: parseInt(minFollowers) || 1000
    };

    await discoverInfluencers(selectedPlatform, criteria);
  };

  const handleAIAnalysis = async () => {
    const platforms = ['twitter', 'facebook', 'instagram', 'linkedin'];
    
    for (const platform of platforms) {
      await getEngagementOpportunities(platform);
    }
  };

  const handleGenerateAIResponse = async (mention: any) => {
    setSelectedThread(mention);
    
    const response = await generateAIResponse(
      mention.content,
      {
        user: mention.user,
        platform: mention.platform,
        sentiment: mention.sentiment
      },
      responseStyle,
      mention.platform
    );

    if (response) {
      setAiResponseData(response);
    }
  };

  const handleHashtagSearch = async () => {
    if (!hashtagInput.trim()) {
      toast({
        title: "Hashtags Required",
        description: "Please enter hashtags to track.",
        variant: "destructive"
      });
      return;
    }

    const hashtags = hashtagInput.split(',').map(h => h.trim()).filter(h => h);
    const platform = selectedPlatform || 'twitter';
    
    await trackHashtags(platform, hashtags);
  };

  const handleEngageWithInfluencer = (influencer: any) => {
    toast({
      title: "AI Engagement Strategy Applied",
      description: `Following AI recommendation for ${influencer.name}: ${influencer.suggestedApproach}`,
    });
  };

  const handleAutoReply = (enabled: boolean) => {
    setAutoReplyEnabled(enabled);
    toast({
      title: enabled ? "AI Auto-Reply Enabled" : "AI Auto-Reply Disabled",
      description: enabled ? "AI will analyze context and generate appropriate replies" : "Manual reply mode activated",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI-Powered Social Media Engagement</h1>
          <p className="text-muted-foreground mt-2">
            Let AI analyze conversations, recommend responses, and identify the best engagement opportunities.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAIAnalysis} disabled={analyzing}>
            {analyzing ? <Refresh className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
            {analyzing ? "Analyzing..." : "AI Analysis"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="ai-recommendations">AI Recommendations</TabsTrigger>
          <TabsTrigger value="influencers">Influencers</TabsTrigger>
          <TabsTrigger value="threads">Thread Management</TabsTrigger>
          <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="published">Published Content</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Engagements</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">No engagements yet</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Replies</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">No pending replies</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Influencer Reach</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">No influencer connections</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0%</div>
                <p className="text-xs text-muted-foreground">No engagement data</p>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Queue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Engagement Queue
              </CardTitle>
              <CardDescription>
                Manage pending engagements and responses across all platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mentions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No engagement queue items</p>
                    <p className="text-sm">Start engaging with your audience to see items here</p>
                  </div>
                ) : (
                  mentions.filter(mention => mention.requires_response).map((mention) => (
                    <div key={mention.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{mention.user}</span>
                          <Badge variant="outline" className="text-xs">{mention.platform}</Badge>
                          <Badge variant={mention.sentiment === 'positive' ? 'default' : 'secondary'} className="text-xs">
                            {mention.sentiment}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{mention.content}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(mention.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleGenerateAIResponse(mention)}>
                        <Brain className="h-4 w-4 mr-1" />
                        AI Reply
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Recommendations Tab */}
        <TabsContent value="ai-recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Engagement Recommendations
              </CardTitle>
              <CardDescription>
                AI-powered insights and suggestions for optimal social media engagement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Analysis Progress */}
              {analyzing && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Refresh className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI is analyzing your engagement opportunities...</span>
                  </div>
                  <Progress value={75} className="w-full" />
                </div>
              )}

              {/* AI Recommendations Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Thread Response Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {mentions.filter(mention => mention.requires_response).slice(0, 3).map((mention) => (
                      <div key={mention.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{mention.user}</p>
                            <p className="text-sm text-muted-foreground">{mention.content}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{mention.platform}</Badge>
                              <Badge variant={mention.sentiment === 'positive' ? 'default' : 'secondary'} className="text-xs">
                                {mention.sentiment}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{mention.engagement_potential} potential</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Brain className="h-4 w-4 text-primary" />
                            <span className="text-xs font-medium">AI</span>
                          </div>
                        </div>
                        
                        <div className="bg-muted p-3 rounded-lg">
                          <Label className="text-xs font-medium text-muted-foreground">AI Suggested Response:</Label>
                          <p className="text-sm mt-1">AI will generate personalized response...</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleGenerateAIResponse(mention)}>
                            <Wand2 className="h-4 w-4 mr-1" />
                            Generate
                          </Button>
                          <Button size="sm" variant="outline">
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                          <Button size="sm" variant="outline">
                            <Send className="h-4 w-4 mr-1" />
                            Send
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Influencer Outreach Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {influencers.slice(0, 2).map((influencer) => (
                      <div key={influencer.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{influencer.name}</p>
                            <p className="text-sm text-muted-foreground">{influencer.handle}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{influencer.platform}</Badge>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs">AI Score: {influencer.ai_score}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                            <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">Why This Influencer:</Label>
                            <p className="text-sm mt-1 text-blue-600 dark:text-blue-400">{influencer.reason}</p>
                          </div>
                          
                          <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                            <Label className="text-xs font-medium text-green-700 dark:text-green-300">Suggested Approach:</Label>
                            <p className="text-sm mt-1 text-green-600 dark:text-green-400">{influencer.suggestedApproach}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleEngageWithInfluencer(influencer)}>
                            <Target className="h-4 w-4 mr-1" />
                            Execute Strategy
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View Profile
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Performance Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    AI Performance Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">87%</div>
                      <p className="text-xs text-muted-foreground">Response Success Rate</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">+23%</div>
                      <p className="text-xs text-muted-foreground">Engagement Increase</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">4.2x</div>
                      <p className="text-xs text-muted-foreground">Response Speed</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">12</div>
                      <p className="text-xs text-muted-foreground">New Connections</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Influencers Tab */}
        <TabsContent value="influencers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                AI-Powered Influencer Discovery
              </CardTitle>
              <CardDescription>
                AI analyzes influencers and provides personalized outreach strategies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search Controls */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.map((platform) => (
                        <SelectItem key={platform.value} value={platform.value}>
                          <div className="flex items-center gap-2">
                            <platform.icon className={`h-4 w-4 ${platform.color}`} />
                            {platform.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Industry/Niche</Label>
                  <Input placeholder="e.g., Marketing, Tech, Finance" />
                </div>
                <div className="space-y-2">
                  <Label>Min. Followers</Label>
                  <Input placeholder="e.g., 10000" type="number" />
                </div>
              </div>

              <Button onClick={handleSearchInfluencers} disabled={isSearching} className="w-full">
                {isSearching ? <Refresh className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
                {isSearching ? "AI Analyzing Influencers..." : "AI-Powered Influencer Search"}
              </Button>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">AI-Recommended Influencers</h3>
                    <Badge variant="secondary">{searchResults.length} found</Badge>
                  </div>
                  {searchResults.map((influencer) => (
                    <div key={influencer.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                            <User className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-medium">{influencer.name}</p>
                            <p className="text-sm text-muted-foreground">{influencer.handle}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-muted-foreground">{influencer.followers} followers</span>
                              <span className="text-xs text-muted-foreground">{influencer.engagement} engagement</span>
                              <Badge variant="outline" className="text-xs">{influencer.niche}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-2">
                            <Brain className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">AI Score: {influencer.aiScore}%</span>
                          </div>
                          <Badge variant={influencer.aiScore >= 90 ? 'default' : 'secondary'}>
                            {influencer.aiScore >= 90 ? 'High Priority' : 'Medium Priority'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                          <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">AI Analysis:</Label>
                          <p className="text-sm mt-1 text-blue-600 dark:text-blue-400">{influencer.reason}</p>
                        </div>
                        
                        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                          <Label className="text-xs font-medium text-green-700 dark:text-green-300">Recommended Approach:</Label>
                          <p className="text-sm mt-1 text-green-600 dark:text-green-400">{influencer.suggestedApproach}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View Profile
                        </Button>
                        <Button size="sm" onClick={() => handleEngageWithInfluencer(influencer)}>
                          <Target className="h-4 w-4 mr-1" />
                          Execute AI Strategy
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hashtags Tab */}
        <TabsContent value="hashtags" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Hashtag Engagement
              </CardTitle>
              <CardDescription>
                Monitor and engage with content through strategic hashtags
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Search Hashtags</Label>
                  <Input placeholder="#digitalmarketing, #socialmedia" />
                </div>
                <div className="space-y-2">
                  <Label>Engagement Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select engagement type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="like">Like Posts</SelectItem>
                      <SelectItem value="comment">Comment on Posts</SelectItem>
                      <SelectItem value="follow">Follow Users</SelectItem>
                      <SelectItem value="share">Share Content</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Search Hashtag Content
              </Button>

              {/* Hashtag Results */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Trending Hashtags</h3>
                {mockHashtagResults.map((hashtag, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-full">
                        <Tag className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{hashtag.hashtag}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-muted-foreground">{hashtag.posts} posts</span>
                          <Badge variant={hashtag.engagement === 'High' ? 'default' : 'secondary'} className="text-xs">
                            {hashtag.engagement} engagement
                          </Badge>
                          {hashtag.trending && <Badge variant="outline" className="text-xs text-green-600">Trending</Badge>}
                        </div>
                      </div>
                    </div>
                    <Button size="sm">
                      <Target className="h-4 w-4 mr-1" />
                      Target
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thread Management Tab */}
        <TabsContent value="threads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Thread & Reply Management
              </CardTitle>
              <CardDescription>
                Manage replies to your posts and engage in meaningful conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Active Threads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <p className="font-medium">Marketing Tips Thread</p>
                        <p className="text-sm text-muted-foreground">15 replies • 2h ago</p>
                        <Badge variant="outline" className="text-xs mt-1">Instagram</Badge>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="font-medium">Product Launch Discussion</p>
                        <p className="text-sm text-muted-foreground">8 replies • 4h ago</p>
                        <Badge variant="outline" className="text-xs mt-1">Twitter</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Reply Templates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <p className="font-medium">Thank You</p>
                        <p className="text-sm text-muted-foreground">Thanks for sharing! 🙏</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="font-medium">Question Response</p>
                        <p className="text-sm text-muted-foreground">Great question! Let me explain...</p>
                      </div>
                    </div>
                    <Button size="sm" className="w-full mt-3">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Template
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Engagement Automation
              </CardTitle>
              <CardDescription>
                Set up automated responses and engagement rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">AI Auto-Reply to Mentions</Label>
                  <p className="text-sm text-muted-foreground">
                    Let AI analyze context and generate appropriate responses automatically
                  </p>
                </div>
                <Switch checked={autoReplyEnabled} onCheckedChange={handleAutoReply} />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">AI Automation Rules</h3>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Intelligent Response Generation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>AI Response Style</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select response style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional & Formal</SelectItem>
                          <SelectItem value="friendly">Friendly & Casual</SelectItem>
                          <SelectItem value="enthusiastic">Enthusiastic & Energetic</SelectItem>
                          <SelectItem value="helpful">Helpful & Supportive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Context Awareness</Label>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="userHistory" className="rounded" defaultChecked />
                        <Label htmlFor="userHistory" className="text-sm">Consider user interaction history</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="postContext" className="rounded" defaultChecked />
                        <Label htmlFor="postContext" className="text-sm">Analyze original post context</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="sentiment" className="rounded" defaultChecked />
                        <Label htmlFor="sentiment" className="text-sm">Sentiment-aware responses</Label>
                      </div>
                    </div>
                    <Button className="w-full">
                      <Wand2 className="h-4 w-4 mr-2" />
                      Configure AI Responses
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Smart Scheduling
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>AI Optimal Timing</Label>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="aiTiming" className="rounded" defaultChecked />
                        <Label htmlFor="aiTiming" className="text-sm">Let AI choose optimal response timing</Label>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Response Delay (AI Recommended)</Label>
                        <Input placeholder="2-5 minutes" disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Daily Engagement Limit</Label>
                        <Input placeholder="50" type="number" />
                      </div>
                    </div>
                    <Button className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Apply AI Schedule
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Published Content Tab */}
        <TabsContent value="published" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Published Content from Calendar
                  </CardTitle>
                  <CardDescription>
                    Manage engagement for content published from your content calendar
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Calendar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {publishedContent.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Published Content Yet</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Content published from your calendar will automatically appear here for engagement management. 
                    Schedule and publish content from the calendar to get started.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      Go to Calendar
                    </Button>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Content
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {publishedContent.map((content) => (
                    <Card key={content.id} className="border border-border">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg mb-2">{content.title}</h4>
                            <p className="text-muted-foreground mb-3 line-clamp-2">
                              {content.content}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>Published {new Date(content.scheduledDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Target className="h-4 w-4" />
                                <span>{content.platforms.length} platform{content.platforms.length > 1 ? 's' : ''}</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary">
                            Published
                          </Badge>
                        </div>
                        
                        {/* Platform Icons */}
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-sm font-medium">Platforms:</span>
                          {content.platforms.map((platformId) => {
                            const platform = platforms.find(p => p.value === platformId);
                            return platform ? (
                              <div key={platformId} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                                <platform.icon className={`h-4 w-4 ${platform.color}`} />
                                <span className="text-xs">{platform.label}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                        
                        {/* Engagement Metrics */}
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <MessageSquare className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                            <div className="text-lg font-semibold">0</div>
                            <div className="text-xs text-muted-foreground">Comments</div>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <Heart className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                            <div className="text-lg font-semibold">0</div>
                            <div className="text-xs text-muted-foreground">Likes</div>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <Share className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                            <div className="text-lg font-semibold">0</div>
                            <div className="text-xs text-muted-foreground">Shares</div>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                            <div className="text-lg font-semibold">0.0%</div>
                            <div className="text-xs text-muted-foreground">Engagement</div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              View Post
                            </Button>
                            <Button size="sm" variant="outline">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              View Comments
                            </Button>
                            <Button size="sm" variant="outline">
                              <BarChart3 className="h-4 w-4 mr-1" />
                              Analytics
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm">
                              <Bot className="h-4 w-4 mr-1" />
                              AI Engage
                            </Button>
                            <Button size="sm" variant="outline">
                              <Settings className="h-4 w-4 mr-1" />
                              Settings
                            </Button>
                          </div>
                        </div>
                        
                        {/* AI Engagement Status */}
                        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">AI Engagement Status</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            AI is monitoring this post for new comments and engagement opportunities. 
                            Auto-replies and influencer outreach suggestions will appear here when detected.
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Switch />
                            <Label className="text-xs">Auto-engage enabled</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Response Generation Dialog */}
      <Dialog open={!!selectedThread} onOpenChange={() => setSelectedThread(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Response Generator
            </DialogTitle>
            <DialogDescription>
              Refining AI response for {selectedThread?.user}
            </DialogDescription>
          </DialogHeader>
          
          {selectedThread && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm font-medium">Original Comment:</Label>
                <p className="text-sm mt-1">{selectedThread.content}</p>
              </div>
              
              <div className="space-y-2">
                <Label>AI Generated Response:</Label>
                <Textarea 
                  value={selectedThread.aiSuggestion}
                  className="min-h-[100px]"
                  placeholder="AI is generating a personalized response..."
                />
              </div>
              
              <div className="grid gap-2 md:grid-cols-3">
                <Button variant="outline" size="sm">
                  <Refresh className="h-4 w-4 mr-1" />
                  Regenerate
                </Button>
                <Button variant="outline" size="sm">
                  <Lightbulb className="h-4 w-4 mr-1" />
                  More Casual
                </Button>
                <Button variant="outline" size="sm">
                  <Target className="h-4 w-4 mr-1" />
                  More Professional
                </Button>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  Send Response
                </Button>
                <Button variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}