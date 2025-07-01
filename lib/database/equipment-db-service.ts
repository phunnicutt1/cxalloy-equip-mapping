import { nanoid } from 'nanoid';
import { Equipment, ConnectionState, EquipmentStatus } from '../../types/equipment';
import { NormalizedPoint, PointFunction, NormalizationConfidence } from '../../types/normalized';
import { BACnetObjectType, PointDataType, PointCategory } from '../../types/point';
import { executeQuery, executeTransaction } from './config';
import { EquipmentRecord, PointRecord, MappingSessionRecord, DbConnectionState } from './models';

// Mapping function to convert equipment status to database ENUM values
function mapEquipmentStatusToDbEnum(status: string): string {
  // Handle case variations and convert to proper ENUM values
  const upperStatus = status.toUpperCase();
  
  switch (upperStatus) {
    case 'ACTIVE':
    case 'OPERATIONAL':
    case 'ONLINE':
      return 'ACTIVE';
    case 'INACTIVE':
    case 'OFFLINE':
      return 'INACTIVE';
    case 'MAINTENANCE':
      return 'MAINTENANCE';
    case 'ERROR':
    case 'FAULT':
      return 'ERROR';
    default:
      console.warn(`[DB SERVICE] Unknown equipment status "${status}", using ACTIVE`);
      return 'ACTIVE';
  }
}

// Mapping function to convert connection state to database ENUM values
function mapConnectionStateToDbEnum(connectionState: string): string {
  const upperState = connectionState.toUpperCase();
  
  switch (upperState) {
    case 'CONNECTED':
    case 'OPEN':
    case 'ONLINE':
      return 'CONNECTED';
    case 'DISCONNECTED':
    case 'CLOSED':
    case 'OFFLINE':
      return 'DISCONNECTED';
    case 'CONNECTING':
    case 'TIMEOUT':
      return 'TIMEOUT';
    case 'ERROR':
    case 'FAULT':
      return 'ERROR';
    default:
      console.warn(`[DB SERVICE] Unknown connection state "${connectionState}", using DISCONNECTED`);
      return 'DISCONNECTED';
  }
}

// Mapping function to convert human-readable equipment types to database ENUM values
function mapEquipmentTypeToDbEnum(equipmentType: string): string {
  // Handle exact matches first
  const upperType = equipmentType.toUpperCase().replace(/\s+/g, '_');
  
  // Direct mappings
  const mappings: { [key: string]: string } = {
    'LAB_AIR_VALVE': 'LAB_AIR_VALVE',
    'AIR_HANDLER_UNIT': 'AIR_HANDLER_UNIT',
    'VAV_CONTROLLER': 'VAV_CONTROLLER',
    'RTU_CONTROLLER': 'RTU_CONTROLLER',
    'CHILLER': 'CHILLER',
    'BOILER': 'BOILER',
    'COOLING_TOWER': 'COOLING_TOWER',
    'HEAT_EXCHANGER': 'HEAT_EXCHANGER',
    'PUMP': 'PUMP',
    'FAN': 'FAN',
    'EXHAUST_FAN': 'EXHAUST_FAN',
    'SUPPLY_FAN': 'SUPPLY_FAN',
    'RETURN_FAN': 'RETURN_FAN',
    'DAMPER': 'DAMPER',
    'VALVE': 'VALVE',
    'ACTUATOR': 'ACTUATOR',
    'SENSOR': 'SENSOR',
    'CONTROLLER': 'CONTROLLER',
    'UNIT_HEATER': 'UNIT_HEATER',
    'ZONE_CONTROLLER': 'ZONE_CONTROLLER',
    'FUME_HOOD': 'FUME_HOOD',
    'LIGHTING_CONTROLLER': 'LIGHTING_CONTROLLER',
    'POWER_METER': 'POWER_METER',
    'WEATHER_STATION': 'WEATHER_STATION',
    'FIRE_SYSTEM': 'FIRE_SYSTEM',
    'SECURITY_SYSTEM': 'SECURITY_SYSTEM',
    'ELEVATOR': 'ELEVATOR',
    'ESCALATOR': 'ESCALATOR'
  };

  // Check direct mapping first
  if (mappings[upperType]) {
    return mappings[upperType];
  }

  // Partial matches for common variations
  if (upperType.includes('LAB') && (upperType.includes('AIR') || upperType.includes('VALVE'))) {
    return 'LAB_AIR_VALVE';
  }
  if (upperType.includes('AHU') || upperType.includes('AIR_HANDLER')) {
    return 'AIR_HANDLER_UNIT';
  }
  if (upperType.includes('VAV')) {
    return 'VAV_CONTROLLER';
  }
  if (upperType.includes('RTU')) {
    return 'RTU_CONTROLLER';
  }
  if (upperType.includes('FAN')) {
    if (upperType.includes('EXHAUST')) return 'EXHAUST_FAN';
    if (upperType.includes('SUPPLY')) return 'SUPPLY_FAN';
    if (upperType.includes('RETURN')) return 'RETURN_FAN';
    return 'FAN';
  }
  if (upperType.includes('FUME') && upperType.includes('HOOD')) {
    return 'FUME_HOOD';
  }

  // Default fallback
  console.warn(`[DB SERVICE] Unknown equipment type "${equipmentType}", using UNKNOWN`);
  return 'UNKNOWN';
}

