-- ===================================================================
-- Migration Script: Consolidate Equipment Data into cxalloytq
-- Purpose: Migrate all BACnet/trio equipment data into unified schema
-- Date: 2025-08-22
-- ===================================================================

USE cxalloytq;

-- Step 1: Create the new schema if not exists
-- Note: Schema will be loaded separately by the migration script

-- ===================================================================
-- Step 2: Data Migration from existing equipment_mapping table
-- Migrate any existing mapping data to preserve user work
-- ===================================================================

-- Check if old equipment_mapping table exists and migrate data
INSERT IGNORE INTO equipment_mappings (
    id,
    bacnet_equipment_id,
    bacnet_equipment_name,
    bacnet_equipment_type,
    cxalloy_equipment_id,
    cxalloy_equipment_name,
    cxalloy_category,
    mapping_type,
    confidence,
    mapping_reason,
    total_bacnet_points,
    mapped_points_count,
    unmapped_points_count,
    is_active,
    is_verified,
    verified_by,
    verified_at,
    created_at,
    updated_at,
    created_by,
    mapping_method
)
SELECT 
    COALESCE(id, CONCAT('migrated-', UUID())),
    COALESCE(bacnet_equipment_id, CONCAT('bacnet-', UUID())),
    COALESCE(bacnet_equipment_name, 'Unknown Equipment'),
    COALESCE(bacnet_equipment_type, 'Unknown'),
    CAST(cxalloy_equipment_id AS CHAR) as cxalloy_equipment_id,
    COALESCE(cxalloy_equipment_name, 'Unknown CxAlloy Equipment'),
    COALESCE(cxalloy_category, 'Unknown'),
    CASE 
        WHEN mapping_type = 'exact' THEN 'exact'
        WHEN mapping_type = 'automatic' THEN 'automatic'
        WHEN mapping_type = 'manual' THEN 'manual'
        ELSE 'manual'
    END,
    COALESCE(confidence, 0.5),
    COALESCE(mapping_reason, 'Migrated from existing data'),
    COALESCE(total_bacnet_points, 0),
    COALESCE(mapped_points_count, 0),
    COALESCE(unmapped_points_count, 0),
    COALESCE(is_active, TRUE),
    COALESCE(is_verified, FALSE),
    verified_by,
    verified_at,
    COALESCE(created_at, NOW()),
    COALESCE(updated_at, NOW()),
    COALESCE(created_by, 'migration-script'),
    COALESCE(mapping_method, 'manual')
FROM information_schema.tables t
LEFT JOIN equipment_mapping em ON t.table_name = 'equipment_mapping'
WHERE t.table_schema = 'cxalloytq' 
  AND t.table_name = 'equipment_mapping'
  AND em.cxalloy_equipment_id IS NOT NULL;

-- ===================================================================
-- Step 3: Create Sample BACnet Equipment Data
-- Since we need actual equipment data to work with the auto-mapping
-- ===================================================================

-- Insert sample BACnet equipment that would typically come from trio files
INSERT IGNORE INTO bacnet_equipment (
    id,
    original_file_id,
    original_filename,
    equipment_name,
    equipment_type,
    description,
    classification_confidence,
    status,
    total_points,
    file_path,
    vendor_name,
    haystack_tags,
    metadata
) VALUES 
-- Air Handler Units
('bacnet-ahu-001', 'file-ahu-1', 'AHU-1.trio', 'AHU-1', 'Air_Handler_Unit', 'Primary Air Handling Unit 1', 0.95, 'ACTIVE', 45, '/data/trio/AHU-1.trio', 'Johnson Controls', 
 JSON_ARRAY('ahu', 'airHandler', 'hvac', 'airHandlingUnit'), 
 JSON_OBJECT('building', 'Main', 'floor', '1', 'zone', 'North Wing')),

