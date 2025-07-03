/**
 * Advanced Point Signature Engine
 * Sophisticated point signature creation and pattern matching system for equipment point configurations
 */

import { NormalizedPoint, PointFunction, NormalizationConfidence } from '@/types/normalized';
import { EquipmentType } from '@/types/equipment';
import { PointTemplate, EquipmentTemplate, TemplateApplicationResult } from '@/types/template';
import { BACnetObjectType } from '@/types/point';

/**
 * Point Signature Interface
 * Represents a wildcard pattern for point matching
 */
export interface PointSignature {
  id: string;
  pattern: string; // e.g., "*ROOM*TEMP*", "*DAMPER*POS*"
  normalizedPattern: string; // Cleaned version for matching
  confidence: number; // 0-1 confidence in pattern quality
  specificity: number; // 0-1 how specific the pattern is
  pointFunction: PointFunction;
  objectType?: BACnetObjectType;
  units?: string;
  keywords: string[]; // Extracted keywords for matching
  
  // Template Association
  templateId?: string;
  equipmentType?: EquipmentType;
  isRequired?: boolean;
  
  // Usage Statistics
  matchCount: number;
  successfulMatches: number;
  avgConfidence: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  source: 'generated' | 'manual' | 'learned';
}

/**
 * Template Match Result
 * Result of matching a point signature against a template
 */
export interface TemplateMatch {
  templateId: string;
  pointSignature: PointSignature;
  matchedPoint: NormalizedPoint;
  confidence: number; // 0-1 confidence in match
  matchScore: number; // Detailed scoring breakdown
  
  // Match Details
  patternMatches: Array<{
    keyword: string;
    position: number;
    weight: number;
    matched: boolean;
  }>;
  
  // Quality Indicators
  exactMatch: boolean;
  partialMatch: boolean;
  fuzzyMatch: boolean;
  contextMatch: boolean;
  
  // Effectiveness Tracking
  effectiveness: {
    historicalSuccessRate: number;
    recentUsage: number;
    userFeedback: number; // -1 to 1 scale
  };
  
  // Recommendations
  recommendations: string[];
  warnings: string[];
}

/**
 * Signature Generation Options
 */
export interface SignatureGenerationOptions {
  minKeywordLength: number;
  maxWildcards: number;
  includeUnits: boolean;
  includeObjectType: boolean;
  prioritizeFunction: boolean;
  confidenceThreshold: number;
}

/**
 * Template Matching Options
 */
export interface TemplateMatchingOptions {
  confidenceThreshold: number;
  allowFuzzyMatching: boolean;
  contextWeight: number;
  requireExactFunction: boolean;
  maxResults: number;
}

/**
 * Advanced Point Signature Engine
 * Creates signatures and matches templates with sophisticated pattern matching
 */
export class PointSignatureEngine {
  private static readonly DEFAULT_GENERATION_OPTIONS: SignatureGenerationOptions = {
    minKeywordLength: 2,
    maxWildcards: 5,
    includeUnits: true,
    includeObjectType: true,
    prioritizeFunction: true,
    confidenceThreshold: 0.6
  };

  private static readonly DEFAULT_MATCHING_OPTIONS: TemplateMatchingOptions = {
    confidenceThreshold: 0.7,
    allowFuzzyMatching: true,
    contextWeight: 0.3,
    requireExactFunction: false,
    maxResults: 10
  };

  private static readonly KEYWORD_PATTERNS = {
    temperature: /temp(erature)?/i,
    pressure: /press(ure)?/i,
    flow: /flow|cfm|gpm/i,
    setpoint: /sp|setpoint/i,
    position: /pos(ition)?/i,
    status: /stat(us)?/i,
    command: /cmd|command/i,
    sensor: /sensor|snsr/i,
    damper: /damper|dmp/i,
    valve: /valve|vlv/i,
    fan: /fan|exh(aust)?/i,
    room: /room|space|zone/i,
    supply: /supply|sup/i,
    return: /return|ret/i,
    exhaust: /exhaust|exh/i
  };

  private static readonly STOP_WORDS = new Set([
    'the', 'and', 'or', 'at', 'in', 'on', 'to', 'for', 'of', 'with', 'by',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'a', 'an'
  ]);