// Mapping function to convert TypeScript PointDataType to database ENUM values
function mapDataTypeToDbEnum(dataType: PointDataType | string): string {
  switch (dataType) {
    case PointDataType.NUMBER:
    case 'Number':
      return 'ANALOG';
    case PointDataType.BOOLEAN:
    case 'Bool':
      return 'BINARY';
    case PointDataType.STRING:
    case 'String':
      return 'STRING';
    case PointDataType.ENUMERATED:
    case 'Enum':
      return 'MULTISTATE';
    default:
      return 'ANALOG'; // Default fallback to ANALOG instead of UNKNOWN
  }
}

// Reverse mapping function to convert database ENUM values to TypeScript PointDataType
function mapDbEnumToDataType(dbEnum: string): PointDataType {
  switch (dbEnum) {
    case 'ANALOG':
      return PointDataType.NUMBER;
    case 'BINARY':
      return PointDataType.BOOLEAN;
    case 'STRING':
      return PointDataType.STRING;
    case 'MULTISTATE':
      return PointDataType.ENUMERATED;
    default:
      return PointDataType.NUMBER; // Default fallback
  }
}

// Reverse mapping function to convert database ENUM values to TypeScript ConnectionState
function mapDbEnumToConnectionState(dbEnum: DbConnectionState): ConnectionState {
  switch (dbEnum) {
    case 'CONNECTED':
      return ConnectionState.OPEN;
    case 'DISCONNECTED':
      return ConnectionState.CLOSED;
    case 'TIMEOUT':
      return ConnectionState.CONNECTING;
    case 'ERROR':
      return ConnectionState.ERROR;
    default:
      return ConnectionState.CLOSED; // Default fallback
  }
}

// Mapping function to convert TypeScript PointCategory to database ENUM values
function mapCategoryToDbEnum(category: PointCategory | string | undefined): string {
  switch (category) {
    case PointCategory.SENSOR:
    case 'SENSOR':
      return 'SENSOR';
    case PointCategory.COMMAND:
    case 'COMMAND':
      return 'COMMAND';
    case PointCategory.STATUS:
    case 'STATUS':
      return 'STATUS';
    case PointCategory.SETPOINT:
    case 'SETPOINT':
      return 'SETPOINT';
    default:
      console.warn(`[DB SERVICE] Unexpected point category value: ${category}, defaulting to PARAMETER`);
      return 'PARAMETER'; // Fallback to PARAMETER instead of UNKNOWN
  }
}

export class EquipmentDatabaseService {
  
  async clearAllData(): Promise<void> {
    console.log('[DB SERVICE] Clearing all data from equipment and point tables');
    // It's better to use TRUNCATE for speed, but DELETE is safer if there are foreign keys without ON DELETE CASCADE
    // We will delete from points first, then equipment to respect foreign key constraints.
    await executeQuery('DELETE FROM point_mapping', [], 'CLEAR_POINTS');
    await executeQuery('DELETE FROM equipment_mapping', [], 'CLEAR_EQUIPMENT');
    console.log('[DB SERVICE] All data cleared.');
  }

