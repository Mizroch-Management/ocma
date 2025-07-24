import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  Sparkles,
  RefreshCw
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
  const [manualContent, setManualContent] = useState<ContentPiece[]>([]);
  const [generatedContent, setGeneratedContent] = useState<any[]>([]);
  const [scheduledContent, setScheduledContent] = useState<any[]>([]);
  const [publicationLogs, setPublicationLogs] = useState<any[]>([]);
  const [isLoadingGeneratedContent, setIsLoadingGeneratedContent] = useState(false);
  const [isLoadingPublicationLogs, setIsLoadingPublicationLogs] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Merge AI workflow content with manual content
  const allScheduledContent = [
    ...manualContent,
    ...workflowState.approvedContent.map(aiContent => ({
      ...aiContent,
      isAIGenerated: true,
    })),
    ...scheduledContent.map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      platforms: item.scheduled_platforms || item.platforms || [],
      scheduledDate: new Date(item.scheduled_date || item.created_at),
      timezone: 'UTC',
      status: item.publication_status || 'scheduled',
      platformOptimizations: item.platform_optimizations || {},
      isAIGenerated: true
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

  // Load generated content and scheduled content from database
  useEffect(() => {
    loadGeneratedContent();
    loadScheduledContent();
    loadPublicationLogs();
    
    // Set up real-time subscription for publication logs
    const publicationChannel = supabase
      .channel('publication-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'publication_logs'
        },
        (payload) => {
          console.log('Publication log change detected:', payload);
          loadPublicationLogs();
        }
      )
      .subscribe();

    // Set up real-time subscription for content updates
    const contentChannel = supabase
      .channel('content-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generated_content'
        },
        (payload) => {
          console.log('Content change detected:', payload);
          loadScheduledContent();
          loadGeneratedContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(publicationChannel);
      supabase.removeChannel(contentChannel);
    };
  }, []);

  const loadGeneratedContent = async () => {
    setIsLoadingGeneratedContent(true);
    try {
      const { data, error } = await supabase
        .from('generated_content')
        .select('*')
        .eq('is_scheduled', false) // Only show unscheduled content
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading generated content:', error);
        return;
      }

      if (data) {
        setGeneratedContent(data);
      }
    } catch (error) {
      console.error('Error loading generated content:', error);
    } finally {
      setIsLoadingGeneratedContent(false);
    }
  };

  const loadScheduledContent = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_content')
        .select('*')
        .eq('is_scheduled', true)
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.error('Error loading scheduled content:', error);
        return;
      }

      if (data) {
        setScheduledContent(data);
      }
    } catch (error) {
      console.error('Error loading scheduled content:', error);
    }
  };

  const loadPublicationLogs = async () => {
    setIsLoadingPublicationLogs(true);
    try {
      const { data, error } = await supabase
        .from('publication_logs')
        .select(`
          *,
          generated_content (
            title,
            content
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading publication logs:', error);
        return;
      }

      if (data) {
        setPublicationLogs(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error loading publication logs:', error);
    } finally {
      setIsLoadingPublicationLogs(false);
    }
  };

  const scheduleGeneratedContent = async (contentId: string, scheduledDate: Date, timezone: string, platforms: string[]) => {
    try {
      // Update the database to mark content as scheduled
      const { error } = await supabase
        .from('generated_content')
        .update({
          is_scheduled: true,
          scheduled_date: scheduledDate.toISOString(),
          scheduled_platforms: platforms,
          publication_status: 'scheduled'
        })
        .eq('id', contentId);

      if (error) {
        console.error('Error scheduling content:', error);
        return false;
      }

      // Reload both generated and scheduled content
      await Promise.all([
        loadGeneratedContent(),
        loadScheduledContent()
      ]);
      return true;
    } catch (error) {
      console.error('Error scheduling content:', error);
      return false;
    }
  };

  const getContentForDate = (date: Date) => {
    return allScheduledContent.filter(content => 
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

          {/* Generated Content Available for Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Available Content
              </CardTitle>
              <CardDescription>
                Generated content ready to schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingGeneratedContent ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Loading generated content...
                </div>
              ) : generatedContent.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No generated content available for scheduling
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {generatedContent.slice(0, 5).map(content => (
                    <div key={content.id} className="p-3 border border-purple-200 bg-purple-50/50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm">{content.title}</h4>
                        <Badge variant="outline" className="text-purple-600 border-purple-300">
                          {content.content_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {content.content}
                      </p>
                      <div className="flex items-center gap-1 mb-2">
                        {content.platforms?.slice(0, 3).map((platformId: string) => {
                          const platform = platforms.find(p => p.id === platformId);
                          return platform ? (
                            <div key={platformId} className={cn("p-1 rounded", platform.color)}>
                              <platform.icon className="h-3 w-3 text-white" />
                            </div>
                          ) : null;
                        })}
                        {content.platforms?.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{content.platforms.length - 3} more
                          </span>
                        )}
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" className="w-full">
                            <CalendarIcon className="h-3 w-3 mr-2" />
                            Schedule This
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Schedule Generated Content</DialogTitle>
                            <DialogDescription>
                              Choose when and where to publish this content
                            </DialogDescription>
                          </DialogHeader>
                          <QuickScheduleForm 
                            content={content} 
                            onSchedule={scheduleGeneratedContent}
                            onSuccess={() => loadGeneratedContent()}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  ))}
                  {generatedContent.length > 5 && (
                    <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                      +{generatedContent.length - 5} more items available
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Publication Logs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    Publication Logs
                  </CardTitle>
                  <CardDescription>
                    Recent publishing activity and status
                    {lastUpdated && (
                      <span className="text-xs block mt-1">
                        Last updated: {format(lastUpdated, "h:mm a")}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadPublicationLogs}
                  disabled={isLoadingPublicationLogs}
                >
                  <RefreshCw className={cn("h-4 w-4", isLoadingPublicationLogs && "animate-spin")} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingPublicationLogs ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Loading publication logs...
                </div>
              ) : publicationLogs.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No publication activity yet
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {publicationLogs.slice(0, 10).map(log => {
                    const platform = platforms.find(p => p.id === log.platform);
                    const isSuccess = log.status === 'success';
                    const isPending = log.status === 'pending';
                    
                    return (
                      <div key={log.id} className={cn(
                        "p-3 border rounded-lg",
                        isSuccess ? "border-green-200 bg-green-50/50" : 
                        isPending ? "border-yellow-200 bg-yellow-50/50" :
                        "border-red-200 bg-red-50/50"
                      )}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            {platform && (
                              <div className={cn("p-1 rounded", platform.color)}>
                                <platform.icon className="h-3 w-3 text-white" />
                              </div>
                            )}
                            <span className="font-medium text-sm">
                              {log.generated_content?.title || 'Unknown Content'}
                            </span>
                          </div>
                          <Badge variant={
                            isSuccess ? "default" : 
                            isPending ? "secondary" : 
                            "destructive"
                          }>
                            {log.status}
                          </Badge>
                        </div>
                        
                        {log.published_at && (
                          <p className="text-xs text-muted-foreground mb-1">
                            Published: {format(new Date(log.published_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        )}
                        
                        {log.platform_post_id && (
                          <p className="text-xs text-muted-foreground mb-1">
                            Post ID: {log.platform_post_id}
                          </p>
                        )}
                        
                        {log.error_message && (
                          <p className="text-xs text-red-600 mb-1">
                            Error: {log.error_message}
                          </p>
                        )}
                        
                        {log.metrics && Object.keys(log.metrics).length > 0 && (
                          <div className="text-xs text-muted-foreground">
                             {Object.entries(log.metrics || {}).map(([key, value]) => (
                               <span key={key} className="mr-3">
                                 {key}: {String(value)}
                               </span>
                             ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {publicationLogs.length > 10 && (
                    <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                      +{publicationLogs.length - 10} more logs
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Quick Schedule Form Component
function QuickScheduleForm({ content, onSchedule, onSuccess }: {
  content: any;
  onSchedule: (contentId: string, scheduledDate: Date, timezone: string, platforms: string[]) => Promise<boolean>;
  onSuccess: () => void;
}) {
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [timezone, setTimezone] = useState('UTC');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(content.platforms || []);

  const handleSchedule = async () => {
    const success = await onSchedule(content.id, scheduledDate, timezone, selectedPlatforms);
    if (success) {
      onSuccess();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Scheduled Date & Time</Label>
        <Input
          type="datetime-local"
          value={format(scheduledDate, "yyyy-MM-dd'T'HH:mm")}
          onChange={(e) => setScheduledDate(new Date(e.target.value))}
        />
      </div>
      
      <div>
        <Label>Timezone</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timezones.map(tz => (
              <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Target Platforms</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {platforms.map(platform => {
            const isSelected = selectedPlatforms.includes(platform.id);
            return (
              <Button
                key={platform.id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedPlatforms(prev => 
                    isSelected 
                      ? prev.filter(p => p !== platform.id)
                      : [...prev, platform.id]
                  );
                }}
                className="justify-start"
              >
                <platform.icon className="h-4 w-4 mr-2" />
                {platform.name}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={handleSchedule} className="flex-1">
          <CalendarIcon className="h-4 w-4 mr-2" />
          Schedule Content
        </Button>
      </div>
    </div>
  );
}
