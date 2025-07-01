import { EquipmentType } from "./equipment";
import { BACnetObjectType, PointDataType, PointCategory } from "./point";
import { PointFunction } from "./normalized";
import { HaystackTag } from "./haystack";

/**
 * Template Type Enumeration
 */
export enum TemplateType {
  EQUIPMENT = "equipment",
  POINT_CONFIGURATION = "point_configuration",
  NORMALIZATION_RULES = "normalization_rules",
  HAYSTACK_TAGS = "haystack_tags"
}

/**
 * Template Scope
 * Defines where and how templates can be applied
 */
export enum TemplateScope {
  GLOBAL = "global", // Available to all projects
  PROJECT = "project", // Project-specific
  ORGANIZATION = "organization", // Organization-wide
  PERSONAL = "personal" // User-specific
}

/**
 * Point Template Definition
 * Defines expected points for equipment types
 */
export interface PointTemplate {
  // Template Identification
  id: string;
  name: string;
  description: string;
  
  // Point Properties
  pointName: string; // Expected point name pattern
  displayName: string; // Human-readable name
  objectType: BACnetObjectType;
  dataType: PointDataType;
  category: PointCategory;
  pointFunction: PointFunction;
  
  // Properties
  units?: string;
  isRequired: boolean; // Must be present for equipment
  isWritable: boolean;
  
  // Haystack Tags
  haystackTags: string[]; // Expected Haystack tags
  
  // Normalization Rules
  normalizationPattern?: string; // Regex pattern for matching
  normalizedName?: string; // Expected normalized name
  
  // Validation Rules
  valueRange?: {
    min?: number;
    max?: number;
  };
  enumValues?: string[]; // For enumerated points
  
  // Conditional Logic
  conditions?: Array<{
    equipmentProperty: string; // e.g., "hasReheat"
    operator: "equals" | "contains" | "exists";
    value?: any;
    description: string;
  }>;
  
  // Metadata
  priority: number; // Higher priority = more important
  group?: string; // Logical grouping (e.g., "temperatures", "flows")
  vendor?: string; // Vendor-specific templates
  
  // Usage Statistics
  usage: {
    timesApplied: number;
    successRate: number;
    lastUsed?: Date;
  };
}

/**
 * Equipment Template
 * Complete template for equipment type with all expected points
 */
export interface EquipmentTemplate {
  // Template Identification
  id: string;
  name: string;
  description: string;
  version: string;
  
  // Equipment Properties
  equipmentType: EquipmentType;
  applicableFilenamePatterns: string[]; // Regex patterns for auto-detection
  
  // Template Scope
  scope: TemplateScope;
  createdBy: string;
  organizationId?: string;
  projectId?: string;
  
  // Point Configuration
  requiredPoints: PointTemplate[]; // Must have these points
  optionalPoints: PointTemplate[]; // May have these points
  
  // Equipment Variants
  variants: Array<{
    name: string; // e.g., "VAV with Reheat", "VAV No Reheat"
    description: string;
    conditions: Record<string, any>; // When this variant applies
    additionalPoints: PointTemplate[];
    excludedPoints: string[]; // Point IDs to exclude
  }>;
  
  // Normalization Configuration
  normalizationRules: Array<{
    priority: number;
    pattern: string;
    replacement: string;
    description: string;
  }>;
  
  // Haystack Configuration
  equipmentHaystackTags: string[]; // Tags for the equipment itself
  defaultPointTags: string[]; // Default tags for all points
  
  // Quality Thresholds
  qualityThresholds: {
    minimumPointMatch: number; // 0-1, minimum % of required points
    confidenceThreshold: number; // 0-1, minimum confidence for auto-apply
  };
  
  // Metadata
  isActive: boolean;
  isPublic: boolean; // Available to other users/organizations
  category: string; // "hvac", "controls", "safety", etc.
  industry: string; // "commercial", "industrial", "healthcare", etc.
  
