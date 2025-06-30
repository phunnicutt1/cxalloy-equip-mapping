/**
 * Core BACnet Point Normalization Engine
 * Transforms cryptic BACnet point names into human-readable descriptions
 */

import { BACnetPoint } from '@/types/point';
import { NormalizedPoint, NormalizationResult, NormalizationConfidence, PointFunction } from '@/types/normalized';
import { HaystackTag } from '@/types/haystack';
import { BACNET_ACRONYMS } from '../dictionaries/bacnet-acronyms';
import { getEquipmentAcronyms } from '../dictionaries/equipment-specific';
import { getVendorAcronyms, inferVendorFromPattern } from '../dictionaries/vendor-specific';

/**
 * Normalization context for better accuracy
 */
export interface NormalizationContext {
  equipmentType?: string;
  equipmentName?: string;
  vendorName?: string;
  units?: string;
  objectType?: string;
  pointCategory?: string;
}

/**
 * Token analysis result
 */
interface TokenAnalysis {
  originalToken: string;
  normalizedToken: string;
  confidence: number;
  source: 'general' | 'equipment' | 'vendor' | 'unit' | 'pattern';
  matchedAcronym?: string;
  expansion?: string;
}

/**
 * Context analysis result
 */
interface ContextAnalysis {
  equipmentContext: string[];
  unitContext: string[];
  objectTypeContext: string[];
  inferredVendor?: string;
}

/**
 * Core Point Normalizer Class
 */
export class PointNormalizer {
  private static readonly DELIMITERS = /[\s_\-\.]+/;
  private static readonly CAMEL_CASE_SPLIT = /(?=[A-Z])/;
  private static readonly UNIT_PATTERNS = {
    temperature: /°?[CF]|deg|temp/i,
    pressure: /psi|pa|inh2o|inhg|bar|press/i,
    flow: /cfm|gpm|lps|m3h|flow/i,
    percentage: /%|pct|percent/i,
    power: /kw|w|hp|power/i,
    humidity: /%?rh|humidity/i,
    co2: /ppm|co2/i
  };

