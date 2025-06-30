import { NextRequest, NextResponse } from 'next/server';
import { ProcessingService, ProcessingResult, ProcessingStatus } from '../../../lib/services/processing-service';
import { storeProcessingResult } from '../../../lib/stores/equipment-store';

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
}

// In-memory store for processing status (in production, use Redis or database)
const processingStore = new Map<string, ProcessingStatus>();

export async function POST(request: NextRequest): Promise<NextResponse<ProcessResponse>> {
  try {
    const body = await request.json() as ProcessRequest;
    const { fileId, filename, options = {} } = body;

    if (!fileId || !filename) {
      return NextResponse.json(
        { success: false, error: 'Missing fileId or filename' },
        { status: 400 }
      );
    }

    // Check if already processing
    const existingStatus = processingStore.get(fileId);
    if (existingStatus && existingStatus.stage !== 'completed' && existingStatus.stage !== 'error') {
      return NextResponse.json(
        { success: false, error: 'File is already being processed' },
        { status: 409 }
      );
    }

    // Initialize processing service
    const processingService = new ProcessingService();

    // Set up status update callback
    const onStatusUpdate = (status: ProcessingStatus) => {
      processingStore.set(fileId, status);
    };

    // Process file
    const result = await processingService.processFile(fileId, filename, onStatusUpdate);

    if (result.success && result.equipment && result.points) {
      // Store the processing result for retrieval via equipment API
      storeProcessingResult(fileId, result.equipment, result.points);
      
      return NextResponse.json({
        success: true,
        result
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during processing' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<ProcessResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'Missing fileId parameter' },
        { status: 400 }
      );
    }

    const status = processingStore.get(fileId);
    
    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Processing status not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const maxAge = searchParams.get('maxAge');
    
    const maxAgeMs = maxAge ? parseInt(maxAge) * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // Default 24 hours
    const cutoffTime = Date.now() - maxAgeMs;
    
    let cleaned = 0;
    for (const [fileId, status] of processingStore.entries()) {
      // Remove completed or errored tasks older than cutoff
      if ((status.stage === 'completed' || status.stage === 'error')) {
        processingStore.delete(fileId);
        cleaned++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleaned} old processing jobs`,
      cleaned
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during cleanup' },
      { status: 500 }
    );
  }
} 