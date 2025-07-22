import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Users, DollarSign, Eye, Heart, MessageSquare, Target, Calendar, Download } from "lucide-react";

const chartConfig = {
  visitors: { label: "Visitors", color: "hsl(var(--primary))" },
  engagement: { label: "Engagement", color: "hsl(var(--secondary))" },
  conversions: { label: "Conversions", color: "hsl(var(--accent))" },
  revenue: { label: "Revenue", color: "hsl(var(--muted))" },
};

const performanceData = [
  { month: "Jan", visitors: 0, engagement: 0, conversions: 0, revenue: 0 },
  { month: "Feb", visitors: 0, engagement: 0, conversions: 0, revenue: 0 },
  { month: "Mar", visitors: 0, engagement: 0, conversions: 0, revenue: 0 },
  { month: "Apr", visitors: 0, engagement: 0, conversions: 0, revenue: 0 },
  { month: "May", visitors: 0, engagement: 0, conversions: 0, revenue: 0 },
  { month: "Jun", visitors: 0, engagement: 0, conversions: 0, revenue: 0 },
];

const platformData = [
  { name: "Instagram", value: 0, color: "hsl(var(--primary))" },
  { name: "Twitter", value: 0, color: "hsl(var(--secondary))" },
  { name: "LinkedIn", value: 0, color: "hsl(var(--accent))" },
  { name: "Facebook", value: 0, color: "hsl(var(--muted))" },
  { name: "TikTok", value: 0, color: "hsl(var(--destructive))" },
];

// This would typically come from a shared state or API - connected to Strategy page metrics
const getPerformanceTargets = () => {
  // In a real app, this would fetch from the Strategy page's performance metrics
  return [
    { metric: "Monthly Visitors", current: 0, target: 30000, unit: "", type: "commercial", 
      breakdown: { daily: 0, weekly: 0, monthly: 0 },
      platforms: { Instagram: 0, LinkedIn: 0, Twitter: 0, Facebook: 0, TikTok: 0 }
    },
    { metric: "Paying Customers", current: 0, target: 300, unit: "", type: "commercial",
      breakdown: { daily: 0, weekly: 0, monthly: 0 },
      platforms: { Instagram: 0, LinkedIn: 0, Twitter: 0, Facebook: 0, TikTok: 0 }
    },
    { metric: "Cost per Lead", current: 0, target: 12.00, unit: "$", type: "commercial",
      breakdown: { daily: 0, weekly: 0, monthly: 0 },
      platforms: { Instagram: 0, LinkedIn: 0, Twitter: 0, Facebook: 0, TikTok: 0 }
    },
    { metric: "Cost per Visitor", current: 0, target: 1.80, unit: "$", type: "commercial",
      breakdown: { daily: 0, weekly: 0, monthly: 0 },
      platforms: { Instagram: 0, LinkedIn: 0, Twitter: 0, Facebook: 0, TikTok: 0 }
    },
    { metric: "Customer Acquisition Cost", current: 0, target: 100, unit: "$", type: "commercial",
      breakdown: { daily: 0, weekly: 0, monthly: 0 },
      platforms: { Instagram: 0, LinkedIn: 0, Twitter: 0, Facebook: 0, TikTok: 0 }
    },
    { metric: "Monthly Reach", current: 0, target: 200000, unit: "", type: "marketing",
      breakdown: { daily: 0, weekly: 0, monthly: 0 },
      platforms: { Instagram: 0, LinkedIn: 0, Twitter: 0, Facebook: 0, TikTok: 0 }
    },
    { metric: "Engagement Rate", current: 0, target: 8.0, unit: "%", type: "marketing",
      breakdown: { daily: 0, weekly: 0, monthly: 0 },
      platforms: { Instagram: 0, LinkedIn: 0, Twitter: 0, Facebook: 0, TikTok: 0 }
    },
    { metric: "Content Views", current: 0, target: 120000, unit: "", type: "marketing",
      breakdown: { daily: 0, weekly: 0, monthly: 0 },
      platforms: { Instagram: 0, LinkedIn: 0, Twitter: 0, Facebook: 0, TikTok: 0 }
    },
    { metric: "Lead Generation", current: 0, target: 2000, unit: "", type: "marketing",
      breakdown: { daily: 0, weekly: 0, monthly: 0 },
      platforms: { Instagram: 0, LinkedIn: 0, Twitter: 0, Facebook: 0, TikTok: 0 }
    },
    { metric: "Social Media Followers", current: 0, target: 15000, unit: "", type: "marketing",
      breakdown: { daily: 0, weekly: 0, monthly: 0 },
      platforms: { Instagram: 0, LinkedIn: 0, Twitter: 0, Facebook: 0, TikTok: 0 }
    },
  ];
};

