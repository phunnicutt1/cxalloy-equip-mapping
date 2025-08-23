-- ===================================================================
-- CxAlloy Equipment Mapping - Consolidated Database Schema
-- Database: cxalloytq
-- Purpose: Unified schema for BACnet equipment, CxAlloy equipment mapping, 
--          and template management in a single database
-- ===================================================================

USE cxalloytq;

-- ===================================================================
-- 1. BACNET EQUIPMENT TABLES
-- Store processed trio file data and BACnet equipment information
-- ===================================================================

-- Main BACnet equipment table (from processed trio files)
CREATE TABLE IF NOT EXISTS bacnet_equipment (
    id VARCHAR(255) PRIMARY KEY,
    original_file_id VARCHAR(255) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    equipment_name VARCHAR(255) NOT NULL,
    equipment_type ENUM('Air_Handler_Unit', 'VAV_Controller', 'RTU_Controller', 'Chiller', 'Boiler', 'Pump', 'Fan', 'Valve', 'Damper', 'Unknown') DEFAULT 'Unknown',
    description TEXT,
    classification_confidence DECIMAL(3,2) DEFAULT 0.00,
    status ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR') DEFAULT 'ACTIVE',
    connection_state ENUM('CONNECTED', 'DISCONNECTED', 'TIMEOUT', 'ERROR') DEFAULT 'DISCONNECTED',
    total_points INT DEFAULT 0,
    processed_points INT DEFAULT 0,
    file_path VARCHAR(1000),
    vendor_name VARCHAR(255),
    model_name VARCHAR(255),
    haystack_tags JSON,
    metadata JSON,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_equipment_name (equipment_name),
    INDEX idx_equipment_type (equipment_type),
    INDEX idx_filename (original_filename),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- BACnet points table (normalized points from trio files)
CREATE TABLE IF NOT EXISTS bacnet_points (
    id VARCHAR(255) PRIMARY KEY,
    equipment_id VARCHAR(255) NOT NULL,
    original_point_id VARCHAR(255) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    normalized_name VARCHAR(500),
    display_name VARCHAR(500),
    description TEXT,
    category ENUM('SENSOR', 'COMMAND', 'STATUS', 'PARAMETER', 'UNKNOWN') DEFAULT 'UNKNOWN',
    data_type ENUM('Number', 'Boolean', 'String', 'Enum', 'DateTime', 'Unknown') DEFAULT 'Unknown',
    units VARCHAR(50),
    bacnet_object_type VARCHAR(10),
    bacnet_object_instance INT,
    vendor_name VARCHAR(255),
    raw_value TEXT,
    haystack_tags JSON,
    normalization_metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints removed for simplified migration
    INDEX idx_equipment_id (equipment_id),
    INDEX idx_original_name (original_name),
    INDEX idx_normalized_name (normalized_name),
    INDEX idx_category (category),
    INDEX idx_object_type (bacnet_object_type),
    UNIQUE KEY unique_equipment_point (equipment_id, original_point_id)
);

-- ===================================================================
-- 2. EQUIPMENT MAPPING TABLES
-- Link BACnet equipment to CxAlloy equipment with confidence scoring
-- ===================================================================

-- Main equipment mapping table
CREATE TABLE IF NOT EXISTS equipment_mappings (
    id VARCHAR(255) PRIMARY KEY,
    bacnet_equipment_id VARCHAR(255) NOT NULL,
    bacnet_equipment_name VARCHAR(255) NOT NULL,
    bacnet_equipment_type VARCHAR(100) NOT NULL,
    cxalloy_equipment_id VARCHAR(255) NOT NULL,
    cxalloy_equipment_name VARCHAR(255) NOT NULL,
    cxalloy_category VARCHAR(100),
    
    -- Mapping metadata
    mapping_type ENUM('exact', 'automatic', 'manual', 'suggested') NOT NULL,
    confidence DECIMAL(4,3) NOT NULL DEFAULT 0.000,
    mapping_reason TEXT,
    mapping_method ENUM('auto', 'manual', 'bulk') DEFAULT 'manual',
    
    -- Point mapping statistics
    total_bacnet_points INT DEFAULT 0,
    mapped_points_count INT DEFAULT 0,
    unmapped_points_count INT DEFAULT 0,
    
    -- Status and verification
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(255),
    verified_at TIMESTAMP NULL,
    
    -- Audit trail
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255) DEFAULT 'system',
    
    -- Foreign key constraints removed for simplified migration
    INDEX idx_bacnet_equipment (bacnet_equipment_id),
    INDEX idx_cxalloy_equipment (cxalloy_equipment_id),
    INDEX idx_mapping_type (mapping_type),
    INDEX idx_confidence (confidence),
    INDEX idx_verified (is_verified),
    INDEX idx_created_at (created_at),
    UNIQUE KEY unique_bacnet_mapping (bacnet_equipment_id),
    UNIQUE KEY unique_cxalloy_mapping (cxalloy_equipment_id)
);