  /**
   * Generate point signature from a normalized point
   */
  public static generateSignature(
    point: NormalizedPoint,
    options: Partial<SignatureGenerationOptions> = {}
  ): PointSignature {
    const opts = { ...this.DEFAULT_GENERATION_OPTIONS, ...options };
    
    // Extract keywords from point name
    const keywords = this.extractKeywords(point.normalizedName || point.originalName);
    
    // Create wildcard pattern
    const pattern = this.createWildcardPattern(keywords, opts);
    
    // Calculate confidence and specificity
    const confidence = this.calculatePatternConfidence(pattern, keywords, point);
    const specificity = this.calculatePatternSpecificity(pattern, keywords);
    
    // Create signature
    const signature: PointSignature = {
      id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pattern,
      normalizedPattern: this.normalizePattern(pattern),
      confidence,
      specificity,
      pointFunction: point.pointFunction,
      objectType: point.objectType,
      units: point.units,
      keywords,
      equipmentType: undefined, // Will be set when associated with template
      isRequired: false,
      matchCount: 0,
      successfulMatches: 0,
      avgConfidence: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'generated'
    };

    return signature;
  }

  /**
   * Match point signatures against equipment templates
   */
  public static matchTemplate(
    points: NormalizedPoint[],
    template: EquipmentTemplate,
    options: Partial<TemplateMatchingOptions> = {}
  ): TemplateMatch[] {
    const opts = { ...this.DEFAULT_MATCHING_OPTIONS, ...options };
    const matches: TemplateMatch[] = [];

    // Generate signatures for all points
    const pointSignatures = points.map(point => this.generateSignature(point));

    // Match against template's required and optional points
    const allTemplatePoints = [
      ...template.requiredPoints.map(p => ({ ...p, isRequired: true })),
      ...template.optionalPoints.map(p => ({ ...p, isRequired: false }))
    ];

    for (const templatePoint of allTemplatePoints) {
      const templateSignature = this.createTemplateSignature(templatePoint, template);
      
      // Find best matching point signature
      const bestMatch = this.findBestMatch(
        templateSignature,
        pointSignatures,
        points,
        opts
      );

      if (bestMatch && bestMatch.confidence >= opts.confidenceThreshold) {
        matches.push(bestMatch);
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence).slice(0, opts.maxResults);
  }

  /**
   * Create default signatures for equipment type
   */
  public static createDefaultSignatures(equipmentType: EquipmentType): PointSignature[] {
    const signatures: PointSignature[] = [];
    const baseId = `default_${equipmentType.toLowerCase().replace(/\s+/g, '_')}`;

    // Common signatures by equipment type
    const defaultPatterns = this.getDefaultPatterns(equipmentType);

    defaultPatterns.forEach((pattern, index) => {
      const signature: PointSignature = {
        id: `${baseId}_${index}`,
        pattern: pattern.pattern,
        normalizedPattern: this.normalizePattern(pattern.pattern),
        confidence: pattern.confidence,
        specificity: pattern.specificity,
        pointFunction: pattern.pointFunction,
        objectType: pattern.objectType,
        units: pattern.units,
        keywords: pattern.keywords,
        equipmentType,
        isRequired: pattern.isRequired,
        matchCount: 0,
        successfulMatches: 0,
        avgConfidence: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'generated'
      };

      signatures.push(signature);
    });

    return signatures;
  }

  /**
   * Extract meaningful keywords from point name
   */
  private static extractKeywords(pointName: string): string[] {
    // Tokenize and clean
    const tokens = pointName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length >= 2 && !this.STOP_WORDS.has(token));

    // Extract meaningful keywords
    const keywords: string[] = [];
    
    for (const token of tokens) {
      // Check against known patterns
      let matched = false;
      for (const [category, pattern] of Object.entries(this.KEYWORD_PATTERNS)) {
        if (pattern.test(token)) {
          keywords.push(category);
          matched = true;
          break;
        }
      }
      
      // Add significant tokens that don't match patterns
      if (!matched && token.length >= 3) {
        keywords.push(token);
      }
    }

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Create wildcard pattern from keywords
   */
  private static createWildcardPattern(
    keywords: string[],
    options: SignatureGenerationOptions
  ): string {
    if (keywords.length === 0) return '*UNKNOWN*';

    // Sort keywords by importance
    const sortedKeywords = this.sortKeywordsByImportance(keywords);
    
    // Create pattern with wildcards
    const pattern = sortedKeywords
      .slice(0, Math.min(keywords.length, options.maxWildcards))
      .map(keyword => keyword.toUpperCase())
      .join('*');

    return `*${pattern}*`;
  }

  /**
   * Calculate pattern confidence based on keywords and point characteristics
   */
  private static calculatePatternConfidence(
    pattern: string,
    keywords: string[],
    point: NormalizedPoint
  ): number {
    let confidence = 0.5; // Base confidence

    // Keyword quality boost
    const keywordQuality = keywords.length > 0 ? 
      Math.min(keywords.length / 4, 1) * 0.3 : 0;
    confidence += keywordQuality;

    // Point function clarity boost
    if (point.pointFunction !== PointFunction.Unknown) {
      confidence += 0.2;
    }

    // Units presence boost
    if (point.units) {
      confidence += 0.1;
    }

    // Object type clarity boost
    if (point.objectType) {
      confidence += 0.1;
    }

    // Normalization quality boost
    if (point.confidence === NormalizationConfidence.HIGH) {
      confidence += 0.15;
    } else if (point.confidence === NormalizationConfidence.MEDIUM) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate pattern specificity (how unique/specific the pattern is)
   */
  private static calculatePatternSpecificity(pattern: string, keywords: string[]): number {
    let specificity = 0.5; // Base specificity

    // More keywords = more specific
    specificity += Math.min(keywords.length / 5, 0.3);

    // Specific technical terms increase specificity
    const technicalTerms = keywords.filter(keyword => 
      Object.keys(this.KEYWORD_PATTERNS).includes(keyword)
    );
    specificity += technicalTerms.length * 0.1;

    // Shorter patterns are more specific
    const wildcardCount = (pattern.match(/\*/g) || []).length;
    specificity += Math.max(0, (5 - wildcardCount) * 0.05);

    return Math.min(specificity, 1.0);
  }

  /**
   * Normalize pattern for consistent matching
   */
  private static normalizePattern(pattern: string): string {
    return pattern
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9*]/g, '');
  }

