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
 * Normalize equipment names for comparison
 */
function normalizeEquipmentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[-_\s]/g, '') // Remove separators
    .replace(/^0+/, '') // Remove leading zeros
    .replace(/\b0+/g, '') // Remove zeros after word boundaries
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
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return (maxLen - distance) / maxLen;
}

/**
 * Get equipment type similarity bonus
 */
function getEquipmentTypeBonus(bacnetType: string, cxalloyType: string): number {
  const bacnetTypeLower = bacnetType.toLowerCase();
  const cxalloyTypeLower = cxalloyType.toLowerCase();
  
  // Exact type match
  if (bacnetTypeLower === cxalloyTypeLower) return 0.2;
  
  // Partial type match
  if (bacnetTypeLower.includes(cxalloyTypeLower) || cxalloyTypeLower.includes(bacnetTypeLower)) {
    return 0.1;
  }
  
  // Known type mappings
  const typeMapping: Record<string, string[]> = {
    'air_handler_unit': ['air handler unit', 'ahu'],
    'vav_controller': ['vav controller', 'vav', 'variable air volume'],
    'rtu_controller': ['rtu controller', 'rtu', 'rooftop unit'],
    'chiller': ['chiller', 'ch'],
    'boiler': ['boiler', 'bl'],
    'pump': ['pump', 'p'],
    'fan': ['fan', 'exhaust fan', 'supply fan', 'return fan'],
    'lab_air_valve': ['lab air valve', 'lab valve', 'fume hood']
  };
  
  for (const [key, variants] of Object.entries(typeMapping)) {
    if ((key === bacnetTypeLower || variants.includes(bacnetTypeLower)) &&
        (key === cxalloyTypeLower || variants.includes(cxalloyTypeLower))) {
      return 0.15;
    }
  }
  
  return 0;
}

/**
 * Find intelligent mapping suggestions for an unmapped data source
 */
export function findMappingSuggestions(
  bacnetEquipmentName: string,
  bacnetEquipmentType: string,
  cxalloyEquipment: Array<{ id: number; name: string; type: string; description?: string; space?: string }>
): NameMatchSuggestion[] {
  const suggestions: NameMatchSuggestion[] = [];
  const bacnetVariations = generateNameVariations(bacnetEquipmentName);
  
  for (const cxalloyEq of cxalloyEquipment) {
    const cxalloyVariations = generateNameVariations(cxalloyEq.name);
    
    let bestScore = 0;
    let matchReason = '';
    
    // Check for exact matches in variations
    for (const bacnetVar of bacnetVariations) {
      for (const cxalloyVar of cxalloyVariations) {
        if (bacnetVar === cxalloyVar) {
          bestScore = Math.max(bestScore, 0.95);
          matchReason = 'Exact name match with normalization';
          break;
        }
      }
      if (bestScore >= 0.95) break;
    }
    
    // If no exact match, calculate similarity scores
    if (bestScore < 0.95) {
      for (const bacnetVar of bacnetVariations) {
        for (const cxalloyVar of cxalloyVariations) {
          const similarity = calculateSimilarity(bacnetVar, cxalloyVar);
          if (similarity > bestScore) {
            bestScore = similarity;
            if (similarity > 0.8) {
              matchReason = 'High similarity match';
            } else if (similarity > 0.6) {
              matchReason = 'Moderate similarity match';
            } else {
              matchReason = 'Possible match';
            }
          }
        }
      }
    }
    
    // Add equipment type bonus
    const typeBonus = getEquipmentTypeBonus(bacnetEquipmentType, cxalloyEq.type);
    bestScore = Math.min(1.0, bestScore + typeBonus);
    
    if (typeBonus > 0 && bestScore > 0.3) {
      matchReason += ` (compatible equipment type)`;
    }
    
    // Only include suggestions with reasonable confidence
    if (bestScore >= 0.4) {
      suggestions.push({
        equipmentId: cxalloyEq.id,
        equipmentName: cxalloyEq.name,
        equipmentType: cxalloyEq.type,
        confidence: bestScore,
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