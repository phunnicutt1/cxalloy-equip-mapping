import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database/config';

/**
 * Save Equipment Mappings API Route
 * 
 * This endpoint saves the currently mapped datasources to the CxAlloy equipment by:
 * 1. Updating the CxAlloy equipment table's `ek_skyspark` field with datasource IDs
 * 2. Saving tracked points to the CxAlloy equipmentpoint table
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
    // First, ensure the ek_skyspark column exists in CxAlloy equipment table
    try {
      await executeQuery(`
        ALTER TABLE equipment 
        ADD COLUMN ek_skyspark VARCHAR(255) NULL
      `, [], 'ADD_EK_SKYSPARK_COLUMN');
      console.log('[SAVE MAPPINGS] Added ek_skyspark column to CxAlloy equipment table');
    } catch (alterError) {
      // Column might already exist, which is fine
      console.log('[SAVE MAPPINGS] ek_skyspark column might already exist in CxAlloy equipment table, continuing...');
    }
    
    const body: SaveMappingsRequest = await request.json();
    console.log(`[SAVE MAPPINGS] Processing ${body.equipmentMappings.length} equipment mappings`);
    
    const results = [];
    let totalPointsSaved = 0;
    
    // Process each equipment mapping
    for (const mapping of body.equipmentMappings) {
      console.log(`[SAVE MAPPINGS] Processing equipment: ${mapping.bacnetEquipmentName} -> ${mapping.cxalloyEquipmentName}`);
      
      // Update CxAlloy equipment table with ek_skyspark field
      await executeQuery(`
        UPDATE equipment 
        SET ek_skyspark = ?
        WHERE equipment_id = ?
      `, [
        mapping.bacnetEquipmentId,
        mapping.cxalloyEquipmentId
      ], 'UPDATE_CXALLOY_EQUIPMENT_SKYSPARK');
      
      console.log(`[SAVE MAPPINGS] Updated CxAlloy equipment ${mapping.cxalloyEquipmentId} with ek_skyspark: ${mapping.bacnetEquipmentId}`);
      
      // Save tracked points to CxAlloy equipmentpoint table
      let pointsSaved = 0;
      for (const point of mapping.trackedPoints) {
        try {
          // First, ensure the equipmentpoint table exists
          try {
            await executeQuery(`
              CREATE TABLE IF NOT EXISTS equipmentpoint (
                equipmentpoint_id INT AUTO_INCREMENT PRIMARY KEY,
                fk_equipment INT NOT NULL,
                point_name VARCHAR(255) NOT NULL,
                normalized_name VARCHAR(255),
                display_name VARCHAR(255),
                description TEXT,
                category VARCHAR(50),
                data_type VARCHAR(50),
                units VARCHAR(50),
                bacnet_object_type VARCHAR(50),
                bacnet_object_instance INT,
                vendor_name VARCHAR(100),
                original_point_id VARCHAR(100),
                ek_skyspark VARCHAR(255),
                dt_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                dt_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (fk_equipment) REFERENCES equipment(equipment_id) ON DELETE CASCADE,
                INDEX idx_equipment (fk_equipment),
                INDEX idx_point_name (point_name),
                INDEX idx_ek_skyspark (ek_skyspark)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `, [], 'CREATE_EQUIPMENTPOINT_TABLE');
          } catch (createError) {
            // Table might already exist, which is fine
          }
          
          // Insert or update point in CxAlloy equipmentpoint table
          await executeQuery(`
            INSERT INTO equipmentpoint (
              fk_equipment, 
              point_name, 
              normalized_name, 
              display_name, 
              description, 
              category, 
              data_type, 
              units, 
              bacnet_object_type, 
              bacnet_object_instance, 
              vendor_name,
              original_point_id,
              ek_skyspark
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              normalized_name = VALUES(normalized_name),
              display_name = VALUES(display_name),
              description = VALUES(description),
              category = VALUES(category),
              data_type = VALUES(data_type),
              units = VALUES(units),
              bacnet_object_type = VALUES(bacnet_object_type),
              bacnet_object_instance = VALUES(bacnet_object_instance),
              vendor_name = VALUES(vendor_name),
              ek_skyspark = VALUES(ek_skyspark),
              dt_modified = NOW()
          `, [
            mapping.cxalloyEquipmentId,
            point.originalName,
            point.normalizedName,
            point.displayName,
            point.description || '',
            point.category,
            point.dataType,
            point.units || null,
            point.bacnetObjectType || null,
            point.bacnetObjectInstance || null,
            point.vendorName || null,
            point.id,
            mapping.bacnetEquipmentId
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