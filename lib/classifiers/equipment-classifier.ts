import { 
  EquipmentType, 
  EquipmentConfig 
} from '@/types/equipment';

/**
 * Equipment classification patterns based on filename analysis
 */
export interface ClassificationPattern {
  pattern: RegExp;
  equipmentType: EquipmentType;
  confidence: number;
  description: string;
  examples: string[];
}

/**
 * Equipment classification result
 */
export interface ClassificationResult {
  equipmentType: EquipmentType;
  equipmentName: string;
  originalFileName: string;
  confidence: number;
  matchedPattern: string;
  alternatives: Array<{
    equipmentType: EquipmentType;
    confidence: number;
    reason: string;
  }>;
  metadata: {
    normalized: boolean;
    ambiguous: boolean;
    warnings: string[];
  };
}

/**
 * Comprehensive equipment classifier for building automation systems
 */
export class EquipmentClassifier {
  private static readonly CLASSIFICATION_PATTERNS: ClassificationPattern[] = [
    // Lab Air Valves - Various configurations
    {
      pattern: /^L-(\d+)$/i,
      equipmentType: EquipmentType.LAB_AIR_VALVE,
      confidence: 0.95,
      description: 'Single Lab Air Valve',
      examples: ['L-5', 'L-20', 'L-3']
    },
    {
      pattern: /^L-(\d+)_L-(\d+)$/i,
      equipmentType: EquipmentType.LAB_AIR_VALVE,
      confidence: 0.95,
      description: 'Supply+Exhaust Lab Air Valve',
      examples: ['L-1_L-2', 'L-9_L-11', 'L-10_L-12']
    },
    
    // VAV Controllers - Multiple naming patterns
    {
      pattern: /^VVR[_-](\d+)\.(\d+)$/i,
      equipmentType: EquipmentType.VAV_CONTROLLER,
      confidence: 0.98,
      description: 'VAV Controller (VVR series)',
      examples: ['VVR_2.1', 'VVR_2.10', 'VVR-2.17']
    },
    {
      pattern: /^VVR[_-]E(\d+)$/i,
      equipmentType: EquipmentType.VAV_CONTROLLER,
      confidence: 0.98,
      description: 'VAV Controller (VVR-E series)',
      examples: ['VVR_E5', 'VVR_E21', 'VVR-E22']
    },
    {
      pattern: /^VV[_-](\d+)[_-]R(\d+)$/i,
      equipmentType: EquipmentType.VAV_CONTROLLER,
      confidence: 0.95,
      description: 'VAV Controller (Return type)',
      examples: ['VV-1-R8', 'VV_5_R3', 'VV-2-R5']
    },
    
    // RTU Controllers
    {
      pattern: /^RTU[_-](\d+)$/i,
      equipmentType: EquipmentType.RTU_CONTROLLER,
      confidence: 0.98,
      description: 'Rooftop Unit Controller',
      examples: ['RTU_2', 'RTU_15', 'RTU-01']
    },
    
    // Air Handler Units
    {
      pattern: /^AHU[_-](\d+)$/i,
      equipmentType: EquipmentType.AIR_HANDLER_UNIT,
      confidence: 0.98,
      description: 'Air Handler Unit',
      examples: ['AHU-1', 'AHU_2', 'AHU_C1']
    },
    {
      pattern: /^AHU[_-](\d+)[_-]([A-Z]\d+)$/i,
      equipmentType: EquipmentType.AIR_HANDLER_UNIT,
      confidence: 0.95,
      description: 'Air Handler Unit with zone designation',
      examples: ['AHU-1-AHU_C1', 'AHU_2_B1']
    },
    
    // Exhaust Fans
    {
      pattern: /^MISC(\d+)[_-]EF$/i,
      equipmentType: EquipmentType.EXHAUST_FAN,
      confidence: 0.95,
      description: 'Miscellaneous Exhaust Fan Controller',
      examples: ['MISC1_EF', 'MISC2_EF']
    },
    {
      pattern: /^EF[_-](\d+)$/i,
      equipmentType: EquipmentType.EXHAUST_FAN,
      confidence: 0.90,
      description: 'Exhaust Fan',
      examples: ['EF_10A', 'EF-12B']
    },
    
    // Chillers and Chilled Water Systems
    {
      pattern: /^CHW[_-](.+)[_-](Chiller|ChwP\d+|ChwSys)$/i,
      equipmentType: EquipmentType.CHILLER,
      confidence: 0.95,
      description: 'Chilled Water System Component',
      examples: ['CHW-System-Chiller', 'CHW-System-ChwP1']
    },
    
    // Hot Water Systems
    {
      pattern: /^HHW[_-](.+)[_-](Boilers?|HwP\d+|HwSys)$/i,
      equipmentType: EquipmentType.BOILER,
      confidence: 0.95,
      description: 'Hot Water System Component',
      examples: ['HHW-System-Boilers', 'HHW-System-HwP1']
    },
    
    // Unit Heaters
    {
      pattern: /^UH[_-](\d+)$/i,
      equipmentType: EquipmentType.UNIT_HEATER,
      confidence: 0.90,
      description: 'Unit Heater',
      examples: ['UH_1322', 'UH_1604']
    },
    
    // Generic patterns with lower confidence
    {
      pattern: /^([A-Z]+)[_-](\d+)$/i,
      equipmentType: EquipmentType.UNKNOWN,
      confidence: 0.50,
      description: 'Generic equipment pattern',
      examples: ['TCP-1', 'VAV-1']
    }
  ];