  /**
   * Main normalization function
   */
  public static normalizePointName(
    point: BACnetPoint,
    context: NormalizationContext = {}
  ): NormalizationResult {
    const startTime = Date.now();
    const result: NormalizationResult = {
      success: false,
      originalPoint: {
        name: point.dis || point.objectName,
        description: point.description || '',
        objectName: point.objectName
      },
      appliedRules: [],
      expandedAcronyms: [],
      warnings: [],
      errors: [],
      suggestions: [],
      processingTimeMs: 0,
      rulesEvaluated: 0
    };

    try {
      // Step 1: Tokenize the point name
      const tokens = this.tokenizePointName(point.dis || point.objectName);
      result.rulesEvaluated++;

      // Step 2: Analyze each token
      const tokenAnalyses = tokens.map(token => 
        this.analyzeToken(token, context)
      );
      result.rulesEvaluated += tokens.length;

      // Step 3: Match acronyms with context awareness
      const acronymMatches = this.matchAcronyms(tokens, context);
      result.expandedAcronyms = acronymMatches.map(match => ({
        original: match.originalToken,
        expanded: match.expansion || match.normalizedToken,
        confidence: match.confidence
      }));
      result.rulesEvaluated += acronymMatches.length;

      // Step 4: Analyze context (equipment type, units, object type)
      const contextAnalysis = this.analyzeContext(point, context);
      result.rulesEvaluated++;

      // Step 5: Generate human-readable description
      const description = this.generateDescription(tokenAnalyses);
      result.appliedRules.push('token_analysis', 'acronym_expansion', 'context_analysis');

      // Step 6: Determine point function
      const pointFunction = this.determinePointFunction(tokenAnalyses);
      
      // Step 7: Generate Haystack tags
      const haystackTags = this.generateHaystackTags(tokenAnalyses, contextAnalysis, pointFunction);

      // Step 8: Calculate overall confidence
      const confidence = this.calculateConfidence(tokenAnalyses, contextAnalysis);

      // Step 9: Create normalized point
      const normalizedPoint: NormalizedPoint = {
        originalPointId: point.objectName,
        equipmentId: context.equipmentName || 'unknown',
        originalName: point.dis || point.objectName,
        originalDescription: point.description || '',
        objectName: point.objectName,
        objectType: point.objectType,
        normalizedName: this.formatNormalizedName(description),
        expandedDescription: description,
        pointFunction,
        category: point.category,
        dataType: point.dataType,
        units: point.units || context.units,
        haystackTags,
        confidence: this.getConfidenceLevel(confidence.overall),
        confidenceScore: confidence.overall,
        normalizationMethod: confidence.primaryMethod,
        normalizationRules: result.appliedRules,
        hasAcronymExpansion: result.expandedAcronyms.length > 0,
        hasUnitNormalization: !!point.units,
        hasContextInference: !!context.equipmentType || !!context.vendorName,
        requiresManualReview: confidence.overall < 0.7,
        normalizedAt: new Date()
      };

      result.normalizedPoint = normalizedPoint;
      result.success = true;

      // Add suggestions for low confidence results
      if (confidence.overall < 0.8) {
        result.suggestions.push(
          'Consider reviewing this normalization manually due to lower confidence score',
          'Verify equipment type and vendor information for better accuracy'
        );
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    result.processingTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Tokenize point name by splitting on delimiters and camelCase
   */
  private static tokenizePointName(pointName: string): string[] {
    if (!pointName) return [];

    // First split on common delimiters
    const tokens = pointName.split(this.DELIMITERS);
    
    // Then split camelCase within each token
    const finalTokens: string[] = [];
    for (const token of tokens) {
      if (token.length === 0) continue;
      
      // Split camelCase
      const camelSplit = token.split(this.CAMEL_CASE_SPLIT).filter(t => t.length > 0);
      finalTokens.push(...camelSplit);
    }

    return finalTokens.filter(token => token.length > 0);
  }

  /**
   * Analyze individual token for possible expansions
   */
  private static analyzeToken(token: string, context: NormalizationContext): TokenAnalysis {
    const analysis: TokenAnalysis = {
      originalToken: token,
      normalizedToken: token,
      confidence: 0.1, // Base confidence
      source: 'pattern'
    };

    // Priority order: Equipment-specific > Vendor-specific > General
    
    // 1. Equipment-specific acronyms (highest priority)
    if (context.equipmentType) {
      const equipmentAcronyms = getEquipmentAcronyms(context.equipmentType);
      const exactMatch = Object.entries(equipmentAcronyms).find(([acronym]) => 
        acronym.toLowerCase() === token.toLowerCase()
      );
      
      if (exactMatch) {
        analysis.normalizedToken = exactMatch[1];
        analysis.confidence = 0.95;
        analysis.source = 'equipment';
        analysis.matchedAcronym = exactMatch[0];
        analysis.expansion = exactMatch[1];
        return analysis;
      }
    }

    // 2. Vendor-specific acronyms
    if (context.vendorName) {
      const vendorAcronyms = getVendorAcronyms(context.vendorName);
      const exactMatch = Object.entries(vendorAcronyms).find(([acronym]) => 
        acronym.toLowerCase() === token.toLowerCase()
      );
      
      if (exactMatch) {
        analysis.normalizedToken = exactMatch[1];
        analysis.confidence = 0.85;
        analysis.source = 'vendor';
        analysis.matchedAcronym = exactMatch[0];
        analysis.expansion = exactMatch[1];
        return analysis;
      }
    }

    // 3. General BACnet acronyms
    const generalMatch = Object.entries(BACNET_ACRONYMS).find(([acronym]) => 
      acronym.toLowerCase() === token.toLowerCase()
    );
    
    if (generalMatch) {
      analysis.normalizedToken = generalMatch[1];
      analysis.confidence = 0.75;
      analysis.source = 'general';
      analysis.matchedAcronym = generalMatch[0];
      analysis.expansion = generalMatch[1];
      return analysis;
    }

    // 4. Unit-based inference
    const unitMatch = this.inferFromUnits(token, context.units);
    if (unitMatch) {
      analysis.normalizedToken = unitMatch.expansion;
      analysis.confidence = unitMatch.confidence;
      analysis.source = 'unit';
      analysis.expansion = unitMatch.expansion;
      return analysis;
    }

    // 5. Pattern-based inference (numbers, common words)
    const patternMatch = this.inferFromPattern(token);
    if (patternMatch) {
      analysis.normalizedToken = patternMatch.expansion;
      analysis.confidence = patternMatch.confidence;
      analysis.source = 'pattern';
      analysis.expansion = patternMatch.expansion;
    }

    return analysis;
  }

  /**
   * Match acronyms with full context awareness
   */
  private static matchAcronyms(tokens: string[], context: NormalizationContext): TokenAnalysis[] {
    return tokens.map(token => this.analyzeToken(token, context));
  }

  /**
   * Analyze context for additional insights
   */
  private static analyzeContext(point: BACnetPoint, context: NormalizationContext): ContextAnalysis {
    const equipmentContext: string[] = [];
    const unitContext: string[] = [];
    const objectTypeContext: string[] = [];

    // Equipment type context
    if (context.equipmentType) {
      equipmentContext.push(context.equipmentType);
    }

    // Unit context
    if (point.units || context.units) {
      const units = point.units || context.units || '';
      unitContext.push(units);
      
      // Infer measurement type from units
      for (const [type, pattern] of Object.entries(this.UNIT_PATTERNS)) {
        if (pattern.test(units)) {
          unitContext.push(type);
        }
      }
    }

    // Object type context
    if (point.objectType) {
      objectTypeContext.push(point.objectType.toString());
    }

    // Infer vendor from naming patterns
    const inferredVendor = context.vendorName || inferVendorFromPattern(point.dis || point.objectName) || undefined;

    return {
      equipmentContext,
      unitContext,
      objectTypeContext,
      inferredVendor
    };
  }

  /**
   * Generate human-readable description
   */
  private static generateDescription(
    tokenAnalyses: TokenAnalysis[]
  ): string {
    const normalizedTokens = tokenAnalyses.map(analysis => analysis.normalizedToken);
    
    // Join tokens with appropriate spacing
    let description = normalizedTokens.join(' ');
    
    // Clean up common patterns
    description = description
      .replace(/\s+/g, ' ') // Multiple spaces
      .replace(/(\w)\s+(\d)/g, '$1 $2') // Word number spacing
      .trim();

    // Capitalize first letter of each word
    description = description.replace(/\b\w/g, l => l.toUpperCase());

    return description;
  }

  /**
   * Determine point function from analysis
   */
  private static determinePointFunction(
    tokenAnalyses: TokenAnalysis[]
  ): PointFunction {
    const tokens = tokenAnalyses.map(a => a.normalizedToken.toLowerCase());

    // Temperature points
    if (tokens.some(t => t.includes('temperature') || t.includes('temp'))) {
      if (tokens.some(t => t.includes('setpoint') || t.includes('sp'))) {
        return PointFunction.TEMPERATURE_SETPOINT;
      }
      return PointFunction.TEMPERATURE_SENSOR;
    }

    // Flow points
    if (tokens.some(t => t.includes('flow') || t.includes('cfm') || t.includes('gpm'))) {
      if (tokens.some(t => t.includes('setpoint') || t.includes('sp'))) {
        return PointFunction.AIRFLOW_SETPOINT;
      }
      if (tokens.some(t => t.includes('command') || t.includes('cmd'))) {
        return PointFunction.AIRFLOW_COMMAND;
      }
      return PointFunction.AIRFLOW_SENSOR;
    }

    // Pressure points
    if (tokens.some(t => t.includes('pressure') || t.includes('press'))) {
      if (tokens.some(t => t.includes('setpoint') || t.includes('sp'))) {
        return PointFunction.PRESSURE_SETPOINT;
      }
      return PointFunction.PRESSURE_SENSOR;
    }

    // Position points
    if (tokens.some(t => t.includes('position') || t.includes('pos'))) {
      if (tokens.some(t => t.includes('damper'))) {
        return PointFunction.DAMPER_POSITION;
      }
      if (tokens.some(t => t.includes('valve'))) {
        return PointFunction.VALVE_POSITION;
      }
    }

    // Status points
    if (tokens.some(t => t.includes('status') || t.includes('stat'))) {
      if (tokens.some(t => t.includes('fan'))) {
        return PointFunction.FAN_STATUS;
      }
      if (tokens.some(t => t.includes('pump'))) {
        return PointFunction.PUMP_STATUS;
      }
      if (tokens.some(t => t.includes('alarm'))) {
        return PointFunction.ALARM_STATUS;
      }
    }

    // Energy points
    if (tokens.some(t => t.includes('power') || t.includes('kw') || t.includes('energy'))) {
      if (tokens.some(t => t.includes('meter'))) {
        return PointFunction.ENERGY_METER;
      }
      return PointFunction.POWER_SENSOR;
    }

    return PointFunction.UNKNOWN;
  }

  /**
   * Generate Haystack tags based on analysis
   */
  private static generateHaystackTags(
    tokenAnalyses: TokenAnalysis[], 
    contextAnalysis: ContextAnalysis,
    pointFunction: PointFunction
  ): HaystackTag[] {
    const tags: HaystackTag[] = [];
    const tokens = tokenAnalyses.map(a => a.normalizedToken.toLowerCase());

    // Base point tag
    tags.push({
      name: 'point',
      isMarker: true,
      category: 'ENTITY' as any,
      source: 'inferred',
      confidence: 1.0,
      appliedAt: new Date(),
      isValid: true
    });

    // Function-based tags
    switch (pointFunction) {
      case PointFunction.TEMPERATURE_SENSOR:
        tags.push(
          { name: 'temp', isMarker: true, category: 'MEASUREMENT' as any, source: 'inferred', confidence: 0.9, appliedAt: new Date(), isValid: true },
          { name: 'sensor', isMarker: true, category: 'FUNCTION' as any, source: 'inferred', confidence: 0.9, appliedAt: new Date(), isValid: true }
        );
        break;
      case PointFunction.TEMPERATURE_SETPOINT:
        tags.push(
          { name: 'temp', isMarker: true, category: 'MEASUREMENT' as any, source: 'inferred', confidence: 0.9, appliedAt: new Date(), isValid: true },
          { name: 'sp', isMarker: true, category: 'FUNCTION' as any, source: 'inferred', confidence: 0.9, appliedAt: new Date(), isValid: true }
        );
        break;
      case PointFunction.AIRFLOW_SENSOR:
        tags.push(
          { name: 'flow', isMarker: true, category: 'MEASUREMENT' as any, source: 'inferred', confidence: 0.9, appliedAt: new Date(), isValid: true },
          { name: 'air', isMarker: true, category: 'SUBSTANCE' as any, source: 'inferred', confidence: 0.9, appliedAt: new Date(), isValid: true },
          { name: 'sensor', isMarker: true, category: 'FUNCTION' as any, source: 'inferred', confidence: 0.9, appliedAt: new Date(), isValid: true }
        );
        break;
      case PointFunction.FAN_STATUS:
        tags.push(
          { name: 'fan', isMarker: true, category: 'ENTITY' as any, source: 'inferred', confidence: 0.9, appliedAt: new Date(), isValid: true },
          { name: 'sensor', isMarker: true, category: 'FUNCTION' as any, source: 'inferred', confidence: 0.9, appliedAt: new Date(), isValid: true }
        );
        break;
      // Add more cases as needed
    }

    return tags;
  }

  /**
   * Calculate overall confidence score
   */
  private static calculateConfidence(
    tokenAnalyses: TokenAnalysis[], 
    contextAnalysis: ContextAnalysis
  ): { overall: number; primaryMethod: string } {
    if (tokenAnalyses.length === 0) {
      return { overall: 0.1, primaryMethod: 'none' };
    }

    // Calculate weighted average confidence
    const totalConfidence = tokenAnalyses.reduce((sum, analysis) => sum + analysis.confidence, 0);
    const averageConfidence = totalConfidence / tokenAnalyses.length;

    // Boost confidence based on context
    let contextBoost = 0;
    if (contextAnalysis.equipmentContext.length > 0) contextBoost += 0.1;
    if (contextAnalysis.unitContext.length > 0) contextBoost += 0.1;
    if (contextAnalysis.inferredVendor) contextBoost += 0.05;

    const overall = Math.min(averageConfidence + contextBoost, 1.0);

    // Determine primary method
    const methodCounts = tokenAnalyses.reduce((counts, analysis) => {
      counts[analysis.source] = (counts[analysis.source] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const primaryMethod = Object.entries(methodCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'pattern';

    return { overall, primaryMethod };
  }

  /**
   * Get confidence level enum from numeric score
   */
  private static getConfidenceLevel(score: number): NormalizationConfidence {
    if (score >= 0.8) return NormalizationConfidence.HIGH;
    if (score >= 0.5) return NormalizationConfidence.MEDIUM;
    if (score >= 0.2) return NormalizationConfidence.LOW;
    return NormalizationConfidence.UNKNOWN;
  }

  /**
   * Format normalized name for display
   */
  private static formatNormalizedName(description: string): string {
    return description
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Infer meaning from units
   */
  private static inferFromUnits(token: string, units?: string): { expansion: string; confidence: number } | null {
    if (!units) return null;

    const lowerToken = token.toLowerCase();
    const lowerUnits = units.toLowerCase();

    // Temperature units
    if (/°?[cf]|deg/.test(lowerUnits)) {
      if (lowerToken.includes('t') || lowerToken.includes('tmp')) {
        return { expansion: 'Temperature', confidence: 0.8 };
      }
    }

    // Flow units
    if (/cfm|gpm|lps/.test(lowerUnits)) {
      if (lowerToken.includes('f') || lowerToken.includes('fl')) {
        return { expansion: 'Flow', confidence: 0.8 };
      }
    }

    // Pressure units
    if (/psi|pa|inh2o/.test(lowerUnits)) {
      if (lowerToken.includes('p') || lowerToken.includes('pr')) {
        return { expansion: 'Pressure', confidence: 0.8 };
      }
    }

    return null;
  }

  /**
   * Infer meaning from common patterns
   */
  private static inferFromPattern(token: string): { expansion: string; confidence: number } | null {
    // Numbers
    if (/^\d+$/.test(token)) {
      return { expansion: token, confidence: 1.0 };
    }

    // Single letters (often abbreviations)
    if (token.length === 1) {
      const singleLetterMappings: Record<string, string> = {
        'T': 'Temperature',
        'P': 'Pressure',
        'F': 'Flow',
        'S': 'Supply',
        'R': 'Return'
      };
      
      const mapping = singleLetterMappings[token.toUpperCase()];
      if (mapping) {
        return { expansion: mapping, confidence: 0.4 };
      }
    }

    // Common words that don't need expansion
    const commonWords = ['the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with'];
    if (commonWords.includes(token.toLowerCase())) {
      return { expansion: token.toLowerCase(), confidence: 1.0 };
    }

    return null;
  }
}

/**
 * Convenience function for simple normalization
 */
export function normalizePointName(
  pointName: string,
  equipmentType?: string,
  vendorName?: string,
  units?: string
): { normalizedName: string; confidence: number } {
  const mockPoint: BACnetPoint = {
    id: `mock-${pointName}`,
    equipmentId: 'mock-equipment',
    objectName: pointName,
    objectType: 'AI' as any,
    objectInstance: 1,
    dis: pointName,
    displayName: pointName,
    dataType: 'Number' as any,
    category: 'SENSOR' as any,
    description: '',
    isWritable: false,
    isCommand: false,
    units,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const context: NormalizationContext = {
    equipmentType,
    vendorName,
    units
  };

  const result = PointNormalizer.normalizePointName(mockPoint, context);
  
  return {
    normalizedName: result.normalizedPoint?.normalizedName || pointName,
    confidence: result.normalizedPoint?.confidenceScore || 0.1
  };
}

export default PointNormalizer; 