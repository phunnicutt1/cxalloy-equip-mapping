import { connectorService } from '../services/connector-service';

/**
 * Equipment classification patterns based on filename analysis
 */
export interface ClassificationPattern {
  pattern: RegExp;
  equipmentType: string;
  confidence: number;
  description: string;
  examples: string[];
}

/**
 * Equipment classification result
 */
export interface ClassificationResult {
  equipmentType: string;
  confidence: number;
  equipmentName: string;
  matchedPattern?: string;
  alternatives: Array<{ type: string; confidence: number }>;
}

/**
 * Comprehensive equipment classifier for building automation systems
 */
export class EquipmentClassifier {
  // Vendor-specific model patterns for equipment classification
  private static readonly VENDOR_MODEL_PATTERNS: Record<string, Record<string, string>> = {
    'ABB': {
      'ACH580': 'VFD', // Variable Frequency Drive
    },
    'Climate Master': {
      'ClimateMaster MPC': 'WSHP', // Water Source Heat Pump
    },
    'Distech Controls, Inc.': {
      'ECB_600': 'CONTROLLER',
      'ECB_300': 'CONTROLLER',
      'ECB_203': 'CONTROLLER',
    },
    'Danfoss Drives A/S': {
      'FC-102': 'VFD', // Variable Frequency Drive
    },
    'ARMSTRONG': {
      'DEPC': 'PUMP_CONTROLLER',
    },
    'Sierra Monitor Corporation': {
      'ProtoCessor': 'GATEWAY',
      'ProtoCessor FFP485': 'GATEWAY',
    },
    'Automated Logic Corporation': {
      'I/O Pro': 'CONTROLLER',
      'I/O Pro 812u': 'CONTROLLER',
    }
  };

