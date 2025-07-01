/**
 * Semantic Inference for Haystack Tagging
 * Provides advanced semantic analysis for point naming patterns
 */

import { NormalizedPoint } from '@/types/normalized';

export interface SemanticContext {
  equipmentType?: string;
  systemType?: string;
  locationContext?: string;
  patterns: string[];
}

export interface SemanticInferenceResult {
  tags: string[];
  confidence: number;
  patterns: string[];
  warnings: string[];
}

export interface ConsistencyResult {
  valid: boolean;
  warnings: string[];
  conflicts: string[];
}

/**
 * Infer semantic tags based on point name patterns and context
 */
export async function inferSemanticTags(
  existingTags: string[], 
  point: NormalizedPoint
): Promise<SemanticInferenceResult> {
  const patterns: string[] = [];
  const tags: string[] = [];
  const warnings: string[] = [];
  let confidence = 0.5;

  try {
    const pointName = (point.normalizedName || point.originalName).toLowerCase();
    
    // Temperature patterns
    if (pointName.includes('temp') || pointName.includes('temperature')) {
      tags.push('temp');
      patterns.push('temperature');
      confidence += 0.2;
    }

    // Pressure patterns
    if (pointName.includes('press') || pointName.includes('pressure')) {
      tags.push('pressure');
      patterns.push('pressure');
      confidence += 0.2;
    }

    // Flow patterns
    if (pointName.includes('flow') || pointName.includes('cfm') || pointName.includes('gpm')) {
      tags.push('flow');
      patterns.push('flow');
      confidence += 0.2;
    }

    // Air handling patterns
    if (pointName.includes('supply') || pointName.includes('discharge')) {
      tags.push('supply');
      patterns.push('supply_air');
      confidence += 0.15;
    }

    if (pointName.includes('return')) {
      tags.push('return');
      patterns.push('return_air');
      confidence += 0.15;
    }

    // Equipment patterns
    if (pointName.includes('fan')) {
      tags.push('fan');
      patterns.push('fan_equipment');
      confidence += 0.15;
    }

    if (pointName.includes('damper')) {
      tags.push('damper');
      patterns.push('damper_control');
      confidence += 0.15;
    }

    // Zone patterns
    if (pointName.includes('zone') || pointName.includes('room')) {
      tags.push('zone');
      patterns.push('zone_control');
      confidence += 0.1;
    }

    confidence = Math.min(confidence, 1.0);

    return {
      tags,
      confidence,
      patterns,
      warnings
    };

  } catch (error) {
    warnings.push(`Semantic inference error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      tags: [],
      confidence: 0,
      patterns: [],
      warnings
    };
  }
}

/**
 * Validate semantic consistency of tag combinations
 */
export function validateSemanticConsistency(tags: string[]): ConsistencyResult {
  const warnings: string[] = [];
  const conflicts: string[] = [];
  let valid = true;

  // Check for conflicting role tags
  const roleTags = tags.filter(tag => ['sensor', 'cmd', 'sp'].includes(tag));
  if (roleTags.length > 1) {
    conflicts.push(`Multiple role tags: ${roleTags.join(', ')}`);
    warnings.push('Point should have only one role (sensor, cmd, or sp)');
    valid = false;
  }

  // Check for conflicting substance tags
  const substanceTags = tags.filter(tag => ['air', 'water', 'steam', 'elec'].includes(tag));
  if (substanceTags.length > 1) {
    conflicts.push(`Multiple substance tags: ${substanceTags.join(', ')}`);
    warnings.push('Point should typically have only one substance tag');
  }

  // Check for missing required combinations
  if (tags.includes('temp') && !substanceTags.length) {
    warnings.push('Temperature points should specify substance (air, water, etc.)');
  }

  if (tags.includes('flow') && !substanceTags.length) {
    warnings.push('Flow points should specify substance (air, water, etc.)');
  }

  return {
    valid,
    warnings,
    conflicts
  };
} 