  /**
   * Classify equipment from filename
   */
  static classifyFromFilename(fileName: string): ClassificationResult {
    // Extract base filename without extension
    const baseName = fileName.replace(/\.(trio|csv|txt)$/i, '');
    
    let bestMatch: ClassificationPattern | null = null;
    let bestConfidence = 0;
    const alternatives: ClassificationResult['alternatives'] = [];

    // Test all patterns
    for (const pattern of this.CLASSIFICATION_PATTERNS) {
      const match = baseName.match(pattern.pattern);
      
      if (match) {
        if (pattern.confidence > bestConfidence) {
          // Store previous best as alternative
          if (bestMatch) {
            alternatives.push({
              equipmentType: bestMatch.equipmentType,
              confidence: bestMatch.confidence,
              reason: `Matched pattern: ${bestMatch.pattern.source}`
            });
          }
          
          bestMatch = pattern;
          bestConfidence = pattern.confidence;
        } else {
          // Add as alternative
          alternatives.push({
            equipmentType: pattern.equipmentType,
            confidence: pattern.confidence,
            reason: `Matched pattern: ${pattern.pattern.source}`
          });
        }
      }
    }

    // Build result
    const result: ClassificationResult = {
      equipmentType: bestMatch?.equipmentType || EquipmentType.UNKNOWN,
      equipmentName: this.extractEquipmentName(baseName),
      originalFileName: fileName,
      confidence: bestConfidence,
      matchedPattern: bestMatch?.pattern.source || 'none',
      alternatives: alternatives.slice(0, 3), // Top 3 alternatives
      metadata: {
        normalized: false,
        ambiguous: alternatives.length > 0,
        warnings: []
      }
    };

    // Add warnings for ambiguous cases
    if (alternatives.length > 2) {
      result.metadata.warnings.push('Multiple equipment patterns matched');
    }
    
    if (bestConfidence < 0.7) {
      result.metadata.warnings.push('Low confidence classification');
    }

    return result;
  }

  /**
   * Extract clean equipment name from filename
   */
  static extractEquipmentName(fileName: string): string {
    // Remove file extension
    let name = fileName.replace(/\.(trio|csv|txt)$/i, '');
    
    // Normalize common separators
    name = name.replace(/[_-]/g, '-');
    
    // Handle special cases
    if (name.match(/^L-\d+$/)) {
      return `Lab Air Valve ${name}`;
    }
    
    if (name.match(/^VVR/)) {
      return `VAV Controller ${name}`;
    }
    
    if (name.match(/^RTU/)) {
      return `RTU Controller ${name}`;
    }
    
    if (name.match(/^AHU/)) {
      return `Air Handler ${name}`;
    }
    
    if (name.includes('EF')) {
      return `Exhaust Fan ${name}`;
    }

    return name;
  }

