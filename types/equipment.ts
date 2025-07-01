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
  equipmentType?: string; // Alternative equipment type string
  description?: string;
  pointPatterns?: string[];
  requiredPoints?: string[];
  optionalPoints?: string[];
  pointMappings?: Array<{
    pointName: string;
    normalizedName: string;
    objectType: string;
    unit: string;
    required: boolean;
    haystackTags: string[];
  }>; // Point mapping definitions
  isBuiltIn?: boolean; // Whether this is a built-in template
  createdAt?: Date;
  updatedAt?: Date;
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