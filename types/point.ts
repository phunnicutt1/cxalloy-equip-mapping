/**
 * BACnet Object Types
 * Based on BACnet protocol specification and sample data analysis
 */
export enum BACnetObjectType {
  // Analog Types
  ANALOG_INPUT = "AI",
  ANALOG_OUTPUT = "AO", 
  ANALOG_VALUE = "AV",
  
  // Binary Types
  BINARY_INPUT = "BI",
  BINARY_OUTPUT = "BO",
  BINARY_VALUE = "BV",
  
  // Multi-state Types
  MULTISTATE_INPUT = "MSI",
  MULTISTATE_OUTPUT = "MSO", 
  MULTISTATE_VALUE = "MSV",
  
  // Other Types
  DEVICE = "DEV",
  FILE = "FILE",
  PROGRAM = "PRG",
  SCHEDULE = "SCH",
  CALENDAR = "CAL",
  NOTIFICATION_CLASS = "NC",
  LOOP = "LOOP",
  TREND_LOG = "TL",
  LIFE_SAFETY_POINT = "LSP",
  LIFE_SAFETY_ZONE = "LSZ"
}

/**
 * Data Types for Point Values
 */
export enum PointDataType {
  NUMBER = "Number",
  BOOLEAN = "Bool", 
  STRING = "String",
  ENUMERATED = "Enum",
  NULL = "Null"
}

/**
 * Point Categories for Classification
 */
export enum PointCategory {
  SENSOR = "sensor",
  COMMAND = "command", 
  STATUS = "status",
  SETPOINT = "setpoint",
  ALARM = "alarm",
  UNKNOWN = "unknown"
}

/**
 * Priority Array for BACnet Writable Points
 */
export enum BACnetPriority {
  MANUAL_LIFE_SAFETY = 1,
  AUTOMATIC_LIFE_SAFETY = 2,
  CRITICAL_EQUIPMENT_CONTROL = 3,
  MINIMUM_ON_OFF = 4,
  MAXIMUM_ON_OFF = 5,
  CRITICAL_CONTROL = 6,
  MINIMUM_CONTROL = 7,
  MAXIMUM_CONTROL = 8,
  CRITICAL_OVERRIDE = 9,
  AVAILABLE_10 = 10,
  AVAILABLE_11 = 11,
  AVAILABLE_12 = 12,
  AVAILABLE_13 = 13,
  AVAILABLE_14 = 14,
  AVAILABLE_15 = 15,
  FALLBACK_VALUE = 16
}

/**
 * Core BACnet Point Interface
 * Represents a single BACnet point from trio file
 */
export interface BACnetPoint {
  // Basic Identification
  id: string;
  equipmentId: string;
  objectName: string; // BACnet object reference (e.g., "AI744", "AO443")
  objectType: BACnetObjectType;
  objectInstance: number; // Numeric part of object reference
  
  // Display Information
  dis?: string; // From trio 'dis' field (raw)
  displayName: string; // From trio 'dis' field
  description: string; // From trio 'bacnetDesc' field
  
  // Data Properties
  dataType: PointDataType; // From trio 'kind' field
  presentValue?: any; // Current value
  units?: string; // From trio 'unit' field (e.g., "°F", "cfm", "%")
  
  // Point Classification
  category: PointCategory;
  isWritable: boolean; // From trio 'writable' marker
  isCommand: boolean; // From trio 'cmd' marker
  
  // BACnet Specific Properties
  bacnetWriteProperty?: string; // From trio 'bacnetWrite' (e.g., "AO443")
  bacnetWriteLevel?: BACnetPriority; // From trio 'bacnetWriteLevel'
  reliability?: string;
  outOfService?: boolean;
  
  // Value Constraints
  minimumValue?: number;
  maximumValue?: number;
  resolution?: number;
  
  // Metadata
  metadata?: {
    equipmentName?: string;
    equipmentType?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
  lastReadTime?: Date;
  lastWriteTime?: Date;
}

/**
 * Raw Trio Point Data
 * Direct representation of trio file point structure
 */
export interface TrioPointData {
  dis: string; // Display name
  bacnetCur?: string; // BACnet current value reference
  bacnetDesc?: string; // BACnet description
  bacnetWrite?: string; // BACnet write property
  bacnetWriteLevel?: number; // Write priority level
  kind: string; // Data type
  point: boolean; // Point marker
  cmd?: boolean; // Command marker
  writable?: boolean; // Writable marker
  unit?: string; // Units
  [key: string]: any; // Additional trio properties
}

/**
 * Point Summary for List Views
 */
export interface PointSummary {
  id: string;
  objectName: string;
  displayName: string;
  objectType: BACnetObjectType;
  dataType: PointDataType;
  units?: string;
  isWritable: boolean;
  hasNormalizedName: boolean;
  haystackTagCount: number;
}

/**
 * Point Value History
 */
export interface PointValueHistory {
  pointId: string;
  timestamp: Date;
  value: any;
  quality: string;
  source: string; // "read", "write", "cov"
}

/**
 * Point Alarm/Event
 */
export interface PointAlarm {
  pointId: string;
  timestamp: Date;
  alarmType: string;
  message: string;
  acknowledged: boolean;
  severity: "low" | "normal" | "high" | "critical";
} 