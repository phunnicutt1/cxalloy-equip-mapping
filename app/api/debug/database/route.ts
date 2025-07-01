import { NextRequest, NextResponse } from 'next/server';
import { getConnectionPool } from '../../../../lib/database/config';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  try {
    const connection = await getConnectionPool();
    
    if (action === 'test') {
      const query = 'SELECT 1 + 1 AS result';
      const result = await connection.query(query);
      return NextResponse.json({ success: true, result: result[0] });
    } else if (action === 'check-metadata') {
      // Check metadata for specific equipment
      const equipmentName = url.searchParams.get('name') || 'WSHP_C1_Rm_719';
      const query = `
        SELECT id, equipment_name, equipment_type, metadata 
        FROM equipment_mapping 
        WHERE equipment_name = ? 
        LIMIT 1
      `;
      const result = await connection.query(query, [equipmentName]);
      const rows = result[0] as any[];
      
      if (rows.length > 0) {
        const row = rows[0];
        let parsedMetadata = null;
        try {
          parsedMetadata = JSON.parse(row.metadata || '{}');
        } catch (e) {
          parsedMetadata = { error: 'Failed to parse metadata' };
        }
        
        return NextResponse.json({ 
          success: true, 
          equipment: {
            ...row,
            parsedMetadata
          }
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Equipment not found' 
        });
      }
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid action. Use ?action=test or ?action=check-metadata&name=EQUIPMENT_NAME' 
      });
    }
  } catch (error) {
    console.error('[DEBUG DATABASE API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 