import { NextRequest, NextResponse } from 'next/server';
import { getConnectionPool } from '../../../../lib/database/config';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { CxAlloyEquipment } from '../../../../types/equipment';

interface CxAlloyEquipmentRow extends RowDataPacket {
  equipment_id: number;
  fk_project: number;
  fk_type: number;
  fk_discipline: number;
  fk_space: number;
  fk_equipmentstatus: number;
  name: string;
  description: string | null;
  notes: string | null;
  dt_ready: Date | null;
  ready_status: string | null;
  is_closed: number;
  d_closed: Date | null;
  is_deleted: number;
  dt_created: Date;
  dt_modified: Date;
  nat_name: string | null;
  // Additional fields from joins
  type_name?: string;
  space_name?: string;
  floor_name?: string;
  building_name?: string;
  status_name?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || '2'; // Default to project 2
    
    const pool = getConnectionPool();
    
    // Query CxAlloy equipment with related information
    // Note: equipmenttype table doesn't exist, so we'll get type info differently
    const query = `
      SELECT 
        e.equipment_id,
        e.fk_project,
        e.fk_type,
        e.fk_discipline,
        e.fk_space,
        e.fk_equipmentstatus,
        e.name,
        e.description,
        e.notes,
        e.dt_ready,
        e.ready_status,
        e.is_closed,
        e.d_closed,
        e.is_deleted,
        e.dt_created,
        e.dt_modified,
        e.nat_name,
        s.name as space_name,
        f.name as floor_name,
        b.name as building_name,
        es.name as status_name
      FROM equipment e
      LEFT JOIN space s ON e.fk_space = s.space_id
      LEFT JOIN floor f ON s.fk_floor = f.floor_id
      LEFT JOIN building b ON f.fk_building = b.building_id
      LEFT JOIN equipmentstatus es ON e.fk_equipmentstatus = es.equipmentstatus_id
      WHERE e.fk_project = ? AND e.is_deleted = 0
      ORDER BY e.name
    `;
    
    const [rows] = await pool.execute<CxAlloyEquipmentRow[]>(query, [projectId]);
    
    // Transform database rows to CxAlloyEquipment format
    const equipment: CxAlloyEquipment[] = rows.map(row => ({
      id: row.equipment_id.toString(),
      name: row.name,
      type: row.name.includes('AHU') ? 'Air Handler' : 
            row.name.includes('CH-') ? 'Chiller' :
            row.name.includes('VAV') ? 'VAV' :
            row.name.includes('RTU') ? 'RTU' :
            'Equipment', // Default type based on name patterns
      description: row.description || '',
      location: row.building_name || '',
      floor: row.floor_name || undefined,
      space: row.space_name || undefined,
      zone: row.space_name || undefined, // Using space as zone for now
      system: undefined, // Will need to be determined differently
      vendor: undefined, // Not available in CxAlloy equipment table
      model: undefined, // Not available in CxAlloy equipment table
      serialNumber: row.nat_name || undefined,
      status: row.status_name || 'Active',
      projectId: row.fk_project,
      createdAt: row.dt_created ? row.dt_created.toISOString() : new Date().toISOString(),
      updatedAt: row.dt_modified ? row.dt_modified.toISOString() : new Date().toISOString(),
    }));
    
    console.log(`[CXALLOY API] Retrieved ${equipment.length} equipment items for project ${projectId}`);
    