('bacnet-ahu-002', 'file-ahu-2', 'AHU-2.trio', 'AHU-2', 'Air_Handler_Unit', 'Secondary Air Handling Unit 2', 0.93, 'ACTIVE', 42, '/data/trio/AHU-2.trio', 'Johnson Controls',
 JSON_ARRAY('ahu', 'airHandler', 'hvac', 'airHandlingUnit'),
 JSON_OBJECT('building', 'Main', 'floor', '2', 'zone', 'South Wing')),

('bacnet-ahu-003', 'file-ahu-3', 'AHU-3.trio', 'AHU-3', 'Air_Handler_Unit', 'Air Handling Unit 3', 0.91, 'ACTIVE', 38, '/data/trio/AHU-3.trio', 'Carrier',
 JSON_ARRAY('ahu', 'airHandler', 'hvac', 'airHandlingUnit'),
 JSON_OBJECT('building', 'Main', 'floor', '3', 'zone', 'East Wing')),

-- VAV Controllers
('bacnet-vav-101', 'file-vav-101', 'VAV-101.trio', 'VAV-101', 'VAV_Controller', 'Variable Air Volume Controller Room 101', 0.88, 'ACTIVE', 25, '/data/trio/VAV-101.trio', 'Honeywell',
 JSON_ARRAY('vav', 'terminal', 'hvac', 'variableAirVolume'),
 JSON_OBJECT('building', 'Main', 'floor', '1', 'room', '101')),

('bacnet-vav-102', 'file-vav-102', 'VAV-102.trio', 'VAV-102', 'VAV_Controller', 'Variable Air Volume Controller Room 102', 0.87, 'ACTIVE', 28, '/data/trio/VAV-102.trio', 'Honeywell',
 JSON_ARRAY('vav', 'terminal', 'hvac', 'variableAirVolume', 'reheat'),
 JSON_OBJECT('building', 'Main', 'floor', '1', 'room', '102', 'hasReheat', true)),

('bacnet-vav-201', 'file-vav-201', 'VAV-201.trio', 'VAV-201', 'VAV_Controller', 'Variable Air Volume Controller Room 201', 0.86, 'ACTIVE', 24, '/data/trio/VAV-201.trio', 'Honeywell',
 JSON_ARRAY('vav', 'terminal', 'hvac', 'variableAirVolume'),
 JSON_OBJECT('building', 'Main', 'floor', '2', 'room', '201')),

-- Chillers
('bacnet-ch-001', 'file-ch-1', 'CH-1.trio', 'CH-1', 'Chiller', 'Primary Chiller Unit 1', 0.94, 'ACTIVE', 65, '/data/trio/CH-1.trio', 'Trane',
 JSON_ARRAY('chiller', 'cooling', 'hvac', 'waterCooled'),
 JSON_OBJECT('building', 'Main', 'location', 'Mechanical Room', 'capacity', '500 tons')),

('bacnet-ch-002', 'file-ch-2', 'CH-2.trio', 'CH-2', 'Chiller', 'Secondary Chiller Unit 2', 0.92, 'ACTIVE', 63, '/data/trio/CH-2.trio', 'Trane',
 JSON_ARRAY('chiller', 'cooling', 'hvac', 'waterCooled'),
 JSON_OBJECT('building', 'Main', 'location', 'Mechanical Room', 'capacity', '500 tons')),

-- RTU Controllers
('bacnet-rtu-001', 'file-rtu-1', 'RTU-01.trio', 'RTU-01', 'RTU_Controller', 'Rooftop Unit 01', 0.89, 'ACTIVE', 35, '/data/trio/RTU-01.trio', 'Lennox',
 JSON_ARRAY('rtu', 'rooftop', 'hvac', 'packagedUnit'),
 JSON_OBJECT('building', 'Main', 'location', 'Roof', 'zone', 'West Wing')),

('bacnet-rtu-002', 'file-rtu-2', 'RTU-02.trio', 'RTU-02', 'RTU_Controller', 'Rooftop Unit 02', 0.87, 'ACTIVE', 33, '/data/trio/RTU-02.trio', 'Lennox',
 JSON_ARRAY('rtu', 'rooftop', 'hvac', 'packagedUnit'),
 JSON_OBJECT('building', 'Main', 'location', 'Roof', 'zone', 'East Wing')),

