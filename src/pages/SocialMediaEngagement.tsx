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
import { Switch } from "@/components/ui/switch";
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
  Zap
} from "lucide-react";

export default function SocialMediaEngagement() {
  const { toast } = useToast();
  
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [engagementType, setEngagementType] = useState("");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [engagementQueue, setEngagementQueue] = useState<any[]>([]);

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

  const mockInfluencers = [
    { id: 1, name: "Sarah Johnson", handle: "@sarahjohnson", platform: "instagram", followers: "125K", engagement: "4.2%", lastPost: "2h ago", niche: "Marketing" },
    { id: 2, name: "Tech Guru Mike", handle: "@techguru", platform: "twitter", followers: "89K", engagement: "3.8%", lastPost: "1h ago", niche: "Technology" },
    { id: 3, name: "Business Leader Jane", handle: "@bizleader", platform: "linkedin", followers: "67K", engagement: "5.1%", lastPost: "4h ago", niche: "Business" }
  ];

  const mockHashtagResults = [
    { hashtag: "#digitalmarketing", posts: "2.1M", engagement: "High", trending: true },
    { hashtag: "#socialmedia", posts: "1.8M", engagement: "Medium", trending: false },
    { hashtag: "#contentcreator", posts: "956K", engagement: "High", trending: true },
    { hashtag: "#entrepreneur", posts: "3.2M", engagement: "Medium", trending: false }
  ];

  const mockEngagementQueue = [
    { id: 1, type: "reply", user: "@sarahjohnson", content: "Great insights on marketing trends!", platform: "instagram", status: "pending", priority: "high" },
    { id: 2, type: "like", user: "@techguru", content: "Latest tech innovations post", platform: "twitter", status: "completed", priority: "medium" },
    { id: 3, type: "comment", user: "@bizleader", content: "Thoughtful business strategy analysis", platform: "linkedin", status: "pending", priority: "high" }
  ];

  const handleSearchInfluencers = async () => {
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setSearchResults(mockInfluencers);
      setIsSearching(false);
    }, 1500);
  };

  const handleEngageWithInfluencer = (influencer: any) => {
    toast({
      title: "Engagement Initiated",
      description: `Started engaging with ${influencer.name} on ${influencer.platform}`,
    });
  };

  const handleAutoReply = (enabled: boolean) => {
    setAutoReplyEnabled(enabled);
    toast({
      title: enabled ? "Auto-Reply Enabled" : "Auto-Reply Disabled",
      description: enabled ? "AI will automatically reply to mentions and comments" : "Manual reply mode activated",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Social Media Engagement</h1>
        <p className="text-muted-foreground mt-2">
          Manage your social media engagement, monitor conversations, and build meaningful relationships.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="influencers">Influencers</TabsTrigger>
          <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
          <TabsTrigger value="threads">Thread Management</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
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
                <div className="text-2xl font-bold">127</div>
                <p className="text-xs text-muted-foreground">+23% from yesterday</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Replies</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">Avg. response time: 2.3h</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Influencer Reach</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45.2K</div>
                <p className="text-xs text-muted-foreground">Potential impressions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.8%</div>
                <p className="text-xs text-muted-foreground">+0.3% this week</p>
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
                {mockEngagementQueue.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${item.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        {item.type === 'reply' && <MessageSquare className="h-4 w-4" />}
                        {item.type === 'like' && <Heart className="h-4 w-4" />}
                        {item.type === 'comment' && <MessageSquare className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium">{item.user}</p>
                        <p className="text-sm text-muted-foreground">{item.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{item.platform}</Badge>
                          <Badge variant={item.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Engage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Influencers Tab */}
        <TabsContent value="influencers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Influencer Outreach
              </CardTitle>
              <CardDescription>
                Find and engage with relevant influencers in your industry
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
                {isSearching ? <Refresh className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                {isSearching ? "Searching..." : "Search Influencers"}
              </Button>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Found Influencers</h3>
                  {searchResults.map((influencer) => (
                    <div key={influencer.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          Profile
                        </Button>
                        <Button size="sm" onClick={() => handleEngageWithInfluencer(influencer)}>
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Engage
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
                  <Label className="text-base">Auto-Reply to Mentions</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically reply to mentions and direct messages
                  </p>
                </div>
                <Switch checked={autoReplyEnabled} onCheckedChange={handleAutoReply} />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Automation Rules</h3>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Keyword Triggers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Keywords</Label>
                      <Input placeholder="help, support, pricing" />
                    </div>
                    <div className="space-y-2">
                      <Label>Auto Response</Label>
                      <Textarea placeholder="Thank you for reaching out! We'll get back to you soon..." />
                    </div>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Rule
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Engagement Scheduling</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Peak Hours</Label>
                        <Input placeholder="9:00 AM - 5:00 PM" />
                      </div>
                      <div className="space-y-2">
                        <Label>Daily Engagement Limit</Label>
                        <Input placeholder="50" type="number" />
                      </div>
                    </div>
                    <Button size="sm">
                      <Settings className="h-4 w-4 mr-1" />
                      Configure Schedule
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}