  // Equipment name patterns (fallback when vendor/model not available)
  private static readonly EQUIPMENT_PATTERNS = [
    // HVAC Equipment
    { pattern: /^AHU[-_]?\d*$/i, type: 'AHU', confidence: 0.9 },
    { pattern: /air.*handl/i, type: 'AHU', confidence: 0.85 },
    { pattern: /^RTU[-_]?\d*$/i, type: 'RTU', confidence: 0.9 },
    { pattern: /rooftop/i, type: 'RTU', confidence: 0.85 },
    { pattern: /^VAV[-_]?\d*$/i, type: 'VAV', confidence: 0.9 },
    { pattern: /^VVR[-_]?\d*\.?\d*$/i, type: 'VAV_CONTROLLER', confidence: 0.95 },
    { pattern: /variable.*air.*volume/i, type: 'VAV', confidence: 0.85 },
    { pattern: /^FCU[-_]?\d*$/i, type: 'FCU', confidence: 0.9 },
    { pattern: /fan.*coil/i, type: 'FCU', confidence: 0.85 },
    
    // Heat Pumps
    { pattern: /^WSHP[-_]?/i, type: 'WSHP', confidence: 0.95 },
    { pattern: /water.*source.*heat.*pump/i, type: 'WSHP', confidence: 0.9 },
    { pattern: /^ASHP[-_]?\d*$/i, type: 'ASHP', confidence: 0.9 },
    { pattern: /air.*source.*heat.*pump/i, type: 'ASHP', confidence: 0.85 },
    { pattern: /^HP[-_]?\d*$/i, type: 'HEAT_PUMP', confidence: 0.7 },
    
    // Fans
    { pattern: /^EF[-_]?\d+[A-Z]?$/i, type: 'EXHAUST_FAN', confidence: 0.95 },
    { pattern: /exhaust.*fan/i, type: 'EXHAUST_FAN', confidence: 0.9 },
    { pattern: /^SF[-_]?\d*$/i, type: 'SUPPLY_FAN', confidence: 0.9 },
    { pattern: /supply.*fan/i, type: 'SUPPLY_FAN', confidence: 0.85 },
    { pattern: /^RF[-_]?\d*$/i, type: 'RETURN_FAN', confidence: 0.9 },
    { pattern: /return.*fan/i, type: 'RETURN_FAN', confidence: 0.85 },
    { pattern: /^CTF[-_]?\d*$/i, type: 'COOLING_TOWER_FAN', confidence: 0.95 },
    { pattern: /cooling.*tower.*fan/i, type: 'COOLING_TOWER_FAN', confidence: 0.9 },
    
    // Laboratory Equipment
    { pattern: /^L[-_]?\d+$/i, type: 'LAB_AIR_VALVE', confidence: 0.95 },
    { pattern: /lab.*air.*valve/i, type: 'LAB_AIR_VALVE', confidence: 0.9 },
    { pattern: /laboratory.*exhaust/i, type: 'LAB_EXHAUST', confidence: 0.85 },
    
    // Pumps
    { pattern: /^CWP[-_]?\d*$/i, type: 'CHILLED_WATER_PUMP', confidence: 0.9 },
    { pattern: /chill.*water.*pump/i, type: 'CHILLED_WATER_PUMP', confidence: 0.85 },
    { pattern: /^HWP[-_]?\d*$/i, type: 'HOT_WATER_PUMP', confidence: 0.9 },
    { pattern: /hot.*water.*pump/i, type: 'HOT_WATER_PUMP', confidence: 0.85 },
    { pattern: /loop.*water.*pump/i, type: 'LOOP_WATER_PUMP', confidence: 0.95 },
    { pattern: /tower.*water.*pump/i, type: 'TOWER_WATER_PUMP', confidence: 0.95 },
    { pattern: /condenser.*water.*pump/i, type: 'CONDENSER_WATER_PUMP', confidence: 0.9 },
    
    // Chillers and Boilers
    { pattern: /^CH[-_]?\d*$/i, type: 'CHILLER', confidence: 0.9 },
    { pattern: /chiller/i, type: 'CHILLER', confidence: 0.95 },
    { pattern: /^BLR[-_]?\d*$/i, type: 'BOILER', confidence: 0.9 },
    { pattern: /boiler/i, type: 'BOILER', confidence: 0.95 },
    { pattern: /master.*boiler.*controller/i, type: 'BOILER_CONTROLLER', confidence: 0.95 },
    
    // Cooling Towers
    { pattern: /^CT[-_]?\d*$/i, type: 'COOLING_TOWER', confidence: 0.9 },
    { pattern: /cooling.*tower/i, type: 'COOLING_TOWER', confidence: 0.95 },
    
    // Terminal Units
    { pattern: /^FPB[-_]?\d*$/i, type: 'FAN_POWERED_BOX', confidence: 0.9 },
    { pattern: /fan.*power.*box/i, type: 'FAN_POWERED_BOX', confidence: 0.85 },
    { pattern: /^FPTU[-_]?\d*$/i, type: 'FAN_POWERED_TERMINAL', confidence: 0.9 },
    { pattern: /^CAV[-_]?\d*$/i, type: 'CONSTANT_AIR_VOLUME', confidence: 0.9 },
    
    // Heat Recovery
    { pattern: /^ERV[-_]?\d*$/i, type: 'ENERGY_RECOVERY_VENTILATOR', confidence: 0.9 },
    { pattern: /energy.*recovery/i, type: 'ERV', confidence: 0.85 },
    { pattern: /^HRV[-_]?\d*$/i, type: 'HEAT_RECOVERY_VENTILATOR', confidence: 0.9 },
    { pattern: /heat.*recovery/i, type: 'HRV', confidence: 0.85 },
    
    // Outdoor Air Units
    { pattern: /^DOAS[-_]?\d*$/i, type: 'DOAS', confidence: 0.95 },
    { pattern: /^DOAU[-_]?\d*$/i, type: 'DOAU', confidence: 0.95 },
    { pattern: /dedicated.*outdoor/i, type: 'DOAS', confidence: 0.9 },
    { pattern: /^MAU[-_]?\d*$/i, type: 'MAKEUP_AIR_UNIT', confidence: 0.9 },
    { pattern: /makeup.*air/i, type: 'MAU', confidence: 0.85 },
    
    // Controllers
    { pattern: /controller/i, type: 'CONTROLLER', confidence: 0.8 },
    { pattern: /^ECB[-_]?\d*/i, type: 'CONTROLLER', confidence: 0.85 },
    { pattern: /loop.*controller/i, type: 'LOOP_CONTROLLER', confidence: 0.9 },
    
    // VFDs
    { pattern: /^VFD[-_]?\d*$/i, type: 'VFD', confidence: 0.9 },
    { pattern: /variable.*frequency/i, type: 'VFD', confidence: 0.85 },
    { pattern: /ac.*drive/i, type: 'VFD', confidence: 0.8 },
    
    // Generic patterns (lower confidence)
    { pattern: /unit/i, type: 'UNIT', confidence: 0.3 },
    { pattern: /system/i, type: 'SYSTEM', confidence: 0.3 }
  ];