  /**
   * Sort keywords by importance for pattern creation
   */
  private static sortKeywordsByImportance(keywords: string[]): string[] {
    const importance: Record<string, number> = {
      // Function indicators (highest priority)
      'temperature': 10, 'pressure': 10, 'flow': 10, 'setpoint': 10,
      'position': 9, 'status': 9, 'command': 9, 'sensor': 9,
      
      // Equipment indicators
      'damper': 8, 'valve': 8, 'fan': 8,
      
      // Location indicators
      'room': 7, 'supply': 7, 'return': 7, 'exhaust': 7
    };

    const defaultImportance = 5;

    return keywords.sort((a, b) => {
      const aImportance = importance[a.toLowerCase()] || defaultImportance;
      const bImportance = importance[b.toLowerCase()] || defaultImportance;
      return bImportance - aImportance;
    });
  }

  /**
   * Create template signature from point template
   */
  private static createTemplateSignature(
    pointTemplate: PointTemplate,
    equipmentTemplate: EquipmentTemplate
  ): PointSignature {
    const keywords = this.extractKeywords(pointTemplate.pointName);
    const pattern = this.createWildcardPattern(keywords, this.DEFAULT_GENERATION_OPTIONS);

    return {
      id: `template_${pointTemplate.id}`,
      pattern,
      normalizedPattern: this.normalizePattern(pattern),
      confidence: 0.8, // Template signatures have high confidence
      specificity: this.calculatePatternSpecificity(pattern, keywords),
      pointFunction: pointTemplate.pointFunction,
      objectType: pointTemplate.objectType,
      units: pointTemplate.units,
      keywords,
      templateId: equipmentTemplate.id,
      equipmentType: equipmentTemplate.equipmentType,
      isRequired: pointTemplate.isRequired,
      matchCount: 0,
      successfulMatches: 0,
      avgConfidence: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'generated'
    };
  }

