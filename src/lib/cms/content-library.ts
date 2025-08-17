// CMS Content Library System - Phase 5
// Comprehensive content management with drafts, templates, and versioning

import { supabase } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';

export interface ContentItem {
  id: string;
  title: string;
  content: string;
  type: 'draft' | 'published' | 'scheduled' | 'archived';
  status: 'draft' | 'review' | 'approved' | 'published';
  category: string;
  tags: string[];
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata: {
    wordCount: number;
    readingTime: number;
    seoScore?: number;
    sentiment?: 'positive' | 'neutral' | 'negative';
  };
  platforms: string[];
  scheduledDate?: Date;
  publishedDate?: Date;
  version: number;
  parentId?: string; // For versioning
  templateId?: string; // If created from template
  collaborators?: string[];
  comments?: ContentComment[];
  attachments?: ContentAttachment[];
  analytics?: ContentAnalytics;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  structure: {
    sections: TemplateSection[];
    variables: TemplateVariable[];
    defaultValues?: Record<string, any>;
  };
  thumbnail?: string;
  usageCount: number;
  rating: number;
  tags: string[];
  createdBy: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateSection {
  id: string;
  title: string;
  content: string;
  order: number;
  required: boolean;
  editable: boolean;
  placeholder?: string;
  maxLength?: number;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  defaultValue?: unknown;
  options?: string[]; // For select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface ContentComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  resolved: boolean;
  replies?: ContentComment[];
}

export interface ContentAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

export interface ContentAnalytics {
  views: number;
  clicks: number;
  shares: number;
  engagement: number;
  conversions: number;
  revenue?: number;
}

export interface ContentVersion {
  id: string;
  contentId: string;
  version: number;
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  author: string;
  timestamp: Date;
  message?: string;
}

export interface ContentFilter {
  type?: string[];
  status?: string[];
  category?: string[];
  tags?: string[];
  author?: string[];
  platforms?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
  sortBy?: 'created' | 'updated' | 'published' | 'title' | 'engagement';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export class ContentLibrary {
  private cache: Map<string, ContentItem> = new Map();
  private templates: Map<string, ContentTemplate> = new Map();
  
  // Create new content
  async createContent(
    content: Partial<ContentItem>,
    options?: {
      fromTemplate?: string;
      asDraft?: boolean;
      scheduledDate?: Date;
    }
  ): Promise<ContentItem> {
    try {
      // If creating from template
      if (options?.fromTemplate) {
        const template = await this.getTemplate(options.fromTemplate);
        content = this.applyTemplate(content, template);
      }
      
      const newContent: ContentItem = {
        id: this.generateId(),
        title: content.title || 'Untitled',
        content: content.content || '',
        type: options?.asDraft ? 'draft' : 'published',
        status: options?.asDraft ? 'draft' : 'approved',
        category: content.category || 'general',
        tags: content.tags || [],
        author: content.author || await this.getCurrentAuthor(),
        metadata: this.calculateMetadata(content.content || ''),
        platforms: content.platforms || [],
        scheduledDate: options?.scheduledDate,
        version: 1,
        templateId: options?.fromTemplate,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...content
      };
      
      // Save to database
      const { data, error } = await supabase
        .from('content_library')
        .insert([newContent])
        .select()
        .single();
      
      if (error) throw error;
      
      // Cache the content
      this.cache.set(data.id, data);
      
      log.info('Content created', { id: data.id, title: data.title });
      return data;
    } catch (error) {
      log.error('Failed to create content', error);
      throw error;
    }
  }
  
  // Get content by ID
  async getContent(id: string): Promise<ContentItem | null> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    
    try {
      const { data, error } = await supabase
        .from('content_library')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        this.cache.set(id, data);
      }
      
      return data;
    } catch (error) {
      log.error('Failed to get content', error);
      return null;
    }
  }
  
