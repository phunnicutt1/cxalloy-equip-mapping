/**
 * Project Haystack v5 Semantic Tagging Engine
 * Generates standardized tags for normalized BACnet points with semantic inference
 */

import { BACnetPoint, PointCategory } from '@/types/point';
import { NormalizedPoint } from '@/types/normalized';
import { HaystackTag, HaystackTagSet, TagValidationResult, TaggingConfiguration, HaystackTagCategory } from '@/types/haystack';
import { 
  OBJECT_TYPE_MAPPINGS, 
  UNIT_MAPPINGS, 
  EQUIPMENT_TYPE_MAPPINGS,
  PHYSICAL_QUANTITY_MAPPINGS,
  LOCATION_MAPPINGS,
  POINT_ROLE_MAPPINGS,
  TAG_MAPPINGS,
  sortTagsByPriority
} from './tag-mappings';
import { inferSemanticTags, SemanticContext, validateSemanticConsistency } from './semantic-inference';
import { validateHaystackTags, exportToSkySpark, exportToZinc, exportToTrio } from '../utils/haystack-validation';

/**
 * Haystack tagging context for enhanced semantic inference
 */
export interface HaystackTaggingContext {
  equipmentType?: string;
  equipmentName?: string;
  vendorName?: string;
  locationContext?: string;
  systemContext?: string;
  buildingContext?: string;
}

/**
 * Haystack tag generation result
 */
export interface HaystackTaggingResult {
  success: boolean;
  tags: HaystackTagSet;
  confidence: number;
  semanticMarkers: string[];
  validationResult: TagValidationResult;
  exportData?: {
    skySpark: string;
    zinc: string;
    json: string;
  };
  warnings: string[];
  errors: string[];
}

/**
 * Project Haystack v5 Tagging Engine
 * Generates semantic tags for normalized BACnet points with full compliance
 */
export class HaystackTagger {
  private config: TaggingConfiguration;

  constructor(config: Partial<TaggingConfiguration> = {}) {
    this.config = {
      enableSemanticInference: true,
      includeVendorTags: true,
      strictValidation: true,
      confidenceThreshold: 0.7,
      ...config
    };
  }

  /**
   * Generate comprehensive Haystack tags for a normalized point
   */
  async generateHaystackTags(point: NormalizedPoint): Promise<HaystackTagSet> {
    const tags = new Set<string>();
    let confidence = 0.5;
    const warnings: string[] = [];
    const metadata: Record<string, any> = {};

    try {
      // Step 1: Add base markers
      tags.add('point');
      
      // Step 2: Determine point role based on object type
      const roleInfo = this.determinePointRole(point);
      roleInfo.tags.forEach(tag => tags.add(tag));
      confidence += roleInfo.confidence;
      metadata.role = roleInfo.role;

      // Step 3: Add physical quantity tags based on units and name
      const quantityInfo = this.inferPhysicalQuantity(point);
      quantityInfo.tags.forEach(tag => tags.add(tag));
      confidence += quantityInfo.confidence;
      metadata.quantity = quantityInfo.quantity;

      // Step 4: Add equipment context tags
      const equipmentInfo = this.addEquipmentContext(point);
      equipmentInfo.tags.forEach(tag => tags.add(tag));
      confidence += equipmentInfo.confidence;
      metadata.equipment = equipmentInfo.equipment;

      // Step 5: Add location context tags
      const locationInfo = this.inferLocationContext(point);
      locationInfo.tags.forEach(tag => tags.add(tag));
      confidence += locationInfo.confidence;
      metadata.location = locationInfo.location;

      // Step 6: Apply semantic inference
      if (this.config.enableSemanticInference) {
        const semanticInfo = await inferSemanticTags(Array.from(tags), point);
        semanticInfo.tags.forEach(tag => tags.add(tag));
        confidence += semanticInfo.confidence;
        metadata.semantic = semanticInfo.patterns;
        warnings.push(...semanticInfo.warnings);
      }

      // Step 7: Normalize confidence
      confidence = Math.min(confidence, 1.0);

      // Step 8: Sort tags by priority
      const sortedTags = sortTagsByPriority(Array.from(tags));

      // Step 9: Validate semantic consistency
      const consistencyResult = validateSemanticConsistency(sortedTags);
      if (!consistencyResult.valid) {
        warnings.push(...consistencyResult.warnings);
        if (this.config.strictValidation) {
          confidence *= 0.8; // Reduce confidence for inconsistent tags
        }
      }

      // Step 10: Convert string tags to HaystackTag objects
      const haystackTags: HaystackTag[] = sortedTags.map(tagName => ({
        name: tagName,
        isMarker: true,
        category: HaystackTagCategory.ENTITY, // Default category
        isValid: true,
        source: 'inferred' as const,
        confidence: confidence,
        appliedAt: new Date()
      }));

      // Step 11: Create tag set
      const tagSet: HaystackTagSet = {
        id: point.originalPointId || point.originalName,
        dis: point.normalizedName || point.originalName,
        tags: haystackTags,
        confidence,
        metadata,
        warnings: warnings.length > 0 ? warnings : undefined
      };

      return tagSet;

    } catch (error) {
      console.error('Error generating Haystack tags:', error);
      const errorTags: HaystackTag[] = [
        {
          name: 'point',
          isMarker: true,
          category: HaystackTagCategory.ENTITY,
          isValid: true,
          source: 'inferred' as const,
          confidence: 0.1,
          appliedAt: new Date()
        },
        {
          name: 'error',
          isMarker: true,
          category: HaystackTagCategory.METADATA,
          isValid: true,
          source: 'inferred' as const,
          confidence: 0.1,
          appliedAt: new Date()
        }
      ];

      return {
        id: point.originalPointId || point.originalName,
        dis: point.originalName,
        tags: errorTags,
        confidence: 0.1,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        warnings: ['Failed to generate complete tag set']
      };
    }
  }

