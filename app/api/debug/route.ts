import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { testConnection } from '../../../lib/database/config';
import { getTableInfo } from '../../../lib/database/models';
import { getStorageStatistics, getCacheStatus } from '../../../lib/stores/equipment-store';

interface DebugInfo {
  timestamp: string;
  system: {
    nodeVersion: string;
    platform: string;
    uptime: number;
    memory: {
      used: number;
      total: number;
      heapUsed: number;
      heapTotal: number;
    };
  };
  fileSystem: {
    uploadsDir: {
      exists: boolean;
      path: string;
      fileCount: number;
      totalSize: number;
      recentFiles: Array<{
        name: string;
        size: number;
        created: string;
        modified: string;
      }>;
    };
  };
  rateLimit: {
    activeIPs: number;
    totalRequests: number;
    blockedRequests: number;
  };
  processing: {
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    jobs: Array<{
      fileId: string;
      stage: string;
      progress: number;
      message: string;
      startTime?: string;
      error?: string;
    }>;
  };
  api: {
    endpoints: Array<{
      path: string;
      method: string;
      status: 'healthy' | 'error';
      lastAccessed?: string;
    }>;
  };
  database: {
    connection: {
      status: 'connected' | 'failed' | 'not_configured';
      error?: string;
      info?: Record<string, unknown>;
    };
    tables: {
      initialized: boolean;
      equipment: { count: number; latest: Date | null };
      points: { count: number; latest: Date | null };
      sessions: { count: number; latest: Date | null };
    };
    statistics?: {
      totalEquipment: number;
      totalPoints: number;
      equipmentByType: { [key: string]: number };
      pointsByCategory: { [key: string]: number };
      recentActivity: { date: string; equipment: number; points: number }[];
    };
    cache: {
      inMemoryItems: number;
      fileIds: string[];
    };
  };
}

interface DebugErrorResponse {
  timestamp: string;
  error: string;
  details: string;
}

// Access the rate limiting store from upload route (simplified approach)
// In production, you'd want to use a shared cache/database
const getRateLimitInfo = () => {
  // This is a simplified version - in production you'd access the actual rate limit store
  return {
    activeIPs: 0,
    totalRequests: 0,
    blockedRequests: 0
  };
};

// Access processing store from process route (simplified approach)
const getProcessingInfo = () => {
  // This is a simplified version - in production you'd access the actual processing store
  return {
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    jobs: []
  };
};

// Simple rate limiting tracker for debug info
const rateLimitTracker = {
  requests: 0,
  resetTime: new Date(Date.now() + 60 * 1000),
  limit: 50 // matches the current rate limit
};

