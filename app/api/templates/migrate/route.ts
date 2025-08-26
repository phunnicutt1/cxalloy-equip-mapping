import { NextRequest, NextResponse } from 'next/server';

interface MigrationResponse {
  success: boolean;
  migrated?: {
    success: number;
    failed: number;
    errors: string[];
  };
  status?: {
    needsMigration: boolean;
    mappingTemplatesCount: number;
    hasBackups: boolean;
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<MigrationResponse>> {
  try {
    // This endpoint is for getting migration status
    // The actual status check needs to be done on the client side since localStorage is involved
    
    return NextResponse.json({
      success: true,
      status: {
        needsMigration: false, // Client will determine this
        mappingTemplatesCount: 0,
        hasBackups: false
      }
    });
  } catch (error) {
    console.error('Migration status error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<MigrationResponse>> {
  try {
    // The migration logic needs to run on the client side since it involves localStorage
    // This endpoint just acknowledges the migration request
    
    const body = await request.json();
    
    // In a real implementation, you might want to:
    // 1. Validate the migration data
    // 2. Store migration logs
    // 3. Update system flags
    
    console.log('Migration data received:', {
      templatesCount: body.templates?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      migrated: {
        success: body.migrated?.success || 0,
        failed: body.migrated?.failed || 0,
        errors: body.migrated?.errors || []
      }
    });
  } catch (error) {
    console.error('Migration POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}