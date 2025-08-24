import type { Equipment, CxAlloyEquipment, EquipmentMapping } from '../../types/equipment';

/**
 * Auto-mapping service for equipment matching
 * Provides algorithms for automatic equipment mapping between BACnet and CxAlloy systems
 */

export interface AutoMappingMatch {
  bacnetEquipment: Equipment;
  cxAlloyEquipment: CxAlloyEquipment;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'type-assisted';
  reasons: string[];
}

export interface AutoMappingResult {
  exactMappings: AutoMappingMatch[];
  suggestedMappings: AutoMappingMatch[];
  unmatchedBacnet: Equipment[];
  unmatchedCxAlloy: CxAlloyEquipment[];
  stats: {
    totalBacnet: number;
    totalCxAlloy: number;
    exactMatches: number;
    suggestedMatches: number;
    processingTimeMs: number;
  };
}

export class AutoMappingService {
  private static readonly EXACT_MATCH_THRESHOLD = 0.95;
  private static readonly SUGGESTION_THRESHOLD = 0.6;
  private static readonly TYPE_BONUS = 0.1;

  /**
   * Main auto-mapping function
   */
  static async autoMapEquipment(
    bacnetEquipment: Equipment[],
    cxAlloyEquipment: CxAlloyEquipment[]
  ): Promise<AutoMappingResult> {
    const startTime = Date.now();
    
    const exactMappings: AutoMappingMatch[] = [];
    const suggestedMappings: AutoMappingMatch[] = [];
    const unmatchedBacnet: Equipment[] = [];
    const unmatchedCxAlloy: CxAlloyEquipment[] = [...cxAlloyEquipment];

    console.log(`[AUTO-MAPPING] Processing ${bacnetEquipment.length} BACnet equipment against ${cxAlloyEquipment.length} CxAlloy equipment`);

    for (const bacnet of bacnetEquipment) {
      let bestMatch: AutoMappingMatch | null = null;
      let bestMatchIndex = -1;

      // Try to find the best match for this BACnet equipment
      for (let i = 0; i < unmatchedCxAlloy.length; i++) {
        const cxAlloy = unmatchedCxAlloy[i];
        const match = this.calculateMatch(bacnet, cxAlloy);

        if (!bestMatch || match.confidence > bestMatch.confidence) {
          bestMatch = match;
          bestMatchIndex = i;
        }
      }

      if (bestMatch) {
        if (bestMatch.confidence >= this.EXACT_MATCH_THRESHOLD) {
          exactMappings.push(bestMatch);
          unmatchedCxAlloy.splice(bestMatchIndex, 1);
        } else if (bestMatch.confidence >= this.SUGGESTION_THRESHOLD) {
          suggestedMappings.push(bestMatch);
          // Remove from unmatchedCxAlloy to prevent duplicate suggestions
          unmatchedCxAlloy.splice(bestMatchIndex, 1);
        } else {
          unmatchedBacnet.push(bacnet);
        }
      } else {
        unmatchedBacnet.push(bacnet);
      }
    }

    // Sort suggestions by confidence (highest first)
    suggestedMappings.sort((a, b) => b.confidence - a.confidence);

    const processingTime = Date.now() - startTime;

    console.log(`[AUTO-MAPPING] Results: ${exactMappings.length} exact, ${suggestedMappings.length} suggested, ${unmatchedBacnet.length} unmatched BACnet, ${unmatchedCxAlloy.length} unmatched CxAlloy (${processingTime}ms)`);

    return {
      exactMappings,
      suggestedMappings,
      unmatchedBacnet,
      unmatchedCxAlloy,
      stats: {
        totalBacnet: bacnetEquipment.length,
        totalCxAlloy: cxAlloyEquipment.length,
        exactMatches: exactMappings.length,
        suggestedMatches: suggestedMappings.length,
        processingTimeMs: processingTime
      }
    };
  }

  /**
   * Calculate match confidence between BACnet and CxAlloy equipment
   */
  private static calculateMatch(
    bacnet: Equipment,
    cxAlloy: CxAlloyEquipment
  ): AutoMappingMatch {
    const reasons: string[] = [];
    let confidence = 0;
    let matchType: 'exact' | 'fuzzy' | 'type-assisted' = 'fuzzy';

    // Normalize names for comparison
    const bacnetNormalized = this.normalizeName(bacnet.name);
    const cxAlloyNormalized = this.normalizeName(cxAlloy.name);

    // Calculate advanced name similarity
    const nameSimilarity = this.calculateAdvancedNameSimilarity(bacnet.name, cxAlloy.name);
    confidence += nameSimilarity * 0.8; // 80% weight for name similarity

    if (nameSimilarity >= 0.95) {
      matchType = 'exact';
      reasons.push(`Exact name match (${Math.round(nameSimilarity * 100)}%)`);
    } else if (nameSimilarity >= 0.7) {
      reasons.push(`High name similarity (${Math.round(nameSimilarity * 100)}%)`);
    } else if (nameSimilarity >= 0.5) {
      reasons.push(`Moderate name similarity (${Math.round(nameSimilarity * 100)}%)`);
    }

    // Equipment type matching bonus
    const typeMatch = this.calculateTypeMatch(bacnet.type, cxAlloy.type);
    if (typeMatch > 0) {
      confidence += typeMatch * this.TYPE_BONUS;
      matchType = 'type-assisted';
      reasons.push(`Equipment type compatibility (${Math.round(typeMatch * 100)}%)`);
    }

    // Location matching (if available)
    if (bacnet.filename && cxAlloy.location) {
      const locationSimilarity = this.calculateStringSimilarity(
        this.normalizeName(bacnet.filename),
        this.normalizeName(cxAlloy.location)
      );
      if (locationSimilarity > 0.5) {
        confidence += locationSimilarity * 0.1; // 10% bonus for location match
        reasons.push(`Location similarity (${Math.round(locationSimilarity * 100)}%)`);
      }
    }

    // Ensure confidence doesn't exceed 1.0
    confidence = Math.min(confidence, 1.0);

    return {
      bacnetEquipment: bacnet,
      cxAlloyEquipment: cxAlloy,
      confidence,
      matchType,
      reasons
    };
  }

