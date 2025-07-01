import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { testConnection, closeConnectionPool } from '../../../lib/database/config';
import { initializeTables, getTableInfo, cleanupOldData } from '../../../lib/database/models';
import { EquipmentDatabaseService } from '../../../lib/database/equipment-db-service';
import { connectorService } from '../../../lib/services/connector-service';
import { EquipmentClassifier } from '../../../lib/classifiers/equipment-classifier';
import { Equipment, ConnectionState, EquipmentStatus } from '../../../types/equipment';

interface DatabaseStatusResponse {
  success: boolean;
  connection: {
    status: 'connected' | 'failed';
    info?: Record<string, unknown>;
    error?: string;
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
}

interface DatabaseActionRequest {
  action: 'initialize' | 'cleanup' | 'test' | 'reset' | 'clear' | 'populate-from-csv';
  options?: {
    cleanupDays?: number;
    force?: boolean;
  };
}

// GET - Database status and information
export async function GET(): Promise<NextResponse<DatabaseStatusResponse>> {
  console.log('[DATABASE API] Getting database status');
  
  try {
    // Instantiate the service
    const dbService = new EquipmentDatabaseService();

    // Test connection
    const connectionResult = await testConnection();
    
    const response: DatabaseStatusResponse = {
      success: connectionResult.success,
      connection: {
        status: connectionResult.success ? 'connected' : 'failed',
        info: connectionResult.info,
        error: connectionResult.error
      },
      tables: {
        initialized: false,
        equipment: { count: 0, latest: null },
        points: { count: 0, latest: null },
        sessions: { count: 0, latest: null }
      }
    };

    if (connectionResult.success) {
      try {
        // Get table information
        const tableInfo = await getTableInfo();
        response.tables = {
          initialized: true,
          ...tableInfo
        };

        // Get statistics if tables exist
        const statistics = await dbService.getStatistics();
        response.statistics = statistics;

      } catch (error) {
        console.warn('[DATABASE API] Tables not initialized or error getting info:', error);
        response.tables.initialized = false;
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[DATABASE API] Error getting database status:', error);
    
    return NextResponse.json({
      success: false,
      connection: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      tables: {
        initialized: false,
        equipment: { count: 0, latest: null },
        points: { count: 0, latest: null },
        sessions: { count: 0, latest: null }
      }
    });
  }
}

// POST - Database actions (initialize, cleanup, etc.)
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[DATABASE API] Processing database action');
  
  try {
    const body = await request.json() as DatabaseActionRequest;
    const { action, options = {} } = body;

    console.log('[DATABASE API] Action requested:', { action, options });

    // Instantiate the service
    const dbService = new EquipmentDatabaseService();

    switch (action) {
      case 'populate-from-csv':
        {
          console.log('[DATABASE API] Populating equipment from CSV data');
          const equipmentNames = connectorService.getAllEquipmentNames();
          let count = 0;
          for (const name of equipmentNames) {
            const metadata = connectorService.getEquipmentMetadata(name);
            const equipmentType = EquipmentClassifier.classifyFromFilename(name).equipmentType;

            const equipment: Equipment = {
              id: nanoid(),
              name: metadata.name || name,
              displayName: metadata.name || name,
              type: equipmentType,
              filename: name,
              status: EquipmentStatus.UNKNOWN,
              connectionState: ConnectionState.CLOSED,
              connectionStatus: 'unknown',
              vendor: metadata.vendor || 'Unknown',
              modelName: metadata.model || 'Unknown',
              points: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            await dbService.storeEquipmentWithPoints(name, equipment, []);
            count++;
          }
          return NextResponse.json({
            success: true,
            message: `Successfully populated ${count} equipment records from CSV.`,
          });
        }
      case 'test':
        {
          const result = await testConnection();
          return NextResponse.json({
            success: result.success,
            message: result.success ? 'Database connection successful' : 'Database connection failed',
            info: result.info,
            error: result.error
          });
        }

      case 'initialize':
        {
          // Test connection first
          const connectionTest = await testConnection();
          if (!connectionTest.success) {
            return NextResponse.json({
              success: false,
              message: 'Cannot initialize: Database connection failed',
              error: connectionTest.error
            }, { status: 500 });
          }

          // Initialize tables
          await initializeTables();
          
          // Get updated table info
          const tableInfo = await getTableInfo();
          
          return NextResponse.json({
            success: true,
            message: 'Database tables initialized successfully',
            tables: tableInfo
          });
        }

      case 'cleanup':
        {
          const days = options.cleanupDays || 30;
          const result = await cleanupOldData(days);
          
          return NextResponse.json({
            success: true,
            message: `Cleanup completed: removed data older than ${days} days`,
            deleted: result
          });
        }

      case 'reset':
        {
          if (!options.force) {
            return NextResponse.json({
              success: false,
              message: 'Reset requires force=true option for safety'
            }, { status: 400 });
          }

          console.log('[DATABASE API] RESET requested - this will delete all data!');
          
          // Drop and recreate tables
          await cleanupOldData(0); // Delete all data
          await initializeTables(); // Recreate tables
          
          return NextResponse.json({
            success: true,
            message: 'Database reset completed - all data deleted',
            warning: 'This action cannot be undone'
          });
        }

      case 'clear':
        {
          console.log('[DATABASE API] Clearing all data');
          
          await dbService.clearAllData();
          
          console.log('[DATABASE API] All data cleared successfully');
          
          return NextResponse.json({
            success: true,
            message: 'All equipment and points data cleared successfully'
          });
        }

      default:
        return NextResponse.json({
          success: false,
          message: `Unknown action: ${action}`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[DATABASE API] Action failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Database action failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Cleanup and close connections
export async function DELETE(): Promise<NextResponse> {
  console.log('[DATABASE API] Closing database connections');
  
  try {
    await closeConnectionPool();
    
    return NextResponse.json({
      success: true,
      message: 'Database connections closed'
    });
  } catch (error) {
    console.error('[DATABASE API] Error closing connections:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error closing database connections',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

 