-- Pumps
('bacnet-p-001', 'file-p-1', 'P-1.trio', 'P-1', 'Pump', 'Primary Chilled Water Pump', 0.85, 'ACTIVE', 18, '/data/trio/P-1.trio', 'Grundfos',
 JSON_ARRAY('pump', 'chilledWater', 'hvac', 'primary'),
 JSON_OBJECT('building', 'Main', 'location', 'Mechanical Room', 'system', 'Chilled Water')),

('bacnet-p-002', 'file-p-2', 'P-2.trio', 'P-2', 'Pump', 'Secondary Chilled Water Pump', 0.84, 'ACTIVE', 16, '/data/trio/P-2.trio', 'Grundfos',
 JSON_ARRAY('pump', 'chilledWater', 'hvac', 'secondary'),
 JSON_OBJECT('building', 'Main', 'location', 'Mechanical Room', 'system', 'Chilled Water'));

-- ===================================================================
-- Step 4: Create Sample BACnet Points for the Equipment
-- This simulates the normalized points that would come from trio processing
-- ===================================================================

-- Sample points for AHU-1
INSERT IGNORE INTO bacnet_points (
    id, equipment_id, original_point_id, original_name, normalized_name, display_name,
    description, category, data_type, units, bacnet_object_type, bacnet_object_instance,
    haystack_tags
) VALUES 
-- AHU-1 Points
('point-ahu1-sat', 'bacnet-ahu-001', 'SAT', 'Supply_Air_Temp', 'supply_air_temperature', 'Supply Air Temperature', 
 'Discharge air temperature sensor', 'SENSOR', 'Number', '°F', 'AI', 1,
 JSON_ARRAY('sensor', 'temp', 'air', 'discharge', 'supply')),

('point-ahu1-rat', 'bacnet-ahu-001', 'RAT', 'Return_Air_Temp', 'return_air_temperature', 'Return Air Temperature',
 'Return air temperature sensor', 'SENSOR', 'Number', '°F', 'AI', 2,
 JSON_ARRAY('sensor', 'temp', 'air', 'return')),

('point-ahu1-sf-cmd', 'bacnet-ahu-001', 'SF_CMD', 'Supply_Fan_Cmd', 'supply_fan_command', 'Supply Fan Command',
 'Supply fan start/stop command', 'COMMAND', 'Boolean', NULL, 'BO', 1,
 JSON_ARRAY('cmd', 'fan', 'supply')),

('point-ahu1-sf-status', 'bacnet-ahu-001', 'SF_STATUS', 'Supply_Fan_Status', 'supply_fan_status', 'Supply Fan Status',
 'Supply fan running status', 'STATUS', 'Boolean', NULL, 'BI', 1,
 JSON_ARRAY('sensor', 'fan', 'supply', 'run')),

-- VAV-101 Points
('point-vav101-zt', 'bacnet-vav-101', 'ZT', 'Zone_Temp', 'zone_temperature', 'Zone Temperature',
 'Room temperature sensor', 'SENSOR', 'Number', '°F', 'AI', 101,
 JSON_ARRAY('sensor', 'temp', 'zone', 'room')),

('point-vav101-dmp', 'bacnet-vav-101', 'DMP_CMD', 'Damper_Cmd', 'damper_position_command', 'Damper Position Command',
 'Supply air damper position command', 'COMMAND', 'Number', '%', 'AO', 101,
 JSON_ARRAY('cmd', 'damper', 'position', 'supply', 'air')),

('point-vav101-flow', 'bacnet-vav-101', 'AIRFLOW', 'Air_Flow', 'air_flow', 'Air Flow',
 'Supply air flow measurement', 'SENSOR', 'Number', 'cfm', 'AI', 102,
 JSON_ARRAY('sensor', 'flow', 'air', 'supply')),

