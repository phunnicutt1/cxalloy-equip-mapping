-- Unified Templates Table Schema
-- Combines functionality of both EquipmentTemplate and MappingTemplate

-- Drop existing tables if they exist
DROP TABLE IF EXISTS template_applications;
DROP TABLE IF EXISTS template_points;
DROP TABLE IF EXISTS unified_templates;

-- Main templates table
CREATE TABLE unified_templates (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Equipment information
  equipment_type VARCHAR(100) NOT NULL,
  category VARCHAR(100),
  vendor VARCHAR(100),
  model VARCHAR(100),
  
  -- Source information (for mapping templates)
  source_equipment_id VARCHAR(100),
  source_equipment_name VARCHAR(255),
  source_bacnet_id VARCHAR(100),
  source_bacnet_name VARCHAR(255),
  
  -- Template metadata
  template_type ENUM('equipment', 'mapping', 'hybrid') NOT NULL DEFAULT 'hybrid',
  is_built_in BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Usage statistics
  usage_count INT DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 0.00,
  effectiveness DECIMAL(3,2) DEFAULT 0.00,
  
  -- Timestamps and audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(100) NOT NULL DEFAULT 'system',
  updated_by VARCHAR(100),
  
  -- Indexes
  INDEX idx_equipment_type (equipment_type),
  INDEX idx_template_type (template_type),
  INDEX idx_category (category),
  INDEX idx_created_at (created_at)
);

