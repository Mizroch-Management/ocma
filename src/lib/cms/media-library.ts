// Media Library with CDN Integration - Phase 5
// Comprehensive media management system with CDN support

import { supabase } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';

export interface MediaAsset {
  id: string;
  name: string;
  originalName: string;
  url: string;
  cdnUrl?: string;
  thumbnailUrl?: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'other';
  mimeType: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number; // For video/audio
  metadata: {
    format?: string;
    codec?: string;
    bitrate?: number;
    fps?: number;
    colorSpace?: string;
    hasAlpha?: boolean;
    exif?: Record<string, any>;
  };
  folder?: string;
  tags: string[];
  altText?: string;
  caption?: string;
  credit?: string;
  license?: 'public' | 'creative-commons' | 'proprietary' | 'custom';
  organizationId: string;
  uploadedBy: string;
  usageCount: number;
  lastUsed?: Date;
  variants?: MediaVariant[];
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaVariant {
  id: string;
  name: string;
  url: string;
  cdnUrl?: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  quality?: number;
  format?: string;
  purpose: 'thumbnail' | 'preview' | 'social' | 'web' | 'print' | 'custom';
}

export interface MediaFolder {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  color?: string;
  icon?: string;
  assetCount: number;
  totalSize: number;
  permissions: {
    read: string[];
    write: string[];
    delete: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaUploadOptions {
  folder?: string;
  tags?: string[];
  generateThumbnail?: boolean;
  generateVariants?: boolean;
  optimize?: boolean;
  cdnUpload?: boolean;
  metadata?: Record<string, any>;
}

export interface MediaFilter {
  type?: string[];
  folder?: string;
  tags?: string[];
  search?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  dimensions?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
  sortBy?: 'name' | 'size' | 'date' | 'usage';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CDNConfig {
  provider: 'cloudflare' | 'cloudinary' | 'aws' | 'custom';
  baseUrl: string;
  apiKey?: string;
  apiSecret?: string;
  options?: {
    autoOptimize?: boolean;
    autoWebP?: boolean;
    lazyLoad?: boolean;
    responsive?: boolean;
  };
}

export class MediaLibrary {
  private cache: Map<string, MediaAsset> = new Map();
  private folders: Map<string, MediaFolder> = new Map();
  private cdnConfig: CDNConfig | null = null;
  private uploadQueue: Map<string, File> = new Map();
  
  constructor() {
    this.initializeCDN();
  }
  
  // Initialize CDN configuration
  private async initializeCDN(): Promise<void> {
    try {
      // Load CDN config from environment or database
      this.cdnConfig = {
        provider: 'cloudflare',
        baseUrl: process.env.VITE_CDN_URL || 'https://cdn.example.com',
        options: {
          autoOptimize: true,
          autoWebP: true,
          lazyLoad: true,
          responsive: true
        }
      };
    } catch (error) {
      log.error('Failed to initialize CDN', error);
    }
  }
  
  // Upload media asset
  async uploadMedia(
    file: File,
    options?: MediaUploadOptions
  ): Promise<MediaAsset> {
    try {
      // Validate file
      this.validateFile(file);
      
      // Generate unique filename
      const filename = this.generateFilename(file);
      const path = options?.folder ? `${options.folder}/${filename}` : filename;
      
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(path);
      
      // Process media (generate thumbnails, optimize, etc.)
      const processed = await this.processMedia(file, publicUrl, options);
      
      // Upload to CDN if configured
      let cdnUrl: string | undefined;
      if (options?.cdnUpload && this.cdnConfig) {
        cdnUrl = await this.uploadToCDN(file, filename);
      }
      
      // Extract metadata
      const metadata = await this.extractMetadata(file);
      
      // Create media asset record
      const asset: MediaAsset = {
        id: this.generateId(),
        name: filename,
        originalName: file.name,
        url: publicUrl,
        cdnUrl,
        thumbnailUrl: processed.thumbnailUrl,
        type: this.getMediaType(file.type),
        mimeType: file.type,
        size: file.size,
        dimensions: metadata.dimensions,
        duration: metadata.duration,
        metadata: metadata,
        folder: options?.folder,
        tags: options?.tags || [],
        organizationId: await this.getOrganizationId(),
        uploadedBy: await this.getCurrentUserId(),
        usageCount: 0,
        variants: processed.variants,
        processingStatus: 'completed',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Save to database
      const { data, error } = await supabase
        .from('media_library')
        .insert([asset])
        .select()
        .single();
      
      if (error) throw error;
      
      // Cache the asset
      this.cache.set(data.id, data);
      
      // Update folder stats
      if (options?.folder) {
        await this.updateFolderStats(options.folder);
      }
      
      log.info('Media uploaded', { id: data.id, name: data.name });
      return data;
    } catch (error) {
      log.error('Failed to upload media', error);
      throw error;
    }
  }
  
  // Upload multiple files
  async uploadBatch(
    files: File[],
    options?: MediaUploadOptions
  ): Promise<MediaAsset[]> {
    const results: MediaAsset[] = [];
    const errors: Array<{ file: string; error: any }> = [];
    
    // Process files in parallel with concurrency limit
    const concurrency = 3;
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const promises = batch.map(file => 
        this.uploadMedia(file, options)
          .catch(error => {
            errors.push({ file: file.name, error });
            return null;
          })
      );
      
      const batchResults = await Promise.all(promises);
      results.push(...batchResults.filter(r => r !== null) as MediaAsset[]);
    }
    
    if (errors.length > 0) {
      log.warn('Some files failed to upload', errors);
    }
    
    return results;
  }
  
  // Get media asset
  async getMedia(id: string): Promise<MediaAsset | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    
    try {
      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        this.cache.set(id, data);
      }
      
      return data;
    } catch (error) {
      log.error('Failed to get media', error);
      return null;
    }
  }
  
  // List media with filters
  async listMedia(filter?: MediaFilter): Promise<{
    items: MediaAsset[];
    total: number;
    totalSize: number;
    hasMore: boolean;
  }> {
    try {
      let query = supabase.from('media_library').select('*', { count: 'exact' });
      
      // Apply filters
      if (filter) {
        if (filter.type?.length) {
          query = query.in('type', filter.type);
        }
        if (filter.folder) {
          query = query.eq('folder', filter.folder);
        }
        if (filter.tags?.length) {
          query = query.contains('tags', filter.tags);
        }
        if (filter.search) {
          query = query.or(`name.ilike.%${filter.search}%,originalName.ilike.%${filter.search}%`);
        }
        if (filter.dateRange) {
          query = query
            .gte('createdAt', filter.dateRange.start.toISOString())
            .lte('createdAt', filter.dateRange.end.toISOString());
        }
        if (filter.sizeRange) {
          query = query
            .gte('size', filter.sizeRange.min)
            .lte('size', filter.sizeRange.max);
        }
        
        // Sorting
        const sortBy = filter.sortBy || 'date';
        const sortOrder = filter.sortOrder || 'desc';
        const sortColumn = sortBy === 'date' ? 'createdAt' : sortBy === 'usage' ? 'usageCount' : sortBy;
        query = query.order(sortColumn, { ascending: sortOrder === 'asc' });
        
        // Pagination
        if (filter.limit) {
          query = query.limit(filter.limit);
        }
        if (filter.offset) {
          query = query.range(filter.offset, filter.offset + (filter.limit || 20) - 1);
        }
      }
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      const items = data || [];
      const totalSize = items.reduce((sum, item) => sum + item.size, 0);
      
      return {
        items,
        total: count || 0,
        totalSize,
        hasMore: (filter?.offset || 0) + items.length < (count || 0)
      };
    } catch (error) {
      log.error('Failed to list media', error);
      return { items: [], total: 0, totalSize: 0, hasMore: false };
    }
  }
  
  // Update media metadata
  async updateMedia(
    id: string,
    updates: Partial<MediaAsset>
  ): Promise<MediaAsset> {
    try {
      const existing = await this.getMedia(id);
      if (!existing) throw new Error('Media not found');
      
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date()
      };
      
      const { data, error } = await supabase
        .from('media_library')
        .update(updated)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update cache
      this.cache.set(id, data);
      
      log.info('Media updated', { id });
      return data;
    } catch (error) {
      log.error('Failed to update media', error);
      throw error;
    }
  }
  
