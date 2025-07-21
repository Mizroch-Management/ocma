import { useState, useEffect } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkflow } from "@/contexts/workflow-context";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Globe, 
  Plus, 
  Edit, 
  Copy, 
  Trash2,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
  Hash,
  Target,
  Image,
  Type,
  MousePointer,
  BarChart3,
  Settings,
  Eye,
  Send,
  Sparkles
} from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { ContentPublishStatus } from "@/components/calendar/content-integration";

interface ContentPiece {
  id: string;
  title: string;
  content: string;
  platforms: string[];
  scheduledDate: Date;
  timezone: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  platformOptimizations: {
    [platform: string]: {
      content: string;
      hashtags: string[];
      visualType: string;
      cta: string;
      language: string;
    };
  };
  analytics?: {
    views: number;
    engagement: number;
    clicks: number;
  };
  isAIGenerated?: boolean;
}

const platforms = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-pink-500' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'bg-blue-500' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
  { id: 'tiktok', name: 'TikTok', icon: Hash, color: 'bg-black' },
];

const timezones = [
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'America/New_York', label: 'Eastern Time (GMT-5)' },
  { value: 'America/Chicago', label: 'Central Time (GMT-6)' },
  { value: 'America/Denver', label: 'Mountain Time (GMT-7)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (GMT-8)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (GMT+8)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+11)' },
];

