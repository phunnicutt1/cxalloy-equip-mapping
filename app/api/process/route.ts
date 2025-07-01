import { NextRequest, NextResponse } from 'next/server';
import { ProcessingService, ProcessingResult, ProcessingStatus } from '../../../lib/services/processing-service';
import { storeProcessingResult } from '../../../lib/stores/equipment-store';
import { nanoid } from 'nanoid';
import { existsSync } from 'fs';
import path from 'path';

interface ProcessRequest {
  fileId: string;
  filename: string;
  options?: {
    enableNormalization?: boolean;
    enableTagging?: boolean;
    includeVendorTags?: boolean;
  };
}

interface ProcessResponse {
  success: boolean;
  result?: ProcessingResult;
  status?: ProcessingStatus;
  error?: string;
  debug?: {
    timestamp: string;
    requestId: string;
    processingTime: number;
    fileExists: boolean;
    storeStatus: string;
  };
}

// In-memory store for processing status (in production, use Redis or database)
const processingStore = new Map<string, ProcessingStatus>();

// Debug logging function
function debugLog(message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  console.log(`[PROCESS DEBUG ${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

export async function POST(request: NextRequest): Promise<NextResponse<ProcessResponse>> {
  const startTime = Date.now();
  const requestId = nanoid(8);
  
  debugLog(`Process request started`, { requestId, url: request.url });

  try {
    const body = await request.json() as ProcessRequest;
    const { fileId, filename, options = {} } = body;

    debugLog(`Process request parsed`, { 
      requestId, 
      fileId, 
      filename, 
      options,
      hasFileId: !!fileId,
      hasFilename: !!filename
    });

    if (!fileId || !filename) {
      const error = 'Missing fileId or filename';
      debugLog(`Validation failed`, { requestId, error, fileId, filename });
      
      return NextResponse.json(
        { 
          success: false, 
          error,
          debug: {
            timestamp: new Date().toISOString(),
            requestId,
            processingTime: Date.now() - startTime,
            fileExists: false,
            storeStatus: 'validation_failed'
          }
        },
        { 
          status: 400,
          headers: { 'X-Debug-Request-ID': requestId }
        }
      );
    }

    // Check if already processing
    const existingStatus = processingStore.get(fileId);
    debugLog(`Checking existing processing status`, { 
      requestId, 
      fileId, 
      existingStatus,
      totalActiveProcesses: processingStore.size
    });
    
    if (existingStatus && existingStatus.stage !== 'completed' && existingStatus.stage !== 'error') {
      const error = 'File is already being processed';
      debugLog(`Already processing`, { requestId, fileId, existingStatus });
      
      return NextResponse.json(
        { 
          success: false, 
          error,
          status: existingStatus,
          debug: {
            timestamp: new Date().toISOString(),
            requestId,
            processingTime: Date.now() - startTime,
            fileExists: true,
            storeStatus: 'already_processing'
          }
        },
        { 
          status: 409,
          headers: { 'X-Debug-Request-ID': requestId }
        }
      );
    }

    // Check if file exists
    const filepath = path.join(process.cwd(), 'uploads', `${fileId}_${filename}`);
    const fileExists = existsSync(filepath);
    
    debugLog(`File existence check`, { 
      requestId, 
      filepath, 
      fileExists,
      fileId,
      filename
    });

    if (!fileExists) {
      const error = `File not found: ${filename}`;
      debugLog(`File not found`, { requestId, filepath, error });
      
      return NextResponse.json(
        { 
          success: false, 
          error,
          debug: {
            timestamp: new Date().toISOString(),
            requestId,
            processingTime: Date.now() - startTime,
            fileExists: false,
            storeStatus: 'file_not_found'
          }
        },
        { 
          status: 404,
          headers: { 'X-Debug-Request-ID': requestId }
        }
      );
    }

    // Initialize processing service
    debugLog(`Initializing processing service`, { requestId });
    const processingService = new ProcessingService();

    // Set up status update callback with debugging
    const onStatusUpdate = (status: ProcessingStatus) => {
      debugLog(`Processing status update`, { requestId, fileId, status });
      processingStore.set(fileId, status);
    };

    debugLog(`Starting file processing`, { 
      requestId, 
      fileId, 
      filename, 
      options,
      filepath
    });

    // Process file
    const result = await processingService.processFile(filepath, onStatusUpdate);

    debugLog(`Processing completed`, { 
      requestId, 
      fileId, 
      success: result.success,
      hasEquipment: !!result.equipment,
      hasPoints: !!result.points,
      pointCount: result.points?.length || 0,
      error: result.error,
      duration: result.duration
    });

    if (result.success && result.equipment && result.points) {
      // Store the processing result for retrieval via equipment API
      try {
        await storeProcessingResult(fileId, result.equipment, result.points);
        debugLog(`Result stored successfully`, { 
          requestId, 
          fileId,
          equipmentId: result.equipment.id,
          pointCount: result.points.length
        });
      } catch (storeError) {
        debugLog(`Failed to store result`, { 
          requestId, 
          fileId, 
          storeError: storeError instanceof Error ? storeError.message : storeError
        });
        
        // Log error but don't fail the request - fallback to in-memory storage
        console.warn(`Database storage failed, using in-memory storage as fallback:`, storeError);
      }
      
      return NextResponse.json({
        success: true,
        result,
        debug: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTime: Date.now() - startTime,
          fileExists: true,
          storeStatus: 'success'
        }
      }, {
        headers: { 'X-Debug-Request-ID': requestId }
      });
    } else {
      const error = result.error || 'Processing failed without specific error';
      debugLog(`Processing failed`, { requestId, fileId, error, result });
      
      return NextResponse.json(
        { 
          success: false, 
          error,
          debug: {
            timestamp: new Date().toISOString(),
            requestId,
            processingTime: Date.now() - startTime,
            fileExists: true,
            storeStatus: 'processing_failed'
          }
        },
        { 
          status: 422,
          headers: { 'X-Debug-Request-ID': requestId }
        }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    debugLog(`Process error occurred`, { 
      requestId, 
      error: errorMessage, 
      stack: errorStack,
      processingTime: Date.now() - startTime
    });
    
    console.error('Processing error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during processing',
        debug: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTime: Date.now() - startTime,
          fileExists: false,
          storeStatus: 'error'
        }
      },
      { 
        status: 500,
        headers: { 'X-Debug-Request-ID': requestId }
      }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<ProcessResponse>> {
  const startTime = Date.now();
  const requestId = nanoid(8);
  
  debugLog(`Status check request started`, { requestId, url: request.url });

  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    debugLog(`Status check parameters`, { requestId, fileId, searchParams: Object.fromEntries(searchParams) });

    if (!fileId) {
      const error = 'Missing fileId parameter';
      debugLog(`Status check validation failed`, { requestId, error });
      
      return NextResponse.json(
        { 
          success: false, 
          error,
          debug: {
            timestamp: new Date().toISOString(),
            requestId,
            processingTime: Date.now() - startTime,
            fileExists: false,
            storeStatus: 'missing_file_id'
          }
        },
        { 
          status: 400,
          headers: { 'X-Debug-Request-ID': requestId }
        }
      );
    }

    const status = processingStore.get(fileId);
    
    debugLog(`Status lookup result`, { 
      requestId, 
      fileId, 
      found: !!status,
      status,
      totalActiveProcesses: processingStore.size
    });
    
    if (!status) {
      const error = 'Processing status not found';
      debugLog(`Status not found`, { requestId, fileId, error });
      
      return NextResponse.json(
        { 
          success: false, 
          error,
          debug: {
            timestamp: new Date().toISOString(),
            requestId,
            processingTime: Date.now() - startTime,
            fileExists: false,
            storeStatus: 'status_not_found'
          }
        },
        { 
          status: 404,
          headers: { 'X-Debug-Request-ID': requestId }
        }
      );
    }

    debugLog(`Status check completed`, { requestId, fileId, status });

    return NextResponse.json({
      success: true,
      status,
      debug: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime,
        fileExists: true,
        storeStatus: 'found'
      }
    }, {
      headers: { 'X-Debug-Request-ID': requestId }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    debugLog(`Status check error occurred`, { 
      requestId, 
      error: errorMessage, 
      stack: errorStack,
      processingTime: Date.now() - startTime
    });
    
    console.error('Status check error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        debug: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTime: Date.now() - startTime,
          fileExists: false,
          storeStatus: 'error'
        }
      },
      { 
        status: 500,
        headers: { 'X-Debug-Request-ID': requestId }
      }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = nanoid(8);
  
  debugLog(`Cleanup request started`, { requestId, url: request.url });

  try {
    const { searchParams } = new URL(request.url);
    const maxAge = searchParams.get('maxAge');
    
    const maxAgeMs = maxAge ? parseInt(maxAge) * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // Default 24 hours
    const cutoffTime = Date.now() - maxAgeMs;
    
    debugLog(`Cleanup parameters`, { 
      requestId, 
      maxAge, 
      maxAgeMs, 
      cutoffTime: new Date(cutoffTime).toISOString(),
      totalJobs: processingStore.size
    });
    
    let cleaned = 0;
    const beforeCleanup = processingStore.size;
    
    for (const [fileId, status] of processingStore.entries()) {
      // Remove completed or errored tasks older than cutoff
      if ((status.stage === 'completed' || status.stage === 'error')) {
        processingStore.delete(fileId);
        cleaned++;
        debugLog(`Cleaned up job`, { requestId, fileId, status: status.stage });
      }
    }

    const afterCleanup = processingStore.size;
    
    debugLog(`Cleanup completed`, { 
      requestId, 
      beforeCleanup, 
      afterCleanup, 
      cleaned,
      processingTime: Date.now() - startTime
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleaned} old processing jobs`,
      cleaned,
      debug: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime,
        beforeCleanup,
        afterCleanup
      }
    }, {
      headers: { 'X-Debug-Request-ID': requestId }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    debugLog(`Cleanup error occurred`, { 
      requestId, 
      error: errorMessage, 
      stack: errorStack,
      processingTime: Date.now() - startTime
    });
    
    console.error('Cleanup error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during cleanup',
        debug: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTime: Date.now() - startTime
        }
      },
      { 
        status: 500,
        headers: { 'X-Debug-Request-ID': requestId }
      }
    );
  }
} 