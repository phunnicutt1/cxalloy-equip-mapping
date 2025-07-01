import { PointDataType, BACnetObjectType, PointCategory } from "./point";
import { HaystackTag } from "./haystack";

/**
 * Normalization Confidence Levels
 */
export enum NormalizationConfidence {
  HIGH = "high",        // >0.8 - Strong dictionary match
  MEDIUM = "medium",    // 0.5-0.8 - Partial match with context
  LOW = "low",         // 0.2-0.5 - Weak match or heuristic
  UNKNOWN = "unknown"   // <0.2 - No reliable match found
}

/**
 * Point Function Categories
 * High-level categorization of point functions
 */
export enum PointFunction {
  Sensor = "sensor",
  Setpoint = "setpoint",
  Command = "command",
  Status = "status",
  Unknown = "unknown"
}

/**
 * Normalized Point Interface
 * Represents a BACnet point after normalization processing
 */
export interface NormalizedPoint {
  // Source Point Reference
  originalPointId: string;
  equipmentId: string;
  
  // Original Properties
  originalName: string; // Original trio display name (e.g., "EX DIFF P 1")
  originalDescription: string; // Original BACnet description
  objectName?: string;
  objectType: BACnetObjectType;
  objectInstance?: number;
  
  // Normalized Properties
  normalizedName: string; // Human-readable name (e.g., "Exhaust Differential Pressure 1")
  expandedDescription: string; // Fully expanded description with no acronyms
  commonName?: string; // Industry standard common name
  
  // Classification
  pointFunction: PointFunction;
  category: PointCategory;
  dataType: PointDataType;
  units?: string;
  
  // Haystack Tags
  haystackTags: HaystackTag[];
  
  // Normalization Metadata
  confidence: NormalizationConfidence;
  confidenceScore: number; // 0-1 numeric confidence
  normalizationMethod: string; // "dictionary", "pattern", "ml", "manual"
  normalizationRules: string[]; // Applied rules/patterns
  
  // Quality Indicators
  hasAcronymExpansion: boolean;
  hasUnitNormalization: boolean;
  hasContextInference: boolean;
  requiresManualReview: boolean;
  
  // Metadata
  normalizedAt: Date;
  normalizedBy?: string; // User ID if manually normalized
  reviewedAt?: Date;
  reviewedBy?: string;
  isPlaceholder?: boolean; // Flag to indicate this is a placeholder for count display
}

/**
 * Normalization Rules Configuration  
 * Defines how acronyms and patterns are expanded
 */
export interface NormalizationRule {
  id: string;
  name: string;
  description: string;
  
  // Pattern Matching
  pattern: RegExp;
  replacement: string;
  priority: number; // Higher priority rules applied first
  
  // Context Constraints
  objectTypes?: BACnetObjectType[]; // Only apply to specific object types
  equipmentTypes?: string[]; // Only apply to specific equipment
  units?: string[]; // Only apply with specific units
  
  // Metadata
  category: string; // "acronym", "unit", "pattern", "context"
  examples: string[]; // Example transformations
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * BACnet Acronym Dictionary Entry
 * Maps common BACnet acronyms to full descriptions
 */
export interface AcronymDefinition {
  acronym: string;
  expansion: string;
  category: string; // "hvac", "sensor", "control", "unit", etc.
  context?: string[]; // Equipment types where this applies
  alternateExpansions?: string[]; // Alternative meanings in different contexts
  
  // Usage Statistics
  frequency: number; // How often this acronym appears
  confidence: number; // Reliability of this expansion
  
  // Examples
  examples: {
    original: string;
    expanded: string;
    context: string;
  }[];
}

/**
 * Point Normalization Result
 * Complete result of point normalization process
 */
export interface NormalizationResult {
  success: boolean;
  originalPoint: {
    name: string;
    description: string;
    objectName: string;
  };
  
  normalizedPoint?: NormalizedPoint;
  
  // Processing Details
  appliedRules: string[];
  expandedAcronyms: Array<{
    original: string;
    expanded: string;
    confidence: number;
  }>;
  
  // Issues and Warnings
  warnings: string[];
  errors: string[];
  suggestions: string[];
  
  // Performance Metrics
  processingTimeMs: number;
  rulesEvaluated: number;
}

/**
 * Batch Normalization Status
 * Tracks progress of normalizing multiple points
 */
export interface BatchNormalizationStatus {
  batchId: string;
  equipmentId: string;
  
  // Counts
  totalPoints: number;
  processedPoints: number;
  successfulNormalizations: number;
  failedNormalizations: number;
  
  // Quality Metrics
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  requiresReviewCount: number;
  
  // Progress
  startTime: Date;
  endTime?: Date;
  isComplete: boolean;
  
  // Results
  results: NormalizationResult[];
} 