-- Auto-mapping session tracking
CREATE TABLE IF NOT EXISTS auto_mapping_sessions (
    id VARCHAR(255) PRIMARY KEY,
    session_name VARCHAR(255) NOT NULL,
    
    -- Session parameters
    bacnet_equipment_count INT DEFAULT 0,
    cxalloy_equipment_count INT DEFAULT 0,
    
    -- Results
    exact_matches_count INT DEFAULT 0,
    suggested_matches_count INT DEFAULT 0,
    unmatched_bacnet_count INT DEFAULT 0,
    unmatched_cxalloy_count INT DEFAULT 0,
    
    -- Performance metrics
    processing_time_ms INT DEFAULT 0,
    algorithm_version VARCHAR(50) DEFAULT '1.0',
    
    -- Session status
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    error_message TEXT,
    
    -- Results data (JSON storage for complex results)
    results_data JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    created_by VARCHAR(255) DEFAULT 'system',
    
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- ===================================================================
-- 3. TEMPLATE MANAGEMENT TABLES
-- Store equipment templates and track their applications
-- ===================================================================

-- Equipment template library
CREATE TABLE IF NOT EXISTS equipment_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) DEFAULT '1.0',
    
    -- Template classification
    equipment_type VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    industry VARCHAR(100),
    vendor VARCHAR(255),
    
    -- Template scope and access
    scope ENUM('global', 'project', 'organization', 'personal') DEFAULT 'project',
    organization_id INT,
    project_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Template configuration
    applicable_filename_patterns JSON, -- Array of regex patterns
    normalization_rules JSON,
    equipment_haystack_tags JSON,
    default_point_tags JSON,
    
    -- Quality thresholds
    minimum_point_match DECIMAL(3,2) DEFAULT 0.70,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.80,
    
    -- Usage statistics
    times_applied INT DEFAULT 0,
    success_rate DECIMAL(4,3) DEFAULT 0.000,
    average_point_match_rate DECIMAL(4,3) DEFAULT 0.000,
    last_used TIMESTAMP NULL,
    
    -- Template metadata
    tags JSON, -- Searchable tags array
    parent_template_id VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    
    -- Foreign key constraints removed for simplified migration
    INDEX idx_equipment_type (equipment_type),
    INDEX idx_scope (scope),
    INDEX idx_active (is_active),
    INDEX idx_created_at (created_at),
    INDEX idx_times_applied (times_applied),
    UNIQUE KEY unique_template_name (name, scope, organization_id, project_id)
);

