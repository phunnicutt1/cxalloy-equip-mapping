import { nanoid } from 'nanoid';
import { Equipment, ConnectionState, EquipmentStatus } from '../../types/equipment';
import { NormalizedPoint, PointFunction, NormalizationConfidence } from '../../types/normalized';
import { BACnetObjectType, PointDataType, PointCategory } from '../../types/point';
import { HaystackTagCategory } from '../../types/haystack';
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

export class EquipmentDatabaseService {
  
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
          originalEquipmentType: equipment.type // Store original for reference
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
            point.category || null,
            mapDataTypeToDbEnum(point.dataType || 'ANALOG'), // Convert to database ENUM value with fallback
            point.units || null,
            point.objectType || null,
            null, // bacnet_object_instance - not available in NormalizedPoint
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

    const equipmentRecords = await executeQuery<EquipmentRecord>(`
      SELECT * FROM equipment_mapping WHERE id = ?
    `, [equipmentId], 'GET_EQUIPMENT');

    if (equipmentRecords.length === 0) {
      return null;
    }

    const record = equipmentRecords[0];
    
    // Get points for this equipment
    const points = await this.getPointsByEquipmentId(equipmentId);

    const rawConnectionState = record.connection_state;
    return {
      id: record.id,
      name: record.equipment_name,
      displayName: record.equipment_name,
      type: record.equipment_type,
      filename: record.original_filename,
      vendor: 'Unknown',
      modelName: 'Unknown',
      status: record.status as EquipmentStatus,
      connectionState: mapDbEnumToConnectionState(rawConnectionState),
      connectionStatus: rawConnectionState === 'CONNECTED' ? 'ok' : 'fault',
      points,
      createdAt: record.created_at,
      updatedAt: record.last_updated
    };
  }

  // Retrieve points by equipment ID
  async getPointsByEquipmentId(equipmentId: string): Promise<NormalizedPoint[]> {
    console.log('[DB SERVICE] Retrieving points for equipment', { equipmentId });

    const pointRecords = await executeQuery<PointRecord>(`
      SELECT * FROM point_mapping 
      WHERE equipment_id = ? 
      ORDER BY normalized_name
    `, [equipmentId], 'GET_POINTS');

    return pointRecords.map(record => {
      const metadata = JSON.parse(record.normalization_metadata || '{}');
      const haystackTagsData = JSON.parse(record.haystack_tags || '[]');
      
              // Convert haystack tags to proper format
        const haystackTags = Array.isArray(haystackTagsData) 
          ? haystackTagsData.map(tag => typeof tag === 'string' 
              ? { 
                  name: tag, 
                  value: undefined, 
                  category: HaystackTagCategory.CUSTOM, 
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
          pointFunction: PointFunction.UNKNOWN,
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
    console.log('[DB SERVICE] Retrieving all equipment', { limit, offset, filters });

    let whereClause = '';
    const params: any[] = [];

    if (filters) {
      const conditions: string[] = [];
      
      if (filters.equipmentType) {
        conditions.push('equipment_type = ?');
        params.push(filters.equipmentType);
      }
      
      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }
      
      if (filters.searchTerm) {
        conditions.push('(equipment_name LIKE ? OR original_filename LIKE ?)');
        params.push(`%${filters.searchTerm}%`, `%${filters.searchTerm}%`);
      }
      
      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }
    }

    // Get total count
    const [countResult] = await executeQuery<{ total: number }>(`
      SELECT COUNT(*) as total FROM equipment_mapping ${whereClause}
    `, params, 'COUNT_EQUIPMENT');

    const total = countResult?.total || 0;

    // Get equipment records
    const equipmentRecords = await executeQuery<EquipmentRecord>(`
      SELECT * FROM equipment_mapping ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit.toString())} OFFSET ${parseInt(offset.toString())}
    `, params, 'GET_ALL_EQUIPMENT');

    // Convert to Equipment objects (with point count for UI display)
    const equipment: Equipment[] = equipmentRecords.map(record => {
      const rawConnectionState = record.connection_state;
      const pointCount = record.total_points || 0;
      
      // Create placeholder points array with correct length for UI display
      // This allows the UI to show correct point counts without loading all point data
      const placeholderPoints: NormalizedPoint[] = Array(pointCount).fill(null).map((_, index) => ({
        // Minimal placeholder data - just enough to represent count
        originalPointId: `placeholder-${index}`,
        equipmentId: record.id,
        originalName: `Point ${index + 1}`,
        originalDescription: '',
        objectName: `placeholder-${index}`,
        objectType: 'ANALOG_INPUT' as any,
        normalizedName: `Point ${index + 1}`,
        expandedDescription: `Point ${index + 1}`,
        pointFunction: 'UNKNOWN' as any,
        category: 'Unknown',
        dataType: 'ANALOG' as any,
        units: '',
        haystackTags: [],
        confidence: 'UNKNOWN' as any,
        confidenceScore: 0,
        normalizationMethod: 'placeholder',
        normalizationRules: [],
        hasAcronymExpansion: false,
        hasUnitNormalization: false,
        hasContextInference: false,
        requiresManualReview: false,
        normalizedAt: new Date(),
        isPlaceholder: true // Flag to indicate this is just for count display
      }));
      
      return {
        id: record.id,
        name: record.equipment_name,
        displayName: record.equipment_name,
        type: record.equipment_type,
        filename: record.original_filename,
        vendor: 'Unknown',
        modelName: 'Unknown',
        status: record.status as EquipmentStatus,
        connectionState: mapDbEnumToConnectionState(rawConnectionState),
        connectionStatus: rawConnectionState === 'CONNECTED' ? 'ok' : 'fault',
        points: placeholderPoints, // Points with correct count for UI
        createdAt: record.created_at,
        updatedAt: record.last_updated
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
    const setClause: string[] = [];
    const params: any[] = [];

    if (updates.processedFiles !== undefined) {
      setClause.push('processed_files = ?');
      params.push(updates.processedFiles);
    }
    if (updates.totalEquipment !== undefined) {
      setClause.push('total_equipment = ?');
      params.push(updates.totalEquipment);
    }
    if (updates.totalPoints !== undefined) {
      setClause.push('total_points = ?');
      params.push(updates.totalPoints);
    }
    if (updates.status) {
      setClause.push('status = ?');
      params.push(updates.status);
      
      if (updates.status === 'completed' || updates.status === 'failed') {
        setClause.push('completed_at = CURRENT_TIMESTAMP');
      }
    }

    if (setClause.length > 0) {
      params.push(sessionId);
      
      await executeQuery(`
        UPDATE mapping_sessions 
        SET ${setClause.join(', ')}
        WHERE id = ?
      `, params, 'UPDATE_SESSION');
    }
  }

  // Get session info
  async getMappingSession(sessionId: string): Promise<MappingSessionRecord | null> {
    const sessions = await executeQuery<MappingSessionRecord>(`
      SELECT * FROM mapping_sessions WHERE id = ?
    `, [sessionId], 'GET_SESSION');

    return sessions[0] || null;
  }

  // Delete equipment and associated points
  async deleteEquipment(equipmentId: string): Promise<void> {
    console.log('[DB SERVICE] Deleting equipment', { equipmentId });

    await executeQuery(`
      DELETE FROM equipment_mapping WHERE id = ?
    `, [equipmentId], 'DELETE_EQUIPMENT');
    
    // Points will be automatically deleted via CASCADE
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

    const [totalStats] = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM equipment_mapping) as totalEquipment,
        (SELECT COUNT(*) FROM point_mapping) as totalPoints
    `, [], 'TOTAL_STATS');

    const equipmentByType = await executeQuery(`
      SELECT equipment_type, COUNT(*) as count 
      FROM equipment_mapping 
      GROUP BY equipment_type
    `, [], 'EQUIPMENT_BY_TYPE');

    const pointsByCategory = await executeQuery(`
      SELECT category, COUNT(*) as count 
      FROM point_mapping 
      GROUP BY category
    `, [], 'POINTS_BY_CATEGORY');

    const recentActivity = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as equipment,
        SUM(total_points) as points
      FROM equipment_mapping 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, [], 'RECENT_ACTIVITY');

    return {
      totalEquipment: totalStats?.totalEquipment || 0,
      totalPoints: totalStats?.totalPoints || 0,
      equipmentByType: Object.fromEntries(
        equipmentByType.map((row: any) => [row.equipment_type, row.count])
      ),
      pointsByCategory: Object.fromEntries(
        pointsByCategory.map((row: any) => [row.category, row.count])
      ),
      recentActivity: recentActivity.map((row: any) => ({
        date: row.date,
        equipment: row.equipment,
        points: row.points
      }))
    };
  }
}

// Singleton instance
export const equipmentDbService = new EquipmentDatabaseService(); 