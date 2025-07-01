"use strict";
/**
 * Comprehensive Tag Mappings for Project Haystack v5
 * Maps BACnet concepts to standardized Haystack markers and tags
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TAG_MAPPINGS = exports.SEMANTIC_COMBINATIONS = exports.POINT_ROLE_MAPPINGS = exports.LOCATION_MAPPINGS = exports.PHYSICAL_QUANTITY_MAPPINGS = exports.EQUIPMENT_TYPE_MAPPINGS = exports.UNIT_MAPPINGS = exports.OBJECT_TYPE_MAPPINGS = void 0;
exports.sortTagsByPriority = sortTagsByPriority;
exports.getEquipmentTagPatterns = getEquipmentTagPatterns;
exports.getUnitTagPatterns = getUnitTagPatterns;
exports.getObjectTypeTagPatterns = getObjectTypeTagPatterns;
/**
 * BACnet Object Type to Haystack Role Mappings
 */
exports.OBJECT_TYPE_MAPPINGS = {
    // Analog Objects
    'AI': { role: 'sensor', tags: ['sensor'], confidence: 0.9 },
    'AO': { role: 'cmd', tags: ['cmd'], confidence: 0.9 },
    'AV': { role: 'sp', tags: ['sp'], confidence: 0.8 },
    // Binary Objects
    'BI': { role: 'sensor', tags: ['sensor', 'binary'], confidence: 0.9 },
    'BO': { role: 'cmd', tags: ['cmd', 'binary'], confidence: 0.9 },
    'BV': { role: 'sp', tags: ['sp', 'binary'], confidence: 0.8 },
    // Multi-state Objects
    'MI': { role: 'sensor', tags: ['sensor', 'multi'], confidence: 0.8 },
    'MO': { role: 'cmd', tags: ['cmd', 'multi'], confidence: 0.8 },
    'MV': { role: 'sp', tags: ['sp', 'multi'], confidence: 0.7 },
    // Calendar and Schedule Objects
    'CAL': { role: 'schedule', tags: ['schedule'], confidence: 0.7 },
    'SCH': { role: 'schedule', tags: ['schedule'], confidence: 0.7 },
    // Notification and Event Objects
    'NC': { role: 'alarm', tags: ['alarm', 'notification'], confidence: 0.8 },
    'EE': { role: 'alarm', tags: ['alarm', 'event'], confidence: 0.8 }
};
/**
 * Unit to Physical Quantity Mappings
 */