  /**
   * Determine point role based on BACnet object type
   */
  private determinePointRole(point: NormalizedPoint): {
    role: string;
    tags: string[];
    confidence: number;
  } {
    const objectType = point.objectType?.toUpperCase();
    
    if (objectType && OBJECT_TYPE_MAPPINGS[objectType]) {
      const mapping = OBJECT_TYPE_MAPPINGS[objectType];
      return {
        role: mapping.role,
        tags: mapping.tags,
        confidence: mapping.confidence
      };
    }

    // Fallback based on point properties
    if (point.category === PointCategory.COMMAND) {
      return {
        role: 'cmd',
        tags: ['cmd'],
        confidence: 0.6
      };
    }

    // Default to sensor
    return {
      role: 'sensor',
      tags: ['sensor'],
      confidence: 0.5
    };
  }

  /**
   * Infer physical quantity from units and point name
   */
  private inferPhysicalQuantity(point: NormalizedPoint): {
    quantity: string;
    tags: string[];
    confidence: number;
  } {
    // Check units first
    if (point.units && UNIT_MAPPINGS[point.units]) {
      const mapping = UNIT_MAPPINGS[point.units];
      return {
        quantity: mapping.quantity,
        tags: mapping.tags,
        confidence: mapping.confidence
      };
    }

    // Check point name patterns
    const pointName = (point.normalizedName || point.originalName).toLowerCase();
    
    for (const [quantity, patterns] of Object.entries(PHYSICAL_QUANTITY_MAPPINGS)) {
      for (const pattern of patterns) {
        if (pointName.includes(pattern.toLowerCase())) {
          return {
            quantity,
            tags: [quantity],
            confidence: 0.7
          };
        }
      }
    }

    return {
      quantity: 'unknown',
      tags: [],
      confidence: 0.1
    };
  }

  /**
   * Add equipment context tags based on point metadata
   */
  private addEquipmentContext(point: NormalizedPoint): {
    equipment: string;
    tags: string[];
    confidence: number;
  } {
    const pointName = (point.normalizedName || point.originalName).toLowerCase();
    
    // Check for equipment type patterns in point name
    for (const [equipType, mapping] of Object.entries(EQUIPMENT_TYPE_MAPPINGS)) {
      if (pointName.includes(equipType.toLowerCase())) {
        return {
          equipment: equipType,
          tags: mapping.tags,
          confidence: mapping.confidence
        };
      }
    }

    // Check for common equipment abbreviations
    const equipmentPatterns = {
      'ahu': ['ahu', 'air handler', 'air handling unit'],
      'vav': ['vav', 'variable air volume'],
      'fan': ['fan', 'blower'],
      'pump': ['pump'],
      'chiller': ['chiller', 'chw'],
      'boiler': ['boiler', 'hhw']
    };

    for (const [equip, patterns] of Object.entries(equipmentPatterns)) {
      for (const pattern of patterns) {
        if (pointName.includes(pattern)) {
          const mapping = EQUIPMENT_TYPE_MAPPINGS[equip.toUpperCase()];
          if (mapping) {
            return {
              equipment: equip,
              tags: mapping.tags,
              confidence: mapping.confidence - 0.1
            };
          }
        }
      }
    }

    return {
      equipment: 'unknown',
      tags: ['equip'],
      confidence: 0.3
    };
  }