  /**
   * Dictionary of equipment prefixes to Haystack-aligned standard types.
   * Based on Haystack v4/v5 equipment taxonomy.
   */
  private static readonly EQUIPMENT_TYPE_DICTIONARY: Record<string, string> = {
    // Air Handling
    'AHU': 'AHU',
    'RTU': 'RTU',
    'DOAS': 'DOAS',
    'DOAU': 'DOAS',
    'MAU': 'MAU',
    
    // Terminal Units
    'VAV': 'VAV',
    'VVR': 'VAV',
    'VV': 'VAV',
    'FCU': 'FCU',
    'FPB': 'FPB',
    'CAV': 'CAV',
    
    // Heat Recovery
    'ERV': 'ERV',
    'HRV': 'HRV',
    
    // Fans
    'EF': 'EXHAUST-FAN',
    'SF': 'SUPPLY-FAN',
    'RF': 'RETURN-FAN',
    'CTF': 'COOLING-TOWER-FAN',
    'MISC': 'FAN',
    
    // Laboratory
    'LAB': 'LAB-EXHAUST',
    'L': 'LAB-EXHAUST',
    
    // Pumps
    'CWP': 'CHILLED-WATER-PUMP',
    'CHWP': 'CHILLED-WATER-PUMP',
    'HWP': 'HOT-WATER-PUMP',
    'HHP': 'HOT-WATER-PUMP',
    'CHP': 'CHILLED-WATER-PUMP',
    'TWP': 'CONDENSER-WATER-PUMP',
    'P': 'PUMP',
    
    // Central Plant
    'CH': 'CHILLER',
    'CHW': 'CHILLER',
    'BLR': 'BOILER',
    'HHW': 'BOILER',
    'CT': 'COOLING-TOWER',
    
    // Heat Pumps
    'WSHP': 'WATER-SOURCE-HEAT-PUMP',
    'ASHP': 'AIR-SOURCE-HEAT-PUMP',
    'HP': 'HEAT-PUMP',
    'CUH': 'UNIT-HEATER',
    'UH': 'UNIT-HEATER',
    
    // Controls
    'VFD': 'VFD',
    'ECB': 'CONTROLLER',
    'CTRL': 'CONTROLLER',
    
    // Systems
    'SYS': 'SYSTEM',
    'SYSTEM': 'SYSTEM'
  };

  // Memo-cache to avoid repeated scanning
  private static readonly typeCache = new Map<string, { typeName: string; matchedKey: string }>();

