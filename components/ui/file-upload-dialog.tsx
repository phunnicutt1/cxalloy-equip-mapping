'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from './button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from './dialog';
import { Progress } from './progress';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from './badge';

interface FileUploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  result?: unknown;
}

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (results: unknown[]) => void;
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

  const uploadFile = async (fileItem: FileUploadItem, retryCount = 0): Promise<void> => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay
    const uploadId = `${fileItem.id}_${Date.now()}`;
    
    console.log(`[UPLOAD DEBUG] Starting upload for file: ${fileItem.file.name}`, {
      uploadId,
      fileId: fileItem.id,
      fileName: fileItem.file.name,
      fileSize: fileItem.file.size,
      fileType: fileItem.file.type,
      retryCount,
      maxRetries
    });
    
    try {
      // Validate file before upload
      if (!fileItem.file || !fileItem.file.name) {
        throw new Error('Invalid file object');
      }

      // Update status to uploading
      setFiles(prev => 
        prev.map(f => f.id === fileItem.id ? { ...f, status: 'uploading' as const, progress: 0 } : f)
      );

      // Create form data
      const formData = new FormData();
      formData.append('file', fileItem.file);

      console.log(`[UPLOAD DEBUG] Sending upload request`, {
        uploadId,
        url: '/api/upload',
        method: 'POST',
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => [
          key, 
          (value && typeof value === 'object' && 'name' in value && 'size' in value) 
            ? `File(${(value as File).name}, ${(value as File).size} bytes)` 
            : value
        ])
      });

      // Upload file with retry logic for rate limiting
      const uploadStartTime = Date.now();
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadDuration = Date.now() - uploadStartTime;
      
      console.log(`[UPLOAD DEBUG] Upload response received`, {
        uploadId,
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        duration: uploadDuration,
        headers: Object.fromEntries(uploadResponse.headers.entries())
      });

      // Handle rate limiting with exponential backoff
      if (uploadResponse.status === 429) {
        const rateLimitHeaders = {
          remaining: uploadResponse.headers.get('X-RateLimit-Remaining'),
          reset: uploadResponse.headers.get('X-RateLimit-Reset'),
          retryAfter: uploadResponse.headers.get('Retry-After'),
          requestId: uploadResponse.headers.get('X-Debug-Request-ID')
        };
        
        console.log(`[UPLOAD DEBUG] Rate limited response`, {
          uploadId,
          retryCount,
          maxRetries,
          rateLimitHeaders
        });
        
        if (retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
          console.log(`[UPLOAD DEBUG] Rate limited, scheduling retry`, {
            uploadId,
            delay,
            attempt: retryCount + 1,
            totalAttempts: maxRetries + 1
          });
          
          // Update status to show waiting
          setFiles(prev => 
            prev.map(f => f.id === fileItem.id ? { 
              ...f, 
              status: 'uploading' as const, 
              progress: 10,
            } : f)
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return uploadFile(fileItem, retryCount + 1);
        } else {
          console.error(`[UPLOAD DEBUG] Rate limit retries exhausted`, {
            uploadId,
            retryCount,
            maxRetries,
            rateLimitHeaders
          });
          throw new Error('Server is busy. Please try again later.');
        }
      }

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        console.error(`[UPLOAD DEBUG] Upload failed with non-OK status`, {
          uploadId,
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          errorData,
          headers: Object.fromEntries(uploadResponse.headers.entries())
        });
        
        throw new Error(errorData.error || `Upload failed with status ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      
      // Validate upload result
      if (!uploadResult || !uploadResult.fileId || !uploadResult.filename) {
        throw new Error('Invalid upload response: missing fileId or filename');
      }
      
      console.log(`[UPLOAD DEBUG] Upload successful, processing file`, {
        uploadId,
        uploadResult,
        fileId: uploadResult.fileId,
        filename: uploadResult.filename
      });

      // Update status to processing
      setFiles(prev => 
        prev.map(f => f.id === fileItem.id ? { ...f, status: 'processing' as const, progress: 50 } : f)
      );

      // Process the uploaded file
      const processStartTime = Date.now();
      
      console.log(`[UPLOAD DEBUG] Starting file processing`, {
        uploadId,
        fileId: uploadResult.fileId,
        filename: uploadResult.filename
      });
      
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
            includeVendorTags: true,
          }
        }),
      });

      const processDuration = Date.now() - processStartTime;
      
      console.log(`[UPLOAD DEBUG] Process response received`, {
        uploadId,
        status: processResponse.status,
        statusText: processResponse.statusText,
        duration: processDuration,
        headers: Object.fromEntries(processResponse.headers.entries())
      });

      if (!processResponse.ok) {
        const errorText = await processResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          console.warn(`[UPLOAD DEBUG] Failed to parse error response`, { parseError, errorText });
          errorData = { error: errorText };
        }
        
        console.error(`[UPLOAD DEBUG] Processing failed with non-OK status`, {
          uploadId,
          status: processResponse.status,
          statusText: processResponse.statusText,
          errorData,
          headers: Object.fromEntries(processResponse.headers.entries())
        });
        
        throw new Error(errorData.error || `Processing failed with status ${processResponse.status}`);
      }

      const processResult = await processResponse.json();
      
      // Validate process result
      if (!processResult || typeof processResult.success !== 'boolean') {
        throw new Error('Invalid processing response format');
      }
      
      if (!processResult.success) {
        throw new Error(processResult.error || 'Processing failed without specific error');
      }
      
      console.log(`[UPLOAD DEBUG] Processing completed successfully`, {
        uploadId,
        success: processResult.success,
        hasResult: !!processResult.result,
        equipmentId: processResult.result?.equipment?.id,
        pointCount: processResult.result?.points?.length || 0,
        processingDuration: processResult.result?.duration,
        debug: processResult.debug
      });

      // Update status to completed
      setFiles(prev => 
        prev.map(f => f.id === fileItem.id ? { 
          ...f, 
          status: 'completed' as const, 
          progress: 100,
          result: {
            fileId: uploadResult.fileId,
            filename: uploadResult.filename,
            equipment: processResult.result?.equipment,
            points: processResult.result?.points || []
          }
        } : f)
      );

    } catch (error) {
      const errorInfo = {
        message: '',
        type: typeof error,
        name: '',
        stack: undefined as string | undefined,
        raw: error
      };

      if (error instanceof Error) {
        errorInfo.message = error.message;
        errorInfo.name = error.name;
        errorInfo.stack = error.stack;
      } else if (typeof error === 'string') {
        errorInfo.message = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorInfo.message = String(error.message);
      } else {
        errorInfo.message = 'Unknown error occurred';
      }
      
      console.error(`[UPLOAD DEBUG] Upload/processing failed with error`, {
        uploadId,
        errorInfo,
        retryCount,
        fileId: fileItem.id,
        fileName: fileItem.file.name,
        timestamp: new Date().toISOString()
      });
      
      // Update status to error
      setFiles(prev => 
        prev.map(f => f.id === fileItem.id ? { 
          ...f, 
          status: 'error' as const, 
          progress: 0,
          error: errorInfo.message || 'Upload failed'
        } : f)
      );
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || isUploading) return;
    
    console.log(`[UPLOAD DEBUG] Starting batch upload`, {
      totalFiles: files.length,
      pendingFiles: files.filter(f => f.status === 'pending').length,
      timestamp: new Date().toISOString()
    });
    
    setIsUploading(true);
    
    try {
      const pendingFiles = files.filter(f => f.status === 'pending');
      
      console.log(`[UPLOAD DEBUG] Processing files sequentially`, {
        pendingFiles: pendingFiles.map(f => ({
          id: f.id,
          name: f.file.name,
          size: f.file.size
        }))
      });
      
      // Process files sequentially with delay to avoid overwhelming the server
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        
        console.log(`[UPLOAD DEBUG] Processing file ${i + 1} of ${pendingFiles.length}`, {
          fileId: file.id,
          fileName: file.file.name,
          index: i
        });
        
        // Add a small delay between files to prevent rate limiting
        if (i > 0) {
          const delay = 2000; // 2 second delay between files (increased to respect rate limits)
          console.log(`[UPLOAD DEBUG] Waiting between files`, { delay, fileIndex: i });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        await uploadFile(file);
      }
      
      // Small delay before completion callback to ensure all state updates are processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Collect successful results
      const completedFiles = files.filter(f => f.status === 'completed');
      
      console.log(`[UPLOAD DEBUG] Batch upload completed`, {
        totalFiles: files.length,
        completedFiles: completedFiles.length,
        errorFiles: files.filter(f => f.status === 'error').length,
        results: completedFiles.map(f => ({
          id: f.id,
          name: f.file.name,
          hasResult: !!f.result
        }))
      });
      
      if (completedFiles.length > 0 && onUploadComplete) {
        onUploadComplete(completedFiles.map(f => f.result));
      }
    } catch (error) {
      console.error('[UPLOAD DEBUG] Upload batch failed:', error);
    } finally {
      setIsUploading(false);
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