export async function GET(): Promise<NextResponse<DebugInfo | DebugErrorResponse>> {
  console.log(`[DEBUG API] Debug info requested at ${new Date().toISOString()}`);
  
  try {
    const debugInfo: DebugInfo = {
      timestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().rss,
          total: process.memoryUsage().rss + process.memoryUsage().external,
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal
        }
      },
      fileSystem: {
        uploadsDir: {
          exists: false,
          path: '',
          fileCount: 0,
          totalSize: 0,
          recentFiles: []
        }
      },
      rateLimit: getRateLimitInfo(),
      processing: getProcessingInfo(),
      api: {
        endpoints: [
          { path: '/api/upload', method: 'POST', status: 'healthy' },
          { path: '/api/process', method: 'POST', status: 'healthy' },
          { path: '/api/equipment', method: 'GET', status: 'healthy' },
          { path: '/api/export', method: 'GET', status: 'healthy' },
          { path: '/api/templates', method: 'GET', status: 'healthy' }
        ]
      },
      database: {
        connection: {
          status: 'not_configured'
        },
        tables: {
          initialized: false,
          equipment: { count: 0, latest: null },
          points: { count: 0, latest: null },
          sessions: { count: 0, latest: null }
        },
        cache: {
          inMemoryItems: 0,
          fileIds: []
        }
      }
    };

    // Check uploads directory
    const uploadDir = path.join(process.cwd(), 'uploads');
    debugInfo.fileSystem.uploadsDir.path = uploadDir;
    debugInfo.fileSystem.uploadsDir.exists = existsSync(uploadDir);

    if (debugInfo.fileSystem.uploadsDir.exists) {
      try {
        const files = await readdir(uploadDir);
        debugInfo.fileSystem.uploadsDir.fileCount = files.length;

        // Get file details for recent files (last 10)
        const fileStats = await Promise.all(
          files.slice(-10).map(async (filename) => {
            try {
              const filepath = path.join(uploadDir, filename);
              const stats = await stat(filepath);
              return {
                name: filename,
                size: stats.size,
                created: stats.birthtime.toISOString(),
                modified: stats.mtime.toISOString()
              };
            } catch (error) {
              console.warn(`Failed to get stats for file ${filename}:`, error);
              return null;
            }
          })
        );

        debugInfo.fileSystem.uploadsDir.recentFiles = fileStats
          .filter((file): file is NonNullable<typeof file> => file !== null)
          .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

        debugInfo.fileSystem.uploadsDir.totalSize = debugInfo.fileSystem.uploadsDir.recentFiles
          .reduce((sum, file) => sum + file.size, 0);

      } catch (error) {
        console.error('Failed to read uploads directory:', error);
      }
    }

    // Test database connection
    try {
      console.log('[DEBUG API] Testing database connection...');
      const connectionResult = await testConnection();
      
      debugInfo.database.connection = {
        status: connectionResult.success ? 'connected' : 'failed',
        info: connectionResult.info,
        error: connectionResult.error
      };

      if (connectionResult.success) {
        try {
          // Get table information
          const tableInfo = await getTableInfo();
          debugInfo.database.tables = {
            initialized: true,
            ...tableInfo
          };

          // Get storage statistics
          const statistics = await getStorageStatistics();
          debugInfo.database.statistics = statistics;

          console.log('[DEBUG API] Database info retrieved successfully');
        } catch (error) {
          console.warn('[DEBUG API] Could not get database table info:', error);
          debugInfo.database.tables.initialized = false;
        }
      }

      // Get cache status
      const cacheStatus = getCacheStatus();
      debugInfo.database.cache = cacheStatus;

    } catch (error) {
      console.error('[DEBUG API] Database connection test failed:', error);
      debugInfo.database.connection = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }

    // Update rate limiting info (simplified for debug)
    if (Date.now() > rateLimitTracker.resetTime.getTime()) {
      rateLimitTracker.requests = 0;
      rateLimitTracker.resetTime = new Date(Date.now() + 60 * 1000);
    }
    rateLimitTracker.requests++;

    console.log(`[DEBUG API] Debug info compiled successfully`, {
      uploadsExists: debugInfo.fileSystem.uploadsDir.exists,
      fileCount: debugInfo.fileSystem.uploadsDir.fileCount,
      memoryUsed: Math.round(debugInfo.system.memory.used / 1024 / 1024) + 'MB'
    });

    return NextResponse.json(debugInfo, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Debug-Generated': new Date().toISOString(),
        'X-Debug-System': process.platform,
        'X-Debug-Node': process.version,
        'X-Database-Status': debugInfo.database.connection.status
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('[DEBUG API] Failed to compile debug info:', error);
    
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        error: 'Failed to compile debug information',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Allow clearing caches, resetting rate limits, etc.
  try {
    const body = await request.json();
    const { action } = body;

    console.log(`[DEBUG API] Debug action requested: ${action}`);

    switch (action) {
      case 'clear-uploads':
        // Clear old upload files (implement carefully)
        return NextResponse.json({ 
          success: true, 
          message: 'Upload cleanup not implemented for safety' 
        });

      case 'reset-rate-limits':
        // Reset rate limiting counters (implement with access to actual store)
        return NextResponse.json({ 
          success: true, 
          message: 'Rate limit reset not implemented' 
        });

      case 'clear-processing':
        // Clear completed processing jobs (implement with access to actual store)
        return NextResponse.json({ 
          success: true, 
          message: 'Processing cleanup not implemented' 
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[DEBUG API] Debug action failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Debug action failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 