  /**
   * Find best matching point signature for template signature
   */
  private static findBestMatch(
    templateSignature: PointSignature,
    pointSignatures: PointSignature[],
    points: NormalizedPoint[],
    options: TemplateMatchingOptions
  ): TemplateMatch | null {
    let bestMatch: TemplateMatch | null = null;
    let bestScore = 0;

    for (let i = 0; i < pointSignatures.length; i++) {
      const pointSignature = pointSignatures[i];
      const point = points[i];
      
      const matchScore = this.calculateMatchScore(templateSignature, pointSignature, point, options);
      
      if (matchScore > bestScore && matchScore >= options.confidenceThreshold) {
        bestScore = matchScore;
        bestMatch = {
          templateId: templateSignature.templateId || 'unknown',
          pointSignature,
          matchedPoint: point,
          confidence: matchScore,
          matchScore,
          patternMatches: this.analyzePatternMatches(templateSignature, pointSignature),
          exactMatch: matchScore > 0.95,
          partialMatch: matchScore > 0.7 && matchScore <= 0.95,
          fuzzyMatch: matchScore > 0.5 && matchScore <= 0.7,
          contextMatch: this.hasContextMatch(templateSignature, pointSignature),
          effectiveness: {
            historicalSuccessRate: 0.8, // Default value
            recentUsage: 0,
            userFeedback: 0
          },
          recommendations: this.generateRecommendations(templateSignature, pointSignature, matchScore),
          warnings: this.generateWarnings(templateSignature, pointSignature, matchScore)
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate match score between template and point signatures
   */
  private static calculateMatchScore(
    templateSignature: PointSignature,
    pointSignature: PointSignature,
    point: NormalizedPoint,
    options: TemplateMatchingOptions
  ): number {
    let score = 0;

    // Pattern similarity (40% weight)
    const patternSimilarity = this.calculatePatternSimilarity(
      templateSignature.normalizedPattern,
      pointSignature.normalizedPattern
    );
    score += patternSimilarity * 0.4;

    // Keyword overlap (30% weight)
    const keywordOverlap = this.calculateKeywordOverlap(
      templateSignature.keywords,
      pointSignature.keywords
    );
    score += keywordOverlap * 0.3;

    // Point function match (20% weight)
    const functionMatch = templateSignature.pointFunction === pointSignature.pointFunction ? 1 : 0;
    score += functionMatch * 0.2;

    // Context match (10% weight)
    const contextMatch = this.calculateContextMatch(templateSignature, pointSignature, point);
    score += contextMatch * options.contextWeight;

    // Apply confidence boost for high-quality signatures
    if (pointSignature.confidence > 0.8) {
      score *= 1.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate pattern similarity using fuzzy matching
   */
  private static calculatePatternSimilarity(pattern1: string, pattern2: string): number {
    if (pattern1 === pattern2) return 1.0;
    
    // Remove wildcards for comparison
    const clean1 = pattern1.replace(/\*/g, '');
    const clean2 = pattern2.replace(/\*/g, '');
    
    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(clean1, clean2);
    const maxLength = Math.max(clean1.length, clean2.length);
    
    return maxLength > 0 ? 1 - (distance / maxLength) : 0;
  }

  /**
   * Calculate keyword overlap between two signature keywords
   */
  private static calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 && keywords2.length === 0) return 1.0;
    if (keywords1.length === 0 || keywords2.length === 0) return 0.0;

    const set1 = new Set(keywords1.map(k => k.toLowerCase()));
    const set2 = new Set(keywords2.map(k => k.toLowerCase()));
    const intersection = new Set([...set1].filter(k => set2.has(k)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate context match (units, object type, etc.)
   */
  private static calculateContextMatch(
    templateSignature: PointSignature,
    pointSignature: PointSignature,
    _point: NormalizedPoint
  ): number {
    let contextScore = 0;
    let contextCount = 0;

    // Units match
    if (templateSignature.units && pointSignature.units) {
      contextScore += templateSignature.units === pointSignature.units ? 1 : 0;
      contextCount++;
    }

    // Object type match
    if (templateSignature.objectType && pointSignature.objectType) {
      contextScore += templateSignature.objectType === pointSignature.objectType ? 1 : 0;
      contextCount++;
    }

    return contextCount > 0 ? contextScore / contextCount : 0;
  }

  /**
   * Analyze pattern matches for detailed feedback
   */
  private static analyzePatternMatches(
    templateSignature: PointSignature,
    pointSignature: PointSignature
  ): Array<{
    keyword: string;
    position: number;
    weight: number;
    matched: boolean;
  }> {
    const matches: Array<{
      keyword: string;
      position: number;
      weight: number;
      matched: boolean;
    }> = [];

    templateSignature.keywords.forEach((keyword, index) => {
      const matched = pointSignature.keywords.some(pk => 
        pk.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(pk.toLowerCase())
      );

      matches.push({
        keyword,
        position: index,
        weight: this.getKeywordWeight(keyword),
        matched
      });
    });

    return matches;
  }

  /**
   * Check if signatures have context match
   */
  private static hasContextMatch(
    templateSignature: PointSignature,
    pointSignature: PointSignature
  ): boolean {
    return (
      (templateSignature.units === pointSignature.units) ||
      (templateSignature.objectType === pointSignature.objectType) ||
      (templateSignature.pointFunction === pointSignature.pointFunction)
    );
  }

  /**
   * Generate recommendations for template match
   */
  private static generateRecommendations(
    templateSignature: PointSignature,
    pointSignature: PointSignature,
    matchScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (matchScore < 0.8) {
      recommendations.push('Consider manual review of this match due to lower confidence');
    }

    if (templateSignature.pointFunction !== pointSignature.pointFunction) {
      recommendations.push('Point function mismatch - verify expected behavior');
    }

    if (templateSignature.units !== pointSignature.units) {
      recommendations.push('Units mismatch - check if unit conversion is needed');
    }

    if (pointSignature.keywords.length < 2) {
      recommendations.push('Point has limited keywords - consider adding more descriptive naming');
    }

    return recommendations;
  }

  /**
   * Generate warnings for template match
   */
  private static generateWarnings(
    templateSignature: PointSignature,
    pointSignature: PointSignature,
    matchScore: number
  ): string[] {
    const warnings: string[] = [];

    if (matchScore < 0.6) {
      warnings.push('Low confidence match - manual verification required');
    }

    if (templateSignature.isRequired && matchScore < 0.8) {
      warnings.push('Required point has low match confidence');
    }

    return warnings;
  }

  /**
   * Get default patterns for equipment type
   */
  private static getDefaultPatterns(equipmentType: EquipmentType): Array<{
    pattern: string;
    confidence: number;
    specificity: number;
    pointFunction: PointFunction;
    objectType?: BACnetObjectType;
    units?: string;
    keywords: string[];
    isRequired: boolean;
  }> {
    const patterns: Array<{
      pattern: string;
      confidence: number;
      specificity: number;
      pointFunction: PointFunction;
      objectType?: BACnetObjectType;
      units?: string;
      keywords: string[];
      isRequired: boolean;
    }> = [];

    // Add common patterns based on equipment type
    switch (equipmentType) {
      case EquipmentType.VAV_CONTROLLER:
        patterns.push(
          {
            pattern: '*ROOM*TEMP*',
            confidence: 0.9,
            specificity: 0.8,
            pointFunction: PointFunction.Sensor,
            objectType: BACnetObjectType.ANALOG_INPUT,
            units: 'degF',
            keywords: ['room', 'temperature'],
            isRequired: true
          },
          {
            pattern: '*DAMPER*POS*',
            confidence: 0.9,
            specificity: 0.8,
            pointFunction: PointFunction.Status,
            objectType: BACnetObjectType.ANALOG_OUTPUT,
            units: '%',
            keywords: ['damper', 'position'],
            isRequired: true
          },
          {
            pattern: '*SETPOINT*',
            confidence: 0.8,
            specificity: 0.7,
            pointFunction: PointFunction.Setpoint,
            objectType: BACnetObjectType.ANALOG_VALUE,
            units: 'degF',
            keywords: ['setpoint'],
            isRequired: true
          }
        );
        break;

      case EquipmentType.AIR_HANDLER_UNIT:
        patterns.push(
          {
            pattern: '*SUPPLY*TEMP*',
            confidence: 0.9,
            specificity: 0.8,
            pointFunction: PointFunction.Sensor,
            objectType: BACnetObjectType.ANALOG_INPUT,
            units: 'degF',
            keywords: ['supply', 'temperature'],
            isRequired: true
          },
          {
            pattern: '*RETURN*TEMP*',
            confidence: 0.9,
            specificity: 0.8,
            pointFunction: PointFunction.Sensor,
            objectType: BACnetObjectType.ANALOG_INPUT,
            units: 'degF',
            keywords: ['return', 'temperature'],
            isRequired: true
          },
          {
            pattern: '*FAN*STATUS*',
            confidence: 0.8,
            specificity: 0.7,
            pointFunction: PointFunction.Status,
            objectType: BACnetObjectType.BINARY_INPUT,
            keywords: ['fan', 'status'],
            isRequired: true
          }
        );
        break;

      case EquipmentType.EXHAUST_FAN:
        patterns.push(
          {
            pattern: '*FAN*STATUS*',
            confidence: 0.9,
            specificity: 0.8,
            pointFunction: PointFunction.Status,
            objectType: BACnetObjectType.BINARY_INPUT,
            keywords: ['fan', 'status'],
            isRequired: true
          },
          {
            pattern: '*SPEED*',
            confidence: 0.8,
            specificity: 0.7,
            pointFunction: PointFunction.Command,
            objectType: BACnetObjectType.ANALOG_OUTPUT,
            units: '%',
            keywords: ['speed'],
            isRequired: false
          }
        );
        break;

      default:
        // Generic patterns for unknown equipment types
        patterns.push(
          {
            pattern: '*TEMP*',
            confidence: 0.6,
            specificity: 0.5,
            pointFunction: PointFunction.Sensor,
            objectType: BACnetObjectType.ANALOG_INPUT,
            units: 'degF',
            keywords: ['temperature'],
            isRequired: false
          },
          {
            pattern: '*STATUS*',
            confidence: 0.6,
            specificity: 0.5,
            pointFunction: PointFunction.Status,
            objectType: BACnetObjectType.BINARY_INPUT,
            keywords: ['status'],
            isRequired: false
          }
        );
    }

    return patterns;
  }

  /**
   * Get keyword weight for importance scoring
   */
  private static getKeywordWeight(keyword: string): number {
    const weights: Record<string, number> = {
      'temperature': 1.0,
      'pressure': 1.0,
      'flow': 1.0,
      'setpoint': 0.9,
      'position': 0.9,
      'status': 0.8,
      'command': 0.8,
      'sensor': 0.7,
      'damper': 0.7,
      'valve': 0.7,
      'fan': 0.7,
      'room': 0.6,
      'supply': 0.6,
      'return': 0.6,
      'exhaust': 0.6
    };

    return weights[keyword.toLowerCase()] || 0.5;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

/**
 * Signature effectiveness analytics
 */
export class SignatureAnalytics {
  /**
   * Calculate template effectiveness metrics
   */
  public static calculateTemplateEffectiveness(
    template: EquipmentTemplate,
    applicationResults: TemplateApplicationResult[]
  ): {
    overallEffectiveness: number;
    pointMatchRate: number;
    confidenceScore: number;
    usageFrequency: number;
    recommendations: string[];
  } {
    if (applicationResults.length === 0) {
      return {
        overallEffectiveness: 0,
        pointMatchRate: 0,
        confidenceScore: 0,
        usageFrequency: 0,
        recommendations: ['Template has not been used yet']
      };
    }

    const successfulApplications = applicationResults.filter(result => result.success);
    const avgPointMatchRate = applicationResults.reduce((sum, result) => 
      sum + result.totalPointMatchRate, 0) / applicationResults.length;
    const avgConfidence = applicationResults.reduce((sum, result) => 
      sum + result.confidence, 0) / applicationResults.length;

    const effectiveness = (successfulApplications.length / applicationResults.length) * 
      avgPointMatchRate * avgConfidence;

    const recommendations: string[] = [];
    
    if (effectiveness < 0.6) {
      recommendations.push('Template effectiveness is low - consider reviewing point patterns');
    }
    
    if (avgPointMatchRate < 0.7) {
      recommendations.push('Point match rate is low - add more flexible patterns');
    }
    
    if (avgConfidence < 0.8) {
      recommendations.push('Confidence scores are low - improve pattern specificity');
    }

    return {
      overallEffectiveness: effectiveness,
      pointMatchRate: avgPointMatchRate,
      confidenceScore: avgConfidence,
      usageFrequency: applicationResults.length,
      recommendations
    };
  }

  /**
   * Generate optimization recommendations for signatures
   */
  public static generateOptimizationRecommendations(
    signatures: PointSignature[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Analyze signature quality
    const lowConfidenceSignatures = signatures.filter(sig => sig.confidence < 0.7);
    if (lowConfidenceSignatures.length > 0) {
      recommendations.push(`${lowConfidenceSignatures.length} signatures have low confidence - review and improve patterns`);
    }

    // Analyze usage patterns
    const unusedSignatures = signatures.filter(sig => sig.matchCount === 0);
    if (unusedSignatures.length > signatures.length * 0.3) {
      recommendations.push('Many signatures are unused - consider removing or improving them');
    }

    // Analyze specificity
    const lowSpecificitySignatures = signatures.filter(sig => sig.specificity < 0.5);
    if (lowSpecificitySignatures.length > 0) {
      recommendations.push(`${lowSpecificitySignatures.length} signatures are too generic - add more specific keywords`);
    }

    return recommendations;
  }
} 