import { NextRequest, NextResponse } from 'next/server';
import { AutoMappingService } from '../../../lib/services/auto-mapping-service';
import { executeQuery } from '../../../lib/database/config';
import type { Equipment, CxAlloyEquipment } from '../../../types/equipment';

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    const body = await request.json();

    console.log('[AUTO-MAP API] Starting auto-mapping process...');

    // Get equipment data from request body (passed from client store)
    const bacnetEquipment: Equipment[] = body.bacnetEquipment || [];
    const cxAlloyEquipment: CxAlloyEquipment[] = body.cxAlloyEquipment || [];

    console.log(`[AUTO-MAP API] Received ${bacnetEquipment.length} BACnet equipment and ${cxAlloyEquipment.length} CxAlloy equipment from client`);

    if (bacnetEquipment.length === 0 || cxAlloyEquipment.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No equipment data provided for auto-mapping',
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