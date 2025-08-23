'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Zap, 
  FileText, 
  Database, 
  CheckCircle, 
  AlertCircle,
  Clock,
  BarChart3
} from 'lucide-react';

interface ProcessingResult {
  success: boolean;
  scannedFiles: {
    trioFiles: Array<{ name: string; size: number }>;
    csvFiles: {
      bacnetConnections?: { name: string; size: number };
      connectorData?: { name: string; size: number };
    };
    totalFiles: number;
  };
  csvEnhancement: {
    enabled: boolean;
    equipmentCount: number;
    vendorRulesCount: number;
  };
  processedFiles: Array<{
    fileName: string;
    success: boolean;
    pointCount?: number;
    error?: string;
    processingTime?: number;
    enhanced?: boolean;
  }>;
  summary: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalEquipment: number;
    totalPoints: number;
    enhancedFiles: number;
    averageConfidence: number;
  };
  sessionId: string;
}

interface AutoProcessButtonProps {
  onProcessingComplete?: (result: ProcessingResult) => void;
}

export function AutoProcessButton({ onProcessingComplete }: AutoProcessButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);

  const scanFiles = async () => {
    try {
      const response = await fetch('/api/auto-process', { method: 'GET' });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan files');
      }
      
      setScanResult(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
      return null;
    }
  };

  const processFiles = async () => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      console.log('[Auto Process] Starting processing...');
      
      const response = await fetch('/api/auto-process', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Processing failed');
      }
      
      setResult(data);
      
      if (onProcessingComplete) {
        onProcessingComplete(data);
      }
      
      console.log('[Auto Process] Processing completed:', data.summary);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      setError(errorMessage);
      console.error('[Auto Process] Processing failed:', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Initial scan on first render
  React.useEffect(() => {
    scanFiles();
  }, []);

  const csvEnhancementReady = scanResult?.csvEnhancementAvailable;
  const hasTrioFiles = (scanResult?.scan?.trioFiles?.length || 0) > 0;
  const readyToProcess = hasTrioFiles;

  return (
    <div className="space-y-4">
      {/* Auto Process Button and Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Auto Re-process Data
          </CardTitle>
          <CardDescription>
            Re-process all TRIO files from the sample_data directory with CSV enhancement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Status */}
          {scanResult && (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{scanResult.scan?.trioFiles?.length || 0}</span>
                </div>
                <p className="text-xs text-gray-500">TRIO Files</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Database className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{Object.keys(scanResult.scan?.csvFiles || {}).length}</span>
                </div>
                <p className="text-xs text-gray-500">CSV Files</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  {csvEnhancementReady ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="font-medium">
                    {csvEnhancementReady ? 'Ready' : 'Basic'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Enhancement</p>
              </div>
            </div>
          )}

          {/* Enhancement Status */}
          {csvEnhancementReady && (
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <strong>CSV Enhancement Available:</strong> Found equipment metadata files. 
                Processing will include vendor-specific rules and enhanced classification.
              </AlertDescription>
            </Alert>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing files...</span>
                <span>Please wait</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={processFiles} 
              disabled={isProcessing || !readyToProcess}
              className="flex-1"
            >
              <Zap className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-pulse' : ''}`} />
              {isProcessing ? 'Processing...' : 'Process All Files'}
            </Button>
            <Button 
              variant="outline"
              onClick={scanFiles}
              disabled={isProcessing}
            >
              Refresh
            </Button>
          </div>

          {/* No Files Warning */}
          {scanResult && !hasTrioFiles && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No TRIO files found in the sample_data directory. Please add .trio files to get started.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Processing Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Processing Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{result.summary.successfulFiles}</p>
                <p className="text-sm text-gray-600">Successful</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{result.summary.failedFiles}</p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{result.summary.totalPoints}</p>
                <p className="text-sm text-gray-600">Total Points</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{result.summary.averageConfidence.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">Avg Confidence</p>
              </div>
            </div>

            {/* CSV Enhancement Results */}
            {result.csvEnhancement.enabled && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-blue-700">CSV Enhancement Applied</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Equipment Definitions:</span> {result.csvEnhancement.equipmentCount}
                  </div>
                  <div>
                    <span className="font-medium">Vendor Rules:</span> {result.csvEnhancement.vendorRulesCount}
                  </div>
                  <div>
                    <span className="font-medium">Enhanced Files:</span> {result.summary.enhancedFiles}
                  </div>
                </div>
              </div>
            )}

            {/* File Results (first 5) */}
            <div className="space-y-2">
              <h5 className="font-medium">Processing Results (showing first 5):</h5>
              {result.processedFiles.slice(0, 5).map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <div>
                      <p className="font-medium text-sm">{file.fileName}</p>
                      {file.success && (
                        <p className="text-xs text-gray-500">
                          {file.pointCount} points • <Clock className="h-3 w-3 inline" /> {file.processingTime}ms
                        </p>
                      )}
                      {file.error && (
                        <p className="text-xs text-red-500">{file.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.enhanced && (
                      <Badge variant="secondary" className="text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        Enhanced
                      </Badge>
                    )}
                    {file.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
              {result.processedFiles.length > 5 && (
                <p className="text-xs text-gray-500 text-center">
                  ... and {result.processedFiles.length - 5} more files
                </p>
              )}
            </div>

            <div className="text-xs text-gray-500">
              Session ID: {result.sessionId}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
