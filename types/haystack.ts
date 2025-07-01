/**
 * Project Haystack v5 Interfaces
 * Based on Project Haystack v5 specification with Xeto schema support
 */

/**
 * Defines a single Haystack tag
 */
export interface HaystackTag {
  name: string; // Tag name (e.g., "site", "equip", "point", "temp", "sensor")
  value?: any; // Tag value (marker tags have no value)
  
  // Metadata
  description?: string;
  category: HaystackTagCategory;
  isMarker: boolean; // True for marker tags (no value)
  
  // Haystack v5 Features
  xetoType?: string; // Xeto schema type
  inheritance?: string[]; // Inherited tag types
  composition?: string[]; // Composed tag types
  
  // Validation
  isValid: boolean;
  validationErrors?: string[];
  
  // Source Tracking
  source: "manual" | "inferred" | "template" | "ml";
  confidence: number; // 0-1 confidence score
  appliedAt: Date;
}

/**
 * Haystack Tag Value Types
 * Represents the data types supported in Haystack tags
 */
export type HaystackValue = 
  | string 
  | number 
  | boolean 
  | Date 
  | HaystackRef
  | HaystackCoord
  | HaystackNumber
  | null;

/**
 * Haystack Reference
 */
export interface HaystackRef {
  type: "ref";
  id: string;
  display?: string;
}

/**
 * Haystack Coordinate
 */
export interface HaystackCoord {
  type: "coord"; 
  latitude: number;
  longitude: number;
}

/**
 * Haystack Number with Units
 */
export interface HaystackNumber {
  type: "number";
  value: number;
  unit?: string;
}

/**
 * Core Haystack Tag
 * Represents a single semantic tag in the Haystack taxonomy
 */
/*
export interface HaystackTagComplex {
  name: string; // Tag name (e.g., "site", "equip", "point", "temp", "sensor")
  value?: HaystackValue; // Tag value (marker tags have no value)
  
  // Metadata
  description?: string;
  category: HaystackTagCategory;
  isMarker: boolean; // True for marker tags (no value)
  
  // Haystack v5 Features
  xetoType?: string; // Xeto schema type
  inheritance?: string[]; // Inherited tag types
  composition?: string[]; // Composed tag types
  
  // Validation
  isValid: boolean;
  validationErrors?: string[];
  
  // Source Tracking
  source: "manual" | "inferred" | "template" | "ml";
  confidence: number; // 0-1 confidence score
  appliedAt: Date;
}
*/

/**
 * Haystack Tag Categories
 * High-level categorization of tag types
 */
export enum HaystackTagCategory {
  // Entity Tags
  ENTITY = "entity", // site, equip, point, space
  
  // Function Tags  
  FUNCTION = "function", // sensor, cmd, sp (setpoint)
  
  // Substance Tags
  SUBSTANCE = "substance", // air, water, steam, elec
  
  // Measurement Tags
  MEASUREMENT = "measurement", // temp, pressure, flow, power
  
  // Relationship Tags
  RELATIONSHIP = "relationship", // siteRef, equipRef, spaceRef
  
  // Metadata Tags
  METADATA = "metadata", // dis, id, area, volume
  
  // System Tags
  SYSTEM = "system", // bacnet, modbus, protocol specific
  
  // Custom Tags
  CUSTOM = "custom" // Organization-specific tags
}

/**
 * Standard Haystack Marker Tags
 * Common marker tags used in building automation
 */
export enum HaystackMarker {
  // Entity Markers
  SITE = "site",
  EQUIP = "equip", 
  POINT = "point",
  SPACE = "space",
  
  // Function Markers
  SENSOR = "sensor",
  CMD = "cmd",
  SP = "sp", // setpoint
  
  // Substance Markers
  AIR = "air",
  WATER = "water",
  STEAM = "steam",
  ELEC = "elec",
  
  // Measurement Markers
  TEMP = "temp",
  PRESSURE = "pressure",
  FLOW = "flow",
  POWER = "power",
  ENERGY = "energy",
  
  // Equipment Type Markers
  AHU = "ahu",
  VAV = "vav",
  FAN = "fan", 
  PUMP = "pump",
  CHILLER = "chiller",
  BOILER = "boiler",
  
  // Point Type Markers
  SUPPLY = "supply",
  RETURN = "return",
  EXHAUST = "exhaust",
  ZONE = "zone",
  DISCHARGE = "discharge",
  
  // Status Markers
  ENABLE = "enable",
  RUN = "run",
  FAULT = "fault",
  ALARM = "alarm"
}

/**
 * Haystack Tag Set
 * Collection of tags for a single entity (equipment, point, etc.)
 */
export interface HaystackTagSet {
  // Basic identification
  id: string; // ID of the tagged entity
  dis?: string; // Display name
  entityId?: string; // Alternative ID field
  entityType?: "site" | "equip" | "point" | "space";
  