  /**
   * Normalize equipment names for better matching
   */
  private static normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[-_\s\.]/g, '') // Normalize separators (hyphens, underscores, spaces, periods)
      .replace(/[^a-z0-9]/g, '') // Remove remaining special characters
      .trim();
  }

  /**
   * Advanced name similarity that preserves numbers and handles common variations
   */
  private static calculateAdvancedNameSimilarity(name1: string, name2: string): number {
    // First try exact match after normalization
    const normalized1 = this.normalizeName(name1);
    const normalized2 = this.normalizeName(name2);
    
    if (normalized1 === normalized2) {
      return 1.0;
    }

    // Preserve original names with just separator normalization for better number matching
    const semiNorm1 = name1.toLowerCase().replace(/[-_\s\.]/g, '');
    const semiNorm2 = name2.toLowerCase().replace(/[-_\s\.]/g, '');
    
    if (semiNorm1 === semiNorm2) {
      return 0.95;
    }

    // Check if one name contains the other (for partial matches)
    if (semiNorm1.includes(semiNorm2) || semiNorm2.includes(semiNorm1)) {
      const longer = semiNorm1.length > semiNorm2.length ? semiNorm1 : semiNorm2;
      const shorter = semiNorm1.length > semiNorm2.length ? semiNorm2 : semiNorm1;
      return 0.8 * (shorter.length / longer.length);
    }

    // Fall back to Levenshtein distance
    return this.calculateStringSimilarity(semiNorm1, semiNorm2);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * Returns a value between 0 and 1 (1 being identical)
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate equipment type compatibility
   * Returns a value between 0 and 1
   */
  private static calculateTypeMatch(bacnetType: string, cxAlloyType: string): number {
    const normalizedBacnet = bacnetType.toLowerCase();
    const normalizedCxAlloy = cxAlloyType.toLowerCase();

    // Direct type mappings
    const typeMap: Record<string, string[]> = {
      'air handler unit': ['ahu', 'air handler', 'air handling unit'],
      'air_handler_unit': ['ahu', 'air handler', 'air handling unit'],
      'ahu': ['air handler', 'air handling unit', 'air handler unit'],
      'vav controller': ['vav', 'variable air volume'],
      'vav_controller': ['vav', 'variable air volume'],
      'chiller': ['ch', 'chiller', 'cooling'],
      'boiler': ['boiler', 'heating'],
      'rtu controller': ['rtu', 'rooftop unit'],
      'rtu_controller': ['rtu', 'rooftop unit'],
      'exhaust fan': ['ef', 'exhaust', 'fan'],
      'exhaust_fan': ['ef', 'exhaust', 'fan'],
      'supply fan': ['sf', 'supply', 'fan'],
      'supply_fan': ['sf', 'supply', 'fan'],
      'pump': ['pump', 'p'],
      'valve': ['valve', 'vlv'],
      'damper': ['damper', 'dmp']
    };

    // Check for exact match
    if (normalizedBacnet === normalizedCxAlloy) {
      return 1.0;
    }

    // Check mapped types
    for (const [key, variants] of Object.entries(typeMap)) {
      if (key === normalizedBacnet || variants.includes(normalizedBacnet)) {
        if (key === normalizedCxAlloy || variants.includes(normalizedCxAlloy)) {
          return 0.9;
        }
      }
    }

    // Check for partial matches (contains)
    if (normalizedBacnet.includes(normalizedCxAlloy) || normalizedCxAlloy.includes(normalizedBacnet)) {
      return 0.6;
    }

    return 0;
  }

  /**
   * Convert auto-mapping matches to EquipmentMapping objects
   */
  static convertToEquipmentMappings(matches: AutoMappingMatch[]): EquipmentMapping[] {
    return matches.map(match => ({
      id: `auto-${match.bacnetEquipment.id}-${match.cxAlloyEquipment.id}`,
      bacnetEquipmentId: match.bacnetEquipment.id,
      bacnetEquipmentName: match.bacnetEquipment.name,
      bacnetEquipmentType: match.bacnetEquipment.type || 'Unknown',
      cxalloyEquipmentId: match.cxAlloyEquipment.id,
      cxalloyEquipmentName: match.cxAlloyEquipment.name,
      cxalloyCategory: match.cxAlloyEquipment.type as any, // Type casting needed
      mappingType: match.matchType === 'exact' ? 'exact' : 'automatic',
      confidence: match.confidence,
      mappingReason: match.reasons.join('; '),
      totalBacnetPoints: match.bacnetEquipment.totalPoints || 0,
      mappedPointsCount: 0,
      unmappedPointsCount: 0,
      isActive: true,
      isVerified: match.confidence >= AutoMappingService.EXACT_MATCH_THRESHOLD,
      verifiedBy: match.confidence >= AutoMappingService.EXACT_MATCH_THRESHOLD ? 'auto-mapping' : undefined,
      verifiedAt: match.confidence >= AutoMappingService.EXACT_MATCH_THRESHOLD ? new Date() : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'auto-mapping-service',
      mappingMethod: 'auto'
    }));
  }
}