const visualTypes = [
  'Single Image',
  'Carousel',
  'Video',
  'Story',
  'Reel',
  'Thumbnail',
  'Cover Photo'
];

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedContent, setSelectedContent] = useState<ContentPiece | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { state: workflowState } = useWorkflow();
  
  // Combine manual and AI-generated content
  const [manualContent, setManualContent] = useState<ContentPiece[]>([
    {
      id: '1',
      title: 'Summer Product Launch',
      content: 'Excited to announce our new summer collection! 🌞',
      platforms: ['instagram', 'twitter', 'facebook'],
      scheduledDate: new Date(2024, 11, 25, 10, 0),
      timezone: 'America/New_York',
      status: 'scheduled',
      platformOptimizations: {
        instagram: {
          content: 'Excited to announce our new summer collection! 🌞 Perfect for your summer adventures! #SummerVibes #NewCollection',
          hashtags: ['#SummerVibes', '#NewCollection', '#Fashion'],
          visualType: 'Carousel',
          cta: 'Shop Now',
          language: 'English'
        },
        twitter: {
          content: 'New summer collection is here! 🌞 Get ready for amazing summer adventures!',
          hashtags: ['#Summer2024', '#NewDrop'],
          visualType: 'Single Image',
          cta: 'Learn More',
          language: 'English'
        },
        facebook: {
          content: 'We\'re thrilled to introduce our brand new summer collection! Designed with comfort and style in mind for all your summer activities.',
          hashtags: ['#SummerCollection', '#ComfortableStyle'],
          visualType: 'Video',
          cta: 'Discover More',
          language: 'English'
        }
      }
    },
    {
      id: '2',
      title: 'Weekly Tips Tuesday',
      content: 'Here are 5 productivity tips to boost your workday!',
      platforms: ['linkedin', 'twitter'],
      scheduledDate: new Date(2024, 11, 26, 14, 30),
      timezone: 'UTC',
      status: 'scheduled',
      platformOptimizations: {
        linkedin: {
          content: 'Here are 5 evidence-based productivity tips that can transform your workday and help you achieve better work-life balance.',
          hashtags: ['#Productivity', '#WorkLife', '#ProfessionalDevelopment'],
          visualType: 'Single Image',
          cta: 'Read More',
          language: 'English'
        },
        twitter: {
          content: '5 productivity tips to boost your workday! 🚀 Thread below 👇',
          hashtags: ['#ProductivityTips', '#WorkSmart'],
          visualType: 'Single Image',
          cta: 'See Thread',
          language: 'English'
        }
      }
    }
  ]);

  // Merge AI workflow content with manual content
  const scheduledContent = [
    ...manualContent,
    ...workflowState.approvedContent.map(aiContent => ({
      ...aiContent,
      isAIGenerated: true,
    }))
  ];

  const [newContent, setNewContent] = useState<Partial<ContentPiece>>({
    title: '',
    content: '',
    platforms: [],
    scheduledDate: new Date(),
    timezone: 'UTC',
    status: 'draft',
    platformOptimizations: {}
  });

  const getContentForDate = (date: Date) => {
    return scheduledContent.filter(content => 
      isSameDay(content.scheduledDate, date)
    );
  };

  const handleCreateContent = () => {
    if (newContent.title && newContent.content && newContent.platforms?.length) {
      const content: ContentPiece = {
        id: Date.now().toString(),
        title: newContent.title,
        content: newContent.content,
        platforms: newContent.platforms,
        scheduledDate: newContent.scheduledDate || new Date(),
        timezone: newContent.timezone || 'UTC',
        status: 'scheduled',
        platformOptimizations: newContent.platformOptimizations || {},
        isAIGenerated: false,
      };
      
      setManualContent([...manualContent, content]);
      setNewContent({
        title: '',
        content: '',
        platforms: [],
        scheduledDate: new Date(),
        timezone: 'UTC',
        status: 'draft',
        platformOptimizations: {}
      });
      setIsCreateDialogOpen(false);
    }
  };

  const handlePlatformOptimization = (platform: string, field: string, value: any) => {
    setNewContent(prev => ({
      ...prev,
      platformOptimizations: {
        ...prev.platformOptimizations,
        [platform]: {
          ...prev.platformOptimizations?.[platform],
          [field]: value
        }
      }
    }));
  };

  const renderCalendarDay = (date: Date) => {
    const dayContent = getContentForDate(date);
    const isSelected = isSameDay(date, selectedDate);
    const isCurrentMonth = isSameMonth(date, selectedDate);
    
    return (
      <div
        key={date.toISOString()}
        className={cn(
          "min-h-[100px] p-2 border border-border cursor-pointer hover:bg-muted/50 transition-colors",
          isSelected && "bg-primary/10 border-primary",
          !isCurrentMonth && "opacity-50"
        )}
        onClick={() => setSelectedDate(date)}
      >
        <div className="text-sm font-medium mb-1">
          {format(date, 'd')}
        </div>
        <div className="space-y-1">
          {dayContent.slice(0, 3).map(content => {
            const platform = platforms.find(p => content.platforms.includes(p.id));
            return (
              <div
                key={content.id}
                className={cn(
                  "text-xs p-1 rounded cursor-pointer hover:opacity-80",
                  content.isAIGenerated 
                    ? "bg-purple-100 text-purple-700 border border-purple-200" 
                    : "bg-primary/20 text-primary"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedContent(content);
                  setIsEditDialogOpen(true);
                }}
              >
                <div className="flex items-center gap-1">
                  {content.isAIGenerated && <Sparkles className="h-3 w-3" />}
                  {platform && <platform.icon className="h-3 w-3" />}
                  <span className="truncate">{content.title}</span>
                </div>
              </div>
            );
          })}
          {dayContent.length > 3 && (
            <div className="text-xs text-muted-foreground">
              +{dayContent.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const days = eachDayOfInterval({ start, end });
    
    // Pad with previous/next month days to fill the grid
    const startWeekDay = start.getDay();
    const endWeekDay = end.getDay();
    
    const paddedDays = [
      ...Array.from({ length: startWeekDay }, (_, i) => addDays(start, -startWeekDay + i)),
      ...days,
      ...Array.from({ length: 6 - endWeekDay }, (_, i) => addDays(end, i + 1))
    ];

    return (
      <div className="grid grid-cols-7 gap-0 border border-border rounded-lg overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-3 bg-muted font-semibold text-center border-b border-border">
            {day}
          </div>
        ))}
        {paddedDays.map(day => renderCalendarDay(day))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Content Calendar</h1>
          <p className="text-muted-foreground mt-2">
            Schedule and manage your content across all platforms with timezone optimization.
          </p>
          {workflowState.approvedContent.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-purple-700">
                {workflowState.approvedContent.length} AI-generated content pieces integrated
              </span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Content
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Schedule New Content</DialogTitle>
                <DialogDescription>
                  Create and optimize content for multiple platforms with timezone management.
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="h-[70vh] pr-4">
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Content Title</Label>
                      <Input
                        id="title"
                        value={newContent.title || ''}
                        onChange={(e) => setNewContent(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter content title..."
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="content">Base Content</Label>
                      <Textarea
                        id="content"
                        value={newContent.content || ''}
                        onChange={(e) => setNewContent(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Enter your content..."
                        rows={4}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Scheduling */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Scheduled Date & Time</Label>
                      <Input
                        type="datetime-local"
                        value={newContent.scheduledDate ? format(newContent.scheduledDate, "yyyy-MM-dd'T'HH:mm") : ''}
                        onChange={(e) => setNewContent(prev => ({ ...prev, scheduledDate: new Date(e.target.value) }))}
                      />
                    </div>
                    
                    <div>
                      <Label>Timezone</Label>
                      <Select value={newContent.timezone} onValueChange={(value) => setNewContent(prev => ({ ...prev, timezone: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {timezones.map(tz => (
                            <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  {/* Platform Selection */}
                  <div>
                    <Label className="text-base font-semibold">Target Platforms</Label>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      {platforms.map(platform => {
                        const isSelected = newContent.platforms?.includes(platform.id);
                        return (
                          <Card
                            key={platform.id}
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-md",
                              isSelected && "ring-2 ring-primary"
                            )}
                            onClick={() => {
                              const currentPlatforms = newContent.platforms || [];
                              const newPlatforms = isSelected
                                ? currentPlatforms.filter(p => p !== platform.id)
                                : [...currentPlatforms, platform.id];
                              setNewContent(prev => ({ ...prev, platforms: newPlatforms }));
                            }}
                          >
                            <CardContent className="p-4 text-center">
                              <platform.icon className="h-8 w-8 mx-auto mb-2" />
                              <p className="text-sm font-medium">{platform.name}</p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Platform Optimizations */}
                  {newContent.platforms && newContent.platforms.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-base font-semibold">Platform Optimizations</Label>
                        <p className="text-sm text-muted-foreground mb-4">
                          Customize content, visuals, and CTAs for each platform.
                        </p>
                        
                        <Tabs defaultValue={newContent.platforms[0]} className="w-full">
                          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${newContent.platforms.length}, 1fr)` }}>
                            {newContent.platforms.map(platformId => {
                              const platform = platforms.find(p => p.id === platformId);
                              return (
                                <TabsTrigger key={platformId} value={platformId}>
                                  {platform && <platform.icon className="h-4 w-4 mr-2" />}
                                  {platform?.name}
                                </TabsTrigger>
                              );
                            })}
                          </TabsList>
                          
                          {newContent.platforms.map(platformId => {
                            const platform = platforms.find(p => p.id === platformId);
                            const optimization = newContent.platformOptimizations?.[platformId] || {};
                            
                            return (
                              <TabsContent key={platformId} value={platformId} className="space-y-4">
                                <div>
                                   <Label>
                                     <Type className="h-4 w-4 inline mr-2" />
                                     Optimized Content for {platform?.name}
                                   </Label>
                                   <Textarea
                                     value={(optimization as any)?.content || newContent.content || ''}
                                     onChange={(e) => handlePlatformOptimization(platformId, 'content', e.target.value)}
                                     placeholder={`Optimize your content for ${platform?.name}...`}
                                     rows={3}
                                   />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>
                                      <Image className="h-4 w-4 inline mr-2" />
                                      Visual Type
                                    </Label>
                                    <Select value={(optimization as any)?.visualType} onValueChange={(value) => handlePlatformOptimization(platformId, 'visualType', value)}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select visual type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {visualTypes.map(type => (
                                          <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div>
                                    <Label>
                                      <MousePointer className="h-4 w-4 inline mr-2" />
                                      Call-to-Action
                                    </Label>
                                     <Input
                                       value={(optimization as any)?.cta || ''}
                                       onChange={(e) => handlePlatformOptimization(platformId, 'cta', e.target.value)}
                                       placeholder="Learn More, Shop Now, etc."
                                     />
                                  </div>
                                </div>
                                
                                <div>
                                  <Label>Hashtags (comma-separated)</Label>
                                   <Input
                                     value={(optimization as any)?.hashtags?.join(', ') || ''}
                                     onChange={(e) => handlePlatformOptimization(platformId, 'hashtags', e.target.value.split(', ').filter(Boolean))}
                                     placeholder="#hashtag1, #hashtag2, #hashtag3"
                                   />
                                </div>
                              </TabsContent>
                            );
                          })}
                        </Tabs>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateContent}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Schedule Content
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {format(selectedDate, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, -30))}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 30))}>
                    Next
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderMonthView()}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Day Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {format(selectedDate, 'MMM d, yyyy')}
              </CardTitle>
              <CardDescription>
                Scheduled content for this day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getContentForDate(selectedDate).map(content => (
                  <div key={content.id} className={cn(
                    "p-3 border rounded-lg",
                    content.isAIGenerated ? "border-purple-200 bg-purple-50/50" : "border-border"
                  )}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {content.isAIGenerated && <Sparkles className="h-3 w-3 text-purple-600" />}
                        <h4 className="font-medium text-sm">{content.title}</h4>
                      </div>
                      <Badge variant={content.status === 'published' ? 'default' : 'secondary'}>
                        {content.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {content.content}
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{format(content.scheduledDate, 'h:mm a')}</span>
                      <Globe className="h-3 w-3 ml-2" />
                      <span className="text-xs">{content.timezone}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {content.platforms.map(platformId => {
                        const platform = platforms.find(p => p.id === platformId);
                        return platform ? (
                          <div key={platformId} className={cn("p-1 rounded", platform.color)}>
                            <platform.icon className="h-3 w-3 text-white" />
                          </div>
                        ) : null;
                      })}
                    </div>
                    {content.isAIGenerated && (
                      <div className="text-xs text-purple-600 mb-2">
                        AI-Generated Content
                      </div>
                    )}
                    <ContentPublishStatus content={content} />
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedContent(content);
                        setIsEditDialogOpen(true);
                      }}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {getContentForDate(selectedDate).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No content scheduled for this day
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Platform Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Platform Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {platforms.map(platform => {
                  const platformContent = scheduledContent.filter(content => 
                    content.platforms.includes(platform.id)
                  );
                  const aiContent = platformContent.filter(content => content.isAIGenerated).length;
                  
                  return (
                    <div key={platform.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded", platform.color)}>
                          <platform.icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-medium">{platform.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="secondary">
                          {platformContent.length} scheduled
                        </Badge>
                        {aiContent > 0 && (
                          <Badge variant="outline" className="text-purple-600">
                            {aiContent} AI
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
