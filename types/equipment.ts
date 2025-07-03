/**
 * Equipment Type Enumeration
 * Based on filename patterns from sample data analysis
 */
export enum EquipmentType {
  LAB_AIR_VALVE = "Lab Air Valve",
  VAV_CONTROLLER = "VAV Controller", 
  RTU_CONTROLLER = "RTU Controller",
  AIR_HANDLER_UNIT = "Air Handler Unit",
  EXHAUST_FAN = "Exhaust Fan",
  CHILLER = "Chiller",
  BOILER = "Boiler",
  UNIT_HEATER = "Unit Heater",
  HUMIDIFIER = "Humidifier",
  RETURN_VAV = "Return VAV",
  AHU_CONTROLLER = "AHU Controller",
  CHILLER_SYSTEM = "Chiller System",
  BOILER_SYSTEM = "Boiler System",
  PUMP_CONTROLLER = "Pump Controller",
  UNKNOWN = "Unknown"
}

/**
 * Equipment Status from BACnet Device
 */
export enum EquipmentStatus {
  OPERATIONAL = "OPERATIONAL",
  FAULT = "FAULT", 
  OFFLINE = "OFFLINE",
  DISABLED = "DISABLED",
  UNKNOWN = "UNKNOWN"
}

/**
 * Connection State for BACnet Communication
 */
export enum ConnectionState {
  OPEN = "open",
  CLOSED = "closed",
  CONNECTING = "connecting",
  ERROR = "error"
}

// Import NormalizedPoint from the normalized types
import type { NormalizedPoint } from './normalized';

/**
 * Equipment Template Interface
 */
export interface EquipmentTemplate {
  id: string;
  name: string;
  type?: EquipmentType;
  equipmentType: EquipmentType; // Primary equipment type
  description?: string;
  category?: string; // Template category for grouping
  pointPatterns?: string[];
  requiredPoints?: PointTemplate[];
  optionalPoints?: PointTemplate[];
  pointMappings?: Array<{
    pointName: string;
    normalizedName: string;
    objectType: string;
    unit: string;
    required: boolean;
    haystackTags: string[];
  }>; // Point mapping definitions
  isBuiltIn?: boolean; // Whether this is a built-in template
  effectiveness?: number; // 0-1 effectiveness score for template matching
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Point Template Interface
 */
export interface PointTemplate {
  id: string;
  name: string;
  description?: string;
  pointFunction: import('./normalized').PointFunction;
  objectType?: import('./point').BACnetObjectType;
  units?: string;
}

/**
 * CxAlloy Equipment Interface
 */
export interface CxAlloyEquipment {
  id: string;
  name: string;
  type: string;
  description?: string;
  location?: string;
  zone?: string;
  system?: string;
}

/**
 * Equipment Mapping Interface
 */
export interface EquipmentMapping {
  bacnetEquipmentId: string;
  cxAlloyEquipmentId: string;
  mappedAt: string;
  confidence: number;
  mappingType: 'manual' | 'automatic';
}

/**
 * Core Equipment Interface
 * Represents a single piece of building automation equipment
 */
export interface Equipment {
  // Identification
  id: string;
  name: string;
  displayName: string;
  type: EquipmentType | string;
  filename: string; // Original trio filename (e.g., "L_5.trio", "VVR_2.1.trio")
  
  // Equipment Details
  vendor: string;
  modelName: string;
  model?: string; // Alias for modelName
  description?: string;
  location?: string;
  
  // Points
  points?: NormalizedPoint[];
  totalPoints?: number;
  processedPoints?: number;
  
  // BACnet Properties
  bacnetDeviceId?: number;
  bacnetDeviceName?: string;
  bacnetVersion?: string;
  bacnetAddress?: string; // URI format (e.g., "bacnet://10.92.26.100/1011012")
  
  // Connection Status
  status: EquipmentStatus;
  connectionState: ConnectionState;
  connectionStatus: string; // "ok", "fault", etc.
  lastCommunication?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  disabled?: boolean;
  
  // Additional metadata from CSV files
  metadata?: {
    deviceName?: string;
    deviceStatus?: string;
    bacnetVersion?: string;
    ipAddress?: string;
    deviceId?: string;
    network?: string;
    uri?: string;
    customFields?: Record<string, string>;
  };
}

/**
 * Equipment Summary for List Views
 */
export interface EquipmentSummary {
  id: string;
  name: string;
  type: EquipmentType;
  status: EquipmentStatus;
  pointCount: number;
  mappedToCxAlloy: boolean;
}

/**
 * Equipment Group for categorized display
 */
export interface EquipmentGroup {
  type: EquipmentType;
  equipment: EquipmentSummary[];
  count: number;
}

/**
 * Equipment Classification Result
 * Result of filename-based equipment type detection
 */
export interface EquipmentClassification {
  filename: string;
  detectedType: EquipmentType;
  confidence: number; // 0-1 confidence score
  reasoning: string; // Explanation of classification logic
  alternativeTypes?: EquipmentType[];
}

/**
 * Equipment Configuration
 * Standard configuration for each equipment type
 */
export interface EquipmentConfig {
  displayName: string;
  description: string;
  typicalPoints: string[];
  vendor: string;
  category: string;
  tags: string[];
}

/**
 * Equipment Source
 * Equipment data loaded from trio files with associated BACnet points
 */
export interface EquipmentSource {
  id: string;
  name: string;
  type: EquipmentType;
  fileName: string;
  points: any[]; // BACnetPoint array
  metadata: {
    classification?: any;
    connector?: any;
    trioMetadata?: any;
    processingDate: string;
    pointCount: number;
    confidence: number;
  };
  status: string;
  tags: string[];
}

/**
 * Enhanced Connector Data for advanced CSV processing
 * Extends basic ConnectorData with dynamic field detection and metadata
 */
export interface EnhancedConnectorData {
  // Basic fields (maintaining compatibility)
  fileName: string;
  equipmentName: string;
  vendor?: string;
  model?: string;
  description?: string;
  uri?: string;
  deviceName?: string;
  
  // Enhanced fields from dynamic detection
  vendorName?: string;
  modelName?: string;
  location?: string;
  fullDescription: string; // Generated from all available fields
  additionalFields: Record<string, string>; // All other detected fields
  
  // Field mapping metadata
  fieldMappings: {
    detectedVendorField?: string;
    detectedModelField?: string;
    detectedDescriptionField?: string;
    detectedLocationField?: string;
    fallbackUsed: string; // Which fallback strategy was used
    confidence: number; // 0-1 confidence in field detection
  };
  
  // Processing metadata
  processingMetadata: {
    csvHeaders: string[];
    totalFields: number;
    mappedFields: number;
    processingTimestamp: string;
    enhancedProcessing: boolean;
  };
}

/**
 * Field Detection Patterns for CSV processing
 */
export interface FieldDetectionPatterns {
  vendor: RegExp[];
  model: RegExp[];
  description: RegExp[];
  location: RegExp[];
  deviceName: RegExp[];
  equipmentName: RegExp[];
}

/**
 * CSV Processing Result with enhanced metadata
 */
export interface CsvProcessingResult {
  success: boolean;
  connectorData: EnhancedConnectorData[];
  errors: string[];
  warnings: string[];
  metadata: {
    totalRecords: number;
    processedRecords: number;
    fieldDetectionAccuracy: number;
    commonPatterns: Record<string, number>;
    processingTime: number;
  };
} 