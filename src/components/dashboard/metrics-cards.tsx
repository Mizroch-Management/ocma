import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricsCardSkeleton } from "@/components/ui/loading-states";
import { 
  FileText, 
  Calendar, 
  Edit3, 
  Share2, 
  TrendingUp, 
  TrendingDown,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease" | "neutral";
  };
  icon: React.ReactNode;
  description?: string;
}

const MetricCard = memo(function MetricCard({ title, value, change, icon, description }: MetricCardProps) {
  const getTrendIcon = () => {
    if (!change) return null;
    
    switch (change.type) {
      case "increase":
        return <TrendingUp className="h-3 w-3 text-success" />;
      case "decrease":
        return <TrendingDown className="h-3 w-3 text-destructive" />;
      case "neutral":
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getChangeColor = () => {
    if (!change) return "";
    
    switch (change.type) {
      case "increase":
        return "text-success";
      case "decrease":
        return "text-destructive";
      case "neutral":
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-medium">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {change && (
          <div className="flex items-center space-x-1 mt-1">
            {getTrendIcon()}
            <span className={cn("text-xs font-medium", getChangeColor())}>
              {change.value > 0 ? "+" : ""}{change.value}%
            </span>
            {description && (
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

interface MetricsCardsProps {
  data?: {
    totalContent: number;
    scheduledContent: number;
    draftContent: number;
    publishedContent: number;
    performanceMetrics: {
      successfulPublications: number;
      failedPublications: number;
    };
  };
  isLoading?: boolean;
}

const MetricsCards = memo(function MetricsCards({ data, isLoading = false }: MetricsCardsProps) {
  const metrics = useMemo(() => [
    {
      title: "Total Content",
      value: data?.totalContent || 0,
      change: { value: 0, type: "neutral" as const },
      icon: <FileText className="h-4 w-4" />,
      description: "pieces created"
    },
    {
      title: "Scheduled Content",
      value: data?.scheduledContent || 0,
      change: { value: 0, type: "neutral" as const },
      icon: <Calendar className="h-4 w-4" />,
      description: "ready to publish"
    },
    {
      title: "Draft Content",
      value: data?.draftContent || 0,
      change: { value: 0, type: "neutral" as const },
      icon: <Edit3 className="h-4 w-4" />,
      description: "in progress"
    },
    {
      title: "Published Content",
      value: data?.publishedContent || 0,
      change: { value: 0, type: "neutral" as const },
      icon: <Share2 className="h-4 w-4" />,
      description: "successfully published"
    }
  ], [data]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <MetricsCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
});

export { MetricsCards };