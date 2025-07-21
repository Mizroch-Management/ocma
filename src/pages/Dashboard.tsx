import { MetricsCards } from "@/components/dashboard/metrics-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";

export default function Dashboard() {
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
      <MetricsCards />

      {/* Quick Actions */}
      <QuickActions />

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div className="space-y-6">
          {/* Upcoming Posts */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Upcoming Posts</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-primary-light rounded-lg">
                <div>
                  <p className="text-sm font-medium">LinkedIn Article</p>
                  <p className="text-xs text-muted-foreground">Tomorrow, 9:00 AM</p>
                </div>
                <span className="w-2 h-2 bg-primary rounded-full"></span>
              </div>
              <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                <div>
                  <p className="text-sm font-medium">Instagram Story</p>
                  <p className="text-xs text-muted-foreground">Today, 6:00 PM</p>
                </div>
                <span className="w-2 h-2 bg-warning rounded-full"></span>
              </div>
              <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                <div>
                  <p className="text-sm font-medium">Twitter Thread</p>
                  <p className="text-xs text-muted-foreground">Friday, 11:00 AM</p>
                </div>
                <span className="w-2 h-2 bg-muted rounded-full"></span>
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">This Week's Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Engagement Rate</span>
                <span className="text-sm font-medium text-success">+2.3%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Reach</span>
                <span className="text-sm font-medium text-primary">45.2K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Clicks</span>
                <span className="text-sm font-medium text-primary">1,247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Shares</span>
                <span className="text-sm font-medium text-success">+15%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}