-- Point templates (expected points for each equipment template)
CREATE TABLE IF NOT EXISTS point_templates (
    id VARCHAR(255) PRIMARY KEY,
    template_id VARCHAR(255) NOT NULL,
    
    -- Point identification
    point_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Point properties
    object_type VARCHAR(10) NOT NULL,
    data_type ENUM('Number', 'Boolean', 'String', 'Enum', 'DateTime') NOT NULL,
    category ENUM('SENSOR', 'COMMAND', 'STATUS', 'PARAMETER') NOT NULL,
    point_function VARCHAR(100), -- e.g., 'temperature_sensor', 'damper_command'
    
    -- Requirements and validation
    units VARCHAR(50),
    is_required BOOLEAN DEFAULT FALSE,
    is_writable BOOLEAN DEFAULT FALSE,
    value_range_min DECIMAL(10,3),
    value_range_max DECIMAL(10,3),
    enum_values JSON, -- For enumerated points
    
    -- Normalization and matching
    normalization_pattern VARCHAR(500), -- Regex pattern for matching
    normalized_name VARCHAR(255),
    haystack_tags JSON,
    
    -- Template organization
    priority INT DEFAULT 100, -- Higher = more important
    point_group VARCHAR(100), -- e.g., 'temperatures', 'flows', 'commands'
    
    -- Conditional logic
    conditions JSON, -- When this point applies
    
    -- Usage statistics
    times_applied INT DEFAULT 0,
    success_rate DECIMAL(4,3) DEFAULT 0.000,
    last_used TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints removed for simplified migration
    INDEX idx_template_id (template_id),
    INDEX idx_point_name (point_name),
    INDEX idx_required (is_required),
    INDEX idx_category (category),
    INDEX idx_priority (priority)
);

-- Template application tracking
CREATE TABLE IF NOT EXISTS template_applications (
    id VARCHAR(255) PRIMARY KEY,
    template_id VARCHAR(255) NOT NULL,
    equipment_mapping_id VARCHAR(255) NOT NULL,
    variant_used VARCHAR(255),
    
    -- Application results
    success BOOLEAN DEFAULT FALSE,
    confidence DECIMAL(4,3) DEFAULT 0.000,
    
    -- Point matching results
    required_points_matched INT DEFAULT 0,
    required_points_total INT DEFAULT 0,
    optional_points_matched INT DEFAULT 0,
    optional_points_total INT DEFAULT 0,
    unmapped_points_count INT DEFAULT 0,
    
    -- Quality metrics
    required_point_match_rate DECIMAL(4,3) DEFAULT 0.000,
    total_point_match_rate DECIMAL(4,3) DEFAULT 0.000,
    normalization_success_rate DECIMAL(4,3) DEFAULT 0.000,
    
    -- Application metadata
    processing_time_ms INT DEFAULT 0,
    rules_applied INT DEFAULT 0,
    is_automatic BOOLEAN DEFAULT FALSE,
    
    -- Issues and recommendations
    warnings JSON,
    errors JSON,
    recommendations JSON,
    
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(255) NOT NULL,
    
    -- Foreign key constraints removed for simplified migration
    INDEX idx_template_id (template_id),
    INDEX idx_equipment_mapping (equipment_mapping_id),
    INDEX idx_success (success),
    INDEX idx_confidence (confidence),
    INDEX idx_applied_at (applied_at)
);

-- Point mappings (specific point-to-point mappings within template applications)
CREATE TABLE IF NOT EXISTS point_mappings (
    id VARCHAR(255) PRIMARY KEY,
    template_application_id VARCHAR(255) NOT NULL,
    template_point_id VARCHAR(255) NOT NULL,
    bacnet_point_id VARCHAR(255),
    
    -- Mapping results
    matched BOOLEAN DEFAULT FALSE,
    confidence DECIMAL(4,3) DEFAULT 0.000,
    mapping_reason TEXT,
    
    -- Manual overrides
    is_manual_override BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints removed for simplified migration
    INDEX idx_template_application (template_application_id),
    INDEX idx_template_point (template_point_id),
    INDEX idx_bacnet_point (bacnet_point_id),
    INDEX idx_matched (matched),
    UNIQUE KEY unique_template_point_mapping (template_application_id, template_point_id)
);

-- ===================================================================
-- 4. ANALYTICS AND REPORTING TABLES
-- Track system performance and usage patterns
-- ===================================================================

-- System analytics summary
CREATE TABLE IF NOT EXISTS system_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    analytics_date DATE NOT NULL,
    
    -- Equipment counts
    total_bacnet_equipment INT DEFAULT 0,
    total_cxalloy_equipment INT DEFAULT 0,
    total_mappings INT DEFAULT 0,
    verified_mappings INT DEFAULT 0,
    
    -- Template usage
    total_templates INT DEFAULT 0,
    active_templates INT DEFAULT 0,
    template_applications_today INT DEFAULT 0,
    
    -- Auto-mapping performance
    auto_mapping_sessions_today INT DEFAULT 0,
    average_confidence_score DECIMAL(4,3) DEFAULT 0.000,
    exact_match_rate DECIMAL(4,3) DEFAULT 0.000,
    
    -- Processing performance
    average_processing_time_ms INT DEFAULT 0,
    total_points_processed INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_analytics_date (analytics_date),
    INDEX idx_analytics_date (analytics_date)
);