-- Template points table
CREATE TABLE template_points (
  id VARCHAR(100) PRIMARY KEY,
  template_id VARCHAR(100) NOT NULL,
  template_point_id VARCHAR(100) NOT NULL,
  
  -- Point identification
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Point configuration
  point_function VARCHAR(50),
  object_type VARCHAR(20),
  units VARCHAR(50),
  required BOOLEAN DEFAULT TRUE,
  
  -- Mapping patterns
  bacnet_cur VARCHAR(255),
  bacnet_dis VARCHAR(255),
  bacnet_desc TEXT,
  nav_name VARCHAR(255),
  
  -- Matching configuration
  matching_facet ENUM('bacnetCur', 'bacnetDis', 'bacnetDesc'),
  confidence DECIMAL(3,2) DEFAULT 0.80,
  
  -- Metadata
  haystack_tags JSON,
  display_order INT DEFAULT 0,
  
  -- Foreign key
  FOREIGN KEY (template_id) REFERENCES unified_templates(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_template_id (template_id),
  INDEX idx_template_point_id (template_point_id),
  INDEX idx_required (required),
  
  -- Unique constraint
  UNIQUE KEY unique_template_point (template_id, template_point_id)
);

-- Template applications table
CREATE TABLE template_applications (
  id VARCHAR(100) PRIMARY KEY,
  template_id VARCHAR(100) NOT NULL,
  template_name VARCHAR(255),
  
  -- Target equipment
  target_equipment_id VARCHAR(100) NOT NULL,
  target_equipment_name VARCHAR(255),
  target_equipment_type VARCHAR(100),
  
  -- Application details (stored as JSON for flexibility)
  applied_points JSON,
  matching_options JSON,
  matching_results JSON,
  
  -- Metadata
  application_type ENUM('point-tracking', 'bulk-mapping', 'manual') NOT NULL,
  is_successful BOOLEAN DEFAULT FALSE,
  errors JSON,
  
  -- Timestamps
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  applied_by VARCHAR(100) NOT NULL DEFAULT 'system',
  
  -- Foreign key
  FOREIGN KEY (template_id) REFERENCES unified_templates(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_template_id_app (template_id),
  INDEX idx_target_equipment (target_equipment_id),
  INDEX idx_applied_at (applied_at),
  INDEX idx_successful (is_successful)
);

-- Create view for template statistics
CREATE VIEW template_statistics AS
SELECT 
  t.id,
  t.name,
  t.equipment_type,
  t.template_type,
  COUNT(DISTINCT ta.id) as total_applications,
  SUM(CASE WHEN ta.is_successful = 1 THEN 1 ELSE 0 END) as successful_applications,
  AVG(JSON_EXTRACT(ta.matching_results, '$.averageConfidence')) as avg_confidence,
  MAX(ta.applied_at) as last_applied
FROM unified_templates t
LEFT JOIN template_applications ta ON t.id = ta.template_id
GROUP BY t.id, t.name, t.equipment_type, t.template_type;

-- Insert default templates (converted from existing defaults)
INSERT INTO unified_templates (
  id, name, description, equipment_type, template_type, 
  is_built_in, is_default, created_by
) VALUES 
  ('vav-standard', 'VAV Standard', 'Standard Variable Air Volume box template', 'VAV Controller', 'equipment', TRUE, TRUE, 'system'),
  ('vav-reheat', 'VAV with Reheat', 'Variable Air Volume box with reheat coil', 'VAV Controller', 'equipment', TRUE, FALSE, 'system'),
  ('ahu-basic', 'AHU Basic', 'Basic Air Handling Unit template', 'Air Handler Unit', 'equipment', TRUE, TRUE, 'system');

-- Insert default template points for VAV Standard
INSERT INTO template_points (
  id, template_id, template_point_id, name, description, 
  point_function, object_type, units, required, haystack_tags
) VALUES 
  ('vav-std-1', 'vav-standard', 'room-temp', 'Room Temperature', 'Zone temperature sensor', 'Sensor', 'AI', '°F', TRUE, JSON_ARRAY('sensor', 'temp', 'zone', 'room')),
  ('vav-std-2', 'vav-standard', 'damper-pos', 'Damper Position', 'Supply air damper position command', 'Command', 'AO', '%', TRUE, JSON_ARRAY('cmd', 'damper', 'position', 'supply', 'air')),
  ('vav-std-3', 'vav-standard', 'airflow', 'Air Flow', 'Supply air flow measurement', 'Sensor', 'AI', 'cfm', FALSE, JSON_ARRAY('sensor', 'flow', 'air', 'supply'));

-- Insert default template points for VAV with Reheat
INSERT INTO template_points (
  id, template_id, template_point_id, name, description, 
  point_function, object_type, units, required, haystack_tags
) VALUES 
  ('vav-rh-1', 'vav-reheat', 'room-temp', 'Room Temperature', 'Zone temperature sensor', 'Sensor', 'AI', '°F', TRUE, JSON_ARRAY('sensor', 'temp', 'zone', 'room')),
  ('vav-rh-2', 'vav-reheat', 'damper-pos', 'Damper Position', 'Supply air damper position command', 'Command', 'AO', '%', TRUE, JSON_ARRAY('cmd', 'damper', 'position', 'supply', 'air')),
  ('vav-rh-3', 'vav-reheat', 'reheat-valve', 'Reheat Valve', 'Hot water reheat valve position', 'Command', 'AO', '%', TRUE, JSON_ARRAY('cmd', 'valve', 'position', 'hotWater', 'reheat'));

-- Insert default template points for AHU Basic
INSERT INTO template_points (
  id, template_id, template_point_id, name, description, 
  point_function, object_type, units, required, haystack_tags
) VALUES 
  ('ahu-1', 'ahu-basic', 'supply-temp', 'Supply Air Temperature', 'Discharge air temperature sensor', 'Sensor', 'AI', '°F', TRUE, JSON_ARRAY('sensor', 'temp', 'air', 'discharge', 'supply')),
  ('ahu-2', 'ahu-basic', 'return-temp', 'Return Air Temperature', 'Return air temperature sensor', 'Sensor', 'AI', '°F', TRUE, JSON_ARRAY('sensor', 'temp', 'air', 'return')),
  ('ahu-3', 'ahu-basic', 'supply-fan', 'Supply Fan', 'Supply fan start/stop command', 'Command', 'BO', NULL, TRUE, JSON_ARRAY('cmd', 'fan', 'supply'));