  // Tags
  tags: HaystackTag[];
  markerTags?: string[]; // Just the marker tag names
  markers?: string[]; // Alternative markers field
  valueTags?: Record<string, HaystackValue>; // Tags with values
  values?: Record<string, any>; // Alternative values field
  refs?: Array<{ name: string; id: string }>; // Reference tags
  
  // Metadata
  meta?: Record<string, any>;
  metadata?: Record<string, any>;
  generatedAt?: Date;
  generatedBy?: string; // "auto", "manual", "template"
  templateId?: string; // If generated from template
  
  // Validation
  isComplete?: boolean;
  completenessScore?: number; // 0-1 based on required tags
  missingRequiredTags?: string[];
  conflictingTags?: string[];
  
  // Quality Metrics
  confidence: number; // Overall confidence in tag assignment
  reviewRequired?: boolean;
  warnings?: string[];
}

/**
 * Xeto Schema Definition (Haystack v5)
 * Formal schema definition for structured data modeling
 */
export interface XetoSchema {
  name: string;
  type: "entity" | "marker" | "value" | "choice";
  
  // Schema Properties
  display?: string;
  description?: string;
  abstract?: boolean;
  
  // Inheritance
  extends?: string[]; // Parent schemas
  mixins?: string[]; // Mixed-in schemas
  
  // Structure
  tags?: XetoTagDef[];
  choices?: string[]; // For choice types
  constraints?: XetoConstraint[];
  
  // Metadata
  version: string;
  namespace: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Xeto Tag Definition
 */
export interface XetoTagDef {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: HaystackValue;
  constraints?: XetoConstraint[];
}

/**
 * Xeto Constraint
 */
export interface XetoConstraint {
  type: "range" | "enum" | "pattern" | "custom";
  definition: any; // Constraint-specific definition
  message?: string; // Error message if constraint fails
}

/**
 * Haystack Tag Template
 * Predefined tag sets for equipment types
 */
export interface HaystackTagTemplate {
  id: string;
  name: string;
  description: string;
  
  // Template Scope
  entityType: "equip" | "point";
  equipmentTypes?: string[]; // Equipment types this applies to
  pointFunctions?: string[]; // Point functions this applies to
  
  // Tag Definitions
  requiredTags: string[]; // Must have these tags
  optionalTags: string[]; // May have these tags
  conditionalTags: Array<{
    condition: string; // When to apply
    tags: string[];
  }>;
  
  // Template Rules
  rules: Array<{
    name: string;
    condition: string;
    action: "add" | "remove" | "modify";
    tags: string[];
  }>;
  
  // Metadata
  category: string;
  industry: string; // "commercial", "industrial", "residential"
  standard: string; // "ashrae", "brick", "custom"
  version: string;
  
  // Usage Statistics
  usage: {
    appliedCount: number;
    successRate: number;
    lastUsed?: Date;
  };
}

/**
 * Tag Generation Result
 * Result of automatic tag generation process
 */
export interface TagGenerationResult {
  entityId: string;
  success: boolean;
  
  // Generated Tags
  generatedTags: HaystackTag[];
  confidence: number;
  
  // Processing Details
  templateUsed?: string;
  rulesApplied: string[];
  inferenceMethod: string;
  
  // Quality Assessment
  completeness: number; // 0-1 based on expected tags
  accuracy: number; // 0-1 based on validation
  missingTags: string[];
  uncertainTags: string[];
  
  // Issues
  warnings: string[];
  errors: string[];
  suggestions: string[];
  
  // Performance
  processingTimeMs: number;
  tagsEvaluated: number;
}

/**
 * Tag Validation Result
 */
export interface TagValidationResult {
  isValid: boolean;
  valid?: boolean; // Alternative field name
  errors: string[];
  warnings: string[];
  suggestions: string[];
  completeness: number;
  confidence: number;
  compliance?: {
    score: number;
    level: 'full' | 'high' | 'medium' | 'low';
    details: string[];
  };
}

/**
 * Tagging Configuration
 */
export interface TaggingConfiguration {
  enableSemanticInference: boolean;
  includeVendorTags: boolean;
  confidenceThreshold: number;
  strictValidation: boolean;
  customRules?: string[];
}

/**
 * Haystack Compliance Report
 */
export interface HaystackComplianceReport {
  totalEntities: number;
  totalPoints?: number;
  compliantEntities: number;
  validPoints?: number;
  complianceRate: number;
  averageCompliance?: number;
  commonIssues: Array<{
    issue: string;
    count: number;
    severity: 'low' | 'medium' | 'high';
  }>;
  complianceDistribution?: {
    full: number;
    high: number;
    medium: number;
    low: number;
  };
  tagStatistics?: {
    mostCommonTags: Array<[string, number]>;
    unusualTags: string[];
    deprecatedTags: string[];
  };
  recommendations: string[];
  generatedAt: Date;
}
