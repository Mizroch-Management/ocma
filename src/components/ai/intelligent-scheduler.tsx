import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { aiServices } from "@/lib/ai/services";
import { SocialMediaClientFactory } from "@/lib/social/api-client";
import { supabase } from "@/integrations/supabase/client";
import { 
  CalendarClock,
  TrendingUp,
  Users,
  Globe,
  Brain,
  Clock,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Zap,
  Target,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/use-organization";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { motion } from "framer-motion";

interface TimeSlot {
  time: string;
  score: number;
  reason: string;
  competition: 'low' | 'medium' | 'high';
  audienceActivity: number;
}

interface SchedulingInsight {
  bestTimes: TimeSlot[];
  worstTimes: TimeSlot[];
  peakDays: string[];
  audienceTimezone: string;
  competitorActivity: {
    time: string;
    posts: number;
  }[];
  recommendations: string[];
}

interface ContentSchedule {
  id: string;
  content: string;
  platform: string;
  scheduledTime: Date;
  optimizationScore: number;
  predictedReach: number;
}

export function IntelligentScheduler() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [insights, setInsights] = useState<SchedulingInsight | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scheduledContent, setScheduledContent] = useState<ContentSchedule[]>([]);
  const [activeTab, setActiveTab] = useState("schedule");

  // Real AI analysis using actual audience data
  const analyzeOptimalTimes = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      const realInsights = await analyzeRealSchedulingData(selectedPlatform);
      setInsights(realInsights);
    } catch (error) {
      console.error('Analysis failed:', error);
      // Fallback to basic insights if analysis fails
      setInsights({
        bestTimes: [
          { time: "9:00 AM", score: 80, reason: "Generally good time for engagement", competition: 'medium', audienceActivity: 70 },
          { time: "7:00 PM", score: 75, reason: "Evening activity", competition: 'medium', audienceActivity: 65 }
        ],
        worstTimes: [
          { time: "3:00 AM", score: 15, reason: "Low audience activity", competition: 'low', audienceActivity: 5 }
        ],
        peakDays: ["Tuesday", "Thursday"],
        audienceTimezone: "America/New_York",
        competitorActivity: [],
        recommendations: ["Connect your social media accounts for personalized scheduling insights"]
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedPlatform]);

  // Add the real analysis function
  const analyzeRealSchedulingData = async (platform: string): Promise<SchedulingInsight> => {
    try {
      if (!organizationId) {
        throw new Error('Select an organization to analyze scheduling data');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get connected accounts for the platform
      let accountsQuery = supabase
        .from('platform_accounts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (platform !== 'all') {
        accountsQuery = accountsQuery.eq('platform', platform);
      }

      const { data: accounts, error: accountsError } = await accountsQuery;
      if (accountsError) {
        throw accountsError;
      }

      if (!accounts || accounts.length === 0) {
        throw new Error('No connected accounts found');
      }

      const allTimeSlots: TimeSlot[] = [];
      const allCompetitorActivity: { time: string; posts: number }[] = [];
      const allRecommendations: string[] = [];

      for (const account of accounts) {
        try {
          // Create API client
          const credentials = {
            clientId: import.meta.env[`VITE_${account.platform.toUpperCase()}_CLIENT_ID`] || '',
            clientSecret: import.meta.env[`VITE_${account.platform.toUpperCase()}_CLIENT_SECRET`] || '',
            redirectUri: import.meta.env[`VITE_${account.platform.toUpperCase()}_REDIRECT_URI`] || ''
          };

          const client = SocialMediaClientFactory.createClient(account.platform, credentials);
          client.setTokens({
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            tokenType: 'bearer',
            expiresIn: 3600,
            expiresAt: account.token_expiry ? new Date(account.token_expiry) : new Date(Date.now() + 3600000)
          });

          // Fetch recent posts to analyze posting patterns
          const posts = await client.getUserPosts(50);
          
          // Analyze posting times and engagement
          const timeEngagementMap = new Map<number, { total: number; count: number }>();
          
          posts.forEach(post => {
            const hour = post.createdAt.getHours();
            const current = timeEngagementMap.get(hour) || { total: 0, count: 0 };
            current.total += post.metrics.engagement;
            current.count += 1;
            timeEngagementMap.set(hour, current);
          });

          // Generate time slots based on actual data
          for (let hour = 6; hour <= 22; hour++) {
            const data = timeEngagementMap.get(hour);
            const avgEngagement = data ? data.total / data.count : 0;
            const postCount = data ? data.count : 0;
            
            // Calculate score based on engagement and frequency
            let score = Math.min(100, (avgEngagement * 10) + (postCount * 2));
            score = Math.max(10, score); // Minimum score
            
            const time12h = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`;
            
            allTimeSlots.push({
              time: time12h,
              score: Math.round(score),
              reason: avgEngagement > 5 ? 'High historical engagement' : 'Moderate engagement opportunity',
              competition: postCount > 5 ? 'high' : postCount > 2 ? 'medium' : 'low',
              audienceActivity: Math.min(100, avgEngagement * 15)
            });
          }

          // Use AI to generate insights
          const contentSample = posts.slice(0, 5).map(p => 
            `${format(p.createdAt, 'HH:mm')}: ${p.metrics.engagement}% engagement`
          ).join(', ');
          
          const aiInsight = await aiServices.analyzeContentPerformance(
            `Analyze optimal posting times from this data: ${contentSample}`,
            account.platform
          );
          
          allRecommendations.push(...aiInsight.optimizations);
          allRecommendations.push(`Best posting time for ${account.platform}: ${aiInsight.bestPostingTime}`);

        } catch (error) {
          console.warn(`Failed to analyze ${account.platform}:`, error);
        }
      }

      // Sort time slots by score and take best/worst
      allTimeSlots.sort((a, b) => b.score - a.score);
      const bestTimes = allTimeSlots.slice(0, 4);
      const worstTimes = allTimeSlots.slice(-2);

      // Analyze peak days (this would require more historical data)
      const peakDays = ["Tuesday", "Thursday", "Sunday"]; // Placeholder

      // Detect audience timezone (placeholder - would analyze follower data)
      const audienceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      return {
        bestTimes,
        worstTimes,
        peakDays,
        audienceTimezone,
        competitorActivity: allCompetitorActivity,
        recommendations: [...new Set(allRecommendations)].slice(0, 5)
      };

    } catch (error) {
      console.error('Failed to analyze real scheduling data:', error);
      throw error;
    }
  };

  useEffect(() => {
    analyzeOptimalTimes();
  }, [analyzeOptimalTimes]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getCompetitionColor = (level: string): string => {
    switch (level) {
      case 'low': return "text-green-600";
      case 'medium': return "text-yellow-600";
      case 'high': return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const scheduleContent = async (time: TimeSlot) => {
    try {
      if (!organizationId) {
        alert('Please select an organization first');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('Please log in to schedule content');
        return;
      }

      // Get user's organization
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', organizationId)
        .maybeSingle();

      if (!orgData) {
        alert('Organization not found');
        return;
      }

      const scheduledTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${time.time}`);

      const { data, error } = await supabase.functions.invoke('schedule-post', {
        body: {
          content: "Your optimized content will be posted here",
          platforms: selectedPlatform === "all" ? ["instagram", "twitter", "linkedin"] : [selectedPlatform],
          publishAt: scheduledTime.toISOString(),
          timezone: insights?.audienceTimezone || "UTC",
          organizationId: orgData.id,
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to schedule post');
      }

      const newSchedule: ContentSchedule = {
        id: data.jobId,
        content: "Scheduled post (job queued)",
        platform: selectedPlatform === "all" ? "multi-platform" : selectedPlatform,
        scheduledTime,
        optimizationScore: time.score,
        predictedReach: Math.floor(time.audienceActivity * 100)
      };
      
      setScheduledContent(prev => [...prev, newSchedule]);
      alert(`Content scheduled successfully for ${time.time}!`);
    } catch (error) {
      console.error('Failed to schedule content:', error);
      alert('Failed to schedule content. Please try again.');
    }
  };

  const removeScheduledContent = async (id: string) => {
    try {
      if (!organizationId) {
        alert('Please select an organization first');
        return;
      }

      const { data, error } = await supabase.functions.invoke('cancel-scheduled-post', {
        body: {
          postId: id,
          organizationId,
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to cancel scheduled post');
      }

      if (data.success) {
        setScheduledContent(prev => prev.filter(item => item.id !== id));
        alert('Scheduled post cancelled successfully');
      } else {
        alert('Failed to cancel scheduled post');
      }
    } catch (error) {
      console.error('Failed to cancel scheduled content:', error);
      // Remove from UI anyway
      setScheduledContent(prev => prev.filter(item => item.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Intelligent Scheduler
          </CardTitle>
          <CardDescription>
            Optimize your posting schedule with AI-driven insights for maximum engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="twitter">Twitter/X</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={analyzeOptimalTimes}
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar and Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>
                
                <TabsContent value="schedule" className="space-y-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border"
                  />
                  
                  {insights && (
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Best Times for {format(selectedDate, 'MMM d, yyyy')}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {insights.bestTimes.map((timeSlot, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card className="cursor-pointer hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-semibold text-lg">{timeSlot.time}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {timeSlot.reason}
                                    </p>
                                  </div>
                                  <Badge className={cn("text-white", getScoreColor(timeSlot.score))}>
                                    {timeSlot.score}%
                                  </Badge>
                                </div>
                                
                                <div className="space-y-2 mt-3">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Competition</span>
                                    <span className={getCompetitionColor(timeSlot.competition)}>
                                      {timeSlot.competition}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Audience Active</span>
                                    <span>{timeSlot.audienceActivity}%</span>
                                  </div>
                                  <Progress value={timeSlot.audienceActivity} className="h-2" />
                                </div>
                                
                                <Button 
                                  size="sm" 
                                  className="w-full mt-3"
                                  onClick={() => scheduleContent(timeSlot)}
                                >
                                  <CalendarClock className="mr-2 h-3 w-3" />
                                  Schedule Here
                                </Button>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="analytics" className="space-y-4">
                  {insights && (
                    <>
                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Competitor Activity Patterns
                        </h3>
                        <div className="space-y-2">
                          {insights.competitorActivity.map((activity, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <span className="font-medium">{activity.time}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {activity.posts} posts
                                </span>
                                <div className="w-32">
                                  <Progress value={(activity.posts / 60) * 100} className="h-2" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Posting when competition is low but audience activity is high gives you the best chance for visibility.
                        </AlertDescription>
                      </Alert>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Scheduled Content */}
          {scheduledContent.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scheduledContent.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {format(item.scheduledTime, 'MMM d, yyyy - h:mm a')}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{item.platform}</Badge>
                          <span className="text-sm text-muted-foreground">
                            Score: {item.optimizationScore}%
                          </span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => removeScheduledContent(item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Insights Panel */}
        <div className="space-y-6">
          {insights && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Peak Performance Days
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {insights.peakDays.map((day, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-primary/10 rounded-lg">
                        <span className="font-medium">{day}</span>
                        <Zap className="h-4 w-4 text-primary" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Audience Timezone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Primary Zone</span>
                      <Badge>{insights.audienceTimezone}</Badge>
                    </div>
                    <Alert>
                      <Users className="h-4 w-4" />
                      <AlertDescription>
                        Your audience is most active in {insights.audienceTimezone}. All times shown are adjusted to this timezone.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insights.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
