import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Calendar,
  Image as ImageIcon,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useOrganization } from "@/hooks/use-organization";

interface ActivityItem {
  id: string;
  type: "scheduled" | "published" | "draft" | "team" | "generated";
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string;
    initials: string;
  };
  platform?: string;
  status?: "success" | "pending" | "warning";
}

function ActivityIcon({ type, status }: { type: ActivityItem["type"]; status?: ActivityItem["status"] }) {
  const getIcon = () => {
    switch (type) {
      case "scheduled":
        return <Calendar className="h-4 w-4" />;
      case "published":
        return <CheckCircle className="h-4 w-4" />;
      case "draft":
        return <Clock className="h-4 w-4" />;
      case "team":
        return <Users className="h-4 w-4" />;
      case "generated":
        return <ImageIcon className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "text-success";
      case "warning":
        return "text-warning";
      case "pending":
        return "text-muted-foreground";
      default:
        return "text-primary";
    }
  };

  return (
    <div className={cn("flex items-center justify-center w-8 h-8 rounded-full bg-primary-light", getStatusColor())}>
      {getIcon()}
    </div>
  );
}

function ActivityItem({ item }: { item: ActivityItem }) {
  return (
    <div className="flex items-start space-x-3 py-3">
      <ActivityIcon type={item.type} status={item.status} />
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
          <span className="text-xs text-muted-foreground">{item.timestamp}</span>
        </div>
        <p className="text-sm text-muted-foreground">{item.description}</p>
        <div className="flex items-center space-x-2">
          {item.user && (
            <div className="flex items-center space-x-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={item.user.avatar} />
                <AvatarFallback className="text-xs">{item.user.initials}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{item.user.name}</span>
            </div>
          )}
          {item.platform && (
            <Badge variant="secondary" className="text-xs">
              {item.platform}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (currentOrganization) {
      loadRecentActivity();
    }
  }, [currentOrganization]);

  const loadRecentActivity = async () => {
    if (!currentOrganization) return;
    
    setIsLoading(true);
    try {
      // Load recent content activity for current organization
      const { data: contentData, error: contentError } = await supabase
        .from('generated_content')
        .select(`
          *,
          profiles!inner(
            full_name
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Load recent publication logs
      const { data: publicationData, error: publicationError } = await supabase
        .from('publication_logs')
        .select(`
          *,
          generated_content (
            title,
            profiles (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (contentError) {
        console.error('Error loading content activity:', contentError);
      }

      if (publicationError) {
        console.error('Error loading publication activity:', publicationError);
      }

      const recentActivities: ActivityItem[] = [];

      // Add content activities
      if (contentData) {
        contentData.forEach(content => {
          const userFullName = (content.profiles as any)?.full_name || 'Unknown User';
          const initials = userFullName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
          
          // Content creation activity
          recentActivities.push({
            id: `content-${content.id}`,
            type: "generated",
            title: content.title,
            description: `${content.content_type} content created`,
            timestamp: formatDistanceToNow(new Date(content.created_at), { addSuffix: true }),
            user: {
              name: userFullName,
              initials: initials
            },
            status: "success"
          });

          // Scheduling activity if scheduled
          if (content.is_scheduled) {
            recentActivities.push({
              id: `scheduled-${content.id}`,
              type: "scheduled",
              title: `${content.title} scheduled`,
              description: `Content scheduled for ${content.scheduled_platforms?.join(', ') || 'multiple platforms'}`,
              timestamp: formatDistanceToNow(new Date(content.updated_at), { addSuffix: true }),
              user: {
                name: userFullName,
                initials: initials
              },
              platform: content.scheduled_platforms?.[0] || 'Multiple',
              status: "pending"
            });
          }
        });
      }

      // Add publication activities
      if (publicationData) {
        publicationData.forEach(log => {
          const contentTitle = (log.generated_content as any)?.title || 'Unknown Content';
          const userFullName = (log.generated_content as any)?.profiles?.full_name || 'System';
          const initials = userFullName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
          
          recentActivities.push({
            id: `publication-${log.id}`,
            type: "published",
            title: `${contentTitle} ${log.status === 'success' ? 'published' : 'failed to publish'}`,
            description: log.status === 'success' 
              ? `Successfully published to ${log.platform}`
              : `Failed to publish to ${log.platform}: ${log.error_message || 'Unknown error'}`,
            timestamp: formatDistanceToNow(new Date(log.created_at), { addSuffix: true }),
            user: {
              name: userFullName,
              initials: initials
            },
            platform: log.platform,
            status: log.status === 'success' ? 'success' : log.status === 'failed' ? 'warning' : 'pending'
          });
        });
      }

      // Sort all activities by timestamp and take the 15 most recent
      const sortedActivities = recentActivities
        .sort((a, b) => {
          // Parse relative timestamps back to compare (this is approximate)
          const aMinutes = parseRelativeTime(a.timestamp);
          const bMinutes = parseRelativeTime(b.timestamp);
          return aMinutes - bMinutes;
        })
        .slice(0, 15);

      setActivities(sortedActivities);

    } catch (error) {
      console.error('Error loading recent activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to parse relative time strings for sorting
  const parseRelativeTime = (timeStr: string): number => {
    const matches = timeStr.match(/(\d+)\s*(second|minute|hour|day|week|month|year)/);
    if (!matches) return 0;
    
    const value = parseInt(matches[1]);
    const unit = matches[2];
    
    const multipliers = {
      second: 1/60,
      minute: 1,
      hour: 60,
      day: 60 * 24,
      week: 60 * 24 * 7,
      month: 60 * 24 * 30,
      year: 60 * 24 * 365
    };
    
    return value * (multipliers[unit as keyof typeof multipliers] || 1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            Loading recent activity...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No recent activity
          </div>
        ) : (
          activities.map((activity) => (
            <ActivityItem key={activity.id} item={activity} />
          ))
        )}
      </CardContent>
    </Card>
  );
}