exports.UNIT_MAPPINGS = {
    // Temperature Units
    '°F': { quantity: 'temperature', tags: ['temp'], confidence: 0.95 },
    '°C': { quantity: 'temperature', tags: ['temp'], confidence: 0.95 },
    'degF': { quantity: 'temperature', tags: ['temp'], confidence: 0.95 },
    'degC': { quantity: 'temperature', tags: ['temp'], confidence: 0.95 },
    'F': { quantity: 'temperature', tags: ['temp'], confidence: 0.9 },
    'C': { quantity: 'temperature', tags: ['temp'], confidence: 0.9 },
    // Pressure Units
    'PSI': { quantity: 'pressure', tags: ['pressure'], confidence: 0.95 },
    'Pa': { quantity: 'pressure', tags: ['pressure'], confidence: 0.95 },
    'kPa': { quantity: 'pressure', tags: ['pressure'], confidence: 0.95 },
    'inWC': { quantity: 'pressure', tags: ['pressure'], confidence: 0.95 },
    'inH2O': { quantity: 'pressure', tags: ['pressure'], confidence: 0.95 },
    'mmHg': { quantity: 'pressure', tags: ['pressure'], confidence: 0.9 },
    'bar': { quantity: 'pressure', tags: ['pressure'], confidence: 0.9 },
    // Flow Units
    'CFM': { quantity: 'flow', tags: ['flow', 'air'], confidence: 0.95 },
    'GPM': { quantity: 'flow', tags: ['flow', 'water'], confidence: 0.95 },
    'L/s': { quantity: 'flow', tags: ['flow'], confidence: 0.95 },
    'L/min': { quantity: 'flow', tags: ['flow'], confidence: 0.95 },
    'm³/h': { quantity: 'flow', tags: ['flow'], confidence: 0.95 },
    'ft³/min': { quantity: 'flow', tags: ['flow'], confidence: 0.9 },
    // Humidity Units
    '%RH': { quantity: 'humidity', tags: ['humidity'], confidence: 0.95 },
    'RH': { quantity: 'humidity', tags: ['humidity'], confidence: 0.9 },
    // Power Units
    'kW': { quantity: 'power', tags: ['power'], confidence: 0.95 },
    'W': { quantity: 'power', tags: ['power'], confidence: 0.95 },
    'HP': { quantity: 'power', tags: ['power'], confidence: 0.9 },
    'BTU/h': { quantity: 'power', tags: ['power'], confidence: 0.9 },
    // Energy Units
    'kWh': { quantity: 'energy', tags: ['energy'], confidence: 0.95 },
    'Wh': { quantity: 'energy', tags: ['energy'], confidence: 0.95 },
    'BTU': { quantity: 'energy', tags: ['energy'], confidence: 0.9 },
    'MJ': { quantity: 'energy', tags: ['energy'], confidence: 0.9 },
    // Speed Units
    'RPM': { quantity: 'speed', tags: ['speed'], confidence: 0.95 },
    'Hz': { quantity: 'freq', tags: ['freq'], confidence: 0.95 },
    // Percentage and Dimensionless
    '%': { quantity: 'level', tags: ['level'], confidence: 0.8 },
    'percent': { quantity: 'level', tags: ['level'], confidence: 0.8 },
    // CO2 Units
    'ppm': { quantity: 'co2', tags: ['co2'], confidence: 0.85 },
    'PPM': { quantity: 'co2', tags: ['co2'], confidence: 0.85 },
    // Voltage and Current
    'V': { quantity: 'voltage', tags: ['elec', 'volt'], confidence: 0.9 },
    'A': { quantity: 'current', tags: ['elec', 'current'], confidence: 0.9 },
    'mA': { quantity: 'current', tags: ['elec', 'current'], confidence: 0.9 }
};
/**
 * Equipment Type to Haystack Marker Mappings
 */
exports.EQUIPMENT_TYPE_MAPPINGS = {
    // Air Handling Equipment
    'AHU': { tags: ['ahu', 'equip'], confidence: 0.95 },
    'RTU': { tags: ['rtu', 'ahu', 'equip'], confidence: 0.95 },
    'VAV': { tags: ['vav', 'equip'], confidence: 0.95 },
    'CAV': { tags: ['cav', 'equip'], confidence: 0.9 },
    'MAU': { tags: ['mau', 'ahu', 'equip'], confidence: 0.9 },
    'ERV': { tags: ['erv', 'equip'], confidence: 0.9 },
    'HRV': { tags: ['hrv', 'equip'], confidence: 0.9 },
    // HVAC Equipment
    'Chiller': { tags: ['chiller', 'equip'], confidence: 0.95 },
    'Boiler': { tags: ['boiler', 'equip'], confidence: 0.95 },
    'CoolingTower': { tags: ['coolingTower', 'equip'], confidence: 0.95 },
    'HeatPump': { tags: ['heatPump', 'equip'], confidence: 0.95 },
    'Furnace': { tags: ['furnace', 'equip'], confidence: 0.9 },
    'UnitHeater': { tags: ['unitHeater', 'equip'], confidence: 0.9 },
    // Pumps and Fans
    'Pump': { tags: ['pump', 'equip'], confidence: 0.95 },
    'Fan': { tags: ['fan', 'equip'], confidence: 0.95 },
    'ExhaustFan': { tags: ['exhaustFan', 'fan', 'equip'], confidence: 0.9 },
    'SupplyFan': { tags: ['supplyFan', 'fan', 'equip'], confidence: 0.9 },
    'ReturnFan': { tags: ['returnFan', 'fan', 'equip'], confidence: 0.9 },
    // Terminal Equipment
    'FCU': { tags: ['fcu', 'equip'], confidence: 0.9 },
    'VRF': { tags: ['vrf', 'equip'], confidence: 0.9 },
    'Radiator': { tags: ['radiator', 'equip'], confidence: 0.85 },
    'Baseboard': { tags: ['baseboard', 'equip'], confidence: 0.85 },
    // Electrical Equipment
    'Panel': { tags: ['elecPanel', 'equip'], confidence: 0.9 },
    'Meter': { tags: ['elecMeter', 'equip'], confidence: 0.9 },
    'UPS': { tags: ['ups', 'equip'], confidence: 0.85 },
    'Generator': { tags: ['generator', 'equip'], confidence: 0.85 },
    // Lighting Equipment
    'LightingPanel': { tags: ['lightingPanel', 'equip'], confidence: 0.9 },
    'Dimmer': { tags: ['dimmer', 'equip'], confidence: 0.85 },
    // Security and Safety
    'FirePanel': { tags: ['firePanel', 'equip'], confidence: 0.9 },
    'SecurityPanel': { tags: ['securityPanel', 'equip'], confidence: 0.9 }
};
/**
 * Physical Quantity Pattern Mappings
 */