-- CH-1 Points
('point-ch1-chwst', 'bacnet-ch-001', 'CHWST', 'CHW_Supply_Temp', 'chilled_water_supply_temp', 'Chilled Water Supply Temperature',
 'Chilled water supply temperature', 'SENSOR', 'Number', '°F', 'AI', 201,
 JSON_ARRAY('sensor', 'temp', 'water', 'chilled', 'supply')),

('point-ch1-chwrt', 'bacnet-ch-001', 'CHWRT', 'CHW_Return_Temp', 'chilled_water_return_temp', 'Chilled Water Return Temperature',
 'Chilled water return temperature', 'SENSOR', 'Number', '°F', 'AI', 202,
 JSON_ARRAY('sensor', 'temp', 'water', 'chilled', 'return')),

('point-ch1-run', 'bacnet-ch-001', 'CH_RUN', 'Chiller_Run_Cmd', 'chiller_run_command', 'Chiller Run Command',
 'Chiller start/stop command', 'COMMAND', 'Boolean', NULL, 'BO', 201,
 JSON_ARRAY('cmd', 'chiller', 'run'));

-- ===================================================================
-- Step 5: Update Point Counts in Equipment Table
-- Ensure the total_points matches actual point count
-- ===================================================================

UPDATE bacnet_equipment be
SET total_points = (
    SELECT COUNT(*) 
    FROM bacnet_points bp 
    WHERE bp.equipment_id = be.id
)
WHERE EXISTS (
    SELECT 1 FROM bacnet_points bp WHERE bp.equipment_id = be.id
);

-- ===================================================================
-- Step 6: Create Initial Template Data with Point Templates
-- Set up comprehensive templates for testing
-- ===================================================================

-- Insert comprehensive point templates for VAV Standard
INSERT IGNORE INTO point_templates (
    id, template_id, point_name, display_name, description,
    object_type, data_type, category, point_function,
    units, is_required, is_writable, normalization_pattern,
    normalized_name, haystack_tags, priority, point_group
) VALUES 
-- VAV Standard Template Points
('vav-std-zt', 'vav-standard-v1', 'Zone_Temp', 'Zone Temperature', 'Room temperature sensor',
 'AI', 'Number', 'SENSOR', 'temperature_sensor', '°F', TRUE, FALSE, 
 '.*(zone|room|space).*temp.*', 'zone_temperature', 
 JSON_ARRAY('sensor', 'temp', 'zone', 'room'), 100, 'temperatures'),

('vav-std-dmp', 'vav-standard-v1', 'Damper_Cmd', 'Damper Position', 'Supply air damper position command',
 'AO', 'Number', 'COMMAND', 'damper_command', '%', TRUE, TRUE,
 '.*(damper|dmp).*', 'damper_position_command',
 JSON_ARRAY('cmd', 'damper', 'position', 'supply', 'air'), 95, 'commands'),

('vav-std-flow', 'vav-standard-v1', 'Air_Flow', 'Air Flow', 'Supply air flow measurement',
 'AI', 'Number', 'SENSOR', 'flow_sensor', 'cfm', FALSE, FALSE,
 '.*(flow|airflow).*', 'air_flow',
 JSON_ARRAY('sensor', 'flow', 'air', 'supply'), 80, 'flows'),

-- VAV with Reheat Template Points (inherits from standard + reheat)
('vav-rh-zt', 'vav-reheat-v1', 'Zone_Temp', 'Zone Temperature', 'Room temperature sensor',
 'AI', 'Number', 'SENSOR', 'temperature_sensor', '°F', TRUE, FALSE,
 '.*(zone|room|space).*temp.*', 'zone_temperature',
 JSON_ARRAY('sensor', 'temp', 'zone', 'room'), 100, 'temperatures'),

('vav-rh-dmp', 'vav-reheat-v1', 'Damper_Cmd', 'Damper Position', 'Supply air damper position command',
 'AO', 'Number', 'COMMAND', 'damper_command', '%', TRUE, TRUE,
 '.*(damper|dmp).*', 'damper_position_command',
 JSON_ARRAY('cmd', 'damper', 'position', 'supply', 'air'), 95, 'commands'),

