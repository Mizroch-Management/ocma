import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MetricsCards } from "@/components/dashboard/metrics-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addDays, isAfter, isBefore } from "date-fns";

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    totalContent: 0,
    scheduledContent: 0,
    draftContent: 0,
    publishedContent: 0,
    upcomingPosts: [],
    performanceMetrics: {
      totalReach: 0,
      totalEngagement: 0,
      successfulPublications: 0,
      failedPublications: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load content statistics
      const { data: contentData, error: contentError } = await supabase
        .from('generated_content')
        .select('*');

      if (contentError) {
        console.error('Error loading content data:', contentError);
        return;
      }

      // Load publication logs for performance metrics
      const { data: publicationLogs, error: logsError } = await supabase
        .from('publication_logs')
        .select('*');

      if (logsError) {
        console.error('Error loading publication logs:', logsError);
      }

      // Calculate metrics
      const totalContent = contentData?.length || 0;
      const scheduledContent = contentData?.filter(item => 
        item.is_scheduled && item.publication_status === 'scheduled'
      ).length || 0;
      const draftContent = contentData?.filter(item => 
        item.publication_status === 'draft'
      ).length || 0;
      const publishedContent = contentData?.filter(item => 
        item.publication_status === 'published'
      ).length || 0;

      // Get upcoming posts (next 7 days)
      const now = new Date();
      const next7Days = addDays(now, 7);
      const upcomingPosts = contentData?.filter(item => 
        item.is_scheduled && 
        item.scheduled_date &&
        isAfter(new Date(item.scheduled_date), now) &&
        isBefore(new Date(item.scheduled_date), next7Days)
      ).sort((a, b) => 
        new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
      ).slice(0, 5) || [];

      // Calculate performance metrics
      const successfulPublications = publicationLogs?.filter(log => 
        log.status === 'success'
      ).length || 0;
      const failedPublications = publicationLogs?.filter(log => 
        log.status === 'failed'
      ).length || 0;

      // Calculate total reach from publication logs metrics
      const totalReach = publicationLogs?.reduce((sum, log) => {
        const metrics = log.metrics as any;
        const reach = metrics?.initial_reach || 0;
        return sum + (typeof reach === 'number' ? reach : 0);
      }, 0) || 0;

      setDashboardData({
        totalContent,
        scheduledContent,
        draftContent,
        publishedContent,
        upcomingPosts,
        performanceMetrics: {
          totalReach,
          totalEngagement: Math.floor(totalReach * 0.15), // Estimate 15% engagement rate
          successfulPublications,
          failedPublications
        }
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlatformBadgeColor = (platforms) => {
    if (!platforms || platforms.length === 0) return "bg-gray-500";
    const platform = platforms[0];
    switch (platform) {
      case 'instagram': return "bg-pink-500";
      case 'facebook': return "bg-blue-600";
      case 'twitter': return "bg-sky-500";
      case 'linkedin': return "bg-blue-700";
      case 'youtube': return "bg-red-600";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's what's happening with your content.
        </p>
      </div>

      {/* Metrics Overview */}
      <MetricsCards 
        data={dashboardData}
        isLoading={isLoading}
      />

      {/* Quick Actions */}
      <QuickActions />

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div className="space-y-6">
          {/* Upcoming Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Upcoming Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Loading upcoming posts...
                </div>
              ) : dashboardData.upcomingPosts.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No upcoming scheduled posts
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.upcomingPosts.map(post => (
                    <div key={post.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{post.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(post.scheduled_date), "MMM d, h:mm a")}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {post.scheduled_platforms?.slice(0, 2).map(platform => (
                            <Badge key={platform} variant="secondary" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                          {post.scheduled_platforms?.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{post.scheduled_platforms.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${getPlatformBadgeColor(post.scheduled_platforms)}`}></span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Loading performance data...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Reach</span>
                    <span className="text-sm font-medium text-primary">
                      {dashboardData.performanceMetrics.totalReach.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Engagement</span>
                    <span className="text-sm font-medium text-primary">
                      {dashboardData.performanceMetrics.totalEngagement.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Successful Posts</span>
                    <span className="text-sm font-medium text-success">
                      {dashboardData.performanceMetrics.successfulPublications}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Failed Posts</span>
                    <span className="text-sm font-medium text-destructive">
                      {dashboardData.performanceMetrics.failedPublications}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="text-sm font-medium text-success">
                      {dashboardData.performanceMetrics.successfulPublications + dashboardData.performanceMetrics.failedPublications > 0
                        ? `${Math.round((dashboardData.performanceMetrics.successfulPublications / (dashboardData.performanceMetrics.successfulPublications + dashboardData.performanceMetrics.failedPublications)) * 100)}%`
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}