-- ===================================================================
-- 5. DATA MIGRATION VIEWS
-- Provide compatibility views for existing queries
-- ===================================================================

-- View to maintain compatibility with existing equipment queries
CREATE OR REPLACE VIEW equipment_view AS
SELECT 
    id,
    equipment_name as name,
    equipment_type as type,
    description,
    original_filename as filename,
    file_path,
    total_points,
    created_at,
    last_updated as updated_at
FROM bacnet_equipment
WHERE status = 'ACTIVE';

-- View for equipment with point counts
CREATE OR REPLACE VIEW equipment_with_points AS
SELECT 
    e.id,
    e.equipment_name as name,
    e.equipment_type as type,
    e.description,
    e.original_filename as filename,
    e.file_path,
    e.total_points,
    COUNT(p.id) as actual_point_count,
    e.created_at,
    e.last_updated as updated_at
FROM bacnet_equipment e
LEFT JOIN bacnet_points p ON e.id = p.equipment_id
WHERE e.status = 'ACTIVE'
GROUP BY e.id, e.equipment_name, e.equipment_type, e.description, 
         e.original_filename, e.file_path, e.total_points, e.created_at, e.last_updated;

-- ===================================================================
-- 6. INITIAL DATA AND INDEXES
-- Set up default templates and optimize queries
-- ===================================================================

-- Insert default equipment templates
INSERT IGNORE INTO equipment_templates (
    id, name, description, equipment_type, category, scope, 
    minimum_point_match, confidence_threshold, created_by
) VALUES 
('vav-standard-v1', 'VAV Standard', 'Standard Variable Air Volume box template', 'VAV_Controller', 'HVAC', 'global', 0.70, 0.80, 'system'),
('vav-reheat-v1', 'VAV with Reheat', 'Variable Air Volume box with reheat coil', 'VAV_Controller', 'HVAC', 'global', 0.70, 0.80, 'system'),
('ahu-basic-v1', 'AHU Basic', 'Basic Air Handling Unit template', 'Air_Handler_Unit', 'HVAC', 'global', 0.60, 0.75, 'system'),
('rtu-basic-v1', 'RTU Basic', 'Basic Rooftop Unit template', 'RTU_Controller', 'HVAC', 'global', 0.65, 0.75, 'system'),
('chiller-basic-v1', 'Chiller Basic', 'Basic Chiller template', 'Chiller', 'HVAC', 'global', 0.60, 0.70, 'system');

-- Create additional indexes for performance
CREATE INDEX idx_bacnet_equipment_composite ON bacnet_equipment(equipment_type, status, created_at);
CREATE INDEX idx_equipment_mappings_composite ON equipment_mappings(mapping_type, is_verified, confidence);
CREATE INDEX idx_template_applications_composite ON template_applications(template_id, success, applied_at);

-- ===================================================================
-- 7. UTILITY FUNCTIONS AND TRIGGERS
-- Maintain data consistency and provide helper functions
-- Note: Functions and triggers will be created via separate scripts if needed
-- ===================================================================

-- Note: Triggers and functions commented out for initial migration
-- They can be added later via separate database management scripts

-- CREATE TRIGGER update_mapping_stats_after_point_mapping
--     AFTER INSERT ON point_mappings
--     FOR EACH ROW
--     UPDATE equipment_mappings em
--     INNER JOIN template_applications ta ON em.id = ta.equipment_mapping_id
--     SET em.mapped_points_count = (
--         SELECT COUNT(*) FROM point_mappings pm 
--         WHERE pm.template_application_id = ta.id AND pm.matched = TRUE
--     ),
--     em.unmapped_points_count = em.total_bacnet_points - em.mapped_points_count
--     WHERE ta.id = NEW.template_application_id;