  /**
   * Get equipment type from classification result
   */
  static getEquipmentType(result: ClassificationResult): EquipmentType {
    return result.equipmentType;
  }

  /**
   * Get all supported equipment patterns
   */
  static getSupportedPatterns(): ClassificationPattern[] {
    return [...this.CLASSIFICATION_PATTERNS];
  }

  /**
   * Validate filename against known patterns
   */
  static validateFileName(fileName: string): {
    isValid: boolean;
    suggestedNames: string[];
    issues: string[];
  } {
    const baseName = fileName.replace(/\.(trio|csv|txt)$/i, '');
    const issues: string[] = [];
    const suggestedNames: string[] = [];

    // Check for common issues
    if (baseName.includes(' ')) {
      issues.push('Filename contains spaces');
      suggestedNames.push(baseName.replace(/\s+/g, '_'));
    }

    if (baseName.includes('..')) {
      issues.push('Filename contains double dots');
    }

    if (!/^[A-Za-z0-9_.-]+$/.test(baseName)) {
      issues.push('Filename contains invalid characters');
    }

    // Check if it matches any known pattern
    const classification = this.classifyFromFilename(fileName);
    const isValid = classification.confidence > 0.5 && issues.length === 0;

    return {
      isValid,
      suggestedNames,
      issues
    };
  }

  /**
   * Batch classify multiple filenames
   */
  static batchClassify(fileNames: string[]): ClassificationResult[] {
    return fileNames.map(fileName => this.classifyFromFilename(fileName));
  }