  /**
   * Infer location context from point name
   */
  private inferLocationContext(point: NormalizedPoint): {
    location: string;
    tags: string[];
    confidence: number;
  } {
    const pointName = (point.normalizedName || point.originalName).toLowerCase();
    
    for (const [location, patterns] of Object.entries(LOCATION_MAPPINGS)) {
      for (const pattern of patterns) {
        if (pointName.includes(pattern.toLowerCase())) {
          return {
            location,
            tags: [location],
            confidence: 0.8
          };
        }
      }
    }

    return {
      location: 'unknown',
      tags: [],
      confidence: 0.1
    };
  }

  /**
   * Validate generated tags
   */
  async validateTags(tagSet: HaystackTagSet): Promise<TagValidationResult> {
    return validateHaystackTags(tagSet);
  }

  /**
   * Process multiple points in batch
   */
  async processBatch(points: NormalizedPoint[]): Promise<HaystackTagSet[]> {
    const results: HaystackTagSet[] = [];
    
    for (const point of points) {
      try {
        const tagSet = await this.generateHaystackTags(point);
        results.push(tagSet);
      } catch (error) {
        console.error(`Error processing point ${point.originalName}:`, error);
        
        // Create minimal error tag set
        const errorTagSet: HaystackTagSet = {
          id: point.originalPointId || point.originalName,
          dis: point.originalName,
          tags: [
            {
              name: 'point',
              isMarker: true,
              category: HaystackTagCategory.ENTITY,
              isValid: true,
              source: 'inferred' as const,
              confidence: 0.1,
              appliedAt: new Date()
            }
          ],
          confidence: 0.1,
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
          warnings: ['Failed to process point']
        };
        
        results.push(errorTagSet);
      }
    }
    
    return results;
  }

  /**
   * Export tags to various formats
   */
  async exportTags(tagSets: HaystackTagSet[], format: 'skyspark' | 'zinc' | 'trio' = 'skyspark'): Promise<string> {
    const exportFunctions = {
      skyspark: exportToSkySpark,
      zinc: exportToZinc,
      trio: exportToTrio
    };

    const exportFn = exportFunctions[format];
    return tagSets.map(tagSet => exportFn(tagSet)).join('\n\n');
  }

  /**
   * Get current configuration
   */
  getConfiguration(): TaggingConfiguration {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfiguration(updates: Partial<TaggingConfiguration>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * Generate Haystack tags for a normalized point (standalone function)
 */
export function generateHaystackTags(
  normalizedPoint: NormalizedPoint,
  originalPoint: BACnetPoint,
  context: HaystackTaggingContext = {}
): HaystackTaggingResult {
  const tagger = new HaystackTagger();
  
  try {
    // This is a simplified synchronous version
    const tags = new Set<string>();
    tags.add('point');
    
    // Basic role determination
    if (normalizedPoint.category === PointCategory.COMMAND) {
      tags.add('cmd');
    } else {
      tags.add('sensor');
    }
    
    // Create basic tag set
    const haystackTags: HaystackTag[] = Array.from(tags).map(tagName => ({
      name: tagName,
      isMarker: true,
      category: HaystackTagCategory.ENTITY,
      isValid: true,
      source: 'inferred' as const,
      confidence: 0.7,
      appliedAt: new Date()
    }));
    
      const tagSet: HaystackTagSet = {
    id: normalizedPoint.originalPointId || normalizedPoint.originalName,
      dis: normalizedPoint.normalizedName || normalizedPoint.originalName,
      tags: haystackTags,
      confidence: 0.7,
      metadata: context
    };
    
    const validationResult = validateHaystackTags(tagSet);
    
    return {
      success: true,
      tags: tagSet,
      confidence: 0.7,
      semanticMarkers: Array.from(tags),
      validationResult,
      warnings: [],
      errors: []
    };
    
  } catch (error) {
    return {
      success: false,
      tags: {
        id: normalizedPoint.originalPointId || normalizedPoint.originalName,
        dis: normalizedPoint.originalName,
        tags: [],
        confidence: 0,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      },
      confidence: 0,
      semanticMarkers: [],
      validationResult: {
        isValid: false,
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        suggestions: [],
        completeness: 0,
        confidence: 0,
        compliance: {
          level: 'low',
          score: 0,
          details: []
        }
      },
      warnings: [],
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Generate Haystack tags for multiple points (batch function)
 */
export function batchGenerateHaystackTags(
  points: Array<{ normalized: NormalizedPoint; original: BACnetPoint; context?: HaystackTaggingContext }>
): HaystackTaggingResult[] {
  return points.map(({ normalized, original, context }) => 
    generateHaystackTags(normalized, original, context)
  );
} 