  // List content with filters
  async listContent(filter?: ContentFilter): Promise<{
    items: ContentItem[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      let query = supabase.from('content_library').select('*', { count: 'exact' });
      
      // Apply filters
      if (filter) {
        if (filter.type?.length) {
          query = query.in('type', filter.type);
        }
        if (filter.status?.length) {
          query = query.in('status', filter.status);
        }
        if (filter.category?.length) {
          query = query.in('category', filter.category);
        }
        if (filter.author?.length) {
          query = query.in('author->id', filter.author);
        }
        if (filter.search) {
          query = query.or(`title.ilike.%${filter.search}%,content.ilike.%${filter.search}%`);
        }
        if (filter.dateRange) {
          query = query
            .gte('createdAt', filter.dateRange.start.toISOString())
            .lte('createdAt', filter.dateRange.end.toISOString());
        }
        
        // Sorting
        const sortBy = filter.sortBy || 'created';
        const sortOrder = filter.sortOrder || 'desc';
        query = query.order(sortBy === 'created' ? 'createdAt' : sortBy, { ascending: sortOrder === 'asc' });
        
        // Pagination
        if (filter.limit) {
          query = query.limit(filter.limit);
        }
        if (filter.offset) {
          query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
        }
      }
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return {
        items: data || [],
        total: count || 0,
        hasMore: (filter?.offset || 0) + (data?.length || 0) < (count || 0)
      };
    } catch (error) {
      log.error('Failed to list content', error);
      return { items: [], total: 0, hasMore: false };
    }
  }
  
  // Update content
  async updateContent(
    id: string,
    updates: Partial<ContentItem>,
    options?: {
      createVersion?: boolean;
      versionMessage?: string;
    }
  ): Promise<ContentItem> {
    try {
      const existing = await this.getContent(id);
      if (!existing) throw new Error('Content not found');
      
      // Create version if requested
      if (options?.createVersion) {
        await this.createVersion(existing, updates, options.versionMessage);
      }
      
      const updated = {
        ...existing,
        ...updates,
        metadata: updates.content 
          ? this.calculateMetadata(updates.content)
          : existing.metadata,
        version: existing.version + 1,
        updatedAt: new Date()
      };
      
      const { data, error } = await supabase
        .from('content_library')
        .update(updated)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update cache
      this.cache.set(id, data);
      
      log.info('Content updated', { id, version: data.version });
      return data;
    } catch (error) {
      log.error('Failed to update content', error);
      throw error;
    }
  }
  
  // Delete content
  async deleteContent(id: string, soft = true): Promise<void> {
    try {
      if (soft) {
        // Soft delete - archive the content
        await this.updateContent(id, { type: 'archived' });
      } else {
        // Hard delete
        const { error } = await supabase
          .from('content_library')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        // Remove from cache
        this.cache.delete(id);
      }
      
      log.info('Content deleted', { id, soft });
    } catch (error) {
      log.error('Failed to delete content', error);
      throw error;
    }
  }
  