exports.PHYSICAL_QUANTITY_MAPPINGS = {
    'temp': ['temperature', 'temp', 'thermal'],
    'pressure': ['pressure', 'press', 'static', 'differential'],
    'flow': ['flow', 'airflow', 'waterflow', 'cfm', 'gpm', 'volume'],
    'humidity': ['humidity', 'humid', 'moisture', 'rh'],
    'co2': ['co2', 'carbon dioxide', 'carbondioxide', 'ppm'],
    'power': ['power', 'electric', 'kw', 'watt', 'demand'],
    'energy': ['energy', 'kwh', 'consumption', 'usage'],
    'speed': ['speed', 'rpm', 'frequency', 'hz'],
    'level': ['level', 'position', 'percent', 'percentage', 'opening']
};
/**
 * Location Context Mappings
 */
exports.LOCATION_MAPPINGS = {
    'zone': ['zone', 'room', 'space', 'area'],
    'discharge': ['discharge', 'supply', 'sup', 'leaving'],
    'return': ['return', 'ret', 'entering'],
    'outside': ['outside', 'outdoor', 'oa', 'oat', 'external'],
    'mixed': ['mixed', 'mix', 'ma', 'mat'],
    'exhaust': ['exhaust', 'exh', 'relief'],
    'entering': ['entering', 'inlet', 'upstream'],
    'leaving': ['leaving', 'outlet', 'downstream']
};
/**
 * Point Role Pattern Mappings
 */
exports.POINT_ROLE_MAPPINGS = {
    'setpoint': ['sp', 'setpoint'],
    'command': ['cmd', 'writable'],
    'feedback': ['sensor', 'feedback'],
    'status': ['sensor', 'status'],
    'alarm': ['alarm', 'fault'],
    'enable': ['cmd', 'enable'],
    'override': ['cmd', 'override']
};
/**
 * Semantic Tag Combinations for Common Patterns
 */