const kpiTargets = getPerformanceTargets();

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("6months");
  const [activeTab, setActiveTab] = useState("overview");

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (current: number, target: number) => {
    const percentage = (current / target) * 100;
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track performance, engagement, and optimize your content strategy.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance vs Targets</TabsTrigger>
          <TabsTrigger value="content">Content Analytics</TabsTrigger>
          <TabsTrigger value="audience">Audience Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-muted-foreground flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +0%
                  </span>
                  from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-muted-foreground flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +0%
                  </span>
                  from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0%</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-muted-foreground flex items-center">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    +0%
                  </span>
                  from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversions</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-muted-foreground flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +0%
                  </span>
                  from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Track your key metrics over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="visitors" 
                      stroke="var(--color-visitors)" 
                      strokeWidth={2}
                      dot={{ fill: "var(--color-visitors)" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="conversions" 
                      stroke="var(--color-conversions)" 
                      strokeWidth={2}
                      dot={{ fill: "var(--color-conversions)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Platform Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Traffic by Platform</CardTitle>
              <CardDescription>Distribution of visitors across social media platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Commercial Targets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Commercial Targets
                </CardTitle>
                <CardDescription>Track revenue and cost metrics against targets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {kpiTargets.filter(kpi => kpi.type === "commercial").map((kpi, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{kpi.metric}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {kpi.unit}{typeof kpi.current === 'number' ? formatNumber(kpi.current) : kpi.current}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {kpi.unit}{typeof kpi.target === 'number' ? formatNumber(kpi.target) : kpi.target}
                        </span>
                        <Badge variant={getProgressPercentage(kpi.current, kpi.target) >= 90 ? "default" : "secondary"}>
                          {Math.round(getProgressPercentage(kpi.current, kpi.target))}%
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={getProgressPercentage(kpi.current, kpi.target)} 
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Marketing Targets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Marketing Targets
                </CardTitle>
                <CardDescription>Track reach, engagement and growth metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {kpiTargets.filter(kpi => kpi.type === "marketing").map((kpi, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{kpi.metric}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {typeof kpi.current === 'number' ? formatNumber(kpi.current) : kpi.current}{kpi.unit}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {typeof kpi.target === 'number' ? formatNumber(kpi.target) : kpi.target}{kpi.unit}
                        </span>
                        <Badge variant={getProgressPercentage(kpi.current, kpi.target) >= 90 ? "default" : "secondary"}>
                          {Math.round(getProgressPercentage(kpi.current, kpi.target))}%
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={getProgressPercentage(kpi.current, kpi.target)} 
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Target vs Actual Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Targets vs Actual Performance</CardTitle>
              <CardDescription>Monthly comparison of key metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="visitors" fill="var(--color-visitors)" name="Visitors" />
                    <Bar dataKey="conversions" fill="var(--color-conversions)" name="Conversions" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* AI-Powered Breakdown Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Time Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Time Breakdown Analysis
                </CardTitle>
                <CardDescription>AI-generated time-based target breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {kpiTargets.slice(0, 3).map((kpi, index) => (
                  <div key={index} className="space-y-2">
                    <div className="text-sm font-medium">{kpi.metric}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Daily</span>
                        <span>{kpi.unit}{formatNumber(kpi.breakdown.daily)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Weekly</span>
                        <span>{kpi.unit}{formatNumber(kpi.breakdown.weekly)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly</span>
                        <span>{kpi.unit}{formatNumber(kpi.breakdown.monthly)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Platform Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Platform Performance
                </CardTitle>
                <CardDescription>Performance breakdown by social platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(kpiTargets[0].platforms).map(([platform, value]) => (
                  <div key={platform} className="flex items-center justify-between">
                    <span className="text-sm">{platform}</span>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(value / kpiTargets[0].current) * 100} 
                        className="w-16 h-2" 
                      />
                      <span className="text-xs w-12 text-right">{formatNumber(value)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Audience Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Target Audience Analysis
                </CardTitle>
                <CardDescription>AI recommendations for audience targeting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Recommended Focus</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Millennials (25-35)</span>
                      <span className="text-primary font-medium">40%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Gen Z (18-24)</span>
                      <span className="text-secondary font-medium">35%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Gen X (36-50)</span>
                      <span className="text-muted-foreground">20%</span>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    AI suggests focusing 75% of efforts on Millennials and Gen Z for optimal ROI
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Performance</CardTitle>
                <CardDescription>Engagement metrics for your content</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="engagement" 
                        stroke="var(--color-engagement)" 
                        fill="var(--color-engagement)" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Content</CardTitle>
                <CardDescription>Your most engaging posts this month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { title: "AI Tools for Content Creation", engagement: 1250, platform: "LinkedIn" },
                  { title: "Social Media Strategy Tips", engagement: 980, platform: "Instagram" },
                  { title: "Marketing Automation Guide", engagement: 750, platform: "Twitter" },
                  { title: "Content Calendar Template", engagement: 620, platform: "Facebook" },
                ].map((content, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">{content.title}</p>
                      <p className="text-sm text-muted-foreground">{content.platform}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{content.engagement}</p>
                      <p className="text-xs text-muted-foreground">engagements</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audience" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Audience Growth</CardTitle>
                <CardDescription>Follower growth across platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="visitors" 
                        stroke="var(--color-visitors)" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Demographics</CardTitle>
                <CardDescription>Audience age distribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { age: "18-24", percentage: 25 },
                  { age: "25-34", percentage: 40 },
                  { age: "35-44", percentage: 20 },
                  { age: "45-54", percentage: 10 },
                  { age: "55+", percentage: 5 },
                ].map((demo, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{demo.age}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={demo.percentage} className="w-20 h-2" />
                      <span className="text-xs w-8">{demo.percentage}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Locations</CardTitle>
                <CardDescription>Where your audience is located</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { country: "United States", percentage: 45 },
                  { country: "United Kingdom", percentage: 15 },
                  { country: "Canada", percentage: 12 },
                  { country: "Australia", percentage: 8 },
                  { country: "Germany", percentage: 6 },
                ].map((location, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{location.country}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={location.percentage} className="w-20 h-2" />
                      <span className="text-xs w-8">{location.percentage}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}