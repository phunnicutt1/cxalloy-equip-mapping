"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipmentClassifier = void 0;
exports.classifyEquipment = classifyEquipment;
exports.getEquipmentType = getEquipmentType;
exports.extractEquipmentName = extractEquipmentName;
const equipment_1 = require("@/types/equipment");
/**
 * Comprehensive equipment classifier for building automation systems
 */
class EquipmentClassifier {
    /**
     * Classify equipment from filename
     */
    static classifyFromFilename(fileName) {
        // Extract base filename without extension
        const baseName = fileName.replace(/\.(trio|csv|txt)$/i, '');
        let bestMatch = null;
        let bestConfidence = 0;
        const alternatives = [];
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
                }
                else {
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
        const result = {
            equipmentType: (bestMatch === null || bestMatch === void 0 ? void 0 : bestMatch.equipmentType) || equipment_1.EquipmentType.UNKNOWN,
            equipmentName: this.extractEquipmentName(baseName),
            originalFileName: fileName,
            confidence: bestConfidence,
            matchedPattern: (bestMatch === null || bestMatch === void 0 ? void 0 : bestMatch.pattern.source) || 'none',
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
     * Extract clean equipment name from filename with detailed descriptions
     */
    static extractEquipmentName(fileName) {
        // Remove file extension
        let name = fileName.replace(/\.(trio|csv|txt)$/i, '');
        // Handle specific patterns with descriptive names
        // VAV Controllers (VVR series)
        const vvrMatch = name.match(/^VVR[_-](\d+)\.(\d+)$/i);
        if (vvrMatch) {
            const floor = vvrMatch[1];
            const room = vvrMatch[2];
            return `Variable Air Volume Controller Room ${floor}.${room}`;
        }
        const vvrEMatch = name.match(/^VVR[_-]E(\d+)$/i);
        if (vvrEMatch) {
            const room = vvrEMatch[1];
            return `Variable Air Volume Controller Room E${room}`;
        }
        // Lab Air Valves
        const labSingleMatch = name.match(/^L-(\d+)$/i);
        if (labSingleMatch) {
            return `Laboratory Exhaust Air Valve Controller ${labSingleMatch[1]}`;
        }
        const labDoubleMatch = name.match(/^L-(\d+)_L-(\d+)$/i);
        if (labDoubleMatch) {
            return `Supply and Exhaust Lab Air Valve Controller ${labDoubleMatch[1]}/${labDoubleMatch[2]}`;
        }
        // RTU Controllers
        const rtuMatch = name.match(/^RTU[_-](\d+)$/i);
        if (rtuMatch) {
            return `Rooftop Unit ${rtuMatch[1]}`;
        }
        // Air Handler Units
        const ahuMatch = name.match(/^AHU[_-](\d+)$/i);
        if (ahuMatch) {
            return `Air Handling Unit ${ahuMatch[1]}`;
        }
        // Exhaust Fans
        const efMatch = name.match(/^EF[_-](\d+[A-Z]?)$/i);
        if (efMatch) {
            return `Exhaust Fan ${efMatch[1]}`;
        }
        const miscEfMatch = name.match(/^MISC(\d+)[_-]EF$/i);
        if (miscEfMatch) {
            return `Miscellaneous Exhaust Fan ${miscEfMatch[1]}`;
        }
        // Unit Heaters
        const uhMatch = name.match(/^UH[_-](\d+)$/i);
        if (uhMatch) {
            const heaterNum = uhMatch[1];
            return `Unit Heater UH-${heaterNum}`;
        }
        // Chilled Water Systems
        if (name.match(/CHW.*Chiller/i)) {
            return 'Chilled Water System Chiller';
        }
        if (name.match(/CHW.*ChwP/i)) {
            return 'Chilled Water System Pump';
        }
        // Hot Water Systems
        if (name.match(/HHW.*Boiler/i)) {
            return 'Hot Water System Boiler';
        }
        if (name.match(/HHW.*HwP/i)) {
            return 'Hot Water System Pump';
        }
        // Generic VAV patterns
        const vavMatch = name.match(/^VV[_-](\d+)[_-]R(\d+)$/i);
        if (vavMatch) {
            const zone = vavMatch[1];
            const room = vavMatch[2];
            return `Variable Air Volume Controller Zone ${zone} Room ${room}`;
        }
        // Default to a cleaned up version of the filename if no specific pattern matches
        return name.replace(/_/g, ' ').replace(/-/g, ' ');
    }
    /**
     * Get equipment type from classification result
     */
    static getEquipmentType(result) {
        return result.equipmentType;
    }
    /**
     * Get all supported equipment patterns
     */
    static getSupportedPatterns() {
        return [...this.CLASSIFICATION_PATTERNS];
    }
    /**
     * Validate filename against known patterns
     */
    static validateFileName(fileName) {
        const baseName = fileName.replace(/\.(trio|csv|txt)$/i, '');
        const issues = [];
        const suggestedNames = [];
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
    static batchClassify(fileNames) {
        return fileNames.map(fileName => this.classifyFromFilename(fileName));
    }
    /**
     * Get equipment configuration for type
     */
    static getEquipmentConfig(equipmentType) {
        const configs = {
            [equipment_1.EquipmentType.VAV_CONTROLLER]: {
                displayName: 'VAV Controller',
                description: 'Variable Air Volume Terminal Unit Controller',
                typicalPoints: ['Temperature', 'Airflow', 'Damper Position', 'Setpoint'],
                vendor: 'Various',
                category: 'HVAC Terminal',
                tags: ['vav', 'controller', 'hvac']
            },
            [equipment_1.EquipmentType.LAB_AIR_VALVE]: {
                displayName: 'Lab Air Valve',
                description: 'Laboratory Air Control Valve',
                typicalPoints: ['Position', 'Airflow', 'Pressure'],
                vendor: 'Various',
                category: 'Lab Equipment',
                tags: ['lab', 'valve', 'airflow']
            },
            [equipment_1.EquipmentType.RTU_CONTROLLER]: {
                displayName: 'RTU Controller',
                description: 'Rooftop Unit Controller',
                typicalPoints: ['Supply Air Temp', 'Return Air Temp', 'Fan Status', 'Heating/Cooling'],
                vendor: 'Various',
                category: 'HVAC Primary',
                tags: ['rtu', 'rooftop', 'controller']
            },
            [equipment_1.EquipmentType.AIR_HANDLER_UNIT]: {
                displayName: 'Air Handler Unit',
                description: 'Central Air Handling Unit',
                typicalPoints: ['Supply Fan', 'Return Fan', 'Heating Coil', 'Cooling Coil'],
                vendor: 'Various',
                category: 'HVAC Primary',
                tags: ['ahu', 'air-handler', 'central']
            },
            [equipment_1.EquipmentType.EXHAUST_FAN]: {
                displayName: 'Exhaust Fan',
                description: 'Exhaust Fan Controller',
                typicalPoints: ['Fan Status', 'Fan Speed', 'Pressure'],
                vendor: 'Various',
                category: 'HVAC Auxiliary',
                tags: ['exhaust', 'fan', 'ventilation']
            },
            [equipment_1.EquipmentType.CHILLER]: {
                displayName: 'Chiller',
                description: 'Chilled Water Plant Equipment',
                typicalPoints: ['Chilled Water Supply Temp', 'Chilled Water Return Temp', 'Status'],
                vendor: 'Various',
                category: 'Central Plant',
                tags: ['chiller', 'cooling', 'central-plant']
            },
            [equipment_1.EquipmentType.BOILER]: {
                displayName: 'Boiler',
                description: 'Hot Water Plant Equipment',
                typicalPoints: ['Hot Water Supply Temp', 'Hot Water Return Temp', 'Status'],
                vendor: 'Various',
                category: 'Central Plant',
                tags: ['boiler', 'heating', 'central-plant']
            },
            [equipment_1.EquipmentType.UNIT_HEATER]: {
                displayName: 'Unit Heater',
                description: 'Hydronic Unit Heater',
                typicalPoints: ['Space Temperature', 'Valve Position', 'Fan Status'],
                vendor: 'Various',
                category: 'HVAC Terminal',
                tags: ['unit-heater', 'terminal', 'heating']
            },
            [equipment_1.EquipmentType.UNKNOWN]: {
                displayName: 'Unknown Equipment',
                description: 'Equipment type not determined',
                typicalPoints: [],
                vendor: 'Unknown',
                category: 'Uncategorized',
                tags: ['unknown']
            },
            [equipment_1.EquipmentType.HUMIDIFIER]: {
                displayName: 'Humidifier',
                description: 'Humidification System',
                typicalPoints: ['Steam Command', 'Humidity', 'Status'],
                vendor: 'Various',
                category: 'HVAC Auxiliary',
                tags: ['humidifier', 'humidity', 'steam']
            },
            [equipment_1.EquipmentType.RETURN_VAV]: {
                displayName: 'Return VAV',
                description: 'Return Air VAV Terminal Unit',
                typicalPoints: ['Airflow', 'Damper Position', 'Status'],
                vendor: 'Various',
                category: 'HVAC Terminal',
                tags: ['return', 'vav', 'damper']
            },
            [equipment_1.EquipmentType.AHU_CONTROLLER]: {
                displayName: 'AHU Controller',
                description: 'Air Handler Unit Controller',
                typicalPoints: ['Supply Fan', 'Return Fan', 'Heating Coil', 'Cooling Coil'],
                vendor: 'Various',
                category: 'HVAC Primary',
                tags: ['ahu', 'air-handler', 'controller']
            },
            [equipment_1.EquipmentType.CHILLER_SYSTEM]: {
                displayName: 'Chiller System',
                description: 'Chilled Water Plant System',
                typicalPoints: ['Chilled Water Supply Temp', 'Chilled Water Return Temp', 'Chiller Status'],
                vendor: 'Various',
                category: 'Central Plant',
                tags: ['chiller', 'cooling', 'system']
            },
            [equipment_1.EquipmentType.BOILER_SYSTEM]: {
                displayName: 'Boiler System',
                description: 'Hot Water Plant System',
                typicalPoints: ['Hot Water Supply Temp', 'Hot Water Return Temp', 'Boiler Status'],
                vendor: 'Various',
                category: 'Central Plant',
                tags: ['boiler', 'heating', 'system']
            },
            [equipment_1.EquipmentType.PUMP_CONTROLLER]: {
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
exports.EquipmentClassifier = EquipmentClassifier;
EquipmentClassifier.CLASSIFICATION_PATTERNS = [
    // Lab Air Valves - Various configurations
    {
        pattern: /^L-(\d+)$/i,
        equipmentType: equipment_1.EquipmentType.LAB_AIR_VALVE,
        confidence: 0.95,
        description: 'Single Lab Air Valve',
        examples: ['L-5', 'L-20', 'L-3']
    },
    {
        pattern: /^L-(\d+)_L-(\d+)$/i,
        equipmentType: equipment_1.EquipmentType.LAB_AIR_VALVE,
        confidence: 0.95,
        description: 'Supply+Exhaust Lab Air Valve',
        examples: ['L-1_L-2', 'L-9_L-11', 'L-10_L-12']
    },
    // VAV Controllers - Multiple naming patterns
    {
        pattern: /^VVR[_-](\d+)\.(\d+)$/i,
        equipmentType: equipment_1.EquipmentType.VAV_CONTROLLER,
        confidence: 0.98,
        description: 'VAV Controller (VVR series)',
        examples: ['VVR_2.1', 'VVR_2.10', 'VVR-2.17']
    },
    {
        pattern: /^VVR[_-]E(\d+)$/i,
        equipmentType: equipment_1.EquipmentType.VAV_CONTROLLER,
        confidence: 0.98,
        description: 'VAV Controller (VVR-E series)',
        examples: ['VVR_E5', 'VVR_E21', 'VVR-E22']
    },
    {
        pattern: /^VV[_-](\d+)[_-]R(\d+)$/i,
        equipmentType: equipment_1.EquipmentType.VAV_CONTROLLER,
        confidence: 0.95,
        description: 'VAV Controller (Return type)',
        examples: ['VV-1-R8', 'VV_5_R3', 'VV-2-R5']
    },
    // RTU Controllers
    {
        pattern: /^RTU[_-](\d+)$/i,
        equipmentType: equipment_1.EquipmentType.RTU_CONTROLLER,
        confidence: 0.98,
        description: 'Rooftop Unit Controller',
        examples: ['RTU_2', 'RTU_15', 'RTU-01']
    },
    // Air Handler Units
    {
        pattern: /^AHU[_-](\d+)$/i,
        equipmentType: equipment_1.EquipmentType.AIR_HANDLER_UNIT,
        confidence: 0.98,
        description: 'Air Handler Unit',
        examples: ['AHU-1', 'AHU_2', 'AHU_C1']
    },
    {
        pattern: /^AHU[_-](\d+)[_-]([A-Z]\d+)$/i,
        equipmentType: equipment_1.EquipmentType.AIR_HANDLER_UNIT,
        confidence: 0.95,
        description: 'Air Handler Unit with zone designation',
        examples: ['AHU-1-AHU_C1', 'AHU_2_B1']
    },
    // Exhaust Fans
    {
        pattern: /^MISC(\d+)[_-]EF$/i,
        equipmentType: equipment_1.EquipmentType.EXHAUST_FAN,
        confidence: 0.95,
        description: 'Miscellaneous Exhaust Fan Controller',
        examples: ['MISC1_EF', 'MISC2_EF']
    },
    {
        pattern: /^EF[_-](\d+)$/i,
        equipmentType: equipment_1.EquipmentType.EXHAUST_FAN,
        confidence: 0.90,
        description: 'Exhaust Fan',
        examples: ['EF_10A', 'EF-12B']
    },
    // Chillers and Chilled Water Systems
    {
        pattern: /^CHW[_-](.+)[_-](Chiller|ChwP\d+|ChwSys)$/i,
        equipmentType: equipment_1.EquipmentType.CHILLER,
        confidence: 0.95,
        description: 'Chilled Water System Component',
        examples: ['CHW-System-Chiller', 'CHW-System-ChwP1']
    },
    // Hot Water Systems
    {
        pattern: /^HHW[_-](.+)[_-](Boilers?|HwP\d+|HwSys)$/i,
        equipmentType: equipment_1.EquipmentType.BOILER,
        confidence: 0.95,
        description: 'Hot Water System Component',
        examples: ['HHW-System-Boilers', 'HHW-System-HwP1']
    },
    // Unit Heaters
    {
        pattern: /^UH[_-](\d+)$/i,
        equipmentType: equipment_1.EquipmentType.UNIT_HEATER,
        confidence: 0.90,
        description: 'Unit Heater',
        examples: ['UH_1322', 'UH_1604']
    },
    // Generic patterns with lower confidence
    {
        pattern: /^([A-Z]+)[_-](\d+)$/i,
        equipmentType: equipment_1.EquipmentType.UNKNOWN,
        confidence: 0.50,
        description: 'Generic equipment pattern',
        examples: ['TCP-1', 'VAV-1']
    }
];
/**
 * Convenience functions for equipment classification
 */
function classifyEquipment(fileName) {
    return EquipmentClassifier.classifyFromFilename(fileName);
}
function getEquipmentType(fileName) {
    const result = EquipmentClassifier.classifyFromFilename(fileName);
    return result.equipmentType;
}
function extractEquipmentName(fileName) {
    return EquipmentClassifier.extractEquipmentName(fileName);
}