  /**
   * Attempt to infer an equipment type from its name using prefix extraction.
   * Takes the first substring before "_" or "-" as the equipment type.
   */
  public static getEquipmentTypeFromName(name: string): { typeName: string; matchedKey: string } {
    if (this.typeCache.has(name)) return this.typeCache.get(name)!;

    // Extract prefix before first separator (_ or -)
    const match = name.match(/^([A-Za-z]+)[-_]/);
    const prefix = match ? match[1].toUpperCase() : name.toUpperCase();
    
    // Check if this prefix exists in our dictionary
    if (this.EQUIPMENT_TYPE_DICTIONARY[prefix]) {
      const res = { typeName: this.EQUIPMENT_TYPE_DICTIONARY[prefix], matchedKey: prefix };
      this.typeCache.set(name, res);
      return res;
    }
    
    // If no exact match, try to find in dictionary keys
    const upper = name.toUpperCase();
    const keys = Object.keys(this.EQUIPMENT_TYPE_DICTIONARY)
      .sort((a, b) => b.length - a.length); // longest first

    for (const key of keys) {
      if (upper.startsWith(key.toUpperCase())) {
        const res = { typeName: this.EQUIPMENT_TYPE_DICTIONARY[key], matchedKey: key };
        this.typeCache.set(name, res);
        return res;
      }
    }
    
    // Default to the prefix itself if not found in dictionary
    const res = { typeName: prefix, matchedKey: prefix };
    this.typeCache.set(name, res);
    return res;
  }

  /**
   * Classify equipment based on filename and metadata from connector service
   */
  public static classifyFromFilename(filename: string): ClassificationResult {
    // Remove file extension
    const baseName = filename.replace(/\.(trio|csv|json)$/i, '');
    
    // Get metadata from connector service
    const metadata = connectorService.getEquipmentMetadata(baseName);
    
    // First, try to classify based on vendor and model
    if (metadata.vendor && metadata.model) {
      const vendorPatterns = this.VENDOR_MODEL_PATTERNS[metadata.vendor];
      if (vendorPatterns) {
        for (const [modelPattern, equipmentType] of Object.entries(vendorPatterns)) {
          if (metadata.model.includes(modelPattern)) {
            console.log(`[CLASSIFIER] Matched by vendor/model: ${metadata.vendor}/${metadata.model} -> ${equipmentType}`);
            return {
              equipmentType,
              confidence: 0.95,
              equipmentName: baseName,
              matchedPattern: `Vendor: ${metadata.vendor}, Model: ${metadata.model}`,
              alternatives: []
            };
          }
        }
      }
    }
    
    // If vendor/model didn't match, try pattern matching on the name

    // --- NEW: dictionary substring match (medium-confidence) ---
    const dictGuess = this.getEquipmentTypeFromName(baseName);
    if (dictGuess.typeName !== 'Unknown') {
      console.log(`[CLASSIFIER] Matched by dictionary: ${baseName} -> ${dictGuess.typeName}`);
      return {
        equipmentType: dictGuess.typeName,
        confidence: 0.9,
        equipmentName: baseName,
        matchedPattern: `Dictionary key: ${dictGuess.matchedKey}`,
        alternatives: []
      };
    }

    // -- Existing regex pattern matching fallback --
    const matches: Array<{ type: string; confidence: number; pattern: string }> = [];
    
    for (const { pattern, type, confidence } of this.EQUIPMENT_PATTERNS) {
      if (pattern.test(baseName)) {
        matches.push({ 
          type, 
          confidence,
          pattern: pattern.toString()
        });
      }
    }
    
    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      const alternatives = matches.slice(1).map(m => ({ 
        type: m.type, 
        confidence: m.confidence 
      }));
      
      console.log(`[CLASSIFIER] Matched by pattern: ${baseName} -> ${bestMatch.type} (confidence: ${bestMatch.confidence})`);
      
      return {
        equipmentType: bestMatch.type,
        confidence: bestMatch.confidence,
        equipmentName: baseName,
        matchedPattern: bestMatch.pattern,
        alternatives
      };
    }
    
