import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  X, 
  FileText, 
  Image, 
  Film, 
  Music, 
  File,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/use-organization';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
}

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  existingFiles?: UploadedFile[];
  onFileRemoved?: (fileId: string) => void;
  bucketName?: string;
  showPreview?: boolean;
  compact?: boolean;
}

export function FileUpload({
  onFilesUploaded,
  maxFiles = 10,
  maxSize = 100,
  acceptedTypes = ['image/*', 'video/*', 'audio/*', 'application/pdf', '.doc', '.docx'],
  existingFiles = [],
  onFileRemoved,
  bucketName = 'media',
  showPreview = true,
  compact = false
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, number>>(new Map());
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(existingFiles);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Film className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const uploadFile = useCallback(async (file: File): Promise<UploadedFile | null> => {
    const fileId = `${currentOrganization?.id || 'default'}/${Date.now()}_${file.name}`;
    
    try {
      setUploadingFiles(prev => new Map(prev).set(fileId, 0));

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileId, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        url: publicUrl,
        uploadedAt: new Date()
      };

      // Generate thumbnail for images
      if (file.type.startsWith('image/')) {
        uploadedFile.thumbnailUrl = publicUrl;
      }

      setUploadingFiles(prev => {
        const newMap = new Map(prev);
        newMap.delete(fileId);
        return newMap;
      });

      return uploadedFile;
    } catch (error) {
      console.error('Upload error:', error);
      setUploadingFiles(prev => {
        const newMap = new Map(prev);
        newMap.delete(fileId);
        return newMap;
      });
      
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${file.name}`,
        variant: "destructive"
      });
      
      return null;
    }
  }, [currentOrganization, toast, bucketName]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > maxSize * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${file.name} exceeds ${maxSize}MB limit`,
          variant: "destructive"
        });
        return false;
      }
      return true;
    });

    if (uploadedFiles.length + validFiles.length > maxFiles) {
      toast({
        title: "Too Many Files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive"
      });
      return;
    }

    const uploadPromises = validFiles.map(uploadFile);
    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter((f): f is UploadedFile => f !== null);
    
    if (successfulUploads.length > 0) {
      const newFiles = [...uploadedFiles, ...successfulUploads];
      setUploadedFiles(newFiles);
      onFilesUploaded(newFiles);
      
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${successfulUploads.length} file(s)`,
      });
    }
  }, [uploadedFiles, maxFiles, maxSize, onFilesUploaded, toast, uploadFile]);

  const removeFile = (fileId: string) => {
    const newFiles = uploadedFiles.filter(f => f.id !== fileId);
    setUploadedFiles(newFiles);
    onFilesUploaded(newFiles);
    onFileRemoved?.(fileId);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles: maxFiles - uploadedFiles.length,
    disabled: uploadedFiles.length >= maxFiles
  });

  if (compact) {
    return (
      <div className="space-y-2">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
            transition-colors duration-200
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
            ${uploadedFiles.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex items-center justify-center gap-2">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {isDragActive ? 'Drop files here' : 'Click or drag files'}
            </span>
          </div>
        </div>
        
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map(file => (
              <Badge key={file.id} variant="secondary" className="pr-1">
                {getFileIcon(file.type)}
                <span className="ml-1 text-xs truncate max-w-[100px]">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="h-4 w-4 p-0 ml-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
          ${uploadedFiles.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          or click to browse files
        </p>
        <p className="text-xs text-muted-foreground">
          Max {maxFiles} files, up to {maxSize}MB each
        </p>
      </div>

      {/* Uploading Files */}
      {uploadingFiles.size > 0 && (
        <div className="mt-4 space-y-2">
          {Array.from(uploadingFiles.entries()).map(([id, progress]) => (
            <div key={id} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{id.split('_').pop()}</span>
                  <span className="text-xs text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Files */}
      {showPreview && uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">Uploaded Files ({uploadedFiles.length}/{maxFiles})</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedFiles.map(file => (
              <div key={file.id} className="relative group">
                <Card className="p-3">
                  {file.type.startsWith('image/') && file.thumbnailUrl ? (
                    <img
                      src={file.thumbnailUrl}
                      alt={file.name}
                      className="w-full h-24 object-cover rounded mb-2"
                    />
                  ) : (
                    <div className="w-full h-24 bg-muted rounded mb-2 flex items-center justify-center">
                      {getFileIcon(file.type)}
                    </div>
                  )}
                  <p className="text-xs truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}