  // Duplicate content
  async duplicateContent(id: string, title?: string): Promise<ContentItem> {
    try {
      const original = await this.getContent(id);
      if (!original) throw new Error('Content not found');
      
      const duplicate = {
        ...original,
        id: this.generateId(),
        title: title || `${original.title} (Copy)`,
        type: 'draft' as const,
        status: 'draft' as const,
        version: 1,
        parentId: original.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const { data, error } = await supabase
        .from('content_library')
        .insert([duplicate])
        .select()
        .single();
      
      if (error) throw error;
      
      this.cache.set(data.id, data);
      
      log.info('Content duplicated', { original: id, duplicate: data.id });
      return data;
    } catch (error) {
      log.error('Failed to duplicate content', error);
      throw error;
    }
  }
  
  // Create content template
  async createTemplate(template: Partial<ContentTemplate>): Promise<ContentTemplate> {
    try {
      const newTemplate: ContentTemplate = {
        id: this.generateId(),
        name: template.name || 'Untitled Template',
        description: template.description || '',
        category: template.category || 'general',
        structure: template.structure || { sections: [], variables: [] },
        usageCount: 0,
        rating: 0,
        tags: template.tags || [],
        createdBy: await this.getCurrentUserId(),
        isPublic: template.isPublic || false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...template
      };
      
      const { data, error } = await supabase
        .from('content_templates')
        .insert([newTemplate])
        .select()
        .single();
      
      if (error) throw error;
      
      this.templates.set(data.id, data);
      
      log.info('Template created', { id: data.id, name: data.name });
      return data;
    } catch (error) {
      log.error('Failed to create template', error);
      throw error;
    }
  }
  
  // Get template
  async getTemplate(id: string): Promise<ContentTemplate | null> {
    if (this.templates.has(id)) {
      return this.templates.get(id)!;
    }
    
    try {
      const { data, error } = await supabase
        .from('content_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        this.templates.set(id, data);
      }
      
      return data;
    } catch (error) {
      log.error('Failed to get template', error);
      return null;
    }
  }
  
  // List templates
  async listTemplates(filter?: {
    category?: string;
    isPublic?: boolean;
    search?: string;
  }): Promise<ContentTemplate[]> {
    try {
      let query = supabase.from('content_templates').select('*');
      
      if (filter) {
        if (filter.category) {
          query = query.eq('category', filter.category);
        }
        if (filter.isPublic !== undefined) {
          query = query.eq('isPublic', filter.isPublic);
        }
        if (filter.search) {
          query = query.or(`name.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      log.error('Failed to list templates', error);
      return [];
    }
  }
  
  // Apply template to content
  private applyTemplate(content: Partial<ContentItem>, template: ContentTemplate): Partial<ContentItem> {
    const result = { ...content };
    
    // Apply template structure
    if (template.structure.sections.length > 0) {
      const sections = template.structure.sections
        .sort((a, b) => a.order - b.order)
        .map(section => {
          // Replace variables in section content
          let sectionContent = section.content;
          template.structure.variables.forEach(variable => {
            const value = content[variable.name as keyof ContentItem] || 
                         template.structure.defaultValues?.[variable.name] || 
                         variable.defaultValue || '';
            sectionContent = sectionContent.replace(
              new RegExp(`{{${variable.name}}}`, 'g'),
              String(value)
            );
          });
          return sectionContent;
        });
      
      result.content = sections.join('\n\n');
    }
    
    // Apply default values
    if (template.structure.defaultValues) {
      Object.entries(template.structure.defaultValues).forEach(([key, value]) => {
        if (!result[key as keyof ContentItem]) {
          (result as any)[key] = value;
        }
      });
    }
    
    result.templateId = template.id;
    result.category = result.category || template.category;
    result.tags = [...(result.tags || []), ...(template.tags || [])];
    
    return result;
  }
  
  // Create content version
  private async createVersion(
    original: ContentItem,
    changes: Partial<ContentItem>,
    message?: string
  ): Promise<ContentVersion> {
    try {
      const version: ContentVersion = {
        id: this.generateId(),
        contentId: original.id,
        version: original.version,
        changes: this.detectChanges(original, changes),
        author: await this.getCurrentUserId(),
        timestamp: new Date(),
        message
      };
      
      const { data, error } = await supabase
        .from('content_versions')
        .insert([version])
        .select()
        .single();
      
      if (error) throw error;
      
      log.info('Content version created', { contentId: original.id, version: data.version });
      return data;
    } catch (error) {
      log.error('Failed to create version', error);
      throw error;
    }
  }
  
  // Get content versions
  async getVersions(contentId: string): Promise<ContentVersion[]> {
    try {
      const { data, error } = await supabase
        .from('content_versions')
        .select('*')
        .eq('contentId', contentId)
        .order('version', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      log.error('Failed to get versions', error);
      return [];
    }
  }
  
  // Restore version
  async restoreVersion(contentId: string, versionId: string): Promise<ContentItem> {
    try {
      const version = await this.getVersion(versionId);
      if (!version) throw new Error('Version not found');
      
      const content = await this.getContent(contentId);
      if (!content) throw new Error('Content not found');
      
      // Apply version changes in reverse
      const restored = { ...content };
      version.changes.forEach(change => {
        (restored as any)[change.field] = change.oldValue;
      });
      
      return await this.updateContent(contentId, restored, {
        createVersion: true,
        versionMessage: `Restored to version ${version.version}`
      });
    } catch (error) {
      log.error('Failed to restore version', error);
      throw error;
    }
  }
  
  // Get single version
  private async getVersion(versionId: string): Promise<ContentVersion | null> {
    try {
      const { data, error } = await supabase
        .from('content_versions')
        .select('*')
        .eq('id', versionId)
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      log.error('Failed to get version', error);
      return null;
    }
  }
  
  // Detect changes between versions
  private detectChanges(
    original: ContentItem,
    updated: Partial<ContentItem>
  ): ContentVersion['changes'] {
    const changes: ContentVersion['changes'] = [];
    
    Object.entries(updated).forEach(([key, newValue]) => {
      const oldValue = original[key as keyof ContentItem];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue
        });
      }
    });
    
    return changes;
  }
  
  // Calculate content metadata
  private calculateMetadata(content: string): ContentItem['metadata'] {
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed
    
    return {
      wordCount,
      readingTime,
      seoScore: this.calculateSEOScore(content),
      sentiment: this.analyzeSentiment(content)
    };
  }
  
  // Calculate SEO score
  private calculateSEOScore(content: string): number {
    let score = 50; // Base score
    
    // Check content length
    const wordCount = content.split(/\s+/).length;
    if (wordCount > 300) score += 10;
    if (wordCount > 600) score += 10;
    
    // Check for headings (assuming markdown)
    if (content.includes('#')) score += 10;
    
    // Check for links
    if (content.includes('http')) score += 5;
    
    // Check for images
    if (content.includes('![') || content.includes('<img')) score += 5;
    
    // Check for lists
    if (content.includes('- ') || content.includes('1.')) score += 5;
    
    // Check for keywords (simplified)
    const keywords = ['SEO', 'marketing', 'content', 'digital', 'social'];
    keywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        score += 2;
      }
    });
    
    return Math.min(100, score);
  }
  
  // Analyze sentiment
  private analyzeSentiment(content: string): 'positive' | 'neutral' | 'negative' {
    // Simplified sentiment analysis
    const positive = ['great', 'excellent', 'amazing', 'good', 'love', 'best', 'wonderful'];
    const negative = ['bad', 'terrible', 'worst', 'hate', 'awful', 'poor', 'disappointing'];
    
    const lowerContent = content.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    
    positive.forEach(word => {
      if (lowerContent.includes(word)) positiveCount++;
    });
    
    negative.forEach(word => {
      if (lowerContent.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
  
  // Get current user ID
  private async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || 'anonymous';
  }
  
  // Get current author
  private async getCurrentAuthor(): Promise<ContentItem['author']> {
    const { data: { user } } = await supabase.auth.getUser();
    return {
      id: user?.id || 'anonymous',
      name: user?.email?.split('@')[0] || 'Anonymous',
      avatar: user?.user_metadata?.avatar_url
    };
  }
  
  // Generate unique ID
  private generateId(): string {
    return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Bulk operations
  async bulkUpdate(
    ids: string[],
    updates: Partial<ContentItem>
  ): Promise<ContentItem[]> {
    const results: ContentItem[] = [];
    
    for (const id of ids) {
      try {
        const updated = await this.updateContent(id, updates);
        results.push(updated);
      } catch (error) {
        log.error(`Failed to update content ${id}`, error);
      }
    }
    
    return results;
  }
  
  async bulkDelete(ids: string[], soft = true): Promise<void> {
    for (const id of ids) {
      try {
        await this.deleteContent(id, soft);
      } catch (error) {
        log.error(`Failed to delete content ${id}`, error);
      }
    }
  }
  
  // Export content
  async exportContent(ids: string[], format: 'json' | 'csv' | 'markdown'): Promise<string> {
    const items = await Promise.all(ids.map(id => this.getContent(id)));
    const validItems = items.filter(item => item !== null) as ContentItem[];
    
    switch (format) {
      case 'json':
        return JSON.stringify(validItems, null, 2);
      
      case 'csv':
        const headers = ['id', 'title', 'type', 'status', 'category', 'author', 'created', 'updated'];
        const rows = validItems.map(item => [
          item.id,
          item.title,
          item.type,
          item.status,
          item.category,
          item.author.name,
          item.createdAt.toISOString(),
          item.updatedAt.toISOString()
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
      
      case 'markdown':
        return validItems.map(item => `
# ${item.title}

**Type:** ${item.type}  
**Status:** ${item.status}  
**Category:** ${item.category}  
**Author:** ${item.author.name}  
**Created:** ${item.createdAt.toLocaleDateString()}  

${item.content}

---
`).join('\n');
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
  
  // Import content
  async importContent(data: string, format: 'json' | 'csv' | 'markdown'): Promise<ContentItem[]> {
    let items: Partial<ContentItem>[] = [];
    
    switch (format) {
      case 'json':
        items = JSON.parse(data);
        break;
      
      case 'csv':
        // Parse CSV (simplified)
        const lines = data.split('\n');
        const headers = lines[0].split(',');
        items = lines.slice(1).map(line => {
          const values = line.split(',');
          const item: Record<string, unknown> = {};
          headers.forEach((header, index) => {
            item[header] = values[index];
          });
          return item;
        });
        break;
      
      case 'markdown':
        // Parse markdown (simplified)
        const sections = data.split('---').filter(s => s.trim());
        items = sections.map(section => {
          const lines = section.trim().split('\n');
          const title = lines[0].replace('#', '').trim();
          const content = lines.slice(1).join('\n').trim();
          return { title, content };
        });
        break;
    }
    
    const results: ContentItem[] = [];
    for (const item of items) {
      try {
        const created = await this.createContent(item);
        results.push(created);
      } catch (error) {
        log.error('Failed to import content item', error);
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const contentLibrary = new ContentLibrary();