    // No match found
    console.log(`[CLASSIFIER] No match found for: ${baseName}`);
    return {
      equipmentType: 'Unknown',
      confidence: 0,
      equipmentName: baseName,
      alternatives: []
    };
  }

  /**
   * Get human-readable equipment type name
   */
  public static getEquipmentTypeDisplayName(type: string): string {
    const displayNames: Record<string, string> = {
      // Haystack standard types (lowercase)
      'ahu': 'Air Handling Unit',
      'rtu': 'Rooftop Unit',
      'vav': 'Variable Air Volume Box',
      'fcu': 'Fan Coil Unit',
      'doas': 'Dedicated Outdoor Air System',
      'mau': 'Makeup Air Unit',
      'erv': 'Energy Recovery Ventilator',
      'hrv': 'Heat Recovery Ventilator',
      'fpb': 'Fan Powered Box',
      'cav': 'Constant Air Volume Box',
      
      // Fans
      'exhaust-fan': 'Exhaust Fan',
      'supply-fan': 'Supply Fan',
      'return-fan': 'Return Fan',
      'cooling-tower-fan': 'Cooling Tower Fan',
      'fan': 'Fan',
      
      // Laboratory
      'lab-exhaust': 'Laboratory Exhaust',
      
      // Pumps
      'chilled-water-pump': 'Chilled Water Pump',
      'hot-water-pump': 'Hot Water Pump',
      'condenser-water-pump': 'Condenser Water Pump',
      'pump': 'Pump',
      
      // Central Plant
      'chiller': 'Chiller',
      'boiler': 'Boiler',
      'cooling-tower': 'Cooling Tower',
      
      // Heat Pumps
      'water-source-heat-pump': 'Water Source Heat Pump',
      'air-source-heat-pump': 'Air Source Heat Pump',
      'heat-pump': 'Heat Pump',
      'unit-heater': 'Unit Heater',
      
      // Controls
      'vfd': 'Variable Frequency Drive',
      'controller': 'Controller',
      
      // Systems
      'system': 'System',
      
      // Legacy types (uppercase) - for backwards compatibility
      'AHU': 'Air Handling Unit',
      'RTU': 'Rooftop Unit',
      'VAV': 'Variable Air Volume Box',
      'FCU': 'Fan Coil Unit',
      'WSHP': 'Water Source Heat Pump',
      'ASHP': 'Air Source Heat Pump',
      'HEAT_PUMP': 'Heat Pump',
      'EXHAUST_FAN': 'Exhaust Fan',
      'SUPPLY_FAN': 'Supply Fan',
      'RETURN_FAN': 'Return Fan',
      'COOLING_TOWER_FAN': 'Cooling Tower Fan',
      'CHILLED_WATER_PUMP': 'Chilled Water Pump',
      'HOT_WATER_PUMP': 'Hot Water Pump',
      'CHILLER': 'Chiller',
      'BOILER': 'Boiler',
      'COOLING_TOWER': 'Cooling Tower',
      'VFD': 'Variable Frequency Drive',
      'CONTROLLER': 'Controller',
      'SYSTEM': 'System',
      'LAB_AIR_VALVE': 'Laboratory Air Valve',
      'VAV_CONTROLLER': 'VAV Controller',
      
      // Default types
      'Unknown': 'Unknown Equipment',
      'UNKNOWN': 'Unknown Equipment'
    };
    
    return displayNames[type] || type;
  }
}

/**
 * Convenience functions for equipment classification
 */
export function classifyEquipment(fileName: string): ClassificationResult {
  return EquipmentClassifier.classifyFromFilename(fileName);
}

export function getEquipmentType(fileName: string): string {
  const result = EquipmentClassifier.classifyFromFilename(fileName);
  return result.equipmentType;
}

export function extractEquipmentName(fileName: string): string {
  const result = EquipmentClassifier.classifyFromFilename(fileName);
  return result.equipmentName;
} 