  /**
   * Get equipment configuration for type
   */
  static getEquipmentConfig(equipmentType: EquipmentType): EquipmentConfig | null {
    const configs: Record<EquipmentType, EquipmentConfig> = {
      [EquipmentType.VAV_CONTROLLER]: {
        displayName: 'VAV Controller',
        description: 'Variable Air Volume Terminal Unit Controller',
        typicalPoints: ['Temperature', 'Airflow', 'Damper Position', 'Setpoint'],
        vendor: 'Various',
        category: 'HVAC Terminal',
        tags: ['vav', 'controller', 'hvac']
      },
      [EquipmentType.LAB_AIR_VALVE]: {
        displayName: 'Lab Air Valve',
        description: 'Laboratory Air Control Valve',
        typicalPoints: ['Position', 'Airflow', 'Pressure'],
        vendor: 'Various',
        category: 'Lab Equipment',
        tags: ['lab', 'valve', 'airflow']
      },
      [EquipmentType.RTU_CONTROLLER]: {
        displayName: 'RTU Controller',
        description: 'Rooftop Unit Controller',
        typicalPoints: ['Supply Air Temp', 'Return Air Temp', 'Fan Status', 'Heating/Cooling'],
        vendor: 'Various',
        category: 'HVAC Primary',
        tags: ['rtu', 'rooftop', 'controller']
      },
      [EquipmentType.AIR_HANDLER_UNIT]: {
        displayName: 'Air Handler Unit',
        description: 'Central Air Handling Unit',
        typicalPoints: ['Supply Fan', 'Return Fan', 'Heating Coil', 'Cooling Coil'],
        vendor: 'Various',
        category: 'HVAC Primary',
        tags: ['ahu', 'air-handler', 'central']
      },
      [EquipmentType.EXHAUST_FAN]: {
        displayName: 'Exhaust Fan',
        description: 'Exhaust Fan Controller',
        typicalPoints: ['Fan Status', 'Fan Speed', 'Pressure'],
        vendor: 'Various',
        category: 'HVAC Auxiliary',
        tags: ['exhaust', 'fan', 'ventilation']
      },
      [EquipmentType.CHILLER]: {
        displayName: 'Chiller',
        description: 'Chilled Water Plant Equipment',
        typicalPoints: ['Chilled Water Supply Temp', 'Chilled Water Return Temp', 'Status'],
        vendor: 'Various',
        category: 'Central Plant',
        tags: ['chiller', 'cooling', 'central-plant']
      },
      [EquipmentType.BOILER]: {
        displayName: 'Boiler',
        description: 'Hot Water Plant Equipment',
        typicalPoints: ['Hot Water Supply Temp', 'Hot Water Return Temp', 'Status'],
        vendor: 'Various',
        category: 'Central Plant',
        tags: ['boiler', 'heating', 'central-plant']
      },
      [EquipmentType.UNIT_HEATER]: {
        displayName: 'Unit Heater',
        description: 'Hydronic Unit Heater',
        typicalPoints: ['Space Temperature', 'Valve Position', 'Fan Status'],
        vendor: 'Various',
        category: 'HVAC Terminal',
        tags: ['unit-heater', 'terminal', 'heating']
      },
      [EquipmentType.UNKNOWN]: {
        displayName: 'Unknown Equipment',
        description: 'Equipment type not determined',
        typicalPoints: [],
        vendor: 'Unknown',
        category: 'Uncategorized',
        tags: ['unknown']
      },
      [EquipmentType.HUMIDIFIER]: {
        displayName: 'Humidifier',
        description: 'Humidification System',
        typicalPoints: ['Steam Command', 'Humidity', 'Status'],
        vendor: 'Various',
        category: 'HVAC Auxiliary',
        tags: ['humidifier', 'humidity', 'steam']
      },
      [EquipmentType.RETURN_VAV]: {
        displayName: 'Return VAV',
        description: 'Return Air VAV Terminal Unit',
        typicalPoints: ['Airflow', 'Damper Position', 'Status'],
        vendor: 'Various',
        category: 'HVAC Terminal',
        tags: ['return', 'vav', 'damper']
      },
      [EquipmentType.AHU_CONTROLLER]: {
        displayName: 'AHU Controller',
        description: 'Air Handler Unit Controller',
        typicalPoints: ['Supply Fan', 'Return Fan', 'Heating Coil', 'Cooling Coil'],
        vendor: 'Various',
        category: 'HVAC Primary',
        tags: ['ahu', 'air-handler', 'controller']
      },
      [EquipmentType.CHILLER_SYSTEM]: {
        displayName: 'Chiller System',
        description: 'Chilled Water Plant System',
        typicalPoints: ['Chilled Water Supply Temp', 'Chilled Water Return Temp', 'Chiller Status'],
        vendor: 'Various',
        category: 'Central Plant',
        tags: ['chiller', 'cooling', 'system']
      },
      [EquipmentType.BOILER_SYSTEM]: {
        displayName: 'Boiler System',
        description: 'Hot Water Plant System',
        typicalPoints: ['Hot Water Supply Temp', 'Hot Water Return Temp', 'Boiler Status'],
        vendor: 'Various',
        category: 'Central Plant',
        tags: ['boiler', 'heating', 'system']
      },
      [EquipmentType.PUMP_CONTROLLER]: {
        displayName: 'Pump Controller',
        description: 'Water Pump Controller',
        typicalPoints: ['Pump Status', 'Pump Speed', 'Flow Rate', 'Pressure'],
        vendor: 'Various',
        category: 'Central Plant',
        tags: ['pump', 'controller', 'water']
      }
    };

    return configs[equipmentType] || null;
  }
}

/**
 * Convenience functions for equipment classification
 */
export function classifyEquipment(fileName: string): ClassificationResult {
  return EquipmentClassifier.classifyFromFilename(fileName);
}

export function getEquipmentType(fileName: string): EquipmentType {
  const result = EquipmentClassifier.classifyFromFilename(fileName);
  return result.equipmentType;
}

export function extractEquipmentName(fileName: string): string {
  return EquipmentClassifier.extractEquipmentName(fileName);
} 