    return NextResponse.json({
      success: true,
      equipment,
      projectId: parseInt(projectId),
      total: equipment.length
    });
    
  } catch (error) {
    console.error('[CXALLOY API] Error fetching equipment:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch CxAlloy equipment' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { name, type, description, location, space, vendor, model, projectId = 2 } = body;
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Equipment name is required' },
        { status: 400 }
      );
    }
    
    const pool = getConnectionPool();
    
    // First, try to find or create a space for the equipment
    let spaceId = null;
    if (space && space !== 'TBD') {
      // Check if space exists
      const [spaceRows] = await pool.execute<RowDataPacket[]>(
        'SELECT space_id FROM space WHERE name = ? LIMIT 1',
        [space]
      );
      
      if (spaceRows.length > 0) {
        spaceId = spaceRows[0].space_id;
      }
    }
    
    // Set default status (Active)
    let statusId = 1; // Assuming 1 is Active status
    const [statusRows] = await pool.execute<RowDataPacket[]>(
      'SELECT equipmentstatus_id FROM equipmentstatus WHERE name = ? LIMIT 1',
      ['Active']
    );
    
    if (statusRows.length > 0) {
      statusId = statusRows[0].equipmentstatus_id;
    }
    
    // Create the equipment record
    const insertQuery = `
      INSERT INTO equipment (
        fk_project,
        fk_space,
        fk_equipmentstatus,
        name,
        description,
        notes,
        is_closed,
        is_deleted,
        dt_created,
        dt_modified
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, NOW(), NOW())
    `;
    
    // Create comprehensive notes from the provided data
    const notesParts = [
      vendor && vendor !== 'Unknown' ? `Vendor: ${vendor}` : null,
      model && model !== 'Unknown' ? `Model: ${model}` : null,
      location && location !== 'TBD' ? `Location: ${location}` : null,
      `Created from BACnet equipment mapping`
    ].filter(Boolean);
    
    const equipmentNotes = notesParts.join('; ');
    
    const [insertResult] = await pool.execute<ResultSetHeader>(insertQuery, [
      projectId,
      spaceId,
      statusId,
      name,
      description || `Equipment created from BACnet mapping: ${name}`,
      equipmentNotes
    ]);
    
    const newEquipmentId = insertResult.insertId;
    
    // Fetch the newly created equipment with all related data
    const fetchQuery = `
      SELECT 
        e.equipment_id,
        e.fk_project,
        e.fk_type,
        e.fk_discipline,
        e.fk_space,
        e.fk_equipmentstatus,
        e.name,
        e.description,
        e.notes,
        e.dt_ready,
        e.ready_status,
        e.is_closed,
        e.d_closed,
        e.is_deleted,
        e.dt_created,
        e.dt_modified,
        e.nat_name,
        s.name as space_name,
        f.name as floor_name,
        b.name as building_name,
        es.name as status_name
      FROM equipment e
      LEFT JOIN space s ON e.fk_space = s.space_id
      LEFT JOIN floor f ON s.fk_floor = f.floor_id
      LEFT JOIN building b ON f.fk_building = b.building_id
      LEFT JOIN equipmentstatus es ON e.fk_equipmentstatus = es.equipmentstatus_id
      WHERE e.equipment_id = ?
    `;
    
    const [equipmentRows] = await pool.execute<CxAlloyEquipmentRow[]>(fetchQuery, [newEquipmentId]);
    
    if (equipmentRows.length === 0) {
      throw new Error('Failed to retrieve created equipment');
    }
    
    const row = equipmentRows[0];
    const newEquipment: CxAlloyEquipment = {
      id: row.equipment_id.toString(),
      name: row.name,
      type: type || (row.name.includes('AHU') ? 'Air Handler' : 
                    row.name.includes('CH-') ? 'Chiller' :
                    row.name.includes('VAV') ? 'VAV' :
                    row.name.includes('RTU') ? 'RTU' :
                    'Equipment'),
      description: row.description || '',
      location: row.building_name || location || '',
      floor: row.floor_name || undefined,
      space: row.space_name || space || undefined,
      zone: row.space_name || undefined,
      system: undefined,
      vendor: vendor || undefined,
      model: model || undefined,
      serialNumber: row.nat_name || undefined,
      status: row.status_name || 'Active',
      projectId: row.fk_project,
      createdAt: row.dt_created ? row.dt_created.toISOString() : new Date().toISOString(),
      updatedAt: row.dt_modified ? row.dt_modified.toISOString() : new Date().toISOString(),
    };
    
    console.log(`[CXALLOY API] Created new equipment: ${newEquipment.name} (ID: ${newEquipment.id})`);
    
    return NextResponse.json({
      success: true,
      equipment: newEquipment,
      message: 'Equipment created successfully'
    });
    
  } catch (error) {
    console.error('[CXALLOY API] Error creating equipment:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create CxAlloy equipment' 
      },
      { status: 500 }
    );
  }
}