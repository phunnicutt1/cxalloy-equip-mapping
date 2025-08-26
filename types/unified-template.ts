/**
 * Unified Template System Types
 * Combines functionality of both EquipmentTemplate and MappingTemplate
 */

import { EquipmentType } from './equipment';
import { PointFunction } from './normalized';
import { BACnetObjectType } from './point';

/**
 * Unified point definition for templates
 * Supports both point configuration and mapping patterns
 */
export interface UnifiedTemplatePoint {
  id: string;
  
  // Point identification
  templatePointId: string;        // Unique ID within template
  name: string;                   // Display name
  description?: string;           // Point description
  
  // Point configuration (from EquipmentTemplate)
  pointFunction: PointFunction;
  objectType?: BACnetObjectType;
  units?: string;
  required: boolean;              // Whether point is required
  
  // Mapping patterns (from MappingTemplate)
  bacnetCur?: string;            // BACnet object reference pattern (e.g., "AV*", "BI7")
  bacnetDis?: string;            // Display name pattern from contractor
  bacnetDesc?: string;           // Description pattern from contractor
  navName?: string;              // User-defined alias/navigation name
  
  // Matching configuration
  matchingFacet?: 'bacnetCur' | 'bacnetDis' | 'bacnetDesc';
  confidence?: number;           // Default confidence for this point (0-1)
  
  // Metadata
  haystackTags?: string[];      // Haystack tags for semantic matching
}

/**
 * Unified Template combining both template types
 */
export interface UnifiedTemplate {
  id: string;
  name: string;
  description?: string;
  
  // Equipment information
  equipmentType: EquipmentType;
  category?: string;             // Template category for grouping
  vendor?: string;               // Equipment vendor
  model?: string;                // Equipment model
  
  // Source information (for mapping templates)
  sourceEquipmentId?: string;    // CxAlloy equipment ID used as template source
  sourceEquipmentName?: string;  // CxAlloy equipment name
  sourceBacnetId?: string;       // BACnet equipment ID used as source
  sourceBacnetName?: string;     // BACnet equipment name
  
  // Points configuration
  points: UnifiedTemplatePoint[];
  
  // Template metadata
  templateType: 'equipment' | 'mapping' | 'hybrid';  // Template origin/purpose
  isBuiltIn: boolean;           // Whether this is a built-in template
  isDefault: boolean;           // Whether this is default for equipment type
  
  // Usage statistics
  usageCount: number;           // How many times template has been applied
  successRate: number;          // Average success rate (0-1)
  effectiveness: number;        // Overall effectiveness score (0-1)
  
  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
  updatedBy?: string;
}

/**
 * Template application result
 */
export interface UnifiedTemplateApplication {
  id: string;
  templateId: string;
  templateName: string;
  
  // Target equipment
  targetEquipmentId: string;
  targetEquipmentName: string;
  targetEquipmentType: string;
  
  // Application details
  appliedPoints: {
    pointId: string;
    templatePointId: string;
    matched: boolean;
    confidence: number;
    navName?: string;
    units?: string;
  }[];
  
  // Matching configuration used
  matchingOptions: {
    matchingFacet: 'bacnetCur' | 'bacnetDis' | 'bacnetDesc';
    copyNavName: boolean;
    copyUnits: boolean;
    confidenceThreshold: number;
    allowPartialMatches: boolean;
  };
  
  // Results
  matchingResults: {
    totalPoints: number;
    matchedPoints: number;
    unmatchedPoints: number;
    averageConfidence: number;
    requiredPointsMatched: number;
    optionalPointsMatched: number;
  };
  
  // Metadata
  applicationType: 'point-tracking' | 'bulk-mapping' | 'manual';
  isSuccessful: boolean;
  errors?: string[];
  appliedAt: Date | string;
  appliedBy: string;
}

/**
 * Template creation request
 */
export interface CreateUnifiedTemplateRequest {
  name: string;
  description?: string;
  equipmentType: EquipmentType;
  category?: string;
  vendor?: string;
  model?: string;
  
  sourceEquipmentId?: string;
  sourceEquipmentName?: string;
  sourceBacnetId?: string;
  sourceBacnetName?: string;
  
  points: Omit<UnifiedTemplatePoint, 'id' | 'templatePointId'>[];
  
  templateType: 'equipment' | 'mapping' | 'hybrid';
  isDefault?: boolean;
}

/**
 * Template update request
 */
export interface UpdateUnifiedTemplateRequest {
  name?: string;
  description?: string;
  category?: string;
  vendor?: string;
  model?: string;
  points?: Omit<UnifiedTemplatePoint, 'id' | 'templatePointId'>[];
  isDefault?: boolean;
}

/**
 * Bulk mapping configuration
 */
export interface BulkMappingConfiguration {
  templateId: string;
  pairs: {
    sourceId: string;
    sourceName: string;
    targetId: string;
    targetName: string;
    confidence?: number;
  }[];
  options: {
    matchingFacet: 'bacnetCur' | 'bacnetDis' | 'bacnetDesc';
    copyNavName: boolean;
    copyUnits: boolean;
    confidenceThreshold: number;
    allowPartialMatches: boolean;
  };
}

/**
 * Template migration data (for migrating from old formats)
 */
export interface TemplateMigrationData {
  equipmentTemplates?: any[];  // Old EquipmentTemplate format
  mappingTemplates?: any[];    // Old MappingTemplate format
  migratedAt?: Date;
  migratedBy?: string;
}