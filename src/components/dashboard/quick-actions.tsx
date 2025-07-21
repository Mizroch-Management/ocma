import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Calendar, 
  Image, 
  Target, 
  BarChart3, 
  Zap,
  ArrowRight 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  variant?: "default" | "primary";
}

function QuickActionCard({ title, description, icon, href, variant = "default" }: QuickActionProps) {
  const navigate = useNavigate();

  return (
    <Card 
      className="group cursor-pointer transition-all duration-200 hover:shadow-medium hover:scale-[1.02]"
      onClick={() => navigate(href)}
    >
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-lg ${
            variant === "primary" 
              ? "bg-gradient-primary text-primary-foreground" 
              : "bg-primary-light text-primary"
          }`}>
            {icon}
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

export function QuickActions() {
  const actions = [
    {
      title: "Create New Post",
      description: "Start crafting your next social media post",
      icon: <Plus className="h-5 w-5" />,
      href: "/drafts/new",
      variant: "primary" as const
    },
    {
      title: "Schedule Content",
      description: "Plan and schedule posts across platforms",
      icon: <Calendar className="h-5 w-5" />,
      href: "/calendar"
    },
    {
      title: "Generate Visual",
      description: "Create AI-powered images and graphics",
      icon: <Image className="h-5 w-5" />,
      href: "/visual-creator"
    },
    {
      title: "Upload Strategy",
      description: "Import marketing strategy for content generation",
      icon: <Target className="h-5 w-5" />,
      href: "/strategy"
    },
    {
      title: "View Analytics",
      description: "Analyze performance and engagement metrics",
      icon: <BarChart3 className="h-5 w-5" />,
      href: "/analytics"
    },
    {
      title: "AI Content Ideas",
      description: "Get personalized content suggestions",
      icon: <Zap className="h-5 w-5" />,
      href: "/ai-suggestions"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        <Button variant="ghost" size="sm">
          View All
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {actions.map((action, index) => (
          <QuickActionCard key={index} {...action} />
        ))}
      </div>
    </div>
  );
}