('vav-rh-reheat', 'vav-reheat-v1', 'Reheat_Valve', 'Reheat Valve Position', 'Hot water reheat valve position',
 'AO', 'Number', 'COMMAND', 'valve_command', '%', TRUE, TRUE,
 '.*(reheat|valve).*', 'reheat_valve_command',
 JSON_ARRAY('cmd', 'valve', 'position', 'hotWater', 'reheat'), 90, 'commands'),

-- AHU Basic Template Points
('ahu-basic-sat', 'ahu-basic-v1', 'Supply_Air_Temp', 'Supply Air Temperature', 'Discharge air temperature sensor',
 'AI', 'Number', 'SENSOR', 'temperature_sensor', '°F', TRUE, FALSE,
 '.*(supply|discharge).*air.*temp.*', 'supply_air_temperature',
 JSON_ARRAY('sensor', 'temp', 'air', 'discharge', 'supply'), 100, 'temperatures'),

('ahu-basic-rat', 'ahu-basic-v1', 'Return_Air_Temp', 'Return Air Temperature', 'Return air temperature sensor',
 'AI', 'Number', 'SENSOR', 'temperature_sensor', '°F', TRUE, FALSE,
 '.*return.*air.*temp.*', 'return_air_temperature',
 JSON_ARRAY('sensor', 'temp', 'air', 'return'), 95, 'temperatures'),

('ahu-basic-sf', 'ahu-basic-v1', 'Supply_Fan', 'Supply Fan Command', 'Supply fan start/stop command',
 'BO', 'Boolean', 'COMMAND', 'fan_command', NULL, TRUE, TRUE,
 '.*supply.*fan.*(cmd|command).*', 'supply_fan_command',
 JSON_ARRAY('cmd', 'fan', 'supply'), 90, 'commands');

-- ===================================================================
-- Step 7: Create Migration Status Tracking
-- Track the migration process and results
-- ===================================================================

CREATE TABLE IF NOT EXISTS migration_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    status ENUM('started', 'completed', 'failed') DEFAULT 'started',
    records_processed INT DEFAULT 0,
    errors_encountered INT DEFAULT 0,
    error_details TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    INDEX idx_migration_name (migration_name),
    INDEX idx_status (status)
);

-- Log this migration
INSERT INTO migration_log (migration_name, status, records_processed) 
VALUES ('001-consolidate-equipment-data', 'completed', 
    (SELECT COUNT(*) FROM bacnet_equipment) + (SELECT COUNT(*) FROM bacnet_points));

-- ===================================================================
-- Step 8: Verification Queries
-- Verify the migration was successful
-- ===================================================================

-- Summary of migrated data
SELECT 
    'BACnet Equipment' as entity_type,
    COUNT(*) as count,
    MIN(created_at) as earliest_date,
    MAX(created_at) as latest_date
FROM bacnet_equipment
UNION ALL
SELECT 
    'BACnet Points' as entity_type,
    COUNT(*) as count,
    MIN(created_at) as earliest_date,
    MAX(created_at) as latest_date
FROM bacnet_points
UNION ALL
SELECT 
    'Equipment Mappings' as entity_type,
    COUNT(*) as count,
    MIN(created_at) as earliest_date,
    MAX(created_at) as latest_date
FROM equipment_mappings
UNION ALL
SELECT 
    'Equipment Templates' as entity_type,
    COUNT(*) as count,
    MIN(created_at) as earliest_date,
    MAX(created_at) as latest_date
FROM equipment_templates
UNION ALL
SELECT 
    'Point Templates' as entity_type,
    COUNT(*) as count,
    MIN(created_at) as earliest_date,
    MAX(created_at) as latest_date
FROM point_templates;

-- Show equipment with point counts
SELECT 
    equipment_name,
    equipment_type,
    total_points,
    (SELECT COUNT(*) FROM bacnet_points WHERE equipment_id = be.id) as actual_points,
    status
FROM bacnet_equipment be
ORDER BY equipment_type, equipment_name;

COMMIT;