  // Versioning
  parentTemplateId?: string; // If derived from another template
  childTemplateIds: string[]; // Templates derived from this one
  
  // Usage and Performance
  usage: {
    timesApplied: number;
    successRate: number;
    averagePointMatchRate: number;
    lastUsed?: Date;
    popularVariants: Array<{
      variantName: string;
      usageCount: number;
    }>;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  tags: string[]; // Searchable tags
}

/**
 * Template Application Result
 * Result of applying a template to equipment
 */
export interface TemplateApplicationResult {
  templateId: string;
  equipmentId: string;
  variantUsed?: string;
  
  // Application Success
  success: boolean;
  confidence: number; // 0-1 overall confidence
  
  // Point Matching Results
  requiredPointMatches: Array<{
    templatePointId: string;
    actualPointId?: string;
    matched: boolean;
    confidence: number;
    reason: string;
  }>;
  
  optionalPointMatches: Array<{
    templatePointId: string;
    actualPointId?: string;
    matched: boolean;
    confidence: number;
  }>;
  
  // Unmapped Points
  unmappedPoints: Array<{
    pointId: string;
    pointName: string;
    reason: string;
  }>;
  
  // Quality Metrics
  requiredPointMatchRate: number; // 0-1
  totalPointMatchRate: number; // 0-1
  normalizationSuccessRate: number; // 0-1
  
  // Issues and Recommendations
  warnings: string[];
  errors: string[];
  recommendations: string[];
  
  // Performance
  processingTimeMs: number;
  rulesApplied: number;
  
  // Application Metadata
  appliedAt: Date;
  appliedBy: string;
  isAutomatic: boolean;
}

/**
 * Template Library
 * Collection of templates for organization/project
 */
export interface TemplateLibrary {
  id: string;
  name: string;
  description: string;
  
  // Scope
  scope: TemplateScope;
  organizationId?: string;
  projectId?: string;
  
  // Templates
  equipmentTemplates: EquipmentTemplate[];
  pointTemplates: PointTemplate[];
  
  // Library Configuration
  defaultTemplates: string[]; // Template IDs to use by default
  templatePriority: Array<{
    templateId: string;
    priority: number;
  }>;
  
  // Access Control
  isPublic: boolean;
  allowedUsers: string[];
  allowedRoles: string[];
  
  // Statistics
  stats: {
    totalTemplates: number;
    totalApplications: number;
    averageSuccessRate: number;
    lastUsed?: Date;
  };
  
  // Metadata
  version: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Template Search Criteria
 * For finding relevant templates
 */
export interface TemplateSearchCriteria {
  // Equipment Matching
  equipmentType?: EquipmentType;
  filename?: string;
  equipmentName?: string;
  
  // Point Matching
  pointCount?: number;
  pointTypes?: BACnetObjectType[];
  hasWritablePoints?: boolean;
  
  // Metadata Filters
  category?: string;
  industry?: string;
  vendor?: string;
  minSuccessRate?: number;
  
  // Scope
  includePublic?: boolean;
  includePersonal?: boolean;
  organizationId?: string;
  projectId?: string;
  
  // Quality Filters
  minConfidenceThreshold?: number;
  maxAge?: number; // Days since last update
}

/**
 * Template Recommendation
 * Suggested template for equipment
 */
export interface TemplateRecommendation {
  templateId: string;
  templateName: string;
  confidence: number; // 0-1 confidence this template fits
  reasoning: string; // Why this template was recommended
  
  // Match Analysis
  expectedPointMatches: number;
  actualPointMatches: number;
  matchRate: number; // 0-1
  
  // Variant Recommendation
  recommendedVariant?: string;
  variantConfidence?: number;
  
  // Quality Indicators
  templateSuccessRate: number;
  recentUsage: number; // Applications in last 30 days
  
  // Preview Data
  preview: {
    requiredPoints: string[];
    optionalPoints: string[];
    haystackTags: string[];
  };
} 