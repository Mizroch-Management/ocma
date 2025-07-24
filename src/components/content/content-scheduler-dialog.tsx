import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useWorkflow } from "@/contexts/workflow-context";
import { Calendar, Clock, Globe, CheckCircle, Instagram, Facebook, Twitter, Linkedin, Youtube } from "lucide-react";
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

  const handleSchedule = () => {
    const scheduledContent = {
      ...content,
      scheduledDate,
      timezone,
      platforms: selectedPlatforms,
      status: 'scheduled',
      id: content.id || Date.now().toString(),
      platformOptimizations: content.platformOptimizations || {}
    };

    // Add to workflow context for calendar integration
    dispatch({
      type: 'SET_APPROVED_CONTENT',
      payload: [scheduledContent]
    });

    onSchedule(scheduledContent);
    
    toast({
      title: "Content Scheduled",
      description: `Content scheduled for ${format(scheduledDate, 'MMM dd, yyyy at h:mm a')} (${timezone})`
    });
    
    onOpenChange(false);
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

  if (!content) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Content</DialogTitle>
          <DialogDescription>
            Choose when and where to publish your content
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Content Preview */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold">{content.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{content.content}</p>
                <div className="flex gap-1">
                  {content.platforms?.map((platformId: string) => {
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
            </CardContent>
          </Card>

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
          <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-2">
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

          {/* Scheduling Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Scheduling Summary</h4>
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
                  <span className="font-medium">Platforms:</span>
                  <span>{selectedPlatforms.length} selected</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSchedule}
            disabled={selectedPlatforms.length === 0}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Content
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}