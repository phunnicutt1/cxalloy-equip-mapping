import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.trio', '.csv', '.txt'];

// Simple in-memory rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50; // 50 requests per minute per IP (increased for bulk uploads)

// Debug logging function
function debugLog(message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  console.log(`[UPLOAD DEBUG ${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

function checkRateLimit(clientIP: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const clientData = requestCounts.get(clientIP);
  
  debugLog(`Rate limit check for IP: ${clientIP}`, {
    currentTime: now,
    existingData: clientData,
    totalTrackedIPs: requestCounts.size
  });
  
  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize
    const newData = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    };
    requestCounts.set(clientIP, newData);
    
    debugLog(`Rate limit initialized/reset for IP: ${clientIP}`, {
      newData,
      remaining: MAX_REQUESTS_PER_WINDOW - 1
    });
    
    return { 
      allowed: true, 
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetIn: RATE_LIMIT_WINDOW
    };
  }
  
  if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
    const resetIn = clientData.resetTime - now;
    debugLog(`Rate limit exceeded for IP: ${clientIP}`, {
      currentCount: clientData.count,
      maxAllowed: MAX_REQUESTS_PER_WINDOW,
      resetIn: resetIn,
      resetAt: new Date(clientData.resetTime).toISOString()
    });
    
    return { 
      allowed: false, 
      remaining: 0,
      resetIn
    };
  }
  
  clientData.count++;
  const remaining = MAX_REQUESTS_PER_WINDOW - clientData.count;
  const resetIn = clientData.resetTime - now;
  
  debugLog(`Rate limit updated for IP: ${clientIP}`, {
    newCount: clientData.count,
    remaining,
    resetIn
  });
  
  return { 
    allowed: true, 
    remaining,
    resetIn
  };
}

interface UploadResponse {
  success: boolean;
  fileId?: string;
  filename?: string;
  size?: number;
  error?: string;
  debug?: {
    timestamp: string;
    clientIP: string;
    rateLimit: {
      remaining: number;
      resetIn: number;
    };
    processingTime: number;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  const startTime = Date.now();
  const requestId = nanoid(8);
  
  debugLog(`Upload request started`, { requestId, url: request.url });
  
  try {
    // Check rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);
    
    if (!rateLimitResult.allowed) {
      const errorResponse = {
        success: false,
        error: 'Too many requests. Please wait before uploading again.',
        debug: {
          timestamp: new Date().toISOString(),
          clientIP,
          rateLimit: {
            remaining: rateLimitResult.remaining,
            resetIn: rateLimitResult.resetIn
          },
          processingTime: Date.now() - startTime
        }
      };
      
      debugLog(`Rate limit exceeded`, { requestId, errorResponse });
      
      return NextResponse.json(errorResponse, { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil(rateLimitResult.resetIn / 1000).toString(),
          'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil((Date.now() + rateLimitResult.resetIn) / 1000).toString(),
          'X-Debug-Request-ID': requestId
        }
      });
    }

    debugLog(`Processing form data`, { requestId, clientIP });
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      debugLog(`No file provided`, { requestId, formDataKeys: Array.from(formData.keys()) });
      return NextResponse.json(
        { 
          success: false, 
          error: 'No file provided',
          debug: {
            timestamp: new Date().toISOString(),
            clientIP,
            rateLimit: {
              remaining: rateLimitResult.remaining,
              resetIn: rateLimitResult.resetIn
            },
            processingTime: Date.now() - startTime
          }
        },
        { status: 400, headers: { 'X-Debug-Request-ID': requestId } }
      );
    }

    debugLog(`File received`, { 
      requestId, 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type 
    });

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      debugLog(`File size validation failed`, { 
        requestId, 
        fileSize: file.size, 
        maxSize: MAX_FILE_SIZE 
      });
      return NextResponse.json(
        { 
          success: false, 
          error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
          debug: {
            timestamp: new Date().toISOString(),
            clientIP,
            rateLimit: {
              remaining: rateLimitResult.remaining,
              resetIn: rateLimitResult.resetIn
            },
            processingTime: Date.now() - startTime
          }
        },
        { status: 400, headers: { 'X-Debug-Request-ID': requestId } }
      );
    }

    // Validate file extension
    const fileExtension = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      debugLog(`File extension validation failed`, { 
        requestId, 
        fileExtension, 
        allowedExtensions: ALLOWED_EXTENSIONS 
      });
      return NextResponse.json(
        { 
          success: false, 
          error: `File type not allowed. Supported: ${ALLOWED_EXTENSIONS.join(', ')}`,
          debug: {
            timestamp: new Date().toISOString(),
            clientIP,
            rateLimit: {
              remaining: rateLimitResult.remaining,
              resetIn: rateLimitResult.resetIn
            },
            processingTime: Date.now() - startTime
          }
        },
        { status: 400, headers: { 'X-Debug-Request-ID': requestId } }
      );
    }

    // Ensure upload directory exists
    debugLog(`Checking upload directory`, { requestId, uploadDir: UPLOAD_DIR });
    if (!existsSync(UPLOAD_DIR)) {
      debugLog(`Creating upload directory`, { requestId });
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique file ID and filename
    const fileId = nanoid();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${fileId}_${sanitizedName}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    debugLog(`Saving file`, { 
      requestId, 
      fileId, 
      sanitizedName, 
      filename, 
      filepath 
    });

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    const successResponse = {
      success: true,
      fileId,
      filename: sanitizedName,
      size: file.size,
      debug: {
        timestamp: new Date().toISOString(),
        clientIP,
        rateLimit: {
          remaining: rateLimitResult.remaining,
          resetIn: rateLimitResult.resetIn
        },
        processingTime: Date.now() - startTime
      }
    };

    debugLog(`Upload completed successfully`, { requestId, fileId, processingTime: Date.now() - startTime });

    return NextResponse.json(successResponse, {
      headers: { 'X-Debug-Request-ID': requestId }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    debugLog(`Upload error occurred`, { 
      requestId, 
      error: errorMessage, 
      stack: errorStack,
      processingTime: Date.now() - startTime
    });
    
    console.error('Upload error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during upload',
        debug: {
          timestamp: new Date().toISOString(),
          clientIP: 'unknown',
          rateLimit: {
            remaining: 0,
            resetIn: 0
          },
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

export async function GET(): Promise<NextResponse> {
  debugLog(`Upload info request`);
  
  return NextResponse.json(
    { 
      message: 'File upload endpoint',
      supportedFormats: ALLOWED_EXTENSIONS,
      maxSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      rateLimit: {
        windowMs: RATE_LIMIT_WINDOW,
        maxRequests: MAX_REQUESTS_PER_WINDOW
      },
      debug: {
        timestamp: new Date().toISOString(),
        uploadDir: UPLOAD_DIR,
        directoryExists: existsSync(UPLOAD_DIR),
        activeRateLimits: requestCounts.size
      }
    },
    { status: 200 }
  );
} 