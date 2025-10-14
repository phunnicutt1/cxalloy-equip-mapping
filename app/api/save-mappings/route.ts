import { NextRequest, NextResponse } from 'next/server';
import { executeTransaction } from '@/lib/database/config';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';

/**
 * Save Equipment Mappings API Route
 *
 * This endpoint saves the currently mapped datasources to the CxAlloy equipment by:
 * 1. Updating the CxAlloy equipment table's `ek_skyspark` field with datasource IDs
 * 2. Saving tracked points to the point table and linking them via equipmentpoint table
 *
 * Uses database transactions to ensure atomicity and data consistency.
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

interface ValidationError {
  field: string;
  message: string;
}

// Validation helper functions
function validateEquipmentMapping(mapping: SaveMappingsRequest['equipmentMappings'][0]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!mapping.cxalloyEquipmentId) {
    errors.push({ field: 'cxalloyEquipmentId', message: 'CxAlloy equipment ID is required' });
  }

  if (!mapping.bacnetEquipmentId || mapping.bacnetEquipmentId.trim() === '') {
    errors.push({ field: 'bacnetEquipmentId', message: 'BACnet equipment ID is required' });
  }

  return errors;
}

function validatePoint(point: SaveMappingsRequest['equipmentMappings'][0]['trackedPoints'][0]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!point.originalName || point.originalName.trim() === '') {
    errors.push({ field: 'originalName', message: 'Point name is required' });
  }

  if (!point.id || point.id.trim() === '') {
    errors.push({ field: 'id', message: 'Point ID (ek_skyspark) is required' });
  }

  // Validate name length (MySQL VARCHAR constraints)
  if (point.originalName && point.originalName.length > 255) {
    errors.push({ field: 'originalName', message: 'Point name exceeds maximum length (255)' });
  }

  return errors;
}

// Helper to query foreign keys with caching
async function getDefaultForeignKeys(connection: PoolConnection): Promise<{
  accountId: number;
  projectId: number;
  gatewayId: number;
}> {
  try {
    // Query for default account (first account)
    const [accountRows] = await connection.execute<RowDataPacket[]>(
      'SELECT account_id FROM account ORDER BY account_id LIMIT 1'
    );
    const accountId = accountRows.length > 0 ? accountRows[0].account_id : 1;

    // Query for default project (project_id = 2 is common default, otherwise first available)
    const [projectRows] = await connection.execute<RowDataPacket[]>(
      'SELECT project_id FROM project WHERE project_id = 2 LIMIT 1'
    );
    let projectId = projectRows.length > 0 ? projectRows[0].project_id : null;

    // If project_id 2 doesn't exist, get the first available project
    if (!projectId) {
      const [fallbackRows] = await connection.execute<RowDataPacket[]>(
        'SELECT project_id FROM project ORDER BY project_id LIMIT 1'
      );
      projectId = fallbackRows.length > 0 ? fallbackRows[0].project_id : 2;
    }

    // Query for default gateway (first gateway)
    const [gatewayRows] = await connection.execute<RowDataPacket[]>(
      'SELECT gateway_id FROM gateway ORDER BY gateway_id LIMIT 1'
    );
    const gatewayId = gatewayRows.length > 0 ? gatewayRows[0].gateway_id : 1;

    console.log('[SAVE MAPPINGS] Resolved foreign keys:', { accountId, projectId, gatewayId });
    return { accountId, projectId, gatewayId };
  } catch (error) {
    console.warn('[SAVE MAPPINGS] Could not fetch foreign keys, using defaults', error);
    // Fallback to hardcoded defaults
    return { accountId: 1, projectId: 2, gatewayId: 1 };
  }
}

// Helper to save a single point within a transaction
async function savePoint(
  connection: PoolConnection,
  point: SaveMappingsRequest['equipmentMappings'][0]['trackedPoints'][0],
  cxalloyEquipmentId: number,
  foreignKeys: { accountId: number; projectId: number; gatewayId: number }
): Promise<void> {
  // Insert or update point in the point table
  await connection.execute(
    `INSERT INTO point (name, description, point_type)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       description = COALESCE(VALUES(description), description),
       dt_modified = NOW()`,
    [
      point.originalName,
      point.description || '',
      'sensor' // Default to sensor type
    ]
  );

  // Get the point_id
  const [pointResult] = await connection.execute<RowDataPacket[]>(
    'SELECT point_id FROM point WHERE name = ?',
    [point.originalName]
  );

  if (!pointResult || pointResult.length === 0) {
    throw new Error(`Failed to get point_id for point: ${point.originalName}`);
  }

  const pointId = pointResult[0].point_id;

  // Insert or update the equipmentpoint record
  await connection.execute(
    `INSERT INTO equipmentpoint (
       fk_account,
       fk_project,
       fk_equipment,
       fk_point,
       fk_gateway,
       ek_skyspark,
       name,
       is_tracked
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       ek_skyspark = VALUES(ek_skyspark),
       name = VALUES(name),
       is_tracked = 1,
       dt_modified = NOW()`,
    [
      foreignKeys.accountId,
      foreignKeys.projectId,
      cxalloyEquipmentId,
      pointId,
      foreignKeys.gatewayId,
      point.id,
      point.displayName || point.originalName
    ]
  );
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

    // Process each equipment mapping using transactions
    for (const mapping of body.equipmentMappings) {
      console.log(`[SAVE MAPPINGS] Processing equipment: ${mapping.bacnetEquipmentName} -> ${mapping.cxalloyEquipmentName}`);
      console.log(`[SAVE MAPPINGS] Equipment IDs - BACnet: ${mapping.bacnetEquipmentId}, CxAlloy: ${mapping.cxalloyEquipmentId}`);
      console.log(`[SAVE MAPPINGS] Tracked points count: ${mapping.trackedPoints.length}`);

      // Validate equipment mapping
      const equipmentErrors = validateEquipmentMapping(mapping);
      if (equipmentErrors.length > 0) {
        const error = equipmentErrors.map(e => e.message).join(', ');
        console.error(`[SAVE MAPPINGS] Validation error: ${error}`);
        allErrors.push({
          equipment: mapping.bacnetEquipmentName,
          point: 'N/A',
          error
        });
        continue; // Skip this mapping but continue with others
      }

      // Use transaction to ensure atomicity
      try {
        await executeTransaction(async (connection) => {
          // Get foreign keys once per equipment
          const foreignKeys = await getDefaultForeignKeys(connection);

          // Update CxAlloy equipment table with ek_skyspark field
          await connection.execute(
            `UPDATE equipment
             SET ek_skyspark = ?
             WHERE equipment_id = ?`,
            [
              mapping.bacnetEquipmentId,
              parseInt(mapping.cxalloyEquipmentId.toString())
            ]
          );

          console.log(`[SAVE MAPPINGS] ✓ Updated CxAlloy equipment ${mapping.cxalloyEquipmentId} with ek_skyspark: ${mapping.bacnetEquipmentId}`);

          // Validate and save all tracked points
          let pointsSaved = 0;
          const pointErrors: Array<{ point: string; error: string }> = [];

          for (const point of mapping.trackedPoints) {
            try {
              // Validate point data
              const pointValidationErrors = validatePoint(point);
              if (pointValidationErrors.length > 0) {
                throw new Error(pointValidationErrors.map(e => e.message).join(', '));
              }

              console.log(`[SAVE MAPPINGS] Processing point: ${point.originalName} (ek_skyspark: ${point.id})`);

              // Save the point using our helper
              await savePoint(connection, point, mapping.cxalloyEquipmentId, foreignKeys);

              pointsSaved++;
              console.log(`[SAVE MAPPINGS] ✓ Saved point: ${point.originalName}`);
            } catch (pointError) {
              const errorMsg = pointError instanceof Error ? pointError.message : String(pointError);
              console.error(`[SAVE MAPPINGS] ✗ Failed to save point ${point.originalName}:`, errorMsg);
              pointErrors.push({
                point: point.originalName,
                error: errorMsg
              });
              // Don't add to allErrors yet - transaction will be rolled back
              throw pointError; // Re-throw to rollback transaction
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
            pointsFailed: 0,
            totalPoints: mapping.trackedPoints.length,
            errors: []
          });
        });
      } catch (transactionError) {
        // Transaction was rolled back
        const error = transactionError instanceof Error ? transactionError.message : String(transactionError);
        console.error(`[SAVE MAPPINGS] Transaction failed for ${mapping.bacnetEquipmentName}:`, error);

        allErrors.push({
          equipment: mapping.bacnetEquipmentName,
          point: 'Transaction',
          error: `Transaction rolled back: ${error}`
        });

        totalPointsFailed += mapping.trackedPoints.length;

        results.push({
          bacnetEquipmentId: mapping.bacnetEquipmentId,
          bacnetEquipmentName: mapping.bacnetEquipmentName,
          cxalloyEquipmentId: mapping.cxalloyEquipmentId,
          cxalloyEquipmentName: mapping.cxalloyEquipmentName,
          pointsSaved: 0,
          pointsFailed: mapping.trackedPoints.length,
          totalPoints: mapping.trackedPoints.length,
          errors: [{ point: 'All points', error }]
        });
      }
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