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
    let totalPointsSaved = 0;
    
    // Process each equipment mapping
    for (const mapping of body.equipmentMappings) {
      console.log(`[SAVE MAPPINGS] Processing equipment: ${mapping.bacnetEquipmentName} -> ${mapping.cxalloyEquipmentName}`);
      console.log(`[SAVE MAPPINGS] Equipment IDs - BACnet: ${mapping.bacnetEquipmentId}, CxAlloy: ${mapping.cxalloyEquipmentId}`);
      
      // Validate that we have the required IDs
      if (!mapping.cxalloyEquipmentId) {
        console.error(`[SAVE MAPPINGS] Missing CxAlloy equipment ID for ${mapping.bacnetEquipmentName}`);
        continue; // Skip this mapping but continue with others
      }
      
      // Update CxAlloy equipment table with ek_skyspark field
      await executeQuery(`
        UPDATE equipment 
        SET ek_skyspark = ?
        WHERE equipment_id = ?
      `, [
        mapping.bacnetEquipmentId,
        parseInt(mapping.cxalloyEquipmentId.toString())
      ], 'UPDATE_CXALLOY_EQUIPMENT_SKYSPARK');
      
      console.log(`[SAVE MAPPINGS] Updated CxAlloy equipment ${mapping.cxalloyEquipmentId} with ek_skyspark: ${mapping.bacnetEquipmentId}`);
      
      // Save tracked points
      let pointsSaved = 0;
      for (const point of mapping.trackedPoints) {
        try {
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
              1, -- Default project (adjust as needed) 
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
        } catch (pointError) {
          console.error(`[SAVE MAPPINGS] Failed to save point ${point.originalName}:`, pointError);
          // Continue with other points even if one fails
        }
      }
      
      console.log(`[SAVE MAPPINGS] Saved ${pointsSaved} points for equipment ${mapping.bacnetEquipmentName}`);
      totalPointsSaved += pointsSaved;
      
      results.push({
        bacnetEquipmentId: mapping.bacnetEquipmentId,
        bacnetEquipmentName: mapping.bacnetEquipmentName,
        cxalloyEquipmentId: mapping.cxalloyEquipmentId,
        cxalloyEquipmentName: mapping.cxalloyEquipmentName,
        pointsSaved,
        totalPoints: mapping.trackedPoints.length
      });
    }
    
    console.log(`[SAVE MAPPINGS] Operation completed: ${body.equipmentMappings.length} equipment mappings, ${totalPointsSaved} points saved`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully saved ${body.equipmentMappings.length} equipment mappings and ${totalPointsSaved} tracked points`,
      data: {
        equipmentMappingsSaved: body.equipmentMappings.length,
        totalPointsSaved,
        results
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