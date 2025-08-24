/**
 * Core BACnet Point Normalization Engine
 * Transforms cryptic BACnet point names into human-readable descriptions
 */

import { BACnetPoint, BACnetObjectType, PointCategory, PointDataType } from '@/types/point';
import { NormalizedPoint, NormalizationResult, NormalizationConfidence, PointFunction } from '@/types/normalized';
import { HaystackTag, HaystackTagCategory } from '@/types/haystack';
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
  // Enhancement options
  addFunctionSuffix?: boolean; // Whether to add "Sensor", "Command" etc.
  useEnhancedConfidence?: boolean; // Whether to use enhanced confidence levels
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

      // Step 5: Determine point function first (pass the point for context)
      const pointFunction = this.determinePointFunction(tokenAnalyses, point);

      // Step 6: Generate human-readable name (without function suffix)
      const normalizedName = this.generateNormalizedName(tokenAnalyses);
      
      // Step 7: Generate description with function suffix when appropriate
      const expandedDescription = this.generateExpandedDescription(tokenAnalyses, context, pointFunction, point);
      result.appliedRules.push('token_analysis', 'acronym_expansion', 'context_analysis');
      
      // Debug logging for normalization results
      if (process.env.NODE_ENV !== 'production' && result.expandedAcronyms.length > 0) {
        console.log(`[NORMALIZATION] ${point.dis || point.objectName} → ${normalizedName}`);
        console.log(`  Description: ${expandedDescription}`);
        console.log(`  Expansions: ${result.expandedAcronyms.map(a => `${a.original}→${a.expanded}`).join(', ')}`);
      }
      
      // Step 8: Generate Haystack tags
      const haystackTags = this.generateHaystackTags(tokenAnalyses, contextAnalysis, pointFunction, expandedDescription);

      // Step 9: Calculate overall confidence
      const confidence = this.calculateConfidence(tokenAnalyses, contextAnalysis);

      // Step 10: Create normalized point
      const normalizedPoint: NormalizedPoint = {
        originalPointId: point.objectName,
        equipmentId: context.equipmentName || 'unknown',
        originalName: point.dis || point.objectName,
        originalDescription: point.description || '',
        objectName: point.objectName,
        objectType: point.objectType,
        normalizedName: this.formatNormalizedName(normalizedName),
        expandedDescription: expandedDescription,
        pointFunction,
        category: point.category,
        dataType: point.dataType,
        units: point.units || context.units,
        haystackTags,
        confidence: this.getConfidenceLevel(confidence.overall, context?.useEnhancedConfidence !== false),
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

    // First split on common delimiters (spaces, underscores, dashes, dots)
    const tokens = pointName.split(this.DELIMITERS).filter(t => t.length > 0);
    
    // Then handle camelCase within each token, but only if it looks like camelCase
    const finalTokens: string[] = [];
    for (const token of tokens) {
      if (token.length === 0) continue;
      
      // Check if token has camelCase pattern (lowercase followed by uppercase)
      const hasCamelCase = /[a-z][A-Z]/.test(token);
      
      if (hasCamelCase) {
        // Split on camelCase boundaries: insert space before uppercase letters
        const camelSplit = token.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
        finalTokens.push(...camelSplit.filter(t => t.length > 0));
      } else {
        // No camelCase, keep as single token
        finalTokens.push(token);
      }
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

    const matchedAcronym = BACNET_ACRONYMS.find(a => a.acronym.toLowerCase() === token.toLowerCase());

    if (matchedAcronym) {
      analysis.normalizedToken = matchedAcronym.expansion;
      analysis.confidence = matchedAcronym.priority / 10;
      analysis.source = 'general';
      analysis.matchedAcronym = matchedAcronym.acronym;
      analysis.expansion = matchedAcronym.expansion;
      
      // Debug logging for acronym expansion
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[ACRONYM EXPANSION] ${token} → ${matchedAcronym.expansion} (confidence: ${analysis.confidence.toFixed(2)}, priority: ${matchedAcronym.priority})`);
      }
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
   * Generate normalized name WITHOUT function suffix
   * This is the clean, human-readable name for the point
   */
  private static generateNormalizedName(tokenAnalyses: TokenAnalysis[]): string {
    // Build the base description from tokens
    const description = tokenAnalyses
      .map(t => t.expansion || t.normalizedToken)
      .filter(t => !['sensor', 'command', 'setpoint', 'status'].includes(t.toLowerCase()))
      .filter(t => isNaN(parseInt(t, 10))) // Filter out numeric tokens
      .join(' ');
    
    // Use the same formatting as formatNormalizedName for consistency
    return this.formatNormalizedName(description);
  }

  /**
   * Generate expanded description WITH function suffix when appropriate
   * This provides additional context about the point's function
   */
  private static generateExpandedDescription(
    tokenAnalyses: TokenAnalysis[],
    context?: NormalizationContext,
    pointFunction?: PointFunction,
    point?: BACnetPoint
  ): string {
    // Get the base name first
    const baseName = this.generateNormalizedName(tokenAnalyses);
    
    // Decide whether to append function suffix to the description
    let functionSuffix = '';
    
    if (pointFunction) {
      // Always append for setpoint, command, and status
      if (pointFunction === PointFunction.Setpoint) {
        functionSuffix = ' Setpoint';
      } else if (pointFunction === PointFunction.Command) {
        functionSuffix = ' Command';
      } else if (pointFunction === PointFunction.Status) {
        functionSuffix = ' Status';
      }
      // Only append "Sensor" for actual input types (AI, BI, MSI)
      else if (pointFunction === PointFunction.Sensor) {
        const objType = point?.objectType?.toUpperCase();
        // Only add "Sensor" for actual input types
        if (objType === 'AI' || objType === 'BI' || objType === 'MSI') {
          functionSuffix = ' Sensor';
        }
        // Don't add "Sensor" for AV, BV, AO, BO, etc.
      }
      // Unknown function gets no suffix - return exact same string as normalized name
      else if (pointFunction === PointFunction.Unknown) {
        return baseName; // Return exactly the same as normalized name
      }
    }
    
    return `${baseName}${functionSuffix}`;
  }

  /**
   * Determine the primary function of the point (Sensor, Setpoint, Command, Status)
   * Takes into account BACnet object type and writable status
   */
  private static determinePointFunction(
    tokenAnalyses: TokenAnalysis[],
    point?: BACnetPoint
  ): PointFunction {
    // First prioritize BACnet object type over name tokens for accuracy
    if (point?.objectType) {
      const objType = point.objectType.toUpperCase();
      
      // Output types (AO, BO) are always commands
      if (objType === 'AO' || objType === 'BO' || objType === 'MSO') {
        return PointFunction.Command;
      }
      
      // Input types - but check for status indicators first
      if (objType === 'AI' || objType === 'BI' || objType === 'MSI') {
        // Check for status tokens first for BI/MSI types
        if (objType === 'BI' || objType === 'MSI') {
          for (const analysis of tokenAnalyses) {
            const matchedAcronym = BACNET_ACRONYMS.find(a => a.acronym.toLowerCase() === analysis.originalToken.toLowerCase());
            if (matchedAcronym && matchedAcronym.pointFunction === 'Status') {
              return PointFunction.Status;
            }
          }
        }
        // Default to sensor for input types
        return PointFunction.Sensor;
      }
      
      // Value types (AV, BV, MSV) depend on writable status
      if (objType === 'AV' || objType === 'BV' || objType === 'MSV') {
        // Check for explicit setpoint tokens first
        for (const analysis of tokenAnalyses) {
          const matchedAcronym = BACNET_ACRONYMS.find(a => a.acronym.toLowerCase() === analysis.originalToken.toLowerCase());
          if (matchedAcronym && matchedAcronym.pointFunction === 'Setpoint') {
            return PointFunction.Setpoint;
          }
        }
        
        if (point.isWritable || point.isCommand) {
          return PointFunction.Command;
        }
        // Non-writable values should not get any function suffix
        return PointFunction.Unknown;
      }
    }
    
    // Then check for explicit function indicators in tokens
    for (const analysis of tokenAnalyses) {
      const matchedAcronym = BACNET_ACRONYMS.find(a => a.acronym.toLowerCase() === analysis.originalToken.toLowerCase());
      if (matchedAcronym && matchedAcronym.pointFunction) {
        switch (matchedAcronym.pointFunction) {
          case 'Setpoint': return PointFunction.Setpoint;
          case 'Command': return PointFunction.Command;
          case 'Status': return PointFunction.Status;
          case 'Sensor': return PointFunction.Sensor;
        }
      }
    }
    
    // Check if point is writable - writable points are commands
    if (point?.isWritable || point?.isCommand) {
      return PointFunction.Command;
    }
    
    // Default to sensor for unknowns
    return PointFunction.Sensor;
  }

  /**
   * Generate comprehensive Haystack tags based on analysis
   */
  private static generateHaystackTags(
    tokenAnalyses: TokenAnalysis[], 
    contextAnalysis: ContextAnalysis,
    pointFunction: PointFunction,
    description: string
  ): HaystackTag[] {
    const tags: HaystackTag[] = [];
    const addedTags = new Set<string>();

    const addTag = (name: string, category: HaystackTagCategory, confidence: number = 0.8) => {
      if (name && !addedTags.has(name)) {
        tags.push({
          name,
          value: undefined,
          category,
          isMarker: true,
          isValid: true,
          source: 'inferred',
          confidence,
          appliedAt: new Date()
        });
        addedTags.add(name);
      }
    };

    // Default tag
    addTag('point', HaystackTagCategory.ENTITY);

    // Tags from tokens
    tokenAnalyses.forEach(analysis => {
      const token = analysis.originalToken;
      if (['air', 'water', 'steam', 'elec'].includes(token.toLowerCase())) {
        addTag(token.toLowerCase(), HaystackTagCategory.SUBSTANCE);
      }
      if (['temp', 'pressure', 'flow', 'humidity', 'power', 'level'].includes(token.toLowerCase())) {
        addTag(token.toLowerCase(), HaystackTagCategory.MEASUREMENT);
      }
    });

    // Tags from point function
    switch (pointFunction) {
      case PointFunction.Sensor:
        addTag('sensor', HaystackTagCategory.FUNCTION);
        break;
      case PointFunction.Setpoint:
        addTag('sp', HaystackTagCategory.FUNCTION);
        break;
      case PointFunction.Command:
        addTag('cmd', HaystackTagCategory.FUNCTION);
        break;
      case PointFunction.Status:
        addTag('status', HaystackTagCategory.FUNCTION);
        break;
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
  private static getConfidenceLevel(score: number, useEnhanced: boolean = true): NormalizationConfidence {
    if (useEnhanced) {
      if (score >= 0.8) return 'HIGH' as NormalizationConfidence;
      if (score >= 0.5) return 'MEDIUM' as NormalizationConfidence;
      if (score >= 0.2) return 'LOW' as NormalizationConfidence;
      return 'UNKNOWN' as NormalizationConfidence;
    } else {
      // Legacy format for backward compatibility
      if (score >= 0.8) return NormalizationConfidence.HIGH;
      if (score >= 0.5) return NormalizationConfidence.MEDIUM;
      if (score >= 0.2) return NormalizationConfidence.LOW;
      return NormalizationConfidence.UNKNOWN;
    }
  }

  /**
   * Format normalized name for display
   */
  private static formatNormalizedName(description: string): string {
    if (!description || description.trim() === '') return 'Unknown Point';
    
    // Capitalize first letter of each word and join
    return description
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Infer meaning from units
   */
  private static inferFromUnits(token: string, units?: string): { expansion: string; confidence: number } | null {
    if (!units) return null;

    for (const [type, pattern] of Object.entries(this.UNIT_PATTERNS)) {
      if (pattern.test(units)) {
        // If token also suggests temperature, it's a strong match
        if (type === 'temperature' && /temp|t/i.test(token)) {
          return { expansion: 'Temperature', confidence: 0.8 };
        }
        // Basic match based on unit type
        return { expansion: type.charAt(0).toUpperCase() + type.slice(1), confidence: 0.6 };
      }
    }
    return null;
  }

  /**
   * Infer meaning from common patterns
   */
  private static inferFromPattern(token: string): { expansion: string; confidence: number } | null {
    if (/sp|setp|setpt/i.test(token)) {
      return { expansion: 'Setpoint', confidence: 0.9 };
    }
    if (/cmd|cmmd|command/i.test(token)) {
      return { expansion: 'Command', confidence: 0.9 };
    }
    if (/st|stat|status/i.test(token)) {
      return { expansion: 'Status', confidence: 0.85 };
    }
    if (/pos|position/i.test(token)) {
      return { expansion: 'Position', confidence: 0.8 };
    }
    if (/lvl|level/i.test(token)) {
      return { expansion: 'Level', confidence: 0.8 };
    }
    return null;
  }
}

/**
 * Standalone utility function for quick normalization (e.g., for UI)
 * This is a simplified version and does not use the full class-based engine.
 */
export function normalizePointName(
  pointName: string,
  equipmentType?: string,
  vendorName?: string,
  units?: string
): { normalizedName: string; confidence: number } {
  if (!pointName) {
    return { normalizedName: 'Unknown', confidence: 0 };
  }

  const context: NormalizationContext = {
    equipmentType,
    vendorName,
    units
  };

  const bacnetPoint: BACnetPoint = {
    objectName: pointName,
    dis: pointName,
    id: `temp-${pointName}`,
    equipmentId: 'temp-equipment',
    objectType: BACnetObjectType.ANALOG_INPUT,
    objectInstance: 1,
    displayName: pointName,
    dataType: PointDataType.NUMBER,
    category: PointCategory.SENSOR,
    description: '',
    isWritable: false,
    isCommand: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = PointNormalizer.normalizePointName(bacnetPoint, context);

  if (result.success && result.normalizedPoint) {
    return {
      normalizedName: result.normalizedPoint.normalizedName,
      confidence: result.normalizedPoint.confidenceScore || 0,
    };
  }

  return {
    normalizedName: pointName, // Fallback to original name
    confidence: 0,
  };
}

export default PointNormalizer;
