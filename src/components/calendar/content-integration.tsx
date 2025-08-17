import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organization';

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
  hashtags?: string[];
  metadata?: Record<string, unknown>;
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
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  
  useEffect(() => {
    const fetchPublishedContent = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Query the database for published and scheduled content
        let query = supabase
          .from('generated_content')
          .select('*')
          .in('publication_status', ['published', 'scheduled'])
          .order('scheduled_date', { ascending: false });

        // Filter by organization if available
        if (currentOrganization?.id) {
          query = query.eq('organization_id', currentOrganization.id);
        } else {
          query = query.eq('user_id', user.id);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching published content:', error);
          toast({
            title: "Error loading content",
            description: "Failed to load published content",
            variant: "destructive"
          });
          return;
        }

        if (data) {
          // Transform database data to ContentPiece format
          const transformedContent: ContentPiece[] = data.map(item => ({
            id: item.id,
            title: item.title,
            content: item.content,
            platforms: item.scheduled_platforms || item.platforms || [],
            scheduledDate: item.scheduled_date ? new Date(item.scheduled_date) : new Date(),
            timezone: 'UTC', // Default timezone
            status: item.publication_status === 'published' ? 'published' : 
                   item.publication_status === 'scheduled' ? 'scheduled' : 'draft',
            platformOptimizations: item.platform_optimizations || {},
            hashtags: item.hashtags || [],
            metadata: item.metadata || {}
          }));

          setPublishedContent(transformedContent);
        }
      } catch (error) {
        console.error('Error in fetchPublishedContent:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPublishedContent();

    // Set up real-time subscription for updates
    const subscription = supabase
      .channel('published_content_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generated_content',
          filter: `publication_status=in.(published,scheduled)`
        },
        (payload) => {
          console.log('Content update received:', payload);
          fetchPublishedContent(); // Refresh the data
        }
      )
      .subscribe();

    // Also subscribe to the in-memory service for backward compatibility
    const service = ContentEngagementService.getInstance();
    const unsubscribe = service.subscribe((memoryContent) => {
      // Merge in-memory content with database content
      setPublishedContent(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const newContent = memoryContent.filter(c => !existingIds.has(c.id));
        return [...prev, ...newContent];
      });
    });

    return () => {
      subscription.unsubscribe();
      unsubscribe();
    };
  }, [user, currentOrganization]);

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