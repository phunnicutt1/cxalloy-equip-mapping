'use client';

import React, { useState, useCallback, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from './dialog';
import { Button } from './button';
import { Progress } from './progress';
import { Badge } from './badge';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  FileText
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface FileUploadItem {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  uploadedFileId?: string;
  error?: string;
  result?: any;
}

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (results: any[]) => void;
}

const ALLOWED_EXTENSIONS = ['.trio', '.csv', '.txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUploadDialog({ 
  open, 
  onOpenChange, 
  onUploadComplete 
}: FileUploadDialogProps) {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `File type not supported. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 10MB limit`;
    }
    
    return null;
  };

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles: FileUploadItem[] = [];
    
    newFiles.forEach(file => {
      const error = validateFile(file);
      if (!error) {
        validFiles.push({
          file,
          id: generateId(),
          status: 'pending',
          progress: 0
        });
      }
    });
    
    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  }, [addFiles]);

  const uploadFile = async (fileItem: FileUploadItem): Promise<void> => {
    try {
      // Update status to uploading
      setFiles(prev => 
        prev.map(f => f.id === fileItem.id ? { ...f, status: 'uploading' as const, progress: 0 } : f)
      );

      // Create form data
      const formData = new FormData();
      formData.append('file', fileItem.file);

      // Upload file
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      
      // Update with upload completion
      setFiles(prev => 
        prev.map(f => f.id === fileItem.id ? { 
          ...f, 
          status: 'processing' as const, 
          progress: 50,
          uploadedFileId: uploadResult.fileId 
        } : f)
      );

      // Process file
      const processResponse = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: uploadResult.fileId,
          filename: uploadResult.filename,
          options: {
            enableNormalization: true,
            enableTagging: true,
            includeVendorTags: true
          }
        }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.error || 'Processing failed');
      }

      const processResult = await processResponse.json();

      // Update with completion
      setFiles(prev => 
        prev.map(f => f.id === fileItem.id ? { 
          ...f, 
          status: 'completed' as const, 
          progress: 100,
          result: processResult.result 
        } : f)
      );

    } catch (error) {
      // Update with error
      setFiles(prev => 
        prev.map(f => f.id === fileItem.id ? { 
          ...f, 
          status: 'error' as const, 
          error: error instanceof Error ? error.message : 'Unknown error',
          progress: 0 
        } : f)
      );
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    
    // Process files sequentially to avoid overwhelming the server
    for (const file of files.filter(f => f.status === 'pending')) {
      await uploadFile(file);
    }
    
    setIsUploading(false);
    
    // Collect successful results
    const completedFiles = files.filter(f => f.status === 'completed');
    if (completedFiles.length > 0 && onUploadComplete) {
      onUploadComplete(completedFiles.map(f => f.result));
    }
  };

  const getStatusIcon = (status: FileUploadItem['status']) => {
    switch (status) {
      case 'pending':
        return <File className="h-4 w-4 text-muted-foreground" />;
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (status: FileUploadItem['status']) => {
    switch (status) {
      case 'pending':
        return 'Ready to upload';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Complete';
      case 'error':
        return 'Failed';
    }
  };

  const canUpload = files.length > 0 && !isUploading && files.some(f => f.status === 'pending');
  const hasCompleted = files.some(f => f.status === 'completed');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Trio Files</DialogTitle>
          <DialogDescription>
            Upload BACnet trio files for equipment mapping and point normalization.
            Supported formats: .trio, .csv, .txt (max 10MB each)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Drop Zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragActive 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-muted-foreground/40"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Drop files here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports .trio, .csv, .txt files up to 10MB
                </p>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".trio,.csv,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File List */}
          {files.length > 0 && (
            <div className="flex-1 min-h-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Files ({files.length})</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiles([])}
                  disabled={isUploading}
                >
                  Clear All
                </Button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((fileItem) => (
                  <div
                    key={fileItem.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex-shrink-0">
                      {getStatusIcon(fileItem.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">
                          {fileItem.file.name}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {getStatusText(fileItem.status)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{(fileItem.file.size / 1024).toFixed(1)} KB</span>
                        {fileItem.status === 'error' && fileItem.error && (
                          <span className="text-red-500">• {fileItem.error}</span>
                        )}
                      </div>
                      
                      {(fileItem.status === 'uploading' || fileItem.status === 'processing') && (
                        <Progress value={fileItem.progress} className="mt-2 h-1" />
                      )}
                    </div>
                    
                    {!isUploading && fileItem.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(fileItem.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {files.length > 0 && (
              <>
                {files.filter(f => f.status === 'completed').length} completed, {' '}
                {files.filter(f => f.status === 'error').length} failed, {' '}
                {files.filter(f => f.status === 'pending').length} pending
              </>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              {hasCompleted ? 'Done' : 'Cancel'}
            </Button>
            
            {canUpload && (
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Files
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 