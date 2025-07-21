import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function MetricCard({ title, value, change, icon, description }: MetricCardProps) {
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
}

export function MetricsCards() {
  const metrics = [
    {
      title: "Total Posts",
      value: "2,847",
      change: { value: 12, type: "increase" as const },
      icon: <FileText className="h-4 w-4" />,
      description: "from last month"
    },
    {
      title: "Scheduled Content",
      value: "156",
      change: { value: 8, type: "increase" as const },
      icon: <Calendar className="h-4 w-4" />,
      description: "next 30 days"
    },
    {
      title: "Draft Count",
      value: "43",
      change: { value: -5, type: "decrease" as const },
      icon: <Edit3 className="h-4 w-4" />,
      description: "pending approval"
    },
    {
      title: "Platform Connections",
      value: "8/10",
      change: { value: 0, type: "neutral" as const },
      icon: <Share2 className="h-4 w-4" />,
      description: "platforms active"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
}