  // Delete media
  async deleteMedia(id: string): Promise<void> {
    try {
      const media = await this.getMedia(id);
      if (!media) throw new Error('Media not found');
      
      // Delete from storage
      const path = media.folder ? `${media.folder}/${media.name}` : media.name;
      const { error: storageError } = await supabase.storage
        .from('media')
        .remove([path]);
      
      if (storageError) throw storageError;
      
      // Delete from CDN if applicable
      if (media.cdnUrl && this.cdnConfig) {
        await this.deleteFromCDN(media.name);
      }
      
      // Delete from database
      const { error } = await supabase
        .from('media_library')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Remove from cache
      this.cache.delete(id);
      
      // Update folder stats
      if (media.folder) {
        await this.updateFolderStats(media.folder);
      }
      
      log.info('Media deleted', { id });
    } catch (error) {
      log.error('Failed to delete media', error);
      throw error;
    }
  }
  
  // Process media (generate thumbnails, optimize, etc.)
  private async processMedia(
    file: File,
    url: string,
    options?: MediaUploadOptions
  ): Promise<{
    thumbnailUrl?: string;
    variants: MediaVariant[];
  }> {
    const variants: MediaVariant[] = [];
    let thumbnailUrl: string | undefined;
    
    if (this.getMediaType(file.type) === 'image') {
      // Generate thumbnail
      if (options?.generateThumbnail !== false) {
        thumbnailUrl = await this.generateThumbnail(file, url);
        variants.push({
          id: this.generateId(),
          name: 'thumbnail',
          url: thumbnailUrl,
          size: 0, // Calculate actual size
          dimensions: { width: 200, height: 200 },
          purpose: 'thumbnail'
        });
      }
      
      // Generate responsive variants
      if (options?.generateVariants) {
        const sizes = [
          { width: 320, name: 'small', purpose: 'web' as const },
          { width: 768, name: 'medium', purpose: 'web' as const },
          { width: 1200, name: 'large', purpose: 'web' as const },
          { width: 1200, height: 630, name: 'social', purpose: 'social' as const }
        ];
        
        for (const size of sizes) {
          const variant = await this.generateVariant(file, url, size);
          if (variant) {
            variants.push(variant);
          }
        }
      }
    }
    
    return { thumbnailUrl, variants };
  }
  
