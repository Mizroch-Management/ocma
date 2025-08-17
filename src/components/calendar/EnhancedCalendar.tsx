import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calendar as CalendarIcon,
  Clock,
  Filter,
  RefreshCw,
  Edit2,
  Copy,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Image as ImageIcon,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ScheduledPost {
  id: string;
  user_id: string;
  platform: string;
  content: string;
  media_urls?: string[];
  scheduled_for: string;
  status: 'pending' | 'processing' | 'posted' | 'failed';
  error_message?: string;
  platform_post_id?: string;
  created_at: string;
  updated_at?: string;
}

interface CalendarPost {
  date: Date;
  posts: ScheduledPost[];
}

const platformIcons = {
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
};

const statusConfig = {
  pending: {
    label: 'Scheduled',
    icon: Clock,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
  },
  posted: {
    label: 'Posted',
    icon: CheckCircle,
    color: 'bg-green-500',
    textColor: 'text-green-700',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    color: 'bg-red-500',
    textColor: 'text-red-700',
  },
};

export function EnhancedCalendar() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [showMediaPreview, setShowMediaPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user, statusFilter, platformFilter, fetchPosts]);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user!.id)
        .order('scheduled_for', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (platformFilter !== 'all') {
        query = query.eq('platform', platformFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load scheduled posts');
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, platformFilter]);

  const getPostsForDate = (date: Date): ScheduledPost[] => {
    return posts.filter(post => {
      const postDate = parseISO(post.scheduled_for);
      return format(postDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
  };

  const handleRetryPost = async (post: ScheduledPost) => {
    try {
      // Update status to pending to retry
      const { error } = await supabase
        .from('scheduled_posts')
        .update({ 
          status: 'pending',
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Post scheduled for retry');
      fetchPosts();
    } catch (error) {
      console.error('Error retrying post:', error);
      toast.error('Failed to retry post');
    }
  };

  const handleEditPost = async (post: ScheduledPost, updates: Partial<ScheduledPost>) => {
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Post updated successfully');
      setEditingPost(null);
      fetchPosts();
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    }
  };

  const handleBulkAction = async (action: 'delete' | 'reschedule' | 'duplicate') => {
    if (selectedPosts.length === 0) {
      toast.error('Please select posts to perform bulk action');
      return;
    }

    try {
      switch (action) {
        case 'delete': {
          const { error: deleteError } = await supabase
            .from('scheduled_posts')
            .delete()
            .in('id', selectedPosts);
          if (deleteError) throw deleteError;
          toast.success(`${selectedPosts.length} posts deleted`);
          break;
        }

        case 'duplicate': {
          const postsToDuplicate = posts.filter(p => selectedPosts.includes(p.id));
          const duplicates = postsToDuplicate.map(post => ({
            ...post,
            id: undefined,
            scheduled_for: new Date(Date.now() + 86400000).toISOString(), // +1 day
            status: 'pending',
            created_at: new Date().toISOString(),
          }));
          
          const { error: dupError } = await supabase
            .from('scheduled_posts')
            .insert(duplicates);
          if (dupError) throw dupError;
          toast.success(`${selectedPosts.length} posts duplicated`);
          break;
        }

        case 'reschedule': {
          // Would open a dialog to select new date/time
          toast.info('Reschedule feature coming soon');
          break;
        }
      }

      setSelectedPosts([]);
      fetchPosts();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error(`Failed to ${action} posts`);
    }
  };

  const renderPostCard = (post: ScheduledPost) => {
    const status = statusConfig[post.status];
    const Icon = status.icon;
    const PlatformIcon = platformIcons[post.platform as keyof typeof platformIcons];

    return (
      <Card key={post.id} className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedPosts.includes(post.id)}
                onCheckedChange={(checked) => {
                  setSelectedPosts(prev => 
                    checked 
                      ? [...prev, post.id]
                      : prev.filter(id => id !== post.id)
                  );
                }}
              />
              {PlatformIcon && <PlatformIcon className="h-4 w-4" />}
              <Badge className={cn(status.color, 'text-white')}>
                <Icon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingPost(post)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              {post.status === 'failed' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRetryPost(post)}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {post.content}
          </p>

          {post.media_urls && post.media_urls.length > 0 && (
            <div className="flex gap-2 mb-2">
              {post.media_urls.slice(0, 3).map((url, index) => (
                <div
                  key={index}
                  className="relative w-12 h-12 bg-muted rounded cursor-pointer"
                  onClick={() => setShowMediaPreview(url)}
                >
                  <ImageIcon className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              ))}
              {post.media_urls.length > 3 && (
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs">
                  +{post.media_urls.length - 3}
                </div>
              )}
            </div>
          )}

          {post.error_message && (
            <div className="flex items-start gap-2 p-2 bg-red-50 rounded text-xs text-red-600">
              <AlertCircle className="h-3 w-3 mt-0.5" />
              <span>{post.error_message}</span>
            </div>
          )}

          <div className="text-xs text-muted-foreground mt-2">
            {format(parseISO(post.scheduled_for), 'MMM d, yyyy h:mm a')}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Content Calendar</h1>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Scheduled</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="twitter">Twitter</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={fetchPosts} variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedPosts.length > 0 && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {selectedPosts.length} posts selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('duplicate')}
              >
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('reschedule')}
              >
                <CalendarIcon className="h-4 w-4 mr-1" />
                Reschedule
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkAction('delete')}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                hasPost: (date) => getPostsForDate(date).length > 0,
              }}
              modifiersStyles={{
                hasPost: {
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                },
              }}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Posts for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Today'}
            </CardTitle>
            <CardDescription>
              {loading ? 'Loading...' : `${getPostsForDate(selectedDate || new Date()).length} posts scheduled`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : getPostsForDate(selectedDate || new Date()).length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  No posts scheduled for this date
                </div>
              ) : (
                getPostsForDate(selectedDate || new Date()).map(renderPostCard)
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Edit Post Dialog */}
      {editingPost && (
        <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Scheduled Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Content</Label>
                <Textarea
                  value={editingPost.content}
                  onChange={(e) => setEditingPost({
                    ...editingPost,
                    content: e.target.value,
                  })}
                  rows={4}
                />
              </div>
              <div>
                <Label>Scheduled Time</Label>
                <Input
                  type="datetime-local"
                  value={editingPost.scheduled_for.slice(0, 16)}
                  onChange={(e) => setEditingPost({
                    ...editingPost,
                    scheduled_for: new Date(e.target.value).toISOString(),
                  })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingPost(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleEditPost(editingPost, editingPost)}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Media Preview Dialog */}
      {showMediaPreview && (
        <Dialog open={!!showMediaPreview} onOpenChange={() => setShowMediaPreview(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Media Preview</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-4">
              <img
                src={showMediaPreview}
                alt="Media preview"
                className="max-w-full max-h-[500px] rounded"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}