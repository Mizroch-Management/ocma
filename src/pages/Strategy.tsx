import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  Target, 
  TrendingUp, 
  Calendar, 
  Users, 
  Eye,
  Edit3,
  Trash2,
  Download,
  Plus,
  BarChart3,
  CheckCircle,
  Clock,
  AlertCircle,
  Lightbulb,
  Zap
} from "lucide-react";

export default function Strategy() {
  const { toast } = useToast();
  
  const [strategies, setStrategies] = useState([
    {
      id: 1,
      name: "Q1 2024 Brand Awareness Campaign",
      description: "Comprehensive strategy focusing on increasing brand visibility across all digital channels",
      status: "Active",
      uploadDate: "2024-01-15",
      lastUpdated: "2024-01-20",
      fileType: "PDF",
      fileSize: "2.4 MB",
      tags: ["Brand Awareness", "Digital Marketing", "Q1"],
      objectives: [
        "Increase brand awareness by 40%",
        "Grow social media following by 25%",
        "Improve engagement rates by 30%"
      ],
      targetAudience: "Millennials and Gen Z professionals",
      budget: "$50,000",
      timeline: "3 months",
      kpis: ["Brand recall", "Social media followers", "Engagement rate", "Website traffic"],
      contentPillars: ["Educational", "Behind-the-scenes", "User-generated content", "Industry insights"],
      generatedContent: 24,
      approvedContent: 18,
      publishedContent: 12
    },
    {
      id: 2,
      name: "Product Launch Strategy",
      description: "Strategic approach for launching our new product line with coordinated messaging",
      status: "Draft",
      uploadDate: "2024-01-10",
      lastUpdated: "2024-01-18",
      fileType: "DOCX",
      fileSize: "1.8 MB",
      tags: ["Product Launch", "Messaging", "Coordination"],
      objectives: [
        "Generate 1000 pre-orders",
        "Create buzz and anticipation",
        "Establish product positioning"
      ],
      targetAudience: "Early adopters and tech enthusiasts",
      budget: "$75,000",
      timeline: "6 months",
      kpis: ["Pre-orders", "Media mentions", "Social media reach", "Email signups"],
      contentPillars: ["Product features", "Benefits", "Customer testimonials", "Expert reviews"],
      generatedContent: 8,
      approvedContent: 5,
      publishedContent: 0
    },
    {
      id: 3,
      name: "Holiday Season Marketing",
      description: "Seasonal marketing strategy for maximizing sales during holiday period",
      status: "Completed",
      uploadDate: "2023-10-15",
      lastUpdated: "2023-12-31",
      fileType: "PDF",
      fileSize: "3.1 MB",
      tags: ["Seasonal", "Sales", "Holiday"],
      objectives: [
        "Increase holiday sales by 60%",
        "Drive traffic to retail locations",
        "Boost online conversions"
      ],
      targetAudience: "General consumers and gift shoppers",
      budget: "$100,000",
      timeline: "4 months",
      kpis: ["Sales revenue", "Store traffic", "Online conversions", "ROI"],
      contentPillars: ["Gift guides", "Promotions", "Festive content", "Customer stories"],
      generatedContent: 45,
      approvedContent: 42,
      publishedContent: 40
    }
  ]);

  const [isUploading, setIsUploading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [newStrategy, setNewStrategy] = useState({
    name: "",
    description: "",
    objectives: [""],
    targetAudience: "",
    budget: "",
    timeline: "",
    contentPillars: [""]
  });

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // Simulate file upload and analysis
    setTimeout(() => {
      const newStrategyFromFile = {
        id: strategies.length + 1,
        name: file.name.replace(/\.[^/.]+$/, ""),
        description: "Automatically extracted strategy description from uploaded file",
        status: "Draft",
        uploadDate: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0],
        fileType: file.name.split('.').pop()?.toUpperCase() || "FILE",
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        tags: ["Uploaded", "Analysis Pending"],
        objectives: ["Analysis in progress..."],
        targetAudience: "To be determined",
        budget: "Not specified",
        timeline: "To be determined",
        kpis: [],
        contentPillars: [],
        generatedContent: 0,
        approvedContent: 0,
        publishedContent: 0
      };
      
      setStrategies(prev => [newStrategyFromFile, ...prev]);
      setIsUploading(false);
      
      toast({
        title: "Strategy Uploaded",
        description: "Your strategy document has been uploaded and is being analyzed.",
      });
    }, 2000);
  };

  const addObjective = () => {
    setNewStrategy(prev => ({
      ...prev,
      objectives: [...prev.objectives, ""]
    }));
  };

  const addContentPillar = () => {
    setNewStrategy(prev => ({
      ...prev,
      contentPillars: [...prev.contentPillars, ""]
    }));
  };

  const updateObjective = (index, value) => {
    setNewStrategy(prev => ({
      ...prev,
      objectives: prev.objectives.map((obj, i) => i === index ? value : obj)
    }));
  };

  const updateContentPillar = (index, value) => {
    setNewStrategy(prev => ({
      ...prev,
      contentPillars: prev.contentPillars.map((pillar, i) => i === index ? value : pillar)
    }));
  };

  const generateContent = (strategyId) => {
    toast({
      title: "Content Generation Started",
      description: "AI is analyzing your strategy and generating aligned content...",
    });
    
    // Simulate content generation
    setTimeout(() => {
      setStrategies(prev => 
        prev.map(strategy => 
          strategy.id === strategyId 
            ? { ...strategy, generatedContent: strategy.generatedContent + 5 }
            : strategy
        )
      );
      
      toast({
        title: "Content Generated",
        description: "5 new content pieces have been generated based on your strategy.",
      });
    }, 3000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active": return "default";
      case "Draft": return "secondary";
      case "Completed": return "outline";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Active": return CheckCircle;
      case "Draft": return Clock;
      case "Completed": return CheckCircle;
      default: return AlertCircle;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Strategy Management</h1>
          <p className="text-muted-foreground mt-2">
            Upload, analyze, and manage marketing strategies to generate aligned content.
          </p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            <Button disabled={isUploading} className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {isUploading ? "Uploading..." : "Upload Strategy"}
            </Button>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Strategy</DialogTitle>
                <DialogDescription>
                  Define your marketing strategy parameters to guide content generation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label>Strategy Name</Label>
                  <Input
                    value={newStrategy.name}
                    onChange={(e) => setNewStrategy(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter strategy name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newStrategy.description}
                    onChange={(e) => setNewStrategy(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your marketing strategy"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-3">
                  <Label>Objectives</Label>
                  {newStrategy.objectives.map((objective, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={objective}
                        onChange={(e) => updateObjective(index, e.target.value)}
                        placeholder={`Objective ${index + 1}`}
                      />
                      {index === newStrategy.objectives.length - 1 && (
                        <Button type="button" variant="outline" onClick={addObjective}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Input
                      value={newStrategy.targetAudience}
                      onChange={(e) => setNewStrategy(prev => ({ ...prev, targetAudience: e.target.value }))}
                      placeholder="Define your target audience"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Budget</Label>
                    <Input
                      value={newStrategy.budget}
                      onChange={(e) => setNewStrategy(prev => ({ ...prev, budget: e.target.value }))}
                      placeholder="e.g., $50,000"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Timeline</Label>
                  <Select value={newStrategy.timeline} onValueChange={(value) => setNewStrategy(prev => ({ ...prev, timeline: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 month">1 Month</SelectItem>
                      <SelectItem value="3 months">3 Months</SelectItem>
                      <SelectItem value="6 months">6 Months</SelectItem>
                      <SelectItem value="1 year">1 Year</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label>Content Pillars</Label>
                  {newStrategy.contentPillars.map((pillar, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={pillar}
                        onChange={(e) => updateContentPillar(index, e.target.value)}
                        placeholder={`Content pillar ${index + 1}`}
                      />
                      {index === newStrategy.contentPillars.length - 1 && (
                        <Button type="button" variant="outline" onClick={addContentPillar}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1">Create Strategy</Button>
                  <Button variant="outline" className="flex-1">Save as Draft</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isUploading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-primary animate-pulse" />
                <span className="font-medium">Analyzing strategy document...</span>
              </div>
              <Progress value={65} className="w-full" />
              <p className="text-sm text-muted-foreground">
                Extracting objectives, target audience, and key metrics from your document.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {strategies.map((strategy) => {
          const StatusIcon = getStatusIcon(strategy.status);
          return (
            <Card key={strategy.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">{strategy.name}</CardTitle>
                      <Badge variant={getStatusColor(strategy.status)} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {strategy.status}
                      </Badge>
                    </div>
                    <CardDescription className="max-w-2xl">
                      {strategy.description}
                    </CardDescription>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {strategy.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{strategy.name}</DialogTitle>
                          <DialogDescription>{strategy.description}</DialogDescription>
                        </DialogHeader>
                        
                        <Tabs defaultValue="overview" className="w-full">
                          <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="content">Content</TabsTrigger>
                            <TabsTrigger value="performance">Performance</TabsTrigger>
                            <TabsTrigger value="analysis">Analysis</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="overview" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="font-medium">Target Audience</Label>
                                <p className="text-sm text-muted-foreground">{strategy.targetAudience}</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="font-medium">Budget</Label>
                                <p className="text-sm text-muted-foreground">{strategy.budget}</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="font-medium">Timeline</Label>
                                <p className="text-sm text-muted-foreground">{strategy.timeline}</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="font-medium">File Info</Label>
                                <p className="text-sm text-muted-foreground">{strategy.fileType} • {strategy.fileSize}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <Label className="font-medium">Objectives</Label>
                              <ul className="space-y-1">
                                {strategy.objectives.map((objective, index) => (
                                  <li key={index} className="flex items-center gap-2 text-sm">
                                    <Target className="h-4 w-4 text-primary" />
                                    {objective}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="space-y-3">
                              <Label className="font-medium">Content Pillars</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {strategy.contentPillars.map((pillar, index) => (
                                  <Badge key={index} variant="secondary" className="justify-center">
                                    {pillar}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <Label className="font-medium">Key Performance Indicators</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {strategy.kpis.map((kpi, index) => (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <BarChart3 className="h-4 w-4 text-primary" />
                                    {kpi}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="content" className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <Card>
                                <CardContent className="p-4 text-center">
                                  <div className="text-2xl font-bold text-primary">{strategy.generatedContent}</div>
                                  <p className="text-sm text-muted-foreground">Generated</p>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="p-4 text-center">
                                  <div className="text-2xl font-bold text-orange-500">{strategy.approvedContent}</div>
                                  <p className="text-sm text-muted-foreground">Approved</p>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="p-4 text-center">
                                  <div className="text-2xl font-bold text-green-500">{strategy.publishedContent}</div>
                                  <p className="text-sm text-muted-foreground">Published</p>
                                </CardContent>
                              </Card>
                            </div>
                            
                            <Button 
                              onClick={() => generateContent(strategy.id)} 
                              className="w-full flex items-center gap-2"
                            >
                              <Zap className="h-4 w-4" />
                              Generate New Content from Strategy
                            </Button>
                          </TabsContent>
                          
                          <TabsContent value="performance" className="space-y-4">
                            <p className="text-muted-foreground">Performance metrics and analytics will be displayed here once content is published.</p>
                          </TabsContent>
                          
                          <TabsContent value="analysis" className="space-y-4">
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <Lightbulb className="h-5 w-5 text-primary" />
                                <h4 className="font-medium">AI Strategy Analysis</h4>
                              </div>
                              <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm">
                                  This strategy shows strong alignment with current market trends. 
                                  The target audience is well-defined and the objectives are measurable. 
                                  Consider increasing focus on video content and user-generated content 
                                  to improve engagement rates.
                                </p>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </DialogContent>
                    </Dialog>
                    
                    <Button variant="ghost" size="sm">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created: {strategy.uploadDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Updated: {strategy.lastUpdated}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{strategy.fileType} • {strategy.fileSize}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{strategy.generatedContent} content pieces</span>
                  </div>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => generateContent(strategy.id)}
                    className="flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Generate Content
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}