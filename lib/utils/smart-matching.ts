/**
 * Smart Equipment Name Matching Utilities
 * Provides intelligent suggestions for mapping equipment with similar names
 */

export interface NameMatchSuggestion {
  equipmentId: number;
  equipmentName: string;
  equipmentType: string;
  confidence: number;
  matchReason: string;
}

/**
 * Normalize equipment names for comparison (enhanced version)
 */
function normalizeEquipmentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[-_\s\.]/g, '') // Normalize separators (hyphens, underscores, spaces, periods)
    .replace(/[^a-z0-9]/g, '') // Remove remaining special characters
    .trim();
}

/**
 * Generate name variations for matching
 */
function generateNameVariations(name: string): string[] {
  const variations = new Set<string>();
  const baseName = name.toLowerCase().trim();
  
  // Add original name
  variations.add(baseName);
  
  // Add normalized version
  variations.add(normalizeEquipmentName(baseName));
  
  // Handle number padding variations (VAV-7 ↔ VAV-07, VAV-007)
  const numberMatch = baseName.match(/^([a-z-_\s]+?)(\d+)$/);
  if (numberMatch) {
    const prefix = numberMatch[1];
    const number = parseInt(numberMatch[2], 10);
    
    // Generate padded versions
    variations.add(`${prefix}${number.toString().padStart(2, '0')}`);
    variations.add(`${prefix}${number.toString().padStart(3, '0')}`);
    variations.add(`${prefix}${number}`); // Unpadded
    
    // Generate separator variations
    const separators = ['-', '_', ' ', ''];
    separators.forEach(sep => {
      variations.add(`${prefix.replace(/[-_\s]/g, sep)}${sep}${number}`);
      variations.add(`${prefix.replace(/[-_\s]/g, sep)}${sep}${number.toString().padStart(2, '0')}`);
      variations.add(`${prefix.replace(/[-_\s]/g, sep)}${sep}${number.toString().padStart(3, '0')}`);
    });
  }
  
  // Handle separator variations for non-numeric suffixes
  const separatorVariations = [
    baseName.replace(/[-_]/g, ''), // Remove all separators
    baseName.replace(/[-_]/g, ' '), // Replace with spaces
    baseName.replace(/\s/g, '-'), // Replace spaces with hyphens
    baseName.replace(/\s/g, '_'), // Replace spaces with underscores
  ];
  
  separatorVariations.forEach(variation => variations.add(variation));
  
  return Array.from(variations);
}

/**
 * Advanced name similarity that preserves numbers and handles common variations
 */
function calculateAdvancedNameSimilarity(name1: string, name2: string): number {
  // First try exact match after normalization
  const normalized1 = normalizeEquipmentName(name1);
  const normalized2 = normalizeEquipmentName(name2);
  
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
  return calculateStringSimilarity(semiNorm1, semiNorm2);
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a value between 0 and 1 (1 being identical)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  
  return 1 - (distance / maxLength);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
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
 * Calculate equipment type compatibility (enhanced version)
 * Returns a value between 0 and 1
 */
function calculateTypeMatch(bacnetType: string, cxalloyType: string): number {
  const normalizedBacnet = bacnetType.toLowerCase();
  const normalizedCxAlloy = cxalloyType.toLowerCase();

  // Direct type mappings
  const typeMap: Record<string, string[]> = {
    'air handler unit': ['ahu', 'air handler', 'air handling unit'],
    'variable air volume': ['vav', 'variable air volume', 'vvr'],
    'chiller': ['ch', 'chiller', 'cooling', 'chw'],
    'boiler': ['boiler', 'heating', 'blr', 'hhw'],
    'rooftop unit': ['rtu', 'rooftop unit'],
    'exhaust fan': ['ef', 'exhaust', 'fan', 'lab exhaust'],
    'supply fan': ['sf', 'supply', 'fan'],
    'pump': ['pump', 'p', 'cwp', 'hwp'],
    'valve': ['valve', 'vlv'],
    'damper': ['damper', 'dmp'],
    'lab-exhaust': ['lab air valve', 'lab valve', 'lab exhaust', 'fume hood']
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
 * Find intelligent mapping suggestions for an unmapped data source (enhanced version)
 */
export function findMappingSuggestions(
  bacnetEquipmentName: string,
  bacnetEquipmentType: string,
  cxalloyEquipment: Array<{ id: number; name: string; type: string; description?: string; space?: string }>
): NameMatchSuggestion[] {
  const suggestions: NameMatchSuggestion[] = [];
  
  for (const cxalloyEq of cxalloyEquipment) {
    let confidence = 0;
    let matchReason = '';
    
    // Calculate advanced name similarity (80% weight)
    const nameSimilarity = calculateAdvancedNameSimilarity(bacnetEquipmentName, cxalloyEq.name);
    confidence += nameSimilarity * 0.8;
    
    if (nameSimilarity >= 0.95) {
      matchReason = `Exact name match (${Math.round(nameSimilarity * 100)}%)`;
    } else if (nameSimilarity >= 0.7) {
      matchReason = `High name similarity (${Math.round(nameSimilarity * 100)}%)`;
    } else if (nameSimilarity >= 0.5) {
      matchReason = `Moderate name similarity (${Math.round(nameSimilarity * 100)}%)`;
    }
    
    // Equipment type matching bonus
    const typeMatch = calculateTypeMatch(bacnetEquipmentType, cxalloyEq.type);
    if (typeMatch > 0) {
      confidence += typeMatch * 0.1; // 10% bonus for type compatibility
      if (matchReason) {
        matchReason += ` + equipment type compatibility (${Math.round(typeMatch * 100)}%)`;
      } else {
        matchReason = `Equipment type compatibility (${Math.round(typeMatch * 100)}%)`;
      }
    }
    
    // Ensure confidence doesn't exceed 1.0
    confidence = Math.min(confidence, 1.0);
    
    // Only include suggestions with reasonable confidence (same threshold as auto-mapping service)
    if (confidence >= 0.6) {
      suggestions.push({
        equipmentId: cxalloyEq.id,
        equipmentName: cxalloyEq.name,
        equipmentType: cxalloyEq.type,
        confidence,
        matchReason
      });
    }
  }
  
  // Sort by confidence (highest first) and limit to top 3
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

/**
 * Check if a data source should show "Create New CxAlloy Asset" option
 */
export function shouldShowCreateNewOption(suggestions: NameMatchSuggestion[]): boolean {
  // Show "Create New" if no good suggestions (confidence < 0.7) are found
  return suggestions.length === 0 || suggestions[0].confidence < 0.7;
}