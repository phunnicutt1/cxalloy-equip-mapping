import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database/config';

/**
 * Save Equipment Mappings API Route
 * 
 * This endpoint saves the currently mapped datasources to the CxAlloy equipment by:
 * 1. Updating the CxAlloy equipment table's `ek_skyspark` field with datasource IDs
 * 2. Saving tracked points to the point table and linking them via equipmentpoint table
 */

interface SaveMappingsRequest {
  equipmentMappings: Array<{
    bacnetEquipmentId: string;
    bacnetEquipmentName: string;
    cxalloyEquipmentId: number;
    cxalloyEquipmentName: string;
    trackedPoints: Array<{
      id: string;
      originalName: string;
      normalizedName: string;
      displayName: string;
      description?: string;
      category: string;
      dataType: string;
      units?: string;
      bacnetObjectType?: string;
      bacnetObjectInstance?: number;
      vendorName?: string;
    }>;
  }>;
}

export async function POST(request: NextRequest) {
  console.log('[SAVE MAPPINGS] Starting save mappings operation...');

  try {
    const body: SaveMappingsRequest = await request.json();
    console.log(`[SAVE MAPPINGS] Processing ${body.equipmentMappings.length} equipment mappings`);

    const results = [];
    const allErrors: Array<{ equipment: string; point: string; error: string }> = [];
    let totalPointsSaved = 0;
    let totalPointsFailed = 0;

    // Process each equipment mapping
    for (const mapping of body.equipmentMappings) {
      console.log(`[SAVE MAPPINGS] Processing equipment: ${mapping.bacnetEquipmentName} -> ${mapping.cxalloyEquipmentName}`);
      console.log(`[SAVE MAPPINGS] Equipment IDs - BACnet: ${mapping.bacnetEquipmentId}, CxAlloy: ${mapping.cxalloyEquipmentId}`);
      console.log(`[SAVE MAPPINGS] Tracked points count: ${mapping.trackedPoints.length}`);

      // Validate that we have the required IDs
      if (!mapping.cxalloyEquipmentId) {
        const error = `Missing CxAlloy equipment ID for ${mapping.bacnetEquipmentName}`;
        console.error(`[SAVE MAPPINGS] ${error}`);
        allErrors.push({
          equipment: mapping.bacnetEquipmentName,
          point: 'N/A',
          error
        });
        continue; // Skip this mapping but continue with others
      }

      // Update CxAlloy equipment table with ek_skyspark field
      try {
        await executeQuery(`
          UPDATE equipment
          SET ek_skyspark = ?
          WHERE equipment_id = ?
        `, [
          mapping.bacnetEquipmentId,
          parseInt(mapping.cxalloyEquipmentId.toString())
        ], 'UPDATE_CXALLOY_EQUIPMENT_SKYSPARK');

        console.log(`[SAVE MAPPINGS] ✓ Updated CxAlloy equipment ${mapping.cxalloyEquipmentId} with ek_skyspark: ${mapping.bacnetEquipmentId}`);
      } catch (equipError) {
        const error = `Failed to update equipment: ${equipError instanceof Error ? equipError.message : String(equipError)}`;
        console.error(`[SAVE MAPPINGS] ${error}`);
        allErrors.push({
          equipment: mapping.bacnetEquipmentName,
          point: 'Equipment Update',
          error
        });
        continue;
      }

      // Save tracked points
      let pointsSaved = 0;
      const pointErrors: Array<{ point: string; error: string }> = [];

      for (const point of mapping.trackedPoints) {
        try {
          // Validate point data
          if (!point.originalName) {
            throw new Error('Missing originalName');
          }
          if (!point.id) {
            throw new Error('Missing point ID (ek_skyspark)');
          }

          console.log(`[SAVE MAPPINGS] Processing point: ${point.originalName} (ek_skyspark: ${point.id})`);

          // First, insert or update point in the point table
          await executeQuery(`
            INSERT INTO point (name, description, point_type)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
              description = COALESCE(VALUES(description), description),
              dt_modified = NOW()
          `, [
            point.originalName,
            point.description || '',
            'sensor' // Default to sensor type
          ], `INSERT_POINT_${point.id}`);

          // Get the point_id (either from insert or existing record)
          const pointResult = await executeQuery(`
            SELECT point_id FROM point WHERE name = ?
          `, [point.originalName], `GET_POINT_ID_${point.id}`) as any[];

          if (!pointResult || pointResult.length === 0) {
            throw new Error(`Failed to get point_id for point: ${point.originalName}`);
          }

          const pointId = (pointResult[0] as any).point_id;
          console.log(`[SAVE MAPPINGS] Point ID from database: ${pointId}`);

          // Now insert or update the equipmentpoint record with proper foreign keys
          await executeQuery(`
            INSERT INTO equipmentpoint (
              fk_account,
              fk_project,
              fk_equipment,
              fk_point,
              fk_gateway,
              ek_skyspark,
              name,
              is_tracked
            ) VALUES (
              1, -- Default account (adjust as needed)
              2, -- Project ID 2
              ?,
              ?,
              1, -- Default gateway (adjust as needed)
              ?,
              ?,
              1
            )
            ON DUPLICATE KEY UPDATE
              ek_skyspark = VALUES(ek_skyspark),
              name = VALUES(name),
              is_tracked = 1,
              dt_modified = NOW()
          `, [
            mapping.cxalloyEquipmentId,
            pointId,
            point.id, // point.id already contains the BACnet datasource ID (originalPointId || originalName)
            point.displayName || point.originalName
          ], `SAVE_CXALLOY_POINT_${point.id}`);

          pointsSaved++;
          console.log(`[SAVE MAPPINGS] ✓ Saved point: ${point.originalName}`);
        } catch (pointError) {
          const errorMsg = pointError instanceof Error ? pointError.message : String(pointError);
          console.error(`[SAVE MAPPINGS] ✗ Failed to save point ${point.originalName}:`, errorMsg);
          pointErrors.push({
            point: point.originalName,
            error: errorMsg
          });
          allErrors.push({
            equipment: mapping.bacnetEquipmentName,
            point: point.originalName,
            error: errorMsg
          });
          totalPointsFailed++;
        }
      }

      console.log(`[SAVE MAPPINGS] Equipment ${mapping.bacnetEquipmentName}: ${pointsSaved}/${mapping.trackedPoints.length} points saved`);
      totalPointsSaved += pointsSaved;

      results.push({
        bacnetEquipmentId: mapping.bacnetEquipmentId,
        bacnetEquipmentName: mapping.bacnetEquipmentName,
        cxalloyEquipmentId: mapping.cxalloyEquipmentId,
        cxalloyEquipmentName: mapping.cxalloyEquipmentName,
        pointsSaved,
        pointsFailed: pointErrors.length,
        totalPoints: mapping.trackedPoints.length,
        errors: pointErrors
      });
    }
    
    console.log(`[SAVE MAPPINGS] Operation completed:`);
    console.log(`  - Equipment mappings processed: ${body.equipmentMappings.length}`);
    console.log(`  - Points saved: ${totalPointsSaved}`);
    console.log(`  - Points failed: ${totalPointsFailed}`);
    console.log(`  - Total errors: ${allErrors.length}`);

    // Determine overall success
    const hasErrors = allErrors.length > 0;
    const partialSuccess = totalPointsSaved > 0 && totalPointsFailed > 0;

    return NextResponse.json({
      success: !hasErrors || partialSuccess,
      message: hasErrors
        ? `Saved ${totalPointsSaved} points with ${totalPointsFailed} failures. ${body.equipmentMappings.length} equipment mappings processed.`
        : `Successfully saved ${body.equipmentMappings.length} equipment mappings and ${totalPointsSaved} tracked points`,
      data: {
        equipmentMappingsSaved: body.equipmentMappings.length,
        totalPointsSaved,
        totalPointsFailed,
        results,
        errors: allErrors
      }
    });
    
  } catch (error) {
    console.error('[SAVE MAPPINGS] Operation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to save mappings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}