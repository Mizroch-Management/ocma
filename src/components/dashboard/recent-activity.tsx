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
  const activities: ActivityItem[] = [
    {
      id: "1",
      type: "published",
      title: "Instagram carousel published",
      description: "5 slides about product features went live",
      timestamp: "2 hours ago",
      user: { name: "Sarah Johnson", initials: "SJ" },
      platform: "Instagram",
      status: "success"
    },
    {
      id: "2",
      type: "scheduled",
      title: "LinkedIn article scheduled",
      description: "Industry insights post set for tomorrow 9 AM",
      timestamp: "4 hours ago",
      user: { name: "Mike Chen", initials: "MC" },
      platform: "LinkedIn",
      status: "pending"
    },
    {
      id: "3",
      type: "generated",
      title: "AI visual created",
      description: "New hero image generated for blog post",
      timestamp: "6 hours ago",
      user: { name: "Emma Davis", initials: "ED" },
      status: "success"
    },
    {
      id: "4",
      type: "draft",
      title: "Draft awaiting approval",
      description: "Twitter thread about company culture needs review",
      timestamp: "8 hours ago",
      user: { name: "John Doe", initials: "JD" },
      platform: "Twitter",
      status: "warning"
    },
    {
      id: "5",
      type: "team",
      title: "New team member added",
      description: "Alex Rodriguez joined as Content Creator",
      timestamp: "1 day ago",
      user: { name: "Admin", initials: "AD" }
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} item={activity} />
        ))}
      </CardContent>
    </Card>
  );
}