  // Store equipment and points in database
  async storeEquipmentWithPoints(
    fileId: string,
    equipment: Equipment,
    points: NormalizedPoint[],
    sessionId?: string
  ): Promise<{ equipmentId: string; pointIds: string[] }> {
    console.log('[DB SERVICE] Storing equipment with points', {
      fileId,
      equipmentId: equipment.id,
      pointCount: points.length,
      sessionId
    });

    return executeTransaction(async (connection) => {
      // Insert equipment record
      const equipmentId = equipment.id;
      const equipmentInsertQuery = `
        INSERT INTO equipment_mapping (
          id, original_file_id, original_filename, equipment_name, equipment_type,
          classification_confidence, status, connection_state, total_points, processed_points,
          haystack_tags, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          equipment_name = VALUES(equipment_name),
          equipment_type = VALUES(equipment_type),
          classification_confidence = VALUES(classification_confidence),
          total_points = VALUES(total_points),
          processed_points = VALUES(processed_points),
          haystack_tags = VALUES(haystack_tags),
          metadata = VALUES(metadata),
          last_updated = CURRENT_TIMESTAMP
      `;

      await connection.execute(equipmentInsertQuery, [
        equipmentId,
        fileId,
        equipment.filename,
        equipment.name || equipment.displayName,
        mapEquipmentTypeToDbEnum(equipment.type), // Convert to database ENUM value
        0.0, // Default classification confidence
        mapEquipmentStatusToDbEnum(equipment.status || 'ACTIVE'),
        mapConnectionStateToDbEnum(equipment.connectionState || 'CONNECTED'),
        points.length,
        points.length,
        JSON.stringify({}), // Empty haystack tags for now
        JSON.stringify({
          originalPoints: equipment.points?.length || 0,
          processingTimestamp: new Date().toISOString(),
          originalEquipmentType: equipment.type, // Store original for reference
          vendor: equipment.vendor,
          model: equipment.modelName,
          description: equipment.description,
          connectionStatus: equipment.connectionStatus,
          ...(equipment.metadata || {}) // Include any additional metadata
        })
      ]);

      // Insert points in batch
      const pointIds: string[] = [];
      if (points.length > 0) {
        const pointInsertQuery = `
          INSERT INTO point_mapping (
            id, equipment_id, original_point_id, original_name, normalized_name,
            display_name, description, category, data_type, units,
            bacnet_object_type, bacnet_object_instance, vendor_name, raw_value,
            haystack_tags, normalization_metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const point of points) {
          const pointId = nanoid();
          pointIds.push(pointId);

          await connection.execute(pointInsertQuery, [
            pointId,
            equipmentId,
            point.originalPointId || null,
            point.originalName || null,
            point.normalizedName || null,
            point.normalizedName || point.originalName || null,
            point.expandedDescription || point.originalDescription || '',
            mapCategoryToDbEnum(point.category),
            mapDataTypeToDbEnum(point.dataType || 'ANALOG'), // Convert to database ENUM value with fallback
            point.units || null,
            point.objectType || null,
            point.objectInstance || null,
            null, // vendor_name - not available in NormalizedPoint
            null, // raw_value - not available in NormalizedPoint
            JSON.stringify(point.haystackTags || {}),
            JSON.stringify({
              normalizationRules: point.normalizationRules || [],
              confidence: point.confidenceScore || 0.0,
              method: point.normalizationMethod || 'unknown',
              originalData: {
                objectType: point.objectType || null,
                dataType: point.dataType || null
              }
            })
          ]);
        }
      }

      console.log('[DB SERVICE] Equipment and points stored successfully', {
        equipmentId,
        pointCount: pointIds.length
      });

      return { equipmentId, pointIds };
    });
  }

  // Retrieve equipment by ID
  async getEquipment(equipmentId: string): Promise<Equipment | null> {
    console.log('[DB SERVICE] Retrieving equipment', { equipmentId });

    const equipmentQuery = 'SELECT * FROM equipment_mapping WHERE id = ?';
    const equipmentRows = await executeQuery<EquipmentRecord>(equipmentQuery, [equipmentId], 'GET_EQUIPMENT');

    if (equipmentRows.length === 0) {
      return null;
    }

    const record = equipmentRows[0];
    
    // Parse metadata to extract vendor and model
    let metadata: any = {};
    try {
      if (typeof record.metadata === 'string') {
        metadata = JSON.parse(record.metadata);
      } else if (typeof record.metadata === 'object' && record.metadata !== null) {
        metadata = record.metadata;
      }
    } catch (e) {
      console.warn('[DB SERVICE] Failed to parse metadata for equipment', record.id, e);
    }
    
    // Get points for this equipment
    const points = await this.getPointsByEquipmentId(equipmentId);

    const rawConnectionState = record.connection_state;
    return {
      id: record.id,
      name: record.equipment_name,
      displayName: record.equipment_name,
      type: record.equipment_type,
      filename: record.original_filename,
      vendor: metadata.vendor || 'Unknown',
      modelName: metadata.model || 'Unknown',
      status: record.status as EquipmentStatus,
      connectionState: mapDbEnumToConnectionState(rawConnectionState),
      connectionStatus: metadata.connectionStatus || (rawConnectionState === 'CONNECTED' ? 'ok' : 'fault'),
      points,
      createdAt: record.created_at,
      updatedAt: record.last_updated
    };
  }

  // Retrieve points by equipment ID
  async getPointsByEquipmentId(equipmentId: string): Promise<NormalizedPoint[]> {
    console.log('[DB SERVICE] Retrieving points for equipment', { equipmentId });

    const query = 'SELECT * FROM point_mapping WHERE equipment_id = ? ORDER BY original_name ASC';
    const pointRows = await executeQuery<PointRecord>(query, [equipmentId], 'GET_POINTS_BY_EQUIPMENT');

    return pointRows.map(record => {
      const metadata = JSON.parse(record.normalization_metadata || '{}');
      const haystackTagsData = JSON.parse(record.haystack_tags || '[]');
      
              // Convert haystack tags to proper format
        const haystackTags = Array.isArray(haystackTagsData) 
          ? haystackTagsData.map(tag => typeof tag === 'string' 
              ? { 
                  name: tag, 
                  value: undefined, 
                  category: 'CUSTOM', 
                  isMarker: true, 
                  isValid: true, 
                  source: 'inferred' as const, 
                  confidence: 0.8, 
                  appliedAt: new Date() 
                }
              : tag)
          : [];

        return {
          // Required fields
          originalPointId: record.original_point_id,
          equipmentId: record.equipment_id,
          originalName: record.original_name,
          originalDescription: record.description || '',
          objectName: record.original_point_id, // Use original point ID as object name
          objectType: (record.bacnet_object_type as BACnetObjectType) || BACnetObjectType.ANALOG_INPUT,
          
          // Normalized fields
          normalizedName: record.normalized_name,
          expandedDescription: record.description || record.normalized_name || record.original_name,
          
          // Classification
          pointFunction: PointFunction.Unknown,
          category: record.category,
          dataType: mapDbEnumToDataType(record.data_type), // Convert from database ENUM
          units: record.units || undefined,
          
          // Haystack tags
          haystackTags,
          
          // Normalization metadata
          confidence: metadata.confidence >= 0.8 ? NormalizationConfidence.HIGH : metadata.confidence >= 0.5 ? NormalizationConfidence.MEDIUM : NormalizationConfidence.LOW,
          confidenceScore: metadata.confidence || 0.0,
          normalizationMethod: metadata.method || 'database',
          normalizationRules: metadata.normalizationRules || [],
          
          // Quality indicators
          hasAcronymExpansion: false,
          hasUnitNormalization: !!record.units,
          hasContextInference: false,
          requiresManualReview: (metadata.confidence || 0) < 0.5,
          
          // Metadata
          normalizedAt: record.created_at || new Date(),
          normalizedBy: 'system'
        };
    });
  }

  // Get all equipment with pagination
  async getAllEquipment(
    limit = 50, 
    offset = 0,
    filters?: {
      equipmentType?: string;
      status?: string;
      searchTerm?: string;
    }
  ): Promise<{ equipment: Equipment[]; total: number }> {
    const { equipmentType, status, searchTerm } = filters || {};
    const params: (string | number)[] = [];
    
    let whereClause = 'WHERE 1=1';

    if (equipmentType) {
      whereClause += ' AND equipment_type = ?';
      params.push(mapEquipmentTypeToDbEnum(equipmentType));
    }
    if (status) {
      whereClause += ' AND status = ?';
      params.push(mapEquipmentStatusToDbEnum(status));
    }
    if (searchTerm) {
      whereClause += ' AND (equipment_name LIKE ? OR original_filename LIKE ?)';
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    const countQuery = `SELECT COUNT(*) as total FROM equipment_mapping ${whereClause}`;
    const totalResult = await executeQuery<{ total: number }>(countQuery, params, 'GET_EQUIPMENT_COUNT');
    const total = totalResult[0]?.total || 0;

    const query = `
      SELECT 
        id, original_filename, equipment_name, equipment_type, status, connection_state,
        total_points, processed_points, last_updated, created_at, metadata
      FROM equipment_mapping
      ${whereClause}
      ORDER BY last_updated DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;

    const rows = await executeQuery<EquipmentRecord>(query, params, 'GET_ALL_EQUIPMENT');
    
    console.log(`[DB SERVICE] Retrieved ${rows.length} equipment records`);
    if (rows.length > 0) {
      console.log(`[DB SERVICE] Sample row metadata:`, {
        equipment_name: rows[0].equipment_name,
        metadata: rows[0].metadata,
        metadata_type: typeof rows[0].metadata
      });
    }
    
    const equipment: Equipment[] = rows.map(row => {
      // Parse metadata to extract vendor and model
      let metadata: any = {};
      try {
        if (typeof row.metadata === 'string') {
          metadata = JSON.parse(row.metadata);
        } else if (typeof row.metadata === 'object' && row.metadata !== null) {
          metadata = row.metadata;
        }
      } catch (e) {
        console.warn('[DB SERVICE] Failed to parse metadata for equipment', row.id, e);
      }
      
      return {
        id: row.id,
        name: row.equipment_name,
        displayName: row.equipment_name,
        type: row.equipment_type,
        filename: row.original_filename,
        vendor: metadata.vendor || 'Unknown',
        modelName: metadata.model || 'Unknown',
        status: row.status as EquipmentStatus,
        connectionState: mapDbEnumToConnectionState(row.connection_state),
        connectionStatus: metadata.connectionStatus || 'ok',
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.last_updated),
        points: [], // Points are not loaded in this high-level view
        totalPoints: row.total_points,
        processedPoints: row.processed_points
      };
    });

    return { equipment, total };
  }

  // Create or update mapping session
  async createMappingSession(sessionName: string): Promise<string> {
    const sessionId = nanoid();
    
    console.log('[DB SERVICE] Creating mapping session', { sessionId, sessionName });

    await executeQuery(`
      INSERT INTO mapping_sessions (id, session_name, status) 
      VALUES (?, ?, 'processing')
    `, [sessionId, sessionName], 'CREATE_SESSION');

    return sessionId;
  }

  // Update mapping session stats
  async updateMappingSession(
    sessionId: string, 
    updates: {
      processedFiles?: number;
      totalEquipment?: number;
      totalPoints?: number;
      status?: 'processing' | 'completed' | 'failed';
    }
  ): Promise<void> {
    const setClauses: string[] = [];
    const params: (string | number)[] = [];

    if (updates.processedFiles !== undefined) {
      setClauses.push('processed_files = ?');
      params.push(updates.processedFiles);
    }
    if (updates.totalEquipment !== undefined) {
      setClauses.push('total_equipment = ?');
      params.push(updates.totalEquipment);
    }
    if (updates.totalPoints !== undefined) {
      setClauses.push('total_points = ?');
      params.push(updates.totalPoints);
    }
    if (updates.status) {
      setClauses.push('status = ?');
      params.push(updates.status);
    }

    if (setClauses.length === 0) return;

    params.push(sessionId);
    const query = `
      UPDATE mapping_sessions 
      SET ${setClauses.join(', ')}, last_updated = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    await executeQuery(query, params, 'UPDATE_SESSION');
  }

  // Get session info
  async getMappingSession(sessionId: string): Promise<MappingSessionRecord | null> {
    const query = 'SELECT * FROM mapping_sessions WHERE id = ?';
    const rows = await executeQuery<MappingSessionRecord>(query, [sessionId], 'GET_SESSION');
    return rows[0] || null;
  }

  // Delete equipment and associated points
  async deleteEquipment(equipmentId: string): Promise<void> {
    console.log('[DB SERVICE] Deleting equipment', { equipmentId });

    await executeQuery(`
      DELETE FROM equipment_mapping WHERE id = ?
    `, [equipmentId], 'DELETE_EQUIPMENT');
    
    // Points will be automatically deleted via CASCADE
  }

  async findEquipmentByName(equipmentName: string): Promise<Equipment | null> {
    const query = 'SELECT * FROM equipment_mapping WHERE equipment_name = ? LIMIT 1';
    const rows = await executeQuery<EquipmentRecord>(query, [equipmentName], 'FIND_EQUIPMENT_BY_NAME');

    if (rows.length === 0) {
      return null;
    }
    
    const record = rows[0];
    const rawConnectionState = record.connection_state;

    return {
      id: record.id,
      name: record.equipment_name,
      displayName: record.equipment_name,
      type: record.equipment_type,
      filename: record.original_filename,
      vendor: 'Unknown', // This should be populated from a metadata field in a future step
      modelName: 'Unknown',
      status: record.status as EquipmentStatus,
      connectionState: mapDbEnumToConnectionState(rawConnectionState),
      connectionStatus: rawConnectionState === 'CONNECTED' ? 'ok' : 'fault',
      points: [], // Points are not loaded in this lookup
      createdAt: record.created_at,
      updatedAt: record.last_updated
    };
  }

  // Get database statistics
  async getStatistics(): Promise<{
    totalEquipment: number;
    totalPoints: number;
    equipmentByType: { [key: string]: number };
    pointsByCategory: { [key: string]: number };
    recentActivity: { date: string; equipment: number; points: number }[];
  }> {
    console.log('[DB SERVICE] Retrieving database statistics');

    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM equipment_mapping) as totalEquipment,
        (SELECT COUNT(*) FROM point_mapping) as totalPoints
    `;
    const statsResult = await executeQuery<{ totalEquipment: number; totalPoints: number }>(statsQuery, [], 'GET_STATS');
    const { totalEquipment, totalPoints } = statsResult[0] || { totalEquipment: 0, totalPoints: 0 };
    
    const equipmentByTypeQuery = `
      SELECT equipment_type, COUNT(*) as count 
      FROM equipment_mapping 
      GROUP BY equipment_type
    `;
    const equipmentByTypeResult = await executeQuery<{ equipment_type: string; count: number }>(equipmentByTypeQuery, [], 'GET_EQUIP_BY_TYPE');
    const equipmentByType = equipmentByTypeResult.reduce((acc, row) => {
      acc[row.equipment_type] = row.count;
      return acc;
    }, {} as { [key: string]: number });

    const pointsByCategoryQuery = `
      SELECT category, COUNT(*) as count 
      FROM point_mapping 
      GROUP BY category
    `;
    const pointsByCategoryResult = await executeQuery<{ category: string; count: number }>(pointsByCategoryQuery, [], 'GET_POINTS_BY_CAT');
    const pointsByCategory = pointsByCategoryResult.reduce((acc, row) => {
      acc[row.category] = row.count;
      return acc;
    }, {} as { [key: string]: number });
    
    const recentActivityQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(CASE WHEN table_name = 'equipment_mapping' THEN 1 END) as equipment,
        COUNT(CASE WHEN table_name = 'point_mapping' THEN 1 END) as points
      FROM (
        SELECT created_at, 'equipment_mapping' as table_name FROM equipment_mapping
        UNION ALL
        SELECT created_at, 'point_mapping' as table_name FROM point_mapping
      ) combined
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 7
    `;
    const recentActivityResult = await executeQuery<{ date: string; equipment: number; points: number }>(recentActivityQuery, [], 'GET_RECENT_ACTIVITY');
    const recentActivity = recentActivityResult.map(row => ({
      date: row.date,
      equipment: row.equipment,
      points: row.points
    }));
    
    return {
      totalEquipment,
      totalPoints,
      equipmentByType,
      pointsByCategory,
      recentActivity
    };
  }
}