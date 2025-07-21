import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';

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
}

// This service handles the integration between Calendar and Social Engagement
export class ContentEngagementService {
  private static instance: ContentEngagementService;
  private publishedContent: ContentPiece[] = [];
  private subscribers: ((content: ContentPiece[]) => void)[] = [];

  static getInstance() {
    if (!ContentEngagementService.instance) {
      ContentEngagementService.instance = new ContentEngagementService();
    }
    return ContentEngagementService.instance;
  }

  // Called when content is published
  markContentAsPublished(content: ContentPiece) {
    const publishedVersion = {
      ...content,
      status: 'published' as const,
      publishedAt: new Date()
    };
    
    this.publishedContent.push(publishedVersion);
    this.notifySubscribers();
    
    // Show toast notification
    toast({
      title: "Content Published",
      description: `"${content.title}" has been published and is now available for engagement management.`,
    });
  }

  // Get all published content for engagement management
  getPublishedContent() {
    return this.publishedContent;
  }

  // Subscribe to published content updates
  subscribe(callback: (content: ContentPiece[]) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.publishedContent));
  }

  // Simulate content publishing (in real app this would be triggered by actual publishing)
  simulatePublishing(content: ContentPiece) {
    setTimeout(() => {
      this.markContentAsPublished(content);
    }, 2000); // Simulate 2 second delay
  }
}

// Hook to use published content in Social Engagement page
export function usePublishedContent() {
  const [publishedContent, setPublishedContent] = useState<ContentPiece[]>([]);
  
  useEffect(() => {
    const service = ContentEngagementService.getInstance();
    setPublishedContent(service.getPublishedContent());
    
    const unsubscribe = service.subscribe(setPublishedContent);
    return unsubscribe;
  }, []);

  return publishedContent;
}

// Component to show content publish status and integration
export function ContentPublishStatus({ content }: { content: ContentPiece }) {
  const handlePublish = () => {
    const service = ContentEngagementService.getInstance();
    service.simulatePublishing(content);
    
    toast({
      title: "Publishing Content",
      description: `Publishing "${content.title}" to ${content.platforms.length} platform(s)...`,
    });
  };

  if (content.status === 'published') {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        Published - Available in Social Engagement
      </div>
    );
  }

  if (content.status === 'scheduled') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handlePublish}
          className="text-blue-600 hover:text-blue-800 text-sm underline"
        >
          Publish Now
        </button>
        <span className="text-sm text-muted-foreground">
          (will appear in Social Engagement after publishing)
        </span>
      </div>
    );
  }

  return null;
}