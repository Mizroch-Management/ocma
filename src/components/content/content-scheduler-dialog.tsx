import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useWorkflow } from "@/contexts/workflow-context";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, 
  Clock, 
  Globe, 
  CheckCircle, 
  Instagram, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Youtube,
  Edit3,
  Save,
  Eye,
  AlertCircle,
  Send
} from "lucide-react";
import { format, addDays, addHours, addMinutes } from "date-fns";

interface ContentSchedulerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  content: any;
  onSchedule: (scheduledContent: any) => void;
}

const platforms = [
  { value: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500" },
  { value: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600" },
  { value: "twitter", label: "Twitter/X", icon: Twitter, color: "text-sky-500" },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-700" },
  { value: "youtube", label: "YouTube", icon: Youtube, color: "text-red-600" }
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

const quickScheduleOptions = [
  { label: "Now", value: "now", date: new Date() },
  { label: "In 1 hour", value: "1h", date: addHours(new Date(), 1) },
  { label: "Tomorrow 9 AM", value: "tomorrow", date: addHours(addDays(new Date(), 1), 9) },
  { label: "This Weekend", value: "weekend", date: addDays(new Date(), 6) },
];

export function ContentSchedulerDialog({ isOpen, onOpenChange, content, onSchedule }: ContentSchedulerDialogProps) {
  const { toast } = useToast();
  const { dispatch } = useWorkflow();
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [timezone, setTimezone] = useState('UTC');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(content?.platforms || []);
  const [currentStep, setCurrentStep] = useState<'edit' | 'schedule' | 'approve'>('edit');
  const [isLoading, setIsLoading] = useState(false);
  
  // Editable content state
  const [editedContent, setEditedContent] = useState({
    title: content?.title || '',
    content: content?.content || '',
    hashtags: content?.hashtags || [],
    platformOptimizations: content?.platformOptimizations || {}
  });

  // Reset state when content changes
  useEffect(() => {
    if (content) {
      setEditedContent({
        title: content.title || '',
        content: content.content || '',
        hashtags: content.hashtags || [],
        platformOptimizations: content.platformOptimizations || {}
      });
      setSelectedPlatforms(content.platforms || []);
      setCurrentStep('edit');
    }
  }, [content]);

  const handleSaveAndContinue = () => {
    if (!editedContent.title.trim() || !editedContent.content.trim()) {
      toast({
        title: "Missing Content",
        description: "Please provide both title and content before continuing.",
        variant: "destructive"
      });
      return;
    }
    setCurrentStep('schedule');
  };

  const handleProceedToApproval = () => {
    if (selectedPlatforms.length === 0) {
      toast({
        title: "No Platforms Selected",
        description: "Please select at least one platform to publish to.",
        variant: "destructive"
      });
      return;
    }
    setCurrentStep('approve');
  };

  const handleFinalApproval = async () => {
    setIsLoading(true);
    try {
      console.log('Starting content approval process...', { 
        contentId: content?.id, 
        selectedPlatforms,
        scheduledDate: scheduledDate.toISOString()
      });

      // Ensure we have a valid content ID
      if (!content?.id) {
        throw new Error('Content ID is missing');
      }

      if (selectedPlatforms.length === 0) {
        throw new Error('No platforms selected for publishing');
      }

      // Update content in database with edited version and scheduling
      const { data: updatedContent, error } = await supabase
        .from('generated_content')
        .update({
          title: editedContent.title,
          content: editedContent.content,
          hashtags: editedContent.hashtags,
          platform_optimizations: editedContent.platformOptimizations,
          is_scheduled: true,
          scheduled_date: scheduledDate.toISOString(),
          scheduled_platforms: selectedPlatforms,
          publication_status: 'scheduled'
        })
        .eq('id', content.id)
        .select()
        .single();

      if (error) {
        console.error('Database update error:', error);
        throw new Error(`Failed to update content: ${error.message}`);
      }

      console.log('Content updated successfully:', updatedContent);

      const scheduledContent = {
        ...content,
        ...editedContent,
        scheduledDate,
        timezone,
        platforms: selectedPlatforms,
        status: 'scheduled',
        isScheduled: true,
        scheduledPlatforms: selectedPlatforms,
        publication_status: 'scheduled'
      };

      // Add to workflow context for calendar integration
      dispatch({
        type: 'SET_APPROVED_CONTENT',
        payload: [scheduledContent]
      });

      onSchedule(scheduledContent);
      
      toast({
        title: "Content Approved & Scheduled!",
        description: `Content will be published on ${format(scheduledDate, 'MMM dd, yyyy at h:mm a')} (${timezone})`
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error scheduling content:', error);
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSchedule = (option: any) => {
    setScheduledDate(option.date);
    toast({
      title: "Quick Schedule Applied",
      description: `Set to publish ${option.label.toLowerCase()}`
    });
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const updatePlatformContent = (platform: string, newContent: string) => {
    setEditedContent(prev => ({
      ...prev,
      platformOptimizations: {
        ...prev.platformOptimizations,
        [platform]: {
          ...prev.platformOptimizations[platform],
          content: newContent
        }
      }
    }));
  };

  if (!content) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStep === 'edit' && <><Edit3 className="h-5 w-5" /> Edit Content</>}
            {currentStep === 'schedule' && <><Calendar className="h-5 w-5" /> Schedule Publication</>}
            {currentStep === 'approve' && <><CheckCircle className="h-5 w-5" /> Review & Approve</>}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'edit' && "Review and edit your content before scheduling"}
            {currentStep === 'schedule' && "Choose when and where to publish your content"}
            {currentStep === 'approve' && "Final review before scheduling your content"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentStep} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit" disabled={currentStep !== 'edit'}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="schedule" disabled={currentStep === 'edit'}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="approve" disabled={currentStep !== 'approve'}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </TabsTrigger>
          </TabsList>

          {/* EDIT CONTENT TAB */}
          <TabsContent value="edit" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Main Content Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Content Editor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={editedContent.title}
                      onChange={(e) => setEditedContent(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter content title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="content">Main Content</Label>
                    <Textarea
                      id="content"
                      value={editedContent.content}
                      onChange={(e) => setEditedContent(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Enter your content here..."
                      rows={8}
                      className="resize-none"
                    />
                    <div className="text-xs text-muted-foreground">
                      {editedContent.content.length} characters
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hashtags">Hashtags (comma separated)</Label>
                    <Input
                      id="hashtags"
                      value={editedContent.hashtags.join(', ')}
                      onChange={(e) => setEditedContent(prev => ({ 
                        ...prev, 
                        hashtags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      }))}
                      placeholder="#example, #content, #marketing"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Platform Optimizations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Platform Optimizations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {platforms.map((platform) => {
                    const IconComponent = platform.icon;
                    const optimizedContent = editedContent.platformOptimizations[platform.value]?.content || editedContent.content;
                    
                    return (
                      <div key={platform.value} className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <IconComponent className={`h-4 w-4 ${platform.color}`} />
                          {platform.label} Version
                        </Label>
                        <Textarea
                          value={optimizedContent}
                          onChange={(e) => updatePlatformContent(platform.value, e.target.value)}
                          placeholder={`Optimized content for ${platform.label}...`}
                          rows={3}
                          className="resize-none text-sm"
                        />
                        <div className="text-xs text-muted-foreground">
                          {optimizedContent.length} characters
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAndContinue}>
                <Save className="h-4 w-4 mr-2" />
                Save & Continue
              </Button>
            </div>
          </TabsContent>

          {/* SCHEDULE TAB */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                {/* Quick Schedule Options */}
                <div className="space-y-2">
                  <Label>Quick Schedule</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {quickScheduleOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickSchedule(option)}
                        className="justify-start"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Schedule */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="datetime">Date & Time</Label>
                    <Input
                      id="datetime"
                      type="datetime-local"
                      value={format(scheduledDate, "yyyy-MM-dd'T'HH:mm")}
                      onChange={(e) => setScheduledDate(new Date(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
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

                {/* Platform Selection */}
                <div className="space-y-2">
                  <Label>Publishing Platforms</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {platforms.map((platform) => {
                      const IconComponent = platform.icon;
                      const isSelected = selectedPlatforms.includes(platform.value);
                      return (
                        <Button
                          key={platform.value}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => togglePlatform(platform.value)}
                          className="justify-start"
                        >
                          <IconComponent className={`h-4 w-4 mr-2 ${platform.color}`} />
                          {platform.label}
                          {isSelected && <CheckCircle className="h-4 w-4 ml-auto" />}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Scheduling Summary */}
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">Scheduling Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>{format(scheduledDate, 'EEEE, MMMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>{format(scheduledDate, 'h:mm a')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4" />
                      <span>{timezone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Send className="h-4 w-4" />
                      <span>{selectedPlatforms.length} platform(s) selected</span>
                    </div>
                  </div>
                  
                  {selectedPlatforms.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Selected Platforms:</Label>
                      <div className="flex flex-wrap gap-1">
                        {selectedPlatforms.map((platformId) => {
                          const platform = platforms.find(p => p.value === platformId);
                          if (!platform) return null;
                          const IconComponent = platform.icon;
                          return (
                            <Badge key={platformId} variant="secondary" className="text-xs">
                              <IconComponent className={`h-3 w-3 mr-1 ${platform.color}`} />
                              {platform.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setCurrentStep('edit')}>
                <Edit3 className="h-4 w-4 mr-2" />
                Back to Edit
              </Button>
              <Button 
                onClick={handleProceedToApproval}
                disabled={selectedPlatforms.length === 0}
              >
                Review & Approve
                <CheckCircle className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </TabsContent>

          {/* APPROVAL TAB */}
          <TabsContent value="approve" className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please review all details carefully. Once approved, this content will be scheduled for automatic publication.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Content Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Content Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Title</Label>
                    <p className="font-semibold">{editedContent.title}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Content</Label>
                    <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                      {editedContent.content}
                    </div>
                  </div>
                  
                  {editedContent.hashtags.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Hashtags</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {editedContent.hashtags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Schedule & Platform Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Publication Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <strong>Date:</strong> {format(scheduledDate, 'EEEE, MMMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <strong>Time:</strong> {format(scheduledDate, 'h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <strong>Timezone:</strong> {timezone}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Platforms ({selectedPlatforms.length})</Label>
                    <div className="space-y-2">
                      {selectedPlatforms.map((platformId) => {
                        const platform = platforms.find(p => p.value === platformId);
                        if (!platform) return null;
                        const IconComponent = platform.icon;
                        const optimizedContent = editedContent.platformOptimizations[platformId]?.content;
                        
                        return (
                          <div key={platformId} className="p-2 border rounded-md">
                            <div className="flex items-center gap-2 mb-1">
                              <IconComponent className={`h-4 w-4 ${platform.color}`} />
                              <span className="font-medium text-sm">{platform.label}</span>
                            </div>
                            {optimizedContent && optimizedContent !== editedContent.content && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                Custom: {optimizedContent}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setCurrentStep('schedule')}>
                <Calendar className="h-4 w-4 mr-2" />
                Back to Schedule
              </Button>
              <Button 
                onClick={handleFinalApproval}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Scheduling...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Schedule
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}