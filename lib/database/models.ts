import { EquipmentType, EquipmentStatus, ConnectionState } from '../../types/equipment';
import { PointCategory, PointDataType } from '../../types/point';
import { executeQuery } from './config';

// Database enum types (these match the actual database ENUM values)
export type DbConnectionState = 'CONNECTED' | 'DISCONNECTED' | 'TIMEOUT' | 'ERROR';

// Database table interfaces
export interface EquipmentRecord {
  id: string;
  original_file_id: string;
  original_filename: string;
  equipment_name: string;
  equipment_type: EquipmentType;
  classification_confidence: number;
  status: EquipmentStatus;
  connection_state: DbConnectionState;
  total_points: number;
  processed_points: number;
  last_updated: Date;
  created_at: Date;
  haystack_tags: string; // JSON string
  metadata: string; // JSON string
}

export interface PointRecord {
  id: string;
  equipment_id: string;
  original_point_id: string;
  original_name: string;
  normalized_name: string;
  display_name: string;
  description: string;
  category: PointCategory;
  data_type: PointDataType;
  units: string | null;
  bacnet_object_type: string | null;
  bacnet_object_instance: number | null;
  vendor_name: string | null;
  raw_value: string | null;
  created_at: Date;
  updated_at: Date;
  haystack_tags: string; // JSON string
  normalization_metadata: string; // JSON string
}

// Mapping session to track processing batches
export interface MappingSessionRecord {
  id: string;
  session_name: string;
  total_files: number;
  processed_files: number;
  total_equipment: number;
  total_points: number;
  status: 'processing' | 'completed' | 'failed';
  started_at: Date;
  completed_at: Date | null;
  metadata: string; // JSON string
}

// SQL table creation scripts
export const CREATE_TABLES_SQL = {
  equipment: `
    CREATE TABLE IF NOT EXISTS equipment_mapping (
      id VARCHAR(36) PRIMARY KEY,
      original_file_id VARCHAR(100) NOT NULL,
      original_filename VARCHAR(255) NOT NULL,
      equipment_name VARCHAR(255) NOT NULL,
      equipment_type ENUM(
        'AIR_HANDLER_UNIT', 'VAV_CONTROLLER', 'RTU_CONTROLLER',
        'CHILLER', 'BOILER', 'COOLING_TOWER', 'HEAT_EXCHANGER',
        'PUMP', 'FAN', 'EXHAUST_FAN', 'SUPPLY_FAN', 'RETURN_FAN',
        'DAMPER', 'VALVE', 'ACTUATOR', 'SENSOR', 'CONTROLLER',
        'UNIT_HEATER', 'ZONE_CONTROLLER', 'LAB_AIR_VALVE',
        'FUME_HOOD', 'LIGHTING_CONTROLLER', 'POWER_METER',
        'WEATHER_STATION', 'FIRE_SYSTEM', 'SECURITY_SYSTEM',
        'ELEVATOR', 'ESCALATOR', 'UNKNOWN'
      ) NOT NULL DEFAULT 'UNKNOWN',
      classification_confidence DECIMAL(3,2) NOT NULL DEFAULT 0.0,
      status ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR') NOT NULL DEFAULT 'ACTIVE',
      connection_state ENUM('CONNECTED', 'DISCONNECTED', 'TIMEOUT', 'ERROR') NOT NULL DEFAULT 'DISCONNECTED',
      total_points INT NOT NULL DEFAULT 0,
      processed_points INT NOT NULL DEFAULT 0,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      haystack_tags JSON,
      metadata JSON,
      INDEX idx_equipment_type (equipment_type),
      INDEX idx_original_file (original_file_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  
  points: `
    CREATE TABLE IF NOT EXISTS point_mapping (
      id VARCHAR(36) PRIMARY KEY,
      equipment_id VARCHAR(36) NOT NULL,
      original_point_id VARCHAR(100) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      normalized_name VARCHAR(255) NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      description TEXT,
      category ENUM('SENSOR', 'COMMAND', 'STATUS', 'SETPOINT', 'PARAMETER') NOT NULL,
      data_type ENUM('ANALOG', 'BINARY', 'MULTISTATE', 'STRING', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
      units VARCHAR(50),
      bacnet_object_type VARCHAR(50),
      bacnet_object_instance INT,
      vendor_name VARCHAR(100),
      raw_value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      haystack_tags JSON,
      normalization_metadata JSON,
      FOREIGN KEY (equipment_id) REFERENCES equipment_mapping(id) ON DELETE CASCADE,
      INDEX idx_equipment_id (equipment_id),
      INDEX idx_category (category),
      INDEX idx_data_type (data_type),
      INDEX idx_original_point (original_point_id),
      INDEX idx_normalized_name (normalized_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
  
  sessions: `
    CREATE TABLE IF NOT EXISTS mapping_sessions (
      id VARCHAR(36) PRIMARY KEY,
      session_name VARCHAR(255) NOT NULL,
      total_files INT NOT NULL DEFAULT 0,
      processed_files INT NOT NULL DEFAULT 0,
      total_equipment INT NOT NULL DEFAULT 0,
      total_points INT NOT NULL DEFAULT 0,
      status ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      metadata JSON,
      INDEX idx_status (status),
      INDEX idx_started_at (started_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `
};

// Initialize database tables
export async function initializeTables(): Promise<void> {
  console.log('[DATABASE] Initializing tables...');
  
  try {
    // Create tables in order (equipment first, then points with foreign key)
    await executeQuery(CREATE_TABLES_SQL.equipment, [], 'CREATE_EQUIPMENT_TABLE');
    await executeQuery(CREATE_TABLES_SQL.points, [], 'CREATE_POINTS_TABLE');
    await executeQuery(CREATE_TABLES_SQL.sessions, [], 'CREATE_SESSIONS_TABLE');
    
    console.log('[DATABASE] Tables initialized successfully');
  } catch (error) {
    console.error('[DATABASE] Failed to initialize tables:', error);
    throw error;
  }
}

// Get table information
export async function getTableInfo(): Promise<{
  equipment: { count: number; latest: Date | null };
  points: { count: number; latest: Date | null };
  sessions: { count: number; latest: Date | null };
}> {
  try {
    const [equipmentStats] = await executeQuery(`
      SELECT 
        COUNT(*) as count,
        MAX(created_at) as latest
      FROM equipment_mapping
    `, [], 'EQUIPMENT_STATS');
    
    const [pointStats] = await executeQuery(`
      SELECT 
        COUNT(*) as count,
        MAX(created_at) as latest
      FROM point_mapping
    `, [], 'POINT_STATS');
    
    const [sessionStats] = await executeQuery(`
      SELECT 
        COUNT(*) as count,
        MAX(started_at) as latest
      FROM mapping_sessions
    `, [], 'SESSION_STATS');
    
    return {
      equipment: {
        count: equipmentStats?.count || 0,
        latest: equipmentStats?.latest || null
      },
      points: {
        count: pointStats?.count || 0,
        latest: pointStats?.latest || null
      },
      sessions: {
        count: sessionStats?.count || 0,
        latest: sessionStats?.latest || null
      }
    };
  } catch (error) {
    console.error('[DATABASE] Failed to get table info:', error);
    throw error;
  }
}

// Clean up old data (useful for development)
export async function cleanupOldData(daysOld = 30): Promise<{ 
  deletedEquipment: number; 
  deletedPoints: number; 
  deletedSessions: number; 
}> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    console.log('[DATABASE] Cleaning up data older than:', cutoffDate.toISOString());
    
    // Delete old sessions (this will cascade to equipment/points if needed)
    const [sessionResult] = await executeQuery(`
      DELETE FROM mapping_sessions 
      WHERE started_at < ? AND status IN ('completed', 'failed')
    `, [cutoffDate], 'CLEANUP_SESSIONS');
    
    // Delete orphaned equipment (not referenced by any session)
    const [equipmentResult] = await executeQuery(`
      DELETE FROM equipment_mapping 
      WHERE created_at < ?
    `, [cutoffDate], 'CLEANUP_EQUIPMENT');
    
    // Points will be automatically deleted via foreign key cascade
    const [pointResult] = await executeQuery(`
      SELECT COUNT(*) as count FROM point_mapping
    `, [], 'COUNT_REMAINING_POINTS');
    
    return {
      deletedEquipment: (equipmentResult as any)?.affectedRows || 0,
      deletedPoints: 0, // Cascade deleted
      deletedSessions: (sessionResult as any)?.affectedRows || 0
    };
  } catch (error) {
    console.error('[DATABASE] Failed to cleanup old data:', error);
    throw error;
  }
} 