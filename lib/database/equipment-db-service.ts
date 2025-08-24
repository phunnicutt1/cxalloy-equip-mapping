import { nanoid } from 'nanoid';
import { Equipment, EquipmentType, ConnectionState, EquipmentStatus } from '../../types/equipment';
import { NormalizedPoint, PointFunction, NormalizationConfidence } from '../../types/normalized';
import { BACnetObjectType, PointDataType, PointCategory } from '../../types/point';
import { EquipmentTemplate, PointTemplate, TemplateApplicationResult } from '../../types/template';
import { PointSignature, TemplateMatch } from '../engines/point-signature-engine';
import { executeQuery, executeTransaction } from './config';
import { EquipmentRecord, PointRecord, MappingSessionRecord, DbConnectionState, EquipmentPointConfigurationRecord, TemplateApplicationRecord } from './models';
import { connectorService } from '../services/connector-service';

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
  // Handle uppercase Haystack-aligned types first
  const upperType = equipmentType.toUpperCase().replace(/\s+/g, '-');
  
  // Haystack to DB mappings (uppercase input -> DB enum)
  const haystackMappings: { [key: string]: string } = {
    'AHU': 'AIR_HANDLER_UNIT',
    'RTU': 'RTU_CONTROLLER',
    'VAV': 'VAV_CONTROLLER',
    'FCU': 'FAN_COIL_UNIT',
    'DOAS': 'AIR_HANDLER_UNIT', // Map DOAS to AHU
    'MAU': 'AIR_HANDLER_UNIT',  // Map MAU to AHU
    'ERV': 'AIR_HANDLER_UNIT',  // Map ERV to AHU
    'HRV': 'AIR_HANDLER_UNIT',  // Map HRV to AHU
    'FPB': 'FAN', // Fan Powered Box
    'CAV': 'VAV_CONTROLLER', // Constant Air Volume similar to VAV
    
    // Fans
    'EXHAUST-FAN': 'EXHAUST_FAN',
    'SUPPLY-FAN': 'SUPPLY_FAN',
    'RETURN-FAN': 'RETURN_FAN',
    'COOLING-TOWER-FAN': 'FAN',
    'FAN': 'FAN',
    
    // Laboratory
    'LAB-EXHAUST': 'LAB_AIR_VALVE',
    
    // Pumps
    'CHILLED-WATER-PUMP': 'PUMP',
    'HOT-WATER-PUMP': 'PUMP',
    'CONDENSER-WATER-PUMP': 'PUMP',
    'PUMP': 'PUMP',
    
    // Central Plant
    'CHILLER': 'CHILLER',
    'BOILER': 'BOILER',
    'COOLING-TOWER': 'COOLING_TOWER',
    
    // Heat Pumps
    'WATER-SOURCE-HEAT-PUMP': 'HEAT_EXCHANGER',
    'AIR-SOURCE-HEAT-PUMP': 'HEAT_EXCHANGER',
    'HEAT-PUMP': 'HEAT_EXCHANGER',
    'UNIT-HEATER': 'UNIT_HEATER',
    
    // Controls
    'VFD': 'CONTROLLER',
    'CONTROLLER': 'CONTROLLER',
    
    // Systems
    'SYSTEM': 'CONTROLLER' // Map system to controller
  };
  
  // Check Haystack mapping first
  if (haystackMappings[upperType]) {
    return haystackMappings[upperType];
  }
  
  // Handle legacy uppercase types for backwards compatibility
  const legacyType = equipmentType.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
  
  // Direct mappings (legacy)
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
    'FAN_COIL_UNIT': 'FAN_COIL_UNIT',
    'LIGHTING_CONTROLLER': 'LIGHTING_CONTROLLER',
    'POWER_METER': 'POWER_METER',
    'WEATHER_STATION': 'WEATHER_STATION',
    'FIRE_SYSTEM': 'FIRE_SYSTEM',
    'SECURITY_SYSTEM': 'SECURITY_SYSTEM',
    'ELEVATOR': 'ELEVATOR',
    'ESCALATOR': 'ESCALATOR'
  };

  // Check direct mapping
  if (mappings[legacyType]) {
    return mappings[legacyType];
  }

  // Partial matches for common variations
  if (legacyType.includes('LAB') && (legacyType.includes('AIR') || legacyType.includes('VALVE') || legacyType.includes('EXHAUST'))) {
    return 'LAB_AIR_VALVE';
  }
  if (legacyType.includes('AHU') || legacyType.includes('AIR_HANDLER')) {
    return 'AIR_HANDLER_UNIT';
  }
  if (legacyType.includes('VAV') || legacyType.includes('VVR') || legacyType.includes('VV')) {
    return 'VAV_CONTROLLER';
  }
  if (legacyType.includes('RTU')) {
    return 'RTU_CONTROLLER';
  }
  if (legacyType.includes('FAN')) {
    if (legacyType.includes('EXHAUST')) return 'EXHAUST_FAN';
    if (legacyType.includes('SUPPLY')) return 'SUPPLY_FAN';
    if (legacyType.includes('RETURN')) return 'RETURN_FAN';
    return 'FAN';
  }
  if (legacyType.includes('FUME') && legacyType.includes('HOOD')) {
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
    console.log('\x1b[33m[DB SERVICE]\x1b[0m Clearing all data from equipment and point tables');
    try {
      // It's better to use TRUNCATE for speed, but DELETE is safer if there are foreign keys without ON DELETE CASCADE
      // We will delete from points first, then equipment to respect foreign key constraints.
      await executeQuery('DELETE FROM point_mapping', [], 'CLEAR_POINTS');
      await executeQuery('DELETE FROM equipment_mapping', [], 'CLEAR_EQUIPMENT');
      console.log('\x1b[32m[DB SERVICE]\x1b[0m All data cleared successfully');
    } catch (error) {
      console.error('\x1b[31m[DB SERVICE ERROR]\x1b[0m Failed to clear data:', error);
      throw error;
    }
  }

  // Store equipment and points in database
  async storeEquipmentWithPoints(
    fileId: string,
    equipment: Equipment,
    points: NormalizedPoint[],
    sessionId?: string
  ): Promise<{ equipmentId: string; pointIds: string[] }> {
    console.log('\x1b[36m[DB SERVICE]\x1b[0m Storing equipment with points', {
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

      console.log('\x1b[32m[DB SERVICE SUCCESS]\x1b[0m Equipment and points stored', {
        equipmentId,
        pointCount: pointIds.length
      });

      return { equipmentId, pointIds };
    }).catch(error => {
      console.error('\x1b[31m[DB SERVICE ERROR]\x1b[0m Failed to store equipment with points:', {
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        error: error.message || error
      });
      throw error;
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
    
    // Get connector metadata for vendor and model info
    const connectorMetadata = connectorService.getEquipmentMetadata(record.equipment_name);
    
    // Get points for this equipment
    const points = await this.getPointsByEquipmentId(equipmentId);

    const rawConnectionState = record.connection_state;
    return {
      id: record.id,
      name: record.equipment_name,
      displayName: record.equipment_name,
      type: record.equipment_type,
      filename: record.original_filename,
      vendor: connectorMetadata.vendor || metadata.vendor || 'Unknown',
      modelName: connectorMetadata.model || metadata.model || 'Unknown', 
      description: connectorMetadata.description,
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
      // Handle JSON parsing - MySQL driver may already parse JSON columns
      let metadata: any = {};
      try {
        if (typeof record.normalization_metadata === 'string') {
          metadata = JSON.parse(record.normalization_metadata || '{}');
        } else if (typeof record.normalization_metadata === 'object' && record.normalization_metadata !== null) {
          metadata = record.normalization_metadata;
        }
      } catch (e) {
        console.warn('[DB SERVICE] Failed to parse normalization_metadata:', e);
        metadata = {};
      }

      let haystackTagsData: any[] = [];
      try {
        if (typeof record.haystack_tags === 'string') {
          haystackTagsData = JSON.parse(record.haystack_tags || '[]');
        } else if (Array.isArray(record.haystack_tags)) {
          haystackTagsData = record.haystack_tags;
        }
      } catch (e) {
        console.warn('[DB SERVICE] Failed to parse haystack_tags:', e);
        haystackTagsData = [];
      }
      
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
      
      // Get connector metadata for vendor and model info
      const connectorMetadata = connectorService.getEquipmentMetadata(row.equipment_name);
      
      return {
        id: row.id,
        name: row.equipment_name,
        displayName: row.equipment_name,
        type: row.equipment_type,
        filename: row.original_filename,
        vendor: connectorMetadata.vendor || metadata.vendor || 'Unknown',
        modelName: connectorMetadata.model || metadata.model || 'Unknown',
        description: connectorMetadata.description,
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

  // ===== TEMPLATE MANAGEMENT METHODS =====

  // Create equipment point configuration template
  async createEquipmentPointConfiguration(
    equipmentType: EquipmentType,
    name: string,
    description: string,
    pointSignatures: PointSignature[],
    isDefault = false,
    createdBy?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const configId = nanoid();
    
    console.log('[DB SERVICE] Creating equipment point configuration', { 
      configId, 
      equipmentType, 
      name, 
      signaturesCount: pointSignatures.length 
    });

    await executeQuery(`
      INSERT INTO equipment_point_configurations (
        id, equipment_type, name, description, point_signatures, 
        default_config, created_by, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      configId,
      equipmentType,
      name,
      description || null,
      JSON.stringify(pointSignatures),
      isDefault,
      createdBy || null,
      metadata ? JSON.stringify(metadata) : null
    ], 'CREATE_CONFIGURATION');

    return configId;
  }

  // Update equipment point configuration template
  async updateEquipmentPointConfiguration(
    configId: string,
    updates: {
      name?: string;
      description?: string;
      pointSignatures?: PointSignature[];
      effectivenessScore?: number;
      usageCount?: number;
      successRate?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      params.push(updates.description);
    }
    if (updates.pointSignatures !== undefined) {
      setClauses.push('point_signatures = ?');
      params.push(JSON.stringify(updates.pointSignatures));
    }
    if (updates.effectivenessScore !== undefined) {
      setClauses.push('effectiveness_score = ?');
      params.push(updates.effectivenessScore);
    }
    if (updates.usageCount !== undefined) {
      setClauses.push('usage_count = ?');
      params.push(updates.usageCount);
    }
    if (updates.successRate !== undefined) {
      setClauses.push('success_rate = ?');
      params.push(updates.successRate);
    }
    if (updates.metadata !== undefined) {
      setClauses.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    if (setClauses.length === 0) return;

    params.push(configId);
    const query = `
      UPDATE equipment_point_configurations 
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    await executeQuery(query, params, 'UPDATE_CONFIGURATION');
  }

  // Delete equipment point configuration template
  async deleteEquipmentPointConfiguration(configId: string): Promise<void> {
    console.log('[DB SERVICE] Deleting equipment point configuration', { configId });

    await executeQuery(`
      DELETE FROM equipment_point_configurations WHERE id = ?
    `, [configId], 'DELETE_CONFIGURATION');
  }

  // Get equipment point configurations
  async getEquipmentPointConfigurations(
    equipmentType?: EquipmentType,
    includeDefaults = true
  ): Promise<Array<{
    id: string;
    equipmentType: string;
    name: string;
    description: string | null;
    pointSignatures: PointSignature[];
    isDefault: boolean;
    effectivenessScore: number;
    usageCount: number;
    successRate: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    metadata: Record<string, any> | null;
  }>> {
    let query = 'SELECT * FROM equipment_point_configurations';
    const params: any[] = [];
    const conditions: string[] = [];

    if (equipmentType) {
      conditions.push('equipment_type = ?');
      params.push(equipmentType);
    }

    if (!includeDefaults) {
      conditions.push('default_config = FALSE');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY default_config DESC, effectiveness_score DESC, name ASC';

    const rows = await executeQuery<EquipmentPointConfigurationRecord>(query, params, 'GET_CONFIGURATIONS');

    return rows.map(row => {
      let pointSignatures: PointSignature[] = [];
      let metadata: Record<string, any> | null = null;

      try {
        if (typeof row.point_signatures === 'string') {
          pointSignatures = JSON.parse(row.point_signatures);
        } else if (Array.isArray(row.point_signatures)) {
          pointSignatures = row.point_signatures;
        }
      } catch (e) {
        console.warn('[DB SERVICE] Failed to parse point signatures for config', row.id, e);
      }

      try {
        if (row.metadata) {
          if (typeof row.metadata === 'string') {
            metadata = JSON.parse(row.metadata);
          } else if (typeof row.metadata === 'object' && row.metadata !== null) {
            metadata = row.metadata;
          }
        }
      } catch (e) {
        console.warn('[DB SERVICE] Failed to parse metadata for config', row.id, e);
      }

      return {
        id: row.id,
        equipmentType: row.equipment_type,
        name: row.name,
        description: row.description,
        pointSignatures,
        isDefault: row.default_config,
        effectivenessScore: row.effectiveness_score,
        usageCount: row.usage_count,
        successRate: row.success_rate,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        metadata
      };
    });
  }

  // Apply template to equipment
  async applyTemplateToEquipment(
    equipmentId: string,
    configurationId: string,
    templateMatches: TemplateMatch[],
    confidenceScore: number,
    appliedBy?: string,
    isAutomatic = true,
    effectivenessRating?: number,
    metadata?: Record<string, any>
  ): Promise<string> {
    const applicationId = nanoid();
    
    console.log('[DB SERVICE] Applying template to equipment', { 
      applicationId,
      equipmentId, 
      configurationId, 
      matchesCount: templateMatches.length,
      confidenceScore 
    });

    // Extract applied points data from template matches
    const appliedPoints = templateMatches.map(match => ({
      templatePointId: match.pointSignature.id,
      actualPointId: match.matchedPoint.originalPointId,
      confidence: match.confidence,
      patternMatch: match.exactMatch || match.partialMatch,
      matchedSignature: match.pointSignature.pattern
    }));

    await executeQuery(`
      INSERT INTO template_applications (
        id, equipment_id, configuration_id, applied_points, confidence_score,
        match_results, effectiveness_rating, applied_by, is_automatic, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      applicationId,
      equipmentId,
      configurationId,
      JSON.stringify(appliedPoints),
      confidenceScore,
      JSON.stringify(templateMatches),
      effectivenessRating || null,
      appliedBy || null,
      isAutomatic,
      metadata ? JSON.stringify(metadata) : null
    ], 'APPLY_TEMPLATE');

    // Update configuration usage statistics
    await executeQuery(`
      UPDATE equipment_point_configurations 
      SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [configurationId], 'UPDATE_CONFIG_USAGE');

    return applicationId;
  }

  // Get template applications for equipment
  async getTemplateApplications(
    equipmentId?: string,
    configurationId?: string
  ): Promise<Array<{
    id: string;
    equipmentId: string;
    configurationId: string;
    appliedPoints: any[];
    confidenceScore: number;
    matchResults: TemplateMatch[] | null;
    effectivenessRating: number | null;
    appliedAt: Date;
    appliedBy: string | null;
    isAutomatic: boolean;
    metadata: Record<string, any> | null;
  }>> {
    let query = 'SELECT * FROM template_applications';
    const params: any[] = [];
    const conditions: string[] = [];

    if (equipmentId) {
      conditions.push('equipment_id = ?');
      params.push(equipmentId);
    }

    if (configurationId) {
      conditions.push('configuration_id = ?');
      params.push(configurationId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY applied_at DESC';

    const rows = await executeQuery<TemplateApplicationRecord>(query, params, 'GET_APPLICATIONS');

    return rows.map(row => {
      let appliedPoints: any[] = [];
      let matchResults: TemplateMatch[] | null = null;
      let metadata: Record<string, any> | null = null;

      try {
        if (typeof row.applied_points === 'string') {
          appliedPoints = JSON.parse(row.applied_points);
        } else if (Array.isArray(row.applied_points)) {
          appliedPoints = row.applied_points;
        }
      } catch (e) {
        console.warn('[DB SERVICE] Failed to parse applied points for application', row.id, e);
      }

      try {
        if (row.match_results) {
          if (typeof row.match_results === 'string') {
            matchResults = JSON.parse(row.match_results);
          } else if (Array.isArray(row.match_results)) {
            matchResults = row.match_results;
          }
        }
      } catch (e) {
        console.warn('[DB SERVICE] Failed to parse match results for application', row.id, e);
      }

      try {
        if (row.metadata) {
          if (typeof row.metadata === 'string') {
            metadata = JSON.parse(row.metadata);
          } else if (typeof row.metadata === 'object' && row.metadata !== null) {
            metadata = row.metadata;
          }
        }
      } catch (e) {
        console.warn('[DB SERVICE] Failed to parse metadata for application', row.id, e);
      }

      return {
        id: row.id,
        equipmentId: row.equipment_id,
        configurationId: row.configuration_id,
        appliedPoints,
        confidenceScore: row.confidence_score,
        matchResults,
        effectivenessRating: row.effectiveness_rating,
        appliedAt: row.applied_at,
        appliedBy: row.applied_by,
        isAutomatic: row.is_automatic,
        metadata
      };
    });
  }

  // Get template effectiveness analytics
  async getTemplateEffectiveness(configurationId?: string): Promise<{
    totalApplications: number;
    averageConfidence: number;
    averageEffectiveness: number;
    successRate: number;
    equipmentTypes: { [key: string]: number };
    recentApplications: Array<{
      date: string;
      applicationCount: number;
      averageConfidence: number;
    }>;
  }> {
    let baseQuery = `
      SELECT 
        ta.configuration_id,
        ta.confidence_score,
        ta.effectiveness_rating,
        ta.applied_at,
        epc.equipment_type
      FROM template_applications ta
      JOIN equipment_point_configurations epc ON ta.configuration_id = epc.id
    `;
    
    const params: any[] = [];
    if (configurationId) {
      baseQuery += ' WHERE ta.configuration_id = ?';
      params.push(configurationId);
    }

    const applicationData = await executeQuery<{
      configuration_id: string;
      confidence_score: number;
      effectiveness_rating: number | null;
      applied_at: Date;
      equipment_type: string;
    }>(baseQuery, params, 'GET_TEMPLATE_EFFECTIVENESS');

    if (applicationData.length === 0) {
      return {
        totalApplications: 0,
        averageConfidence: 0,
        averageEffectiveness: 0,
        successRate: 0,
        equipmentTypes: {},
        recentApplications: []
      };
    }

    const totalApplications = applicationData.length;
    const averageConfidence = applicationData.reduce((sum, app) => sum + app.confidence_score, 0) / totalApplications;
    
    const effectivenessRatings = applicationData.filter(app => app.effectiveness_rating !== null);
    const averageEffectiveness = effectivenessRatings.length > 0 
      ? effectivenessRatings.reduce((sum, app) => sum + (app.effectiveness_rating || 0), 0) / effectivenessRatings.length
      : 0;

    const successRate = applicationData.filter(app => app.confidence_score >= 0.7).length / totalApplications;

    const equipmentTypes = applicationData.reduce((acc, app) => {
      acc[app.equipment_type] = (acc[app.equipment_type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    // Recent applications (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentData = applicationData.filter(app => new Date(app.applied_at) >= sevenDaysAgo);
    const recentApplications = recentData.reduce((acc, app) => {
      const date = new Date(app.applied_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { applicationCount: 0, totalConfidence: 0 };
      }
      acc[date].applicationCount++;
      acc[date].totalConfidence += app.confidence_score;
      return acc;
    }, {} as { [key: string]: { applicationCount: number; totalConfidence: number } });

    const recentApplicationsArray = Object.entries(recentApplications).map(([date, data]) => ({
      date,
      applicationCount: data.applicationCount,
      averageConfidence: data.totalConfidence / data.applicationCount
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalApplications,
      averageConfidence,
      averageEffectiveness,
      successRate,
      equipmentTypes,
      recentApplications: recentApplicationsArray
    };
  }

  // Get all template applications across all templates (for analytics)
  async getAllTemplateApplications(): Promise<Array<{
    id: string;
    equipmentId: string;
    templateId: string;
    templateName: string;
    equipmentType: string;
    confidence: number;
    success: boolean;
    pointMatchRate: number;
    appliedAt: Date;
    appliedBy: string | null;
    isAutomatic: boolean;
  }>> {
    const query = `
      SELECT 
        ta.id,
        ta.equipment_id,
        ta.configuration_id as template_id,
        epc.name as template_name,
        epc.equipment_type,
        ta.confidence_score as confidence,
        CASE WHEN ta.confidence_score >= 0.7 THEN true ELSE false END as success,
        ta.confidence_score as point_match_rate,
        ta.applied_at,
        ta.applied_by,
        ta.is_automatic
      FROM template_applications ta
      JOIN equipment_point_configurations epc ON ta.configuration_id = epc.id
      ORDER BY ta.applied_at DESC
    `;

    const rows = await executeQuery<{
      id: string;
      equipment_id: string;
      template_id: string;
      template_name: string;
      equipment_type: string;
      confidence: number;
      success: boolean;
      point_match_rate: number;
      applied_at: Date;
      applied_by: string | null;
      is_automatic: boolean;
    }>(query, [], 'GET_ALL_APPLICATIONS');

    return rows.map(row => ({
      id: row.id,
      equipmentId: row.equipment_id,
      templateId: row.template_id,
      templateName: row.template_name,
      equipmentType: row.equipment_type,
      confidence: row.confidence,
      success: row.success,
      pointMatchRate: row.point_match_rate,
      appliedAt: row.applied_at,
      appliedBy: row.applied_by,
      isAutomatic: row.is_automatic
    }));
  }

  // Get template applications for a specific template (for analytics)
  async getTemplateApplicationsForAnalytics(templateId: string): Promise<Array<{
    id: string;
    equipmentId: string;
    confidence: number;
    success: boolean;
    pointMatchRate: number;
    appliedAt: Date;
    appliedBy: string | null;
    isAutomatic: boolean;
  }>> {
    const query = `
      SELECT 
        id,
        equipment_id,
        confidence_score as confidence,
        CASE WHEN confidence_score >= 0.7 THEN true ELSE false END as success,
        confidence_score as point_match_rate,
        applied_at,
        applied_by,
        is_automatic
      FROM template_applications
      WHERE configuration_id = ?
      ORDER BY applied_at DESC
    `;

    const rows = await executeQuery<{
      id: string;
      equipment_id: string;
      confidence: number;
      success: boolean;
      point_match_rate: number;
      applied_at: Date;
      applied_by: string | null;
      is_automatic: boolean;
    }>(query, [templateId], 'GET_TEMPLATE_APPLICATIONS');

    return rows.map(row => ({
      id: row.id,
      equipmentId: row.equipment_id,
      confidence: row.confidence,
      success: row.success,
      pointMatchRate: row.point_match_rate,
      appliedAt: row.applied_at,
      appliedBy: row.applied_by,
      isAutomatic: row.is_automatic
    }));
  }

  // Get template usage statistics for analytics
  async getTemplateUsageStats(): Promise<Array<{
    templateId: string;
    templateName: string;
    equipmentType: string;
    totalApplications: number;
    successfulApplications: number;
    successRate: number;
    averageConfidence: number;
    lastUsed: Date | null;
    isDefault: boolean;
  }>> {
    const query = `
      SELECT 
        epc.id as template_id,
        epc.name as template_name,
        epc.equipment_type,
        epc.is_default,
        COUNT(ta.id) as total_applications,
        SUM(CASE WHEN ta.confidence_score >= 0.7 THEN 1 ELSE 0 END) as successful_applications,
        AVG(ta.confidence_score) as average_confidence,
        MAX(ta.applied_at) as last_used
      FROM equipment_point_configurations epc
      LEFT JOIN template_applications ta ON epc.id = ta.configuration_id
             WHERE 1=1
      GROUP BY epc.id, epc.name, epc.equipment_type, epc.is_default
      ORDER BY total_applications DESC, epc.name
    `;

    const rows = await executeQuery<{
      template_id: string;
      template_name: string;
      equipment_type: string;
      is_default: boolean;
      total_applications: number;
      successful_applications: number;
      average_confidence: number | null;
      last_used: Date | null;
    }>(query, [], 'GET_TEMPLATE_USAGE_STATS');

    return rows.map(row => ({
      templateId: row.template_id,
      templateName: row.template_name,
      equipmentType: row.equipment_type,
      totalApplications: row.total_applications,
      successfulApplications: row.successful_applications,
      successRate: row.total_applications > 0 ? row.successful_applications / row.total_applications : 0,
      averageConfidence: row.average_confidence || 0,
      lastUsed: row.last_used,
      isDefault: row.is_default
    }));
  }

  // Get analytics time series data
  async getAnalyticsTimeSeries(days: number = 30): Promise<Array<{
    date: string;
    totalApplications: number;
    successfulApplications: number;
    successRate: number;
    averageConfidence: number;
  }>> {
    const query = `
      SELECT 
        DATE(applied_at) as date,
        COUNT(*) as total_applications,
        SUM(CASE WHEN confidence_score >= 0.7 THEN 1 ELSE 0 END) as successful_applications,
        AVG(confidence_score) as average_confidence
      FROM template_applications
      WHERE applied_at >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
      GROUP BY DATE(applied_at)
      ORDER BY date
    `;

    const rows = await executeQuery<{
      date: string;
      total_applications: number;
      successful_applications: number;
      average_confidence: number;
    }>(query, [days], 'GET_ANALYTICS_TIME_SERIES');

    return rows.map(row => ({
      date: row.date,
      totalApplications: row.total_applications,
      successfulApplications: row.successful_applications,
      successRate: row.total_applications > 0 ? row.successful_applications / row.total_applications : 0,
      averageConfidence: row.average_confidence
    }));
  }
}