exports.SEMANTIC_COMBINATIONS = {
    // Temperature combinations
    'zone-temp-sensor': ['point', 'sensor', 'temp', 'zone'],
    'discharge-temp-sensor': ['point', 'sensor', 'temp', 'discharge'],
    'return-temp-sensor': ['point', 'sensor', 'temp', 'return'],
    'outside-temp-sensor': ['point', 'sensor', 'temp', 'outside'],
    'temp-setpoint': ['point', 'sp', 'temp'],
    // Fan combinations
    'fan-status': ['point', 'sensor', 'fan', 'run'],
    'fan-command': ['point', 'cmd', 'fan', 'run'],
    'fan-speed': ['point', 'sp', 'fan', 'speed'],
    // Valve combinations
    'valve-position': ['point', 'sensor', 'valve', 'position'],
    'valve-command': ['point', 'cmd', 'valve', 'position'],
    // Damper combinations
    'damper-position': ['point', 'sensor', 'damper', 'position'],
    'damper-command': ['point', 'cmd', 'damper', 'position'],
    // Pressure combinations
    'static-pressure': ['point', 'sensor', 'pressure', 'static'],
    'diff-pressure': ['point', 'sensor', 'pressure', 'differential'],
    // Flow combinations
    'air-flow': ['point', 'sensor', 'flow', 'air'],
    'water-flow': ['point', 'sensor', 'flow', 'water'],
    // Energy combinations
    'power-sensor': ['point', 'sensor', 'power'],
    'energy-sensor': ['point', 'sensor', 'energy']
};
/**
 * Enhanced Tag Mappings with BACnet-specific patterns
 */
exports.TAG_MAPPINGS = {
    // Temperature patterns
    'temp': {
        tags: ['temp'],
        confidence: 0.9,
        patterns: ['temp', 'temperature', 'thermal', 'deg', '°']
    },
    // Equipment patterns
    'ahu': {
        tags: ['ahu', 'equip'],
        confidence: 0.95,
        patterns: ['ahu', 'air handler', 'air handling unit']
    },
    'vav': {
        tags: ['vav', 'equip'],
        confidence: 0.95,
        patterns: ['vav', 'variable air volume']
    },
    'fan': {
        tags: ['fan', 'equip'],
        confidence: 0.9,
        patterns: ['fan', 'blower']
    },
    // Point role patterns
    'sensor': {
        tags: ['sensor'],
        confidence: 0.85,
        patterns: ['sensor', 'status', 'feedback', 'measured']
    },
    'cmd': {
        tags: ['cmd'],
        confidence: 0.85,
        patterns: ['cmd', 'command', 'control', 'output']
    },
    'sp': {
        tags: ['sp'],
        confidence: 0.8,
        patterns: ['sp', 'setpoint', 'set point', 'target']
    }
};
/**
 * Sort tags by priority (most important first)
 */
function sortTagsByPriority(tags) {
    const priorityOrder = [
        'point', // Always first
        'equip', // Equipment markers
        'ahu', 'vav', 'fan', 'pump', 'chiller', 'boiler',
        'sensor', 'cmd', 'sp', // Point roles
        'temp', 'pressure', 'flow', 'humidity', 'co2', 'power', 'energy', // Quantities
        'zone', 'discharge', 'return', 'outside', 'mixed', // Locations
        'run', 'enable', 'status', 'alarm' // States
    ];
    return tags.sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a);
        const bIndex = priorityOrder.indexOf(b);
        // If both are in priority list, sort by index
        if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
        }
        // Priority tags come first
        if (aIndex !== -1)
            return -1;
        if (bIndex !== -1)
            return 1;
        // Otherwise alphabetical
        return a.localeCompare(b);
    });
}
/**
 * Get equipment-specific tag patterns
 */
function getEquipmentTagPatterns(equipmentType) {
    const mapping = exports.EQUIPMENT_TYPE_MAPPINGS[equipmentType.toUpperCase()];
    return mapping ? mapping.tags : ['equip'];
}
/**
 * Get unit-specific tag patterns
 */
function getUnitTagPatterns(unit) {
    const mapping = exports.UNIT_MAPPINGS[unit];
    return mapping ? mapping.tags : [];
}
/**
 * Get object type tag patterns
 */
function getObjectTypeTagPatterns(objectType) {
    const mapping = exports.OBJECT_TYPE_MAPPINGS[objectType === null || objectType === void 0 ? void 0 : objectType.toUpperCase()];
    return mapping ? mapping.tags : ['point'];
}
