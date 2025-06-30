import { NextRequest, NextResponse } from 'next/server';
import { processingService, ProcessingOptions, ProcessingResult } from '@/lib/services/processing-service';

interface ProcessRequest {
  fileId: string;
  fileName: string;
  options?: ProcessingOptions;
}

interface ProcessResponse {
  success: boolean;
  message: string;
  fileId?: string;
  result?: ProcessingResult;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ProcessResponse>> {
  try {
    const body: ProcessRequest = await request.json();
    const { fileId, fileName, options = {} } = body;

    if (!fileId || !fileName) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: fileId and fileName',
        error: 'Invalid request parameters'
      }, { status: 400 });
    }

    // Start processing in background
    try {
      const result = await processingService.processFile(fileId, fileName, options);
      
      return NextResponse.json({
        success: true,
        message: 'File processed successfully',
        fileId,
        result
      }, { status: 200 });

    } catch (processingError) {
      return NextResponse.json({
        success: false,
        message: 'Processing failed',
        fileId,
        error: processingError instanceof Error ? processingError.message : 'Unknown processing error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Process API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format',
      error: error instanceof Error ? error.message : 'Request parsing failed'
    }, { status: 400 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');

  if (fileId) {
    // Get status for specific file
    const status = processingService.getProcessingStatus(fileId);
    
    if (!status) {
      return NextResponse.json({
        success: false,
        message: 'Processing job not found',
        error: 'Invalid file ID'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Processing status retrieved',
      status
    });
  } else {
    // Get all processing jobs
    const jobs = processingService.getAllProcessingJobs();
    
    return NextResponse.json({
      success: true,
      message: 'All processing jobs retrieved',
      jobs,
      total: jobs.length
    });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const maxAge = searchParams.get('maxAge');
  
  const maxAgeMs = maxAge ? parseInt(maxAge) * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // Default 24 hours
  const cleaned = processingService.cleanupOldJobs(maxAgeMs);

  return NextResponse.json({
    success: true,
    message: `Cleaned up ${cleaned} old processing jobs`,
    cleaned
  });
} 