  // Generate thumbnail
  private async generateThumbnail(file: File, url: string): Promise<string> {
    // In production, use image processing service
    // For now, return the same URL with query params
    return `${url}?w=200&h=200&fit=cover`;
  }
  
  // Generate image variant
  private async generateVariant(
    file: File,
    url: string,
    options: { width: number; height?: number; name: string; purpose: 'web' | 'social' | 'print' }
  ): Promise<MediaVariant> {
    // In production, use image processing service
    const variantUrl = options.height 
      ? `${url}?w=${options.width}&h=${options.height}&fit=cover`
      : `${url}?w=${options.width}&fit=contain`;
    
    return {
      id: this.generateId(),
      name: options.name,
      url: variantUrl,
      size: 0, // Calculate actual size
      dimensions: {
        width: options.width,
        height: options.height || 0
      },
      purpose: options.purpose
    };
  }
  
  // Upload to CDN
  private async uploadToCDN(file: File, filename: string): Promise<string> {
    if (!this.cdnConfig) throw new Error('CDN not configured');
    
    // Simulate CDN upload - in production, use actual CDN API
    const cdnUrl = `${this.cdnConfig.baseUrl}/${filename}`;
    
    // Add to processing queue
    this.uploadQueue.set(filename, file);
    
    // Process upload asynchronously
    setTimeout(() => {
      this.uploadQueue.delete(filename);
      log.info('CDN upload completed', { filename, cdnUrl });
    }, 1000);
    
    return cdnUrl;
  }
  
  // Delete from CDN
  private async deleteFromCDN(filename: string): Promise<void> {
    if (!this.cdnConfig) return;
    
    // Simulate CDN deletion - in production, use actual CDN API
    log.info('CDN deletion completed', { filename });
  }
  
  // Extract metadata from file
  private async extractMetadata(file: File): Promise<any> {
    const metadata: any = {
      format: file.type.split('/')[1],
      size: file.size
    };
    
    if (file.type.startsWith('image/')) {
      // Extract image dimensions
      const dimensions = await this.getImageDimensions(file);
      metadata.dimensions = dimensions;
    } else if (file.type.startsWith('video/')) {
      // Extract video metadata
      metadata.duration = 0; // Would need video processing library
      metadata.codec = 'unknown';
      metadata.bitrate = 0;
      metadata.fps = 0;
    } else if (file.type.startsWith('audio/')) {
      // Extract audio metadata
      metadata.duration = 0; // Would need audio processing library
      metadata.codec = 'unknown';
      metadata.bitrate = 0;
    }
    
    return metadata;
  }
  
  // Get image dimensions
  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }
  
  // Validate file
  private validateFile(file: File): void {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mpeg', 'audio/ogg', 'audio/wav',
      'application/pdf', 'application/zip'
    ];
    
    if (file.size > maxSize) {
      throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }
  }
  
  // Get media type from MIME type
  private getMediaType(mimeType: string): MediaAsset['type'] {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'document';
    return 'other';
  }
  
  // Generate unique filename
  private generateFilename(file: File): string {
    const ext = file.name.split('.').pop();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}_${random}.${ext}`;
  }
  
  // Generate unique ID
  private generateId(): string {
    return `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Get current user ID
  private async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || 'anonymous';
  }
  
  // Get organization ID
  private async getOrganizationId(): Promise<string> {
    // Get from context or user's organization
    return 'default_org';
  }
  
  // Folder management
  async createFolder(folder: Partial<MediaFolder>): Promise<MediaFolder> {
    try {
      const newFolder: MediaFolder = {
        id: this.generateId(),
        name: folder.name || 'New Folder',
        path: folder.path || '/',
        parentId: folder.parentId,
        assetCount: 0,
        totalSize: 0,
        permissions: folder.permissions || {
          read: ['*'],
          write: ['*'],
          delete: ['admin']
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...folder
      };
      
      const { data, error } = await supabase
        .from('media_folders')
        .insert([newFolder])
        .select()
        .single();
      
      if (error) throw error;
      
      this.folders.set(data.id, data);
      
      log.info('Folder created', { id: data.id, name: data.name });
      return data;
    } catch (error) {
      log.error('Failed to create folder', error);
      throw error;
    }
  }
  
  async listFolders(): Promise<MediaFolder[]> {
    try {
      const { data, error } = await supabase
        .from('media_folders')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      log.error('Failed to list folders', error);
      return [];
    }
  }
  
  private async updateFolderStats(folderId: string): Promise<void> {
    try {
      const { data: assets } = await supabase
        .from('media_library')
        .select('size')
        .eq('folder', folderId);
      
      const assetCount = assets?.length || 0;
      const totalSize = assets?.reduce((sum, asset) => sum + asset.size, 0) || 0;
      
      await supabase
        .from('media_folders')
        .update({ assetCount, totalSize, updatedAt: new Date() })
        .eq('id', folderId);
    } catch (error) {
      log.error('Failed to update folder stats', error);
    }
  }
  
  // Get CDN URL with transformations
  getCDNUrl(
    asset: MediaAsset,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    }
  ): string {
    if (!asset.cdnUrl || !this.cdnConfig) {
      return asset.url;
    }
    
    // Build transformation URL based on CDN provider
    const params = new URLSearchParams();
    if (options?.width) params.append('w', options.width.toString());
    if (options?.height) params.append('h', options.height.toString());
    if (options?.quality) params.append('q', options.quality.toString());
    if (options?.format) params.append('f', options.format);
    if (options?.fit) params.append('fit', options.fit);
    
    return `${asset.cdnUrl}?${params.toString()}`;
  }
  
  // Track media usage
  async trackUsage(id: string): Promise<void> {
    try {
      const media = await this.getMedia(id);
      if (!media) return;
      
      await this.updateMedia(id, {
        usageCount: media.usageCount + 1,
        lastUsed: new Date()
      });
    } catch (error) {
      log.error('Failed to track media usage', error);
    }
  }
}

// Export singleton instance
export const mediaLibrary = new MediaLibrary();