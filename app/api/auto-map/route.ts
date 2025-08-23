import { NextRequest, NextResponse } from 'next/server';
import { AutoMappingService } from '../../../lib/services/auto-mapping-service';
import { executeQuery } from '../../../lib/database/config';
import type { Equipment, CxAlloyEquipment } from '../../../types/equipment';

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    console.log('[AUTO-MAP API] Starting auto-mapping process with real database data...');

    // Fetch real BACnet equipment from equipment_mapping table (where processed data is stored)
    const bacnetQuery = `
      SELECT 
        id,
        equipment_name as name,
        equipment_type as type,
        metadata,
        original_filename as filename,
        total_points as totalPoints,
        created_at,
        last_updated as updated_at
      FROM equipment_mapping
      WHERE status = 'ACTIVE'
      ORDER BY equipment_name
    `;

    // Fetch real CxAlloy equipment from database  
    const cxAlloyQuery = `
      SELECT 
        e.equipment_id as id,
        e.fk_project as projectId,
        e.name,
        e.description,
        e.nat_name as serialNumber,
        s.name as space,
        COALESCE(b.name, '') as location,
        f.name as floor,
        es.name as status,
        CASE 
          WHEN LOWER(e.name) LIKE '%ahu%' OR LOWER(e.name) LIKE '%air handler%' THEN 'Air Handler Unit'
          WHEN LOWER(e.name) LIKE '%vav%' OR LOWER(e.name) LIKE '%variable air%' THEN 'VAV Controller'
          WHEN LOWER(e.name) LIKE '%rtu%' OR LOWER(e.name) LIKE '%rooftop%' THEN 'RTU Controller'
          WHEN LOWER(e.name) LIKE '%chiller%' OR LOWER(e.name) LIKE '%ch-%' THEN 'Chiller'
          WHEN LOWER(e.name) LIKE '%boiler%' OR LOWER(e.name) LIKE '%bl-%' THEN 'Boiler'
          WHEN LOWER(e.name) LIKE '%pump%' OR LOWER(e.name) LIKE '%p-%' THEN 'Pump'
          WHEN LOWER(e.name) LIKE '%fan%' OR LOWER(e.name) LIKE '%sf-%' OR LOWER(e.name) LIKE '%ef-%' THEN 'Fan'
          WHEN LOWER(e.name) LIKE '%valve%' OR LOWER(e.name) LIKE '%vlv%' THEN 'Valve'
          WHEN LOWER(e.name) LIKE '%damper%' OR LOWER(e.name) LIKE '%dmp%' THEN 'Damper'
          ELSE 'Unknown'
        END as type,
        e.dt_created as created_at,
        e.dt_modified as updated_at
      FROM equipment e
      LEFT JOIN space s ON e.fk_space = s.space_id
      LEFT JOIN floor f ON s.fk_floor = f.floor_id
      LEFT JOIN building b ON f.fk_building = b.building_id
      LEFT JOIN equipmentstatus es ON e.fk_equipmentstatus = es.equipmentstatus_id
      WHERE e.fk_project = 2 AND e.is_deleted = 0
      ORDER BY e.name
    `;

    console.log('[AUTO-MAP API] Fetching equipment data from consolidated database...');
    const [bacnetResults, cxAlloyResults] = await Promise.all([
      executeQuery(bacnetQuery, []),
      executeQuery(cxAlloyQuery, [])
    ]);

    // Transform bacnet results to Equipment format, extracting description from metadata
    const bacnetEquipment: Equipment[] = bacnetResults.map((row: any) => {
      let description = '';
      try {
        if (row.metadata) {
          const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
          description = metadata.description || '';
        }
      } catch (e) {
        console.warn('[AUTO-MAP API] Failed to parse metadata for equipment', row.id);
      }
      
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        description,
        filename: row.filename,
        totalPoints: row.totalPoints,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });
    
    const cxAlloyEquipment = cxAlloyResults as CxAlloyEquipment[];

    console.log(`[AUTO-MAP API] Loaded ${bacnetEquipment.length} BACnet equipment and ${cxAlloyEquipment.length} CxAlloy equipment`);

    if (bacnetEquipment.length === 0 || cxAlloyEquipment.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No equipment data available for auto-mapping',
        bacnetCount: bacnetEquipment.length,
        cxAlloyCount: cxAlloyEquipment.length
      }, { status: 400 });
    }

    // Perform auto-mapping using the service
    console.log('[AUTO-MAP API] Running auto-mapping algorithms...');
    const mappingResult = await AutoMappingService.autoMapEquipment(bacnetEquipment, cxAlloyEquipment);

    // Convert matches to EquipmentMapping format
    const exactMappings = AutoMappingService.convertToEquipmentMappings(mappingResult.exactMappings);
    const suggestedMappings = AutoMappingService.convertToEquipmentMappings(mappingResult.suggestedMappings);

    const processingTime = Date.now() - startTime;
    console.log(`[AUTO-MAP API] Auto-mapping completed in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      data: {
        ...mappingResult,
        exactMappings,
        suggestedMappings,
        stats: {
          ...mappingResult.stats,
          totalProcessingTimeMs: processingTime
        }
      },
      summary: {
        bacnetEquipmentCount: bacnetEquipment.length,
        cxAlloyEquipmentCount: cxAlloyEquipment.length,
        exactMatches: mappingResult.exactMappings.length,
        suggestedMatches: mappingResult.suggestedMappings.length,
        unmatchedBacnet: mappingResult.unmatchedBacnet.length,
        unmatchedCxAlloy: mappingResult.unmatchedCxAlloy.length,
        processingTimeMs: processingTime
      }
    });

  } catch (error) {
    console.error('[AUTO-MAP API] Error during auto-mapping:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Auto-mapping failed',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // GET endpoint for checking auto-mapping capabilities
    const bacnetCountQuery = `SELECT COUNT(*) as count FROM equipment_mapping WHERE status = 'ACTIVE'`;
    const cxAlloyCountQuery = `SELECT COUNT(*) as count FROM equipment WHERE fk_project = 2 AND is_deleted = 0`;

    const [bacnetResult, cxAlloyResult] = await Promise.all([
      executeQuery(bacnetCountQuery, []),
      executeQuery(cxAlloyCountQuery, [])
    ]);

    const bacnetCount = (bacnetResult as any[])[0]?.count || 0;
    const cxAlloyCount = (cxAlloyResult as any[])[0]?.count || 0;

    return NextResponse.json({
      success: true,
      available: bacnetCount > 0 && cxAlloyCount > 0,
      equipment: {
        bacnet: bacnetCount,
        cxAlloy: cxAlloyCount
      },
      capabilities: {
        exactMatching: true,
        fuzzyMatching: true,
        typeAssisted: true,
        confidenceScoring: true,
        bulkProcessing: true
      }
    });

  } catch (error) {
    console.error('[AUTO-MAP API] Error checking capabilities:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check auto-mapping capabilities'
    }, { status: 500 });
  }
}