import { NextRequest, NextResponse } from 'next/server';

// Rate limiting storage (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMITS = {
  '/api/upload': { requests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  '/api/process': { requests: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  '/api/equipment': { requests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  '/api/templates': { requests: 50, windowMs: 60 * 1000 }, // 50 requests per minute
  '/api/export': { requests: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  default: { requests: 60, windowMs: 60 * 1000 } // 60 requests per minute for other routes
};

function getRateLimitKey(request: NextRequest): string {
  // Use IP address for rate limiting (in production, consider user ID)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded ? forwarded.split(',')[0] : realIp || 'unknown';
  return ip;
}

function getRateLimitConfig(pathname: string) {
  for (const [path, config] of Object.entries(RATE_LIMITS)) {
    if (path !== 'default' && pathname.startsWith(path)) {
      return config;
    }
  }
  return RATE_LIMITS.default;
}

function isRateLimited(key: string, config: { requests: number; windowMs: number }): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(key);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize rate limit
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return false;
  }

  if (userLimit.count >= config.requests) {
    return true;
  }

  userLimit.count++;
  rateLimitMap.set(key, userLimit);
  return false;
}

function cleanupExpiredRateLimits(): void {
  const now = Date.now();
  for (const [key, limit] of rateLimitMap.entries()) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Clean up expired rate limits every 5 minutes
setInterval(cleanupExpiredRateLimits, 5 * 60 * 1000);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply middleware to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Security headers
  const response = NextResponse.next();
  
  // Basic security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS headers for API routes
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers });
  }

  // Rate limiting
  const rateLimitKey = getRateLimitKey(request);
  const rateLimitConfig = getRateLimitConfig(pathname);

  if (isRateLimited(rateLimitKey, rateLimitConfig)) {
    const resetTime = rateLimitMap.get(rateLimitKey)?.resetTime || Date.now();
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    return NextResponse.json(
      {
        success: false,
        message: 'Rate limit exceeded',
        error: 'Too many requests',
        retryAfter
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': rateLimitConfig.requests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime.toString(),
          ...Object.fromEntries(response.headers.entries())
        }
      }
    );
  }

  // Add rate limit headers to successful responses
  const userLimit = rateLimitMap.get(rateLimitKey);
  if (userLimit) {
    response.headers.set('X-RateLimit-Limit', rateLimitConfig.requests.toString());
    response.headers.set('X-RateLimit-Remaining', (rateLimitConfig.requests - userLimit.count).toString());
    response.headers.set('X-RateLimit-Reset', userLimit.resetTime.toString());
  }

  // Content-Type validation for POST/PUT requests
  if (['POST', 'PUT'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    
    // Allow multipart/form-data for file uploads
    if (pathname === '/api/upload') {
      if (!contentType?.startsWith('multipart/form-data')) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid content type for file upload',
            error: 'Expected multipart/form-data'
          },
          { status: 400 }
        );
      }
    } else {
      // Require JSON for other API endpoints
      if (!contentType?.includes('application/json')) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid content type',
            error: 'Expected application/json'
          },
          { status: 400 }
        );
      }
    }
  }

  // Request size validation (10MB for uploads, 1MB for others)
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength);
    const maxSize = pathname === '/api/upload' ? 10 * 1024 * 1024 : 1024 * 1024;
    
    if (size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          message: 'Request too large',
          error: `Maximum request size is ${maxSize / (1024 * 1024)}MB`
        },
        { status: 413 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: '/api/:path*'
}; 