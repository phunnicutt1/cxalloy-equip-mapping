"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREATE_TABLES_SQL = void 0;
exports.initializeTables = initializeTables;
exports.getTableInfo = getTableInfo;
exports.cleanupOldData = cleanupOldData;
const config_1 = require("./config");
// SQL table creation scripts
exports.CREATE_TABLES_SQL = {
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
async function initializeTables() {
    console.log('[DATABASE] Initializing tables...');
    try {
        // Create tables in order (equipment first, then points with foreign key)
        await (0, config_1.executeQuery)(exports.CREATE_TABLES_SQL.equipment, [], 'CREATE_EQUIPMENT_TABLE');
        await (0, config_1.executeQuery)(exports.CREATE_TABLES_SQL.points, [], 'CREATE_POINTS_TABLE');
        await (0, config_1.executeQuery)(exports.CREATE_TABLES_SQL.sessions, [], 'CREATE_SESSIONS_TABLE');
        console.log('[DATABASE] Tables initialized successfully');
    }
    catch (error) {
        console.error('[DATABASE] Failed to initialize tables:', error);
        throw error;
    }
}
// Get table information
async function getTableInfo() {
    try {
        const [equipmentStats] = await (0, config_1.executeQuery)(`
      SELECT 
        COUNT(*) as count,
        MAX(created_at) as latest
      FROM equipment_mapping
    `, [], 'EQUIPMENT_STATS');
        const [pointStats] = await (0, config_1.executeQuery)(`
      SELECT 
        COUNT(*) as count,
        MAX(created_at) as latest
      FROM point_mapping
    `, [], 'POINT_STATS');
        const [sessionStats] = await (0, config_1.executeQuery)(`
      SELECT 
        COUNT(*) as count,
        MAX(started_at) as latest
      FROM mapping_sessions
    `, [], 'SESSION_STATS');
        return {
            equipment: {
                count: (equipmentStats === null || equipmentStats === void 0 ? void 0 : equipmentStats.count) || 0,
                latest: (equipmentStats === null || equipmentStats === void 0 ? void 0 : equipmentStats.latest) || null
            },
            points: {
                count: (pointStats === null || pointStats === void 0 ? void 0 : pointStats.count) || 0,
                latest: (pointStats === null || pointStats === void 0 ? void 0 : pointStats.latest) || null
            },
            sessions: {
                count: (sessionStats === null || sessionStats === void 0 ? void 0 : sessionStats.count) || 0,
                latest: (sessionStats === null || sessionStats === void 0 ? void 0 : sessionStats.latest) || null
            }
        };
    }
    catch (error) {
        console.error('[DATABASE] Failed to get table info:', error);
        throw error;
    }
}
// Clean up old data (useful for development)
async function cleanupOldData(daysOld = 30) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        console.log('[DATABASE] Cleaning up data older than:', cutoffDate.toISOString());
        // Delete old sessions (this will cascade to equipment/points if needed)
        const [sessionResult] = await (0, config_1.executeQuery)(`
      DELETE FROM mapping_sessions 
      WHERE started_at < ? AND status IN ('completed', 'failed')
    `, [cutoffDate], 'CLEANUP_SESSIONS');
        // Delete orphaned equipment (not referenced by any session)
        const [equipmentResult] = await (0, config_1.executeQuery)(`
      DELETE FROM equipment_mapping 
      WHERE created_at < ?
    `, [cutoffDate], 'CLEANUP_EQUIPMENT');
        // Points will be automatically deleted via foreign key cascade
        const [pointResult] = await (0, config_1.executeQuery)(`
      SELECT COUNT(*) as count FROM point_mapping
    `, [], 'COUNT_REMAINING_POINTS');
        return {
            deletedEquipment: (equipmentResult === null || equipmentResult === void 0 ? void 0 : equipmentResult.affectedRows) || 0,
            deletedPoints: 0, // Cascade deleted
            deletedSessions: (sessionResult === null || sessionResult === void 0 ? void 0 : sessionResult.affectedRows) || 0
        };
    }
    catch (error) {
        console.error('[DATABASE] Failed